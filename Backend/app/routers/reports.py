"""
Reports API router — returns research-ready structured data.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.experiment import Experiment
from app.models.test_generation import TestGeneration
from app.models.test_result import TestResult
from app.models.user import User
from app.services.experiment_service import ExperimentService
from app.services.project_service import ProjectService
from app.services.source_analysis_service import SourceAnalysisService

router = APIRouter(tags=["Reports"])


@router.get(
    "/projects/{project_id}/report",
    summary="Get comprehensive report for a project",
)
def get_project_report(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        project = ProjectService.get_project_or_raise(db, project_id, current_user.id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    sources = SourceAnalysisService.list_sources(db, project_id)
    source_analysis = None
    if sources:
        source_analysis = SourceAnalysisService.analyze_source(sources[0].source_code).model_dump()

    generations = db.query(TestGeneration).filter(
        TestGeneration.project_id == project_id
    ).order_by(TestGeneration.created_at.desc()).all()

    latest_gen = generations[0] if generations else None
    latest_result = None
    if latest_gen:
        latest_result = db.query(TestResult).filter(
            TestResult.generation_id == latest_gen.id
        ).order_by(TestResult.created_at.desc()).first()

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "language": project.language,
            "build_tool": project.build_tool,
            "status": project.status,
            "created_at": project.created_at.isoformat(),
        },
        "source_analysis": source_analysis,
        "generation": {
            "total_generations": len(generations),
            "latest": {
                "id": latest_gen.id,
                "provider": latest_gen.provider,
                "model": latest_gen.model,
                "status": latest_gen.status,
                "created_at": latest_gen.created_at.isoformat(),
            } if latest_gen else None,
        },
        "test_results": {
            "tests_total": latest_result.tests_total if latest_result else None,
            "tests_passed": latest_result.tests_passed if latest_result else None,
            "tests_failed": latest_result.tests_failed if latest_result else None,
            "compilation_success": latest_result.compilation_success if latest_result else None,
        },
        "coverage": {
            "line_coverage": latest_result.line_coverage if latest_result else None,
            "branch_coverage": latest_result.branch_coverage if latest_result else None,
            "instruction_coverage": latest_result.instruction_coverage if latest_result else None,
            "method_coverage": latest_result.method_coverage if latest_result else None,
        },
        "mutation_testing": {
            "mutation_score": latest_result.mutation_score if latest_result else None,
            "killed_mutations": latest_result.killed_mutations if latest_result else None,
            "survived_mutations": latest_result.survived_mutations if latest_result else None,
            "status": "measured" if (latest_result and latest_result.mutation_score is not None) else "not_run",
        },
    }


@router.get(
    "/experiments/{experiment_id}/report",
    summary="Get comprehensive report for an experiment",
)
def get_experiment_report(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        exp = ExperimentService.get_experiment_or_raise(db, experiment_id, current_user.id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")

    gen = None
    test_result = None
    if exp.generation_id:
        gen = db.query(TestGeneration).filter(TestGeneration.id == exp.generation_id).first()
    if exp.test_result_id:
        test_result = db.query(TestResult).filter(TestResult.id == exp.test_result_id).first()

    return {
        "experiment": {
            "id": exp.id,
            "name": exp.name,
            "status": exp.status,
            "initial_provider": exp.initial_provider,
            "initial_model": exp.initial_model,
            "refinement_provider": exp.refinement_provider,
            "refinement_model": exp.refinement_model,
            "max_iterations": exp.max_iterations,
            "execution_time_ms": exp.execution_time_ms,
            "created_at": exp.created_at.isoformat(),
        },
        "generation": {
            "id": gen.id if gen else None,
            "provider": gen.provider if gen else None,
            "model": gen.model if gen else None,
            "status": gen.status if gen else None,
        },
        "coverage": {
            "line_coverage": exp.line_coverage,
            "branch_coverage": exp.branch_coverage,
            "mutation_score": exp.mutation_score,
            "status": "measured" if exp.line_coverage is not None else "not_measured",
        },
        "test_results": {
            "tests_total": test_result.tests_total if test_result else None,
            "tests_passed": test_result.tests_passed if test_result else None,
            "compilation_success": test_result.compilation_success if test_result else None,
            "execution_time_ms": test_result.execution_time_ms if test_result else None,
        },
        "mutation_testing": {
            "mutation_score": test_result.mutation_score if test_result else None,
            "killed_mutations": test_result.killed_mutations if test_result else None,
            "survived_mutations": test_result.survived_mutations if test_result else None,
            "status": "measured" if (test_result and test_result.mutation_score is not None) else "not_run",
        },
    }
