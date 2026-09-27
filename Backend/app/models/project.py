"""
Project ORM model.

Table: projects
Conforms strictly to Phase 2 specifications.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    # ── Primary key ───────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )

    # ── Ownership ─────────────────────────────────────────────────────────────
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user: Mapped["User"] = relationship("User", back_populates="projects")  # type: ignore[name-defined]  # noqa: F821

    # ── Core fields ───────────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    language: Mapped[str] = mapped_column(String(50), nullable=False, default="Java")
    java_version: Mapped[str | None] = mapped_column(String(20), nullable=True, default="17")
    build_tool: Mapped[str] = mapped_column(String(50), nullable=False, default="Maven")
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Draft"
    )  # Draft | Ready | Analyzing | Generating | Refining | Completed | Failed

    # ── Relationships ─────────────────────────────────────────────────────────
    source_files: Mapped[list["SourceFile"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "SourceFile", back_populates="project", cascade="all, delete-orphan"
    )
    test_generations: Mapped[list["TestGeneration"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "TestGeneration", back_populates="project", cascade="all, delete-orphan"
    )
    test_results: Mapped[list["TestResult"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "TestResult", back_populates="project", cascade="all, delete-orphan"
    )
    test_refinements: Mapped[list["TestRefinement"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "TestRefinement", back_populates="project", cascade="all, delete-orphan"
    )
    experiments: Mapped[list["Experiment"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Experiment", back_populates="project", cascade="all, delete-orphan"
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
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

    # ── Backward Compatibility Properties ─────────────────────────────────────
    @property
    def owner_id(self) -> str:
        return self.user_id

    @owner_id.setter
    def owner_id(self, val: str) -> None:
        self.user_id = val

    @property
    def owner(self):
        return self.user

    @property
    def source_file_count(self) -> int:
        return len(self.source_files) if self.source_files is not None else 0

    def __repr__(self) -> str:
        return f"<Project id={self.id!r} name={self.name!r} user_id={self.user_id!r}>"
