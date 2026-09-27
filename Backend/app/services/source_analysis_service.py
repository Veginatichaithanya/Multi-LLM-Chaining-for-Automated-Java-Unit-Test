"""
Source analysis service.

Bridges the API layer to the java_analyzer engine.
Conforms strictly to Phase 2 specifications.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.engines.java_analyzer import JavaAnalysis, analyze_java_source
from app.models.source_analysis import SourceAnalysis
from app.models.source_file import SourceFile
from app.schemas.source import ComplexityInfo, JavaAnalysisResult, MethodInfo, SourceCreate, SourceUpdate
from app.utils.validators import validate_java_filename, validate_source_size


class SourceAnalysisService:

    @staticmethod
    def upload_source(
        db: Session, project_id: str, payload: SourceCreate
    ) -> SourceFile:
        validate_java_filename(payload.file_name)
        validate_source_size(payload.source_code)

        encoded = payload.source_code.encode("utf-8")
        source = SourceFile(
            id=str(uuid.uuid4()),
            project_id=project_id,
            file_name=payload.file_name.strip(),
            source_code=payload.source_code,
            language="Java",
            file_size=len(encoded),
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        return source

    @staticmethod
    def list_sources(db: Session, project_id: str) -> list[SourceFile]:
        return (
            db.query(SourceFile)
            .filter(SourceFile.project_id == project_id)
            .order_by(SourceFile.created_at.desc())
            .all()
        )

    @staticmethod
    def get_source(db: Session, project_id: str, source_id: str) -> SourceFile | None:
        return (
            db.query(SourceFile)
            .filter(SourceFile.id == source_id, SourceFile.project_id == project_id)
            .first()
        )

    @staticmethod
    def get_source_or_raise(db: Session, project_id: str, source_id: str) -> SourceFile:
        source = SourceAnalysisService.get_source(db, project_id, source_id)
        if source is None:
            raise ValueError("Source file not found")
        return source

    @staticmethod
    def update_source(
        db: Session, project_id: str, source_id: str, payload: SourceUpdate
    ) -> SourceFile:
        source = SourceAnalysisService.get_source_or_raise(db, project_id, source_id)
        if payload.file_name is not None:
            validate_java_filename(payload.file_name)
            source.file_name = payload.file_name.strip()
        if payload.source_code is not None:
            validate_source_size(payload.source_code)
            source.source_code = payload.source_code
            source.file_size = len(payload.source_code.encode("utf-8"))
        source.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(source)
        return source

    @staticmethod
    def delete_source(db: Session, project_id: str, source_id: str) -> None:
        source = SourceAnalysisService.get_source_or_raise(db, project_id, source_id)
        db.delete(source)
        db.commit()

    @staticmethod
    def analyze_source(source_code: str) -> JavaAnalysisResult:
        analysis: JavaAnalysis = analyze_java_source(source_code)

        methods = [
            MethodInfo(
                name=m.name,
                return_type=m.return_type,
                parameters=m.parameters,
                visibility=m.visibility,
                is_static=m.is_static,
                throws=m.throws,
            )
            for m in analysis.methods
        ]
        constructors = [
            MethodInfo(
                name=c.name,
                return_type="void",
                parameters=c.parameters,
                visibility=c.visibility,
                is_static=False,
                throws=c.throws,
            )
            for c in analysis.constructors
        ]

        return JavaAnalysisResult(
            class_name=analysis.class_name,
            package=analysis.package,
            imports=analysis.imports,
            methods=methods,
            constructors=constructors,
            complexity=ComplexityInfo(
                method_count=len(analysis.methods),
                branch_count=analysis.branch_count,
                constructor_count=len(analysis.constructors),
                field_count=analysis.field_count,
                line_count=analysis.line_count,
            ),
            analysis_notes=analysis.analysis_notes,
        )

    @staticmethod
    def analyze_and_store(
        db: Session, project_id: str, source_id: str
    ) -> SourceAnalysis:
        """
        Analyze Java source from PostgreSQL and persist results in source_analyses table.
        Adheres strictly to Phase 3 requirements.
        """
        source = SourceAnalysisService.get_source_or_raise(db, project_id, source_id)
        raw_analysis = analyze_java_source(source.source_code, source_id=source_id)
        analysis_json = raw_analysis.to_dict(source_id=source_id)

        # Check if an analysis already exists for this source_id in this project
        existing = (
            db.query(SourceAnalysis)
            .filter(
                SourceAnalysis.project_id == project_id,
                SourceAnalysis.source_file_id == source_id,
            )
            .first()
        )
        if existing:
            existing.analysis_json = analysis_json
            existing.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            return existing

        new_analysis = SourceAnalysis(
            id=str(uuid.uuid4()),
            project_id=project_id,
            source_file_id=source_id,
            analysis_json=analysis_json,
        )
        db.add(new_analysis)
        db.commit()
        db.refresh(new_analysis)
        return new_analysis

    @staticmethod
    def get_latest_analysis(
        db: Session, project_id: str, source_id: str
    ) -> SourceAnalysis | None:
        """Retrieve stored analysis for a source file."""
        return (
            db.query(SourceAnalysis)
            .filter(
                SourceAnalysis.project_id == project_id,
                SourceAnalysis.source_file_id == source_id,
            )
            .order_by(SourceAnalysis.created_at.desc())
            .first()
        )

