"""
Experiment Service.

Provides lifecycle management, validation, comparison, and runner orchestration
for Phase 6 multi-LLM experiments.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.experiment import Experiment
from app.models.experiment_metric import ExperimentMetric
from app.models.experiment_run import ExperimentRun
from app.models.project import Project
from app.schemas.experiment import (
    ExperimentComparisonItem,
    ExperimentCompareResponse,
    ExperimentCreate,
)
from app.services.experiment_runner import ExperimentRunner


class ExperimentService:

    @staticmethod
    def create_experiment(db: Session, user_id: str, payload: ExperimentCreate) -> Experiment:
        # Validate project ownership
        project = (
            db.query(Project)
            .filter(Project.id == payload.project_id, Project.user_id == user_id)
            .first()
        )
        if not project:
            raise ValueError(f"Project {payload.project_id} not found or access denied")

        # Map configuration aliases if needed
        from app.config import get_settings
        settings = get_settings()

        config = payload.configuration.lower().strip()
        if config in ("gemini", "gemini_only"):
            norm_config = "gemini_only"
            initial_provider = payload.initial_provider or "gemini"
            initial_model = payload.initial_model or settings.GEMINI_MODEL
            ref_provider = None
            ref_model = None
        elif config in ("openrouter", "openrouter_only"):
            norm_config = "openrouter_only"
            initial_provider = payload.initial_provider or "openrouter"
            initial_model = payload.initial_model or settings.OPENROUTER_MODEL
            ref_provider = None
            ref_model = None
        elif config in ("agentrouter", "agentrouter_only"):
            norm_config = "agentrouter_only"
            initial_provider = payload.initial_provider or "agentrouter"
            initial_model = payload.initial_model or (settings.AGENTROUTER_MODEL or "gpt-4o")
            ref_provider = None
            ref_model = None
        elif config in ("gemini_to_agentrouter", "gemini_agentrouter"):
            norm_config = "gemini_to_agentrouter"
            initial_provider = payload.initial_provider or "gemini"
            initial_model = payload.initial_model or settings.GEMINI_MODEL
            ref_provider = payload.refinement_provider or "agentrouter"
            ref_model = payload.refinement_model or (settings.AGENTROUTER_MODEL or "gpt-4o")
        elif config in ("openrouter_to_agentrouter", "openrouter_agentrouter"):
            norm_config = "openrouter_to_agentrouter"
            initial_provider = payload.initial_provider or "openrouter"
            initial_model = payload.initial_model or settings.OPENROUTER_MODEL
            ref_provider = payload.refinement_provider or "agentrouter"
            ref_model = payload.refinement_model or (settings.AGENTROUTER_MODEL or "gpt-4o")
        else:
            norm_config = "gemini_to_openrouter"
            initial_provider = payload.initial_provider or "gemini"
            initial_model = payload.initial_model or settings.GEMINI_MODEL
            ref_provider = payload.refinement_provider or "openrouter"
            ref_model = payload.refinement_model or settings.OPENROUTER_MODEL

        exp = Experiment(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=payload.project_id,
            name=payload.name.strip(),
            description=payload.description,
            configuration=norm_config,
            initial_provider=initial_provider,
            initial_model=initial_model,
            refinement_provider=ref_provider,
            refinement_model=ref_model,
            max_iterations=payload.max_iterations,
            framework=payload.framework or "junit5",
            status="created",
        )
        db.add(exp)
        db.commit()
        db.refresh(exp)
        return exp

    @staticmethod
    def list_experiments(db: Session, user_id: str, project_id: Optional[str] = None) -> List[Experiment]:
        query = db.query(Experiment).filter(Experiment.user_id == user_id)
        if project_id:
            query = query.filter(Experiment.project_id == project_id)
        return query.order_by(Experiment.created_at.desc()).all()

    @staticmethod
    def get_experiment_or_raise(db: Session, exp_id: str, user_id: str) -> Experiment:
        exp = (
            db.query(Experiment)
            .options(
                joinedload(Experiment.runs).joinedload(ExperimentRun.metrics),
                joinedload(Experiment.metrics),
            )
            .filter(Experiment.id == exp_id, Experiment.user_id == user_id)
            .first()
        )
        if not exp:
            raise ValueError("Experiment not found or access denied")
        return exp

    @staticmethod
    def run_experiment(
        db: Session,
        exp_id: str,
        user_id: str,
        source_id: Optional[str] = None,
        ai_provider_override: Optional[any] = None,
    ) -> Experiment:
        return ExperimentRunner.execute_experiment(
            db=db,
            experiment_id=exp_id,
            user_id=user_id,
            source_id=source_id,
            ai_provider_override=ai_provider_override,
        )

    @staticmethod
    def compare_experiments(
        db: Session, user_id: str, experiment_ids: List[str]
    ) -> ExperimentCompareResponse:
        """
        Produce a factual side-by-side comparison of experiments without arbitrary ranking.
        Adheres to Phase 6 Sections 18 & 19.
        """
        exps = (
            db.query(Experiment)
            .options(joinedload(Experiment.metrics))
            .filter(Experiment.id.in_(experiment_ids), Experiment.user_id == user_id)
            .all()
        )

        comparison_items: List[ExperimentComparisonItem] = []
        for exp in exps:
            # Find latest metric record for this experiment
            latest_metric = None
            if exp.metrics:
                sorted_metrics = sorted(exp.metrics, key=lambda m: m.created_at, reverse=True)
                latest_metric = sorted_metrics[0]

            item = ExperimentComparisonItem(
                id=exp.id,
                name=exp.name,
                configuration=exp.configuration,
                initial_provider=exp.initial_provider,
                initial_model=exp.initial_model,
                refinement_provider=exp.refinement_provider,
                refinement_model=exp.refinement_model,
                status=exp.status,
                line_coverage=exp.line_coverage,
                branch_coverage=exp.branch_coverage,
                instruction_coverage=latest_metric.instruction_coverage if latest_metric else None,
                method_coverage=latest_metric.method_coverage if latest_metric else None,
                class_coverage=latest_metric.class_coverage if latest_metric else None,
                compilation_success=latest_metric.compilation_success if latest_metric else False,
                execution_success=latest_metric.execution_success if latest_metric else False,
                passed_tests=latest_metric.passed_tests if latest_metric else 0,
                failed_tests=latest_metric.failed_tests if latest_metric else 0,
                total_tests=latest_metric.total_tests if latest_metric else 0,
                execution_time_ms=exp.execution_time_ms,
                refinement_iterations=latest_metric.refinement_iterations if latest_metric else 0,
                created_at=exp.created_at,
            )
            comparison_items.append(item)

        return ExperimentCompareResponse(experiments=comparison_items)
