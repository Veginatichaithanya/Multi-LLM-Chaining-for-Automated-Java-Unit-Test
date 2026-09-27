"""
Source code API router.

All operations strictly verify project ownership.
Conforms strictly to Phase 2 specifications.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.source import SourceCreate, SourceOut, SourceOutWithCode, SourceUpdate
from app.services.project_service import ProjectService
from app.services.source_analysis_service import SourceAnalysisService
from app.utils.validators import validate_java_filename, validate_source_size

router = APIRouter(prefix="/projects", tags=["Source Analysis"])


def _verify_project_access(db: Session, project_id: str, user_id: str) -> None:
    try:
        ProjectService.get_project_or_raise(db, project_id, user_id)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.post(
    "/{project_id}/source",
    response_model=SourceOutWithCode,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a Java source file",
)
def upload_source(
    project_id: str,
    payload: SourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceOutWithCode:
    _verify_project_access(db, project_id, current_user.id)
    try:
        validate_java_filename(payload.file_name)
        validate_source_size(payload.source_code)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    source = SourceAnalysisService.upload_source(db, project_id, payload)
    return SourceOutWithCode.model_validate(source)


@router.get(
    "/{project_id}/source",
    response_model=list[SourceOut],
    summary="List source files in a project",
)
def list_sources(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SourceOut]:
    _verify_project_access(db, project_id, current_user.id)
    sources = SourceAnalysisService.list_sources(db, project_id)
    return [SourceOut.model_validate(s) for s in sources]


@router.get(
    "/{project_id}/source/{source_id}",
    response_model=SourceOutWithCode,
    summary="Get a source file by ID",
)
def get_source(
    project_id: str,
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceOutWithCode:
    _verify_project_access(db, project_id, current_user.id)
    try:
        source = SourceAnalysisService.get_source_or_raise(db, project_id, source_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return SourceOutWithCode.model_validate(source)


@router.put(
    "/{project_id}/source/{source_id}",
    response_model=SourceOutWithCode,
    summary="Update a source file by ID",
)
def update_source(
    project_id: str,
    source_id: str,
    payload: SourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceOutWithCode:
    _verify_project_access(db, project_id, current_user.id)
    try:
        source = SourceAnalysisService.update_source(db, project_id, source_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return SourceOutWithCode.model_validate(source)


@router.delete(
    "/{project_id}/source/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a source file",
)
def delete_source(
    project_id: str,
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    _verify_project_access(db, project_id, current_user.id)
    try:
        SourceAnalysisService.delete_source(db, project_id, source_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
