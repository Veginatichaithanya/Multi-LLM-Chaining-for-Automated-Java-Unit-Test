"""
Results & Discussion API router.

Provides three research-data endpoints consumed by the Results & Discussion page:

GET /api/results/comparison         — Single-LLM vs Multi-LLM coverage + mutation
GET /api/results/refinement-history — Iteration-by-iteration metric progression
GET /api/results/mutation           — Mutation score and mutant counts comparison

All endpoints:
  - Require authentication (Bearer JWT).
  - Read ONLY from existing tables (test_results, test_refinements, experiments,
    test_generations, coverage_results).
  - Never fabricate data.
  - Return has_data=False when no experimental data exists for the selection.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.coverage_result import CoverageResult
from app.models.experiment import Experiment
from app.models.experiment_metric import ExperimentMetric
from app.models.experiment_run import ExperimentRun
from app.models.test_generation import TestGeneration
from app.models.test_refinement import TestRefinement
from app.models.test_result import TestResult
from app.models.user import User
from app.services.project_service import ProjectService

router = APIRouter(prefix="/results", tags=["Results"])


# ── helpers ───────────────────────────────────────────────────────────────────


def _assert_project_access(db: Session, project_id: str, user_id: str) -> None:
    """Raise 404 / 403 if the project is inaccessible."""
    try:
        ProjectService.get_project_or_raise(db, project_id, user_id)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


def _best_test_result(
    db: Session, project_id: str, generation_id: Optional[str]
) -> Optional[TestResult]:
    """Return the latest TestResult for a generation (or the project if generation_id is None)."""
    q = db.query(TestResult).filter(TestResult.project_id == project_id)
    if generation_id:
        q = q.filter(TestResult.generation_id == generation_id)
    return q.order_by(TestResult.created_at.desc()).first()


def _best_coverage(
    db: Session, project_id: str, test_result_id: Optional[str]
) -> Optional[CoverageResult]:
    """Return the CoverageResult linked to a TestResult, if any."""
    if not test_result_id:
        return None
    return (
        db.query(CoverageResult)
        .filter(
            CoverageResult.project_id == project_id,
            CoverageResult.test_result_id == test_result_id,
        )
        .order_by(CoverageResult.created_at.desc())
        .first()
    )


def _metrics_from_result(tr: Optional[TestResult], cov: Optional[CoverageResult]) -> dict[str, Any]:
    """Extract line_coverage, branch_coverage, mutation_score from real DB rows."""
    lc: Optional[float] = None
    bc: Optional[float] = None
    ms: Optional[float] = None

    if cov:
        lc = cov.line_coverage
        bc = cov.branch_coverage
    elif tr:
        lc = getattr(tr, "line_coverage", None)
        bc = getattr(tr, "branch_coverage", None)

    if tr:
        ms = getattr(tr, "mutation_score", None)

    return {
        "line_coverage": lc,
        "branch_coverage": bc,
        "mutation_score": ms,
    }


def _mutation_counts(tr: Optional[TestResult]) -> dict[str, Any]:
    """Extract PIT mutant counts from a TestResult row."""
    if not tr:
        return {
            "mutation_score": None,
            "total_mutants": None,
            "killed_mutants": None,
            "surviving_mutants": None,
        }
    killed = getattr(tr, "killed_mutations", None)
    survived = getattr(tr, "survived_mutations", None)
    total = None
    if killed is not None and survived is not None:
        total = killed + survived
    return {
        "mutation_score": getattr(tr, "mutation_score", None),
        "total_mutants": total,
        "killed_mutants": killed,
        "surviving_mutants": survived,
    }


# ── endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "/comparison",
    summary="Single-LLM vs Multi-LLM coverage and mutation comparison",
)
def get_comparison(
    project_id: str = Query(..., description="Project UUID"),
    experiment_id: Optional[str] = Query(None, description="Experiment UUID"),
    run_id: Optional[str] = Query(None, description="Selected Multi-LLM run UUID"),
    single_experiment_id: Optional[str] = Query(None, description="Single-LLM experiment UUID"),
    multi_experiment_id: Optional[str] = Query(None, description="Multi-LLM experiment UUID"),
    generation_id: Optional[str] = Query(None, description="Initial-generation UUID (single-LLM fallback)"),
    refinement_id: Optional[str] = Query(None, description="Refinement UUID (multi-LLM fallback)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Return line_coverage, branch_coverage, mutation_score for both
    Single-LLM and Multi-LLM test generation.

    Strict validation:
    1. Verify selected experiment exists and belongs to selected project and user.
    2. Identify Single-LLM and Multi-LLM runs.
    3. Verify JaCoCo results exist.
    4. Verify PIT results exist (or calculate mutation score from killed / total).
    5. Never treat missing data as 0% or 100%. Never substitute placeholders.
    6. If data is incomplete, return status="insufficient_data".
    """
    _assert_project_access(db, project_id, current_user.id)

    insufficient_response = {
        "status": "insufficient_data",
        "message": "Complete experimental results are required before generating Fig. 3.",
        "has_data": False,
        "project_id": project_id,
        "experiment_id": experiment_id,
        "run_id": run_id,
        "single_llm": {
            "line_coverage": None,
            "branch_coverage": None,
            "mutation_score": None,
        },
        "multi_llm": {
            "line_coverage": None,
            "branch_coverage": None,
            "mutation_score": None,
        },
    }

    single_line: Optional[float] = None
    single_branch: Optional[float] = None
    single_mut: Optional[float] = None

    multi_line: Optional[float] = None
    multi_branch: Optional[float] = None
    multi_mut: Optional[float] = None

    resolved_exp: Optional[Experiment] = None
    resolved_multi_run: Optional[ExperimentRun] = None

    # ── Path A: Experiment-based resolution ───────────────────────────────────
    if experiment_id:
        resolved_exp = (
            db.query(Experiment)
            .filter(
                Experiment.id == experiment_id,
                Experiment.project_id == project_id,
                Experiment.user_id == current_user.id,
            )
            .first()
        )
        if not resolved_exp:
            return insufficient_response
    elif single_experiment_id or multi_experiment_id:
        exp_target_id = single_experiment_id or multi_experiment_id
        resolved_exp = (
            db.query(Experiment)
            .filter(
                Experiment.id == exp_target_id,
                Experiment.project_id == project_id,
                Experiment.user_id == current_user.id,
            )
            .first()
        )
    else:
        # If experiment_id omitted, check latest completed or active experiment for project
        resolved_exp = (
            db.query(Experiment)
            .filter(
                Experiment.project_id == project_id,
                Experiment.user_id == current_user.id,
                Experiment.status == "completed",
            )
            .order_by(Experiment.created_at.desc())
            .first()
        )
        if not resolved_exp:
            resolved_exp = (
                db.query(Experiment)
                .filter(
                    Experiment.project_id == project_id,
                    Experiment.user_id == current_user.id,
                )
                .order_by(Experiment.created_at.desc())
                .first()
            )

    if resolved_exp:
        # 1. Identify Single-LLM run (iteration 0 / baseline)
        single_exp_id = single_experiment_id or resolved_exp.id
        run0 = (
            db.query(ExperimentRun)
            .filter(
                ExperimentRun.experiment_id == single_exp_id,
                ExperimentRun.iteration == 0,
            )
            .first()
        )
        # If not found in resolved_exp and resolved_exp is not gemini_only, check for gemini_only in project
        if not run0 and resolved_exp.project_id:
            s_exp = (
                db.query(Experiment)
                .filter(
                    Experiment.project_id == project_id,
                    Experiment.user_id == current_user.id,
                    Experiment.configuration.in_(["gemini_only", "gemini"]),
                    Experiment.status == "completed",
                )
                .order_by(Experiment.created_at.desc())
                .first()
            )
            if s_exp:
                run0 = (
                    db.query(ExperimentRun)
                    .filter(
                        ExperimentRun.experiment_id == s_exp.id,
                        ExperimentRun.iteration == 0,
                    )
                    .first()
                )

        if run0:
            m0 = db.query(ExperimentMetric).filter(ExperimentMetric.experiment_run_id == run0.id).first()
            tr0 = db.query(TestResult).filter(TestResult.id == run0.test_result_id).first() if run0.test_result_id else None
            cov0 = _best_coverage(db, project_id, tr0.id if tr0 else None)

            if m0 and m0.line_coverage is not None:
                single_line = m0.line_coverage
            elif cov0 and cov0.line_coverage is not None:
                single_line = cov0.line_coverage
            elif tr0 and tr0.line_coverage is not None:
                single_line = tr0.line_coverage

            if m0 and m0.branch_coverage is not None:
                single_branch = m0.branch_coverage
            elif cov0 and cov0.branch_coverage is not None:
                single_branch = cov0.branch_coverage
            elif tr0 and tr0.branch_coverage is not None:
                single_branch = tr0.branch_coverage

            if m0 and m0.mutation_score is not None:
                single_mut = m0.mutation_score
            elif tr0 and tr0.mutation_score is not None:
                single_mut = tr0.mutation_score
            elif tr0 and tr0.killed_mutations is not None and tr0.survived_mutations is not None:
                tot = tr0.killed_mutations + tr0.survived_mutations
                if tot > 0:
                    single_mut = round((tr0.killed_mutations / tot) * 100.0, 2)

        # 2. Identify Multi-LLM run (refinement run)
        multi_exp_id = multi_experiment_id or resolved_exp.id
        if run_id:
            resolved_multi_run = (
                db.query(ExperimentRun)
                .filter(
                    ExperimentRun.id == run_id,
                    ExperimentRun.experiment_id == multi_exp_id,
                )
                .first()
            )
        else:
            resolved_multi_run = (
                db.query(ExperimentRun)
                .filter(
                    ExperimentRun.experiment_id == multi_exp_id,
                    ExperimentRun.iteration > 0,
                    ExperimentRun.status == "completed",
                )
                .order_by(ExperimentRun.iteration.desc())
                .first()
            )
            if not resolved_multi_run:
                resolved_multi_run = (
                    db.query(ExperimentRun)
                    .filter(
                        ExperimentRun.experiment_id == multi_exp_id,
                        ExperimentRun.iteration > 0,
                    )
                    .order_by(ExperimentRun.iteration.desc())
                    .first()
                )

        # Cross-experiment fallback for Multi-LLM: if selected experiment has no iteration > 0,
        # find matching chaining/refinement experiment in same project
        if not resolved_multi_run:
            m_exp = (
                db.query(Experiment)
                .filter(
                    Experiment.project_id == project_id,
                    Experiment.user_id == current_user.id,
                    Experiment.configuration.in_(["gemini_to_openrouter", "gemini_to_agentrouter"]),
                    Experiment.status == "completed",
                )
                .order_by(Experiment.created_at.desc())
                .first()
            )
            if m_exp:
                resolved_multi_run = (
                    db.query(ExperimentRun)
                    .filter(
                        ExperimentRun.experiment_id == m_exp.id,
                        ExperimentRun.iteration > 0,
                        ExperimentRun.status == "completed",
                    )
                    .order_by(ExperimentRun.iteration.desc())
                    .first()
                )

        if resolved_multi_run:
            m_multi = db.query(ExperimentMetric).filter(ExperimentMetric.experiment_run_id == resolved_multi_run.id).first()
            tr_multi = db.query(TestResult).filter(TestResult.id == resolved_multi_run.test_result_id).first() if resolved_multi_run.test_result_id else None
            ref_multi = db.query(TestRefinement).filter(TestRefinement.id == resolved_multi_run.refinement_id).first() if resolved_multi_run.refinement_id else None
            cov_multi = _best_coverage(db, project_id, tr_multi.id if tr_multi else None)

            if m_multi and m_multi.line_coverage is not None:
                multi_line = m_multi.line_coverage
            elif ref_multi and ref_multi.line_coverage is not None:
                multi_line = ref_multi.line_coverage
            elif cov_multi and cov_multi.line_coverage is not None:
                multi_line = cov_multi.line_coverage
            elif tr_multi and tr_multi.line_coverage is not None:
                multi_line = tr_multi.line_coverage

            if m_multi and m_multi.branch_coverage is not None:
                multi_branch = m_multi.branch_coverage
            elif ref_multi and ref_multi.branch_coverage is not None:
                multi_branch = ref_multi.branch_coverage
            elif cov_multi and cov_multi.branch_coverage is not None:
                multi_branch = cov_multi.branch_coverage
            elif tr_multi and tr_multi.branch_coverage is not None:
                multi_branch = tr_multi.branch_coverage

            if m_multi and m_multi.mutation_score is not None:
                multi_mut = m_multi.mutation_score
            elif ref_multi and ref_multi.mutation_score is not None:
                multi_mut = ref_multi.mutation_score
            elif tr_multi and tr_multi.mutation_score is not None:
                multi_mut = tr_multi.mutation_score
            elif tr_multi and tr_multi.killed_mutations is not None and tr_multi.survived_mutations is not None:
                tot = tr_multi.killed_mutations + tr_multi.survived_mutations
                if tot > 0:
                    multi_mut = round((tr_multi.killed_mutations / tot) * 100.0, 2)

    # ── Path B: Fallback to generation_id / refinement_id if no experiment ─────
    if single_line is None and (generation_id or refinement_id):
        if generation_id:
            gen = db.query(TestGeneration).filter(
                TestGeneration.id == generation_id,
                TestGeneration.project_id == project_id,
            ).first()
        else:
            gen = (
                db.query(TestGeneration)
                .filter(TestGeneration.project_id == project_id)
                .order_by(TestGeneration.created_at.asc())
                .first()
            )

        if gen:
            tr0 = _best_test_result(db, project_id, gen.id)
            cov0 = _best_coverage(db, project_id, tr0.id if tr0 else None)
            if cov0 and cov0.line_coverage is not None:
                single_line = cov0.line_coverage
            elif tr0 and tr0.line_coverage is not None:
                single_line = tr0.line_coverage

            if cov0 and cov0.branch_coverage is not None:
                single_branch = cov0.branch_coverage
            elif tr0 and tr0.branch_coverage is not None:
                single_branch = tr0.branch_coverage

            if tr0 and tr0.mutation_score is not None:
                single_mut = tr0.mutation_score
            elif tr0 and tr0.killed_mutations is not None and tr0.survived_mutations is not None:
                tot = tr0.killed_mutations + tr0.survived_mutations
                if tot > 0:
                    single_mut = round((tr0.killed_mutations / tot) * 100.0, 2)

        if refinement_id:
            ref = db.query(TestRefinement).filter(
                TestRefinement.id == refinement_id,
                TestRefinement.project_id == project_id,
            ).first()
        elif gen:
            ref = (
                db.query(TestRefinement)
                .filter(
                    TestRefinement.project_id == project_id,
                    TestRefinement.generation_id == gen.id,
                )
                .order_by(TestRefinement.iteration.desc())
                .first()
            )
        else:
            ref = None

        if ref:
            multi_line = ref.line_coverage
            multi_branch = ref.branch_coverage
            multi_mut = ref.mutation_score
            if multi_mut is None and ref.parent_result_id:
                p_tr = db.query(TestResult).filter(TestResult.id == ref.parent_result_id).first()
                if p_tr and p_tr.mutation_score is not None:
                    multi_mut = p_tr.mutation_score
                elif p_tr and p_tr.killed_mutations is not None and p_tr.survived_mutations is not None:
                    tot = p_tr.killed_mutations + p_tr.survived_mutations
                    if tot > 0:
                        multi_mut = round((p_tr.killed_mutations / tot) * 100.0, 2)

    # ── Validation: All 6 metrics must be verified real values (not None) ─────
    is_complete = (
        single_line is not None
        and single_branch is not None
        and single_mut is not None
        and multi_line is not None
        and multi_branch is not None
        and multi_mut is not None
    )

    if not is_complete:
        res = dict(insufficient_response)
        res["experiment_id"] = resolved_exp.id if resolved_exp else None
        res["run_id"] = resolved_multi_run.id if resolved_multi_run else None
        res["single_llm"] = {
            "line_coverage": single_line,
            "branch_coverage": single_branch,
            "mutation_score": single_mut,
        }
        res["multi_llm"] = {
            "line_coverage": multi_line,
            "branch_coverage": multi_branch,
            "mutation_score": multi_mut,
        }
        return res

    return {
        "status": "success",
        "has_data": True,
        "project_id": project_id,
        "experiment_id": resolved_exp.id if resolved_exp else None,
        "run_id": resolved_multi_run.id if resolved_multi_run else None,
        "single_llm": {
            "line_coverage": float(single_line),
            "branch_coverage": float(single_branch),
            "mutation_score": float(single_mut),
        },
        "multi_llm": {
            "line_coverage": float(multi_line),
            "branch_coverage": float(multi_branch),
            "mutation_score": float(multi_mut),
        },
    }


