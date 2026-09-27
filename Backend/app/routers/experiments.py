"""
Experiments API router.

Implements Phase 6 endpoints:
- POST /api/experiments (Create experiment)
- GET /api/experiments (List user experiments)
- GET /api/experiments/compare?ids=... (Factual comparison)
- GET /api/experiments/{experiment_id} (Details with runs and metrics)
- POST /api/experiments/{experiment_id}/run (Sequential execution)
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.experiment import (
    ExperimentCompareResponse,
    ExperimentCreate,
    ExperimentDetailOut,
    ExperimentOut,
    RunExperimentRequest,
)
from app.services.experiment_service import ExperimentService

router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.post(
    "",
    response_model=ExperimentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new experiment",
)
def create_experiment(
    payload: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExperimentOut:
    try:
        exp = ExperimentService.create_experiment(db, current_user.id, payload)
        return ExperimentOut.model_validate(exp)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create experiment: {str(e)}",
        )


@router.get("", response_model=List[ExperimentOut], summary="List all experiments for current user")
def list_experiments(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ExperimentOut]:
    exps = ExperimentService.list_experiments(db, current_user.id, project_id=project_id)
    return [ExperimentOut.model_validate(e) for e in exps]


@router.get(
    "/compare",
    response_model=ExperimentCompareResponse,
    summary="Factual side-by-side comparison of experiments without ranking",
)
def compare_experiments(
    ids: str = Query(..., description="Comma-separated experiment IDs to compare"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExperimentCompareResponse:
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if not id_list:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one experiment ID is required for comparison",
        )
    return ExperimentService.compare_experiments(db, current_user.id, id_list)


@router.get(
    "/{experiment_id}",
    response_model=ExperimentDetailOut,
    summary="Get an experiment by ID with runs and metrics",
)
def get_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExperimentDetailOut:
    try:
        exp = ExperimentService.get_experiment_or_raise(db, experiment_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return ExperimentDetailOut.model_validate(exp)


@router.post(
    "/{experiment_id}/run",
    response_model=ExperimentDetailOut,
    summary="Run an experiment sequentially",
)
def run_experiment(
    experiment_id: str,
    payload: RunExperimentRequest = RunExperimentRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExperimentDetailOut:
    try:
        ExperimentService.get_experiment_or_raise(db, experiment_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    exp = ExperimentService.run_experiment(
        db=db,
        exp_id=experiment_id,
        user_id=current_user.id,
        source_id=payload.source_id,
    )
    return ExperimentDetailOut.model_validate(exp)
