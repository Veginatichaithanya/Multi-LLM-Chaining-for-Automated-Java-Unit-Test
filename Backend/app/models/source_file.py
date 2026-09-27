"""
SourceFile ORM model.

Table: source_files
Conforms strictly to Phase 2 specifications.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SourceFile(Base):
    __tablename__ = "source_files"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False, default="Java")
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

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

    project: Mapped["Project"] = relationship("Project", back_populates="source_files")  # type: ignore[name-defined]  # noqa: F821

    # ── Backward Compatibility Properties ─────────────────────────────────────
    @property
    def file_size_bytes(self) -> int:
        return self.file_size

    @file_size_bytes.setter
    def file_size_bytes(self, v: int) -> None:
        self.file_size = v

    def __repr__(self) -> str:
        return f"<SourceFile id={self.id!r} file_name={self.file_name!r}>"