@router.get(
    "/refinement-history",
    summary="Coverage and mutation metrics across all refinement iterations",
)
def get_refinement_history(
    project_id: str = Query(..., description="Project UUID"),
    generation_id: Optional[str] = Query(None, description="Generation UUID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Return iteration-by-iteration metrics starting from the initial generation
    (iteration 0) through all stored TestRefinement records for that generation.

    Only iterations that actually exist in the database are returned.
    """
    _assert_project_access(db, project_id, current_user.id)

    # Resolve generation
    if generation_id:
        gen = db.query(TestGeneration).filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not gen:
            raise HTTPException(status_code=404, detail="Generation not found")
    else:
        gen = (
            db.query(TestGeneration)
            .filter(TestGeneration.project_id == project_id)
            .order_by(TestGeneration.created_at.asc())
            .first()
        )

    iterations: list[dict[str, Any]] = []

    # ── Iteration 0: initial generation ───────────────────────────────────────
    if gen:
        tr0 = _best_test_result(db, project_id, gen.id)
        cov0 = _best_coverage(db, project_id, tr0.id if tr0 else None)
        m0 = _metrics_from_result(tr0, cov0)
        iterations.append(
            {
                "iteration": 0,
                "label": "Initial Generation",
                "line_coverage": m0["line_coverage"],
                "branch_coverage": m0["branch_coverage"],
                "mutation_score": m0["mutation_score"],
            }
        )

        # ── Subsequent refinement iterations ──────────────────────────────────
        refs = (
            db.query(TestRefinement)
            .filter(
                TestRefinement.project_id == project_id,
                TestRefinement.generation_id == gen.id,
                TestRefinement.status == "completed",
            )
            .order_by(TestRefinement.iteration.asc())
            .all()
        )

        for ref in refs:
            iterations.append(
                {
                    "iteration": ref.iteration,
                    "label": f"Refinement {ref.iteration}",
                    "line_coverage": ref.line_coverage,
                    "branch_coverage": ref.branch_coverage,
                    "mutation_score": ref.mutation_score,
                }
            )

    has_data = len(iterations) > 0 and any(
        it["line_coverage"] is not None for it in iterations
    )

    return {
        "has_data": has_data,
        "project_id": project_id,
        "generation_id": gen.id if gen else None,
        "iterations": iterations,
    }


@router.get(
    "/mutation",
    summary="Mutation score and mutant counts for single-LLM vs multi-LLM",
)
def get_mutation_comparison(
    project_id: str = Query(..., description="Project UUID"),
    generation_id: Optional[str] = Query(None, description="Initial-generation UUID"),
    refinement_id: Optional[str] = Query(None, description="Refinement UUID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Return mutation_score, total_mutants, killed_mutants, surviving_mutants
    for both single-LLM (initial generation) and multi-LLM (refinement).
    """
    _assert_project_access(db, project_id, current_user.id)

    # Resolve generation
    if generation_id:
        gen = db.query(TestGeneration).filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not gen:
            raise HTTPException(status_code=404, detail="Generation not found")
    else:
        gen = (
            db.query(TestGeneration)
            .filter(TestGeneration.project_id == project_id)
            .order_by(TestGeneration.created_at.asc())
            .first()
        )

    # Single-LLM: from initial test_result
    single_tr = _best_test_result(db, project_id, gen.id if gen else None)
    single_mutation = _mutation_counts(single_tr)

    # Multi-LLM: from best refinement's parent test_result
    ref: Optional[TestRefinement] = None
    if refinement_id:
        ref = db.query(TestRefinement).filter(
            TestRefinement.id == refinement_id,
            TestRefinement.project_id == project_id,
        ).first()
    elif gen:
        ref = (
            db.query(TestRefinement)
            .filter(
                TestRefinement.project_id == project_id,
                TestRefinement.generation_id == gen.id,
            )
            .order_by(TestRefinement.iteration.desc())
            .first()
        )

    multi_tr: Optional[TestResult] = None
    if ref and ref.parent_result_id:
        multi_tr = db.query(TestResult).filter(TestResult.id == ref.parent_result_id).first()

    # Fall back to refinement's own stored mutation_score if no parent result
    if ref and (multi_tr is None or getattr(multi_tr, "mutation_score", None) is None):
        # Build a pseudo-dict using the refinement's stored metrics
        killed = getattr(multi_tr, "killed_mutations", None) if multi_tr else None
        survived = getattr(multi_tr, "survived_mutations", None) if multi_tr else None
        total = (killed + survived) if (killed is not None and survived is not None) else None
        multi_mutation = {
            "mutation_score": ref.mutation_score,
            "total_mutants": total,
            "killed_mutants": killed,
            "surviving_mutants": survived,
        }
    else:
        multi_mutation = _mutation_counts(multi_tr)

    has_data = (
        single_mutation["mutation_score"] is not None
        or multi_mutation["mutation_score"] is not None
    )

    return {
        "has_data": has_data,
        "project_id": project_id,
        "generation_id": gen.id if gen else None,
        "refinement_id": ref.id if ref else None,
        "single_llm": single_mutation,
        "multi_llm": multi_mutation,
    }
