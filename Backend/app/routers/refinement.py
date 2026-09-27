"""
Test refinement API router.

Implements Phase 5 endpoints:
- POST /api/projects/{project_id}/refine-tests (Single iteration)
- POST /api/projects/{project_id}/refine-tests/run (Multi-iteration loop)
- GET /api/projects/{project_id}/refinements (List project refinements)
- GET /api/projects/{project_id}/refinements/{refinement_id} (Single refinement)
- GET /api/projects/{project_id}/generations/{generation_id}/refinements (Generation history)
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.refinement import (
    RefineTestsRequest,
    RefinementRecordOut,
    RefinementResponse,
    RefinementRunSummary,
)
from app.services.refinement_service import RefinementService

router = APIRouter(prefix="/projects", tags=["Test Refinement"])


@router.post(
    "/{project_id}/refine-tests",
    response_model=RefinementResponse,
    summary="Refine tests using OpenRouter / GPT-4o with execution and coverage feedback",
)
def refine_tests(
    project_id: str,
    payload: RefineTestsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RefinementResponse:
    """Perform a single refinement step adhering to Phase 5 Section 7 & 8."""
    if payload.max_iterations < 1 or payload.max_iterations > 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="max_iterations must be between 1 and 5",
        )

    try:
        res = RefinementService.refine_single_step(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            generation_id=payload.generation_id,
            provider_name=payload.provider or "openrouter",
            model=payload.model,
        )
        return RefinementResponse(**res)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refinement failed: {str(e)}",
        )


@router.post(
    "/{project_id}/refine-tests/run",
    response_model=RefinementRunSummary,
    summary="Run automated multi-iteration test refinement loop (1–5 iterations)",
)
def run_refinement_loop(
    project_id: str,
    payload: RefineTestsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RefinementRunSummary:
    """Execute automated iterative refinement loop until stopping condition or max_iterations."""
    if payload.max_iterations < 1 or payload.max_iterations > 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="max_iterations must be between 1 and 5",
        )

    try:
        res = RefinementService.run_refinement_loop(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            generation_id=payload.generation_id,
            max_iterations=payload.max_iterations,
            provider_name=payload.provider or "openrouter",
            model=payload.model,
        )
        return RefinementRunSummary(**res)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refinement loop failed: {str(e)}",
        )


@router.get(
    "/{project_id}/refinements",
    response_model=List[RefinementRecordOut],
    summary="List all test refinements for a project",
)
def list_refinements(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[RefinementRecordOut]:
    try:
        records = RefinementService.list_refinements(db, project_id, current_user.id)
        return [RefinementRecordOut.model_validate(r) for r in records]
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{project_id}/refinements/{refinement_id}",
    response_model=RefinementRecordOut,
    summary="Get a specific test refinement by ID",
)
def get_refinement(
    project_id: str,
    refinement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RefinementRecordOut:
    try:
        record = RefinementService.get_refinement(db, project_id, refinement_id, current_user.id)
        return RefinementRecordOut.model_validate(record)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{project_id}/generations/{generation_id}/refinements",
    response_model=List[RefinementRecordOut],
    summary="Get all test refinements for a specific generation ordered by iteration",
)
def get_generation_refinements(
    project_id: str,
    generation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[RefinementRecordOut]:
    try:
        records = RefinementService.get_generation_refinements(
            db, project_id, generation_id, current_user.id
        )
        return [RefinementRecordOut.model_validate(r) for r in records]
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
