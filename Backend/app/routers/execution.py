"""
Test execution API router — runs Maven/JUnit.
"""
from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.coverage import ExecutionRequest, TestExecutionResult
from app.services.test_execution_service import TestExecutionService

router = APIRouter(prefix="/projects", tags=["Test Execution"])


@router.post(
    "/{project_id}/run-tests",
    response_model=TestExecutionResult,
    summary="Compile and run generated JUnit tests with Maven",
)
def run_tests_endpoint(
    project_id: str,
    payload: ExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TestExecutionResult:
    try:
        raw_res = TestExecutionService.run_tests(
            db=db,
            project_id=project_id,
            generation_id=payload.generation_id,
            user_id=current_user.id,
        )
        return TestExecutionResult(
            test_result_id=raw_res.get("test_result_id"),
            result_id=raw_res.get("test_result_id"),
            generation_id=payload.generation_id,
            status=raw_res.get("status", "failed"),
            compile_success=raw_res.get("compile_success", False),
            execution_success=raw_res.get("execution_success", False),
            total_tests=raw_res.get("total_tests", 0),
            passed_tests=raw_res.get("passed_tests", 0),
            failed_tests=raw_res.get("failed_tests", 0),
            skipped_tests=raw_res.get("skipped_tests", 0),
            error_count=raw_res.get("error_count", 0),
            execution_time_ms=raw_res.get("execution_time_ms", 0),
            stdout=raw_res.get("stdout"),
            stderr=raw_res.get("stderr"),
            message=raw_res.get("message"),
            test_cases=raw_res.get("test_cases", []),
        )
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{project_id}/test-results",
    summary="List all test execution results for project",
)
def list_test_results_endpoint(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    try:
        results = TestExecutionService.list_test_results(db, project_id, current_user.id)
        return [
            {
                "id": r.id,
                "test_result_id": r.id,
                "result_id": r.id,
                "generation_id": r.generation_id,
                "project_id": r.project_id,
                "status": r.status,
                "compile_success": r.compilation_success,
                "execution_success": r.execution_success,
                "total_tests": r.tests_total,
                "passed_tests": r.tests_passed,
                "failed_tests": r.tests_failed,
                "skipped_tests": r.tests_skipped,
                "error_count": r.error_count,
                "execution_time_ms": r.execution_time_ms,
                "stdout": r.stdout,
                "stderr": r.stderr,
                "line_coverage": r.line_coverage,
                "branch_coverage": r.branch_coverage,
                "instruction_coverage": r.instruction_coverage,
                "method_coverage": r.method_coverage,
                "class_coverage": r.class_coverage,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in results
        ]
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{project_id}/test-results/{result_id}",
    summary="Get details of a specific test execution result",
)
def get_test_result_endpoint(
    project_id: str,
    result_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        r = TestExecutionService.get_test_result(db, project_id, result_id, current_user.id)
        return {
            "id": r.id,
            "test_result_id": r.id,
            "result_id": r.id,
            "generation_id": r.generation_id,
            "project_id": r.project_id,
            "status": r.status,
            "compile_success": r.compilation_success,
            "execution_success": r.execution_success,
            "total_tests": r.tests_total,
            "passed_tests": r.tests_passed,
            "failed_tests": r.tests_failed,
            "skipped_tests": r.tests_skipped,
            "error_count": r.error_count,
            "execution_time_ms": r.execution_time_ms,
            "stdout": r.stdout,
            "stderr": r.stderr,
            "line_coverage": r.line_coverage,
            "branch_coverage": r.branch_coverage,
            "instruction_coverage": r.instruction_coverage,
            "method_coverage": r.method_coverage,
            "class_coverage": r.class_coverage,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
