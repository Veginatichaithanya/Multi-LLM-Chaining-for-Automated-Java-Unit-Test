"""
Project business logic service.

All project operations enforce ownership — users can only access their own projects.
Conforms strictly to Phase 2 specifications.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_result import TestResult
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate


class ProjectService:
    """Stateless project service."""

    @staticmethod
    def create_project(db: Session, user_id: str, payload: ProjectCreate) -> Project:
        project = Project(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            language=payload.language or "Java",
            java_version=payload.java_version or "17",
            build_tool=payload.build_tool or "Maven",
            status="Draft",
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def list_projects(db: Session, user_id: str) -> list[Project]:
        return (
            db.query(Project)
            .filter(Project.user_id == user_id)
            .order_by(Project.created_at.desc())
            .all()
        )

    @staticmethod
    def get_project(db: Session, project_id: str, user_id: str) -> Project | None:
        return (
            db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user_id)
            .first()
        )

    @staticmethod
    def get_project_or_raise(db: Session, project_id: str, user_id: str) -> Project:
        project = ProjectService.get_project(db, project_id, user_id)
        if project is None:
            raise ValueError("Project not found")
        return project

    @staticmethod
    def build_project_out(db: Session, project: Project) -> ProjectOut:
        source_count = (
            db.query(SourceFile).filter(SourceFile.project_id == project.id).count()
        )
        latest_res = (
            db.query(TestResult)
            .filter(TestResult.project_id == project.id)
            .order_by(TestResult.created_at.desc())
            .first()
        )
        latest_cov = latest_res.line_coverage if latest_res and latest_res.line_coverage is not None else None

        return ProjectOut(
            id=project.id,
            name=project.name,
            description=project.description,
            language=project.language,
            java_version=project.java_version or "17",
            build_tool=project.build_tool,
            status=project.status,
            user_id=project.user_id,
            owner_id=project.user_id,
            source_file_count=source_count,
            latest_coverage=latest_cov,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    @staticmethod
    def update_project(
        db: Session, project_id: str, user_id: str, payload: ProjectUpdate
    ) -> Project:
        project = ProjectService.get_project_or_raise(db, project_id, user_id)
        update_data = payload.model_dump(exclude_none=True)
        for key, value in update_data.items():
            if hasattr(project, key):
                setattr(project, key, value)
        project.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete_project(db: Session, project_id: str, user_id: str) -> None:
        project = ProjectService.get_project_or_raise(db, project_id, user_id)
        db.delete(project)
        db.commit()
