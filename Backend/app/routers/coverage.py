"""
Coverage and mutation testing API router.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.coverage import CoverageRequest, CoverageResult, ExecutionRequest, MutationResult
from app.services.coverage_service import CoverageService
from app.services.project_service import ProjectService
from app.services.test_execution_service import TestExecutionService

router = APIRouter(prefix="/projects", tags=["Coverage"])


@router.post(
    "/{project_id}/coverage",
    response_model=CoverageResult,
    summary="Run or retrieve JaCoCo coverage analysis for a test execution",
)
def run_or_get_coverage_endpoint(
    project_id: str,
    payload: CoverageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CoverageResult:
    try:
        test_result_id = payload.test_result_id
        if not test_result_id:
            # Fallback: if generation_id was provided instead, find latest test_result for that generation
            if payload.generation_id:
                from app.models.test_result import TestResult
                tr = (
                    db.query(TestResult)
                    .filter(
                        TestResult.generation_id == payload.generation_id,
                        TestResult.project_id == project_id,
                    )
                    .order_by(TestResult.created_at.desc())
                    .first()
                )
                if tr:
                    test_result_id = tr.id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"No test execution found for generation {payload.generation_id}",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Either test_result_id or generation_id must be provided",
                )

        cov_record = TestExecutionService.get_or_calculate_coverage(
            db=db,
            project_id=project_id,
            test_result_id=test_result_id,
            user_id=current_user.id,
        )

        return CoverageResult(
            id=cov_record.id,
            result_id=cov_record.id,
            project_id=cov_record.project_id,
            test_result_id=cov_record.test_result_id,
            line_coverage=cov_record.line_coverage,
            branch_coverage=cov_record.branch_coverage,
            instruction_coverage=cov_record.instruction_coverage,
            method_coverage=cov_record.method_coverage,
            class_coverage=cov_record.class_coverage,
            status="measured" if cov_record.line_coverage is not None else "not_measured",
            created_at=cov_record.created_at.isoformat() if cov_record.created_at else None,
        )
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{project_id}/coverage",
    response_model=Optional[CoverageResult],
    summary="Get latest JaCoCo coverage result for project",
)
def get_latest_coverage_endpoint(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Optional[CoverageResult]:
    try:
        cov_record = TestExecutionService.get_latest_coverage(
            db=db, project_id=project_id, user_id=current_user.id
        )
        if not cov_record:
            return None
        return CoverageResult(
            id=cov_record.id,
            result_id=cov_record.id,
            project_id=cov_record.project_id,
            test_result_id=cov_record.test_result_id,
            line_coverage=cov_record.line_coverage,
            branch_coverage=cov_record.branch_coverage,
            instruction_coverage=cov_record.instruction_coverage,
            method_coverage=cov_record.method_coverage,
            class_coverage=cov_record.class_coverage,
            status="measured" if cov_record.line_coverage is not None else "not_measured",
            created_at=cov_record.created_at.isoformat() if cov_record.created_at else None,
        )
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{project_id}/coverage/{coverage_id}",
    response_model=CoverageResult,
    summary="Get specific JaCoCo coverage result by ID",
)
def get_coverage_by_id_endpoint(
    project_id: str,
    coverage_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CoverageResult:
    try:
        cov_record = TestExecutionService.get_coverage_by_id(
            db=db, project_id=project_id, coverage_id=coverage_id, user_id=current_user.id
        )
        return CoverageResult(
            id=cov_record.id,
            result_id=cov_record.id,
            project_id=cov_record.project_id,
            test_result_id=cov_record.test_result_id,
            line_coverage=cov_record.line_coverage,
            branch_coverage=cov_record.branch_coverage,
            instruction_coverage=cov_record.instruction_coverage,
            method_coverage=cov_record.method_coverage,
            class_coverage=cov_record.class_coverage,
            status="measured" if cov_record.line_coverage is not None else "not_measured",
            created_at=cov_record.created_at.isoformat() if cov_record.created_at else None,
        )
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/{project_id}/mutation-test",
    response_model=MutationResult,
    summary="Run PIT mutation testing",
)
def run_mutation_test(
    project_id: str,
    payload: ExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MutationResult:
    try:
        ProjectService.get_project_or_raise(db, project_id, current_user.id)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    try:
        result = CoverageService.run_mutation_test(db, project_id, payload.generation_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return MutationResult(
        result_id=result.id,
        generation_id=payload.generation_id,
        mutation_score=result.mutation_score,
        killed_mutations=result.killed_mutations,
        survived_mutations=result.survived_mutations,
        status="completed" if result.mutation_score is not None else "not_run",
    )
