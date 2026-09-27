"""
Java source analysis API router.

Conforms strictly to Phase 3 specifications:
- Accepts {"source_id": "UUID"} in POST /api/projects/{project_id}/analyze
- Analyzes package, imports, classes, constructors, methods, parameters, fields, and branches
- Stores analysis in PostgreSQL source_analyses table
- Returns structured JSON response
- Returns safe error responses without exposing Python stack traces
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.source import AnalysisRequest
from app.services.project_service import ProjectService
from app.services.source_analysis_service import SourceAnalysisService

router = APIRouter(prefix="/projects", tags=["Source Analysis"])


def _check_project_ownership(db: Session, project_id: str, user_id: str) -> None:
    try:
        ProjectService.get_project_or_raise(db, project_id, user_id)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.post(
    "/{project_id}/analyze",
    summary="Analyze Java source code and store results in PostgreSQL",
)
def analyze_project(
    project_id: str,
    payload: Optional[AnalysisRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Analyzes a Java source file, stores structured AST results in the database,
    and returns Phase 3 analysis details.
    """
    _check_project_ownership(db, project_id, current_user.id)

    # Determine which source file to analyze
    target_source_id = payload.source_id if payload and payload.source_id else None
    if not target_source_id:
        sources = SourceAnalysisService.list_sources(db, project_id)
        if not sources:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "failed",
                    "error": {
                        "code": "SOURCE_ANALYSIS_FAILED",
                        "message": "No source files found in this project. Upload a Java file first.",
                    },
                },
            )
        target_source_id = sources[0].id

    try:
        analysis_record = SourceAnalysisService.analyze_and_store(
            db, project_id, target_source_id
        )
    except ValueError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "status": "failed",
                "error": {
                    "code": "SOURCE_ANALYSIS_FAILED",
                    "message": str(e),
                },
            },
        )
    except Exception as e:
        # Safe error response — no Python stack traces exposed
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "failed",
                "error": {
                    "code": "SOURCE_ANALYSIS_FAILED",
                    "message": f"Failed to parse and analyze Java source: {str(e)}",
                },
            },
        )

    json_data = analysis_record.analysis_json
    classes = json_data.get("classes", [])
    primary_class = classes[0] if classes else {}
    primary_class_name = primary_class.get("name", "Unknown")

    # Construct response providing both Phase 3 strict structure and backward-compatible fields
    response_content = {
        "analysis_id": analysis_record.id,
        "source_id": target_source_id,
        "status": "completed",
        "analysis": json_data,
        # Backward-compatible convenience fields for existing consumers
        "class_name": primary_class_name,
        "package": json_data.get("package_name"),
        "imports": json_data.get("imports", []),
        "methods": primary_class.get("methods", []),
        "constructors": primary_class.get("constructors", []),
        "complexity": json_data.get("statistics", {}),
        "analysis_notes": json_data.get("analysis_notes", []),
    }
    return JSONResponse(status_code=status.HTTP_200_OK, content=response_content)


@router.get(
    "/{project_id}/analysis/{source_id}",
    summary="Get latest stored analysis for a Java source file",
)
def get_source_analysis(
    project_id: str,
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve existing analysis from PostgreSQL for a source file."""
    _check_project_ownership(db, project_id, current_user.id)

    analysis_record = SourceAnalysisService.get_latest_analysis(db, project_id, source_id)
    if not analysis_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this source file. Run analysis first.",
        )

    json_data = analysis_record.analysis_json
    classes = json_data.get("classes", [])
    primary_class = classes[0] if classes else {}

    return {
        "analysis_id": analysis_record.id,
        "source_id": source_id,
        "status": "completed",
        "analysis": json_data,
        "class_name": primary_class.get("name", "Unknown"),
        "package": json_data.get("package_name"),
        "imports": json_data.get("imports", []),
        "methods": primary_class.get("methods", []),
        "constructors": primary_class.get("constructors", []),
        "complexity": json_data.get("statistics", {}),
        "analysis_notes": json_data.get("analysis_notes", []),
        "created_at": analysis_record.created_at.isoformat(),
        "updated_at": analysis_record.updated_at.isoformat(),
    }
