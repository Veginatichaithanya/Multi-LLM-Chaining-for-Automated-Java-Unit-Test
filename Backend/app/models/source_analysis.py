"""
SourceAnalysis ORM model.

Table: source_analyses
Stores structured AST analysis results for Java source files.
Conforms strictly to Phase 3 specifications.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database import Base


class SourceAnalysis(Base):
    __tablename__ = "source_analyses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # JSONB for PostgreSQL, falls back to JSON for SQLite
    analysis_json: Mapped[dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON, "sqlite"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")  # type: ignore[name-defined]  # noqa: F821
    source_file: Mapped["SourceFile"] = relationship("SourceFile")  # type: ignore[name-defined]  # noqa: F821

    def __repr__(self) -> str:
        return f"<SourceAnalysis id={self.id!r} source_file_id={self.source_file_id!r}>"
