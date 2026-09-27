"""
Experiment ORM model.

Table: experiments
Phase 6 / Section 2 compliance: Multi-LLM reproducible experiment tracking.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.experiment_metric import ExperimentMetric
    from app.models.experiment_run import ExperimentRun
    from app.models.project import Project
    from app.models.user import User


class Experiment(Base):
    __tablename__ = "experiments"
    __test__ = False

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Configuration: "gemini_only" | "openrouter_only" | "gemini_to_openrouter"
    configuration: Mapped[str] = mapped_column(
        String(100), nullable=False, default="gemini_to_openrouter"
    )

    initial_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="gemini")
    initial_model: Mapped[str] = mapped_column(String(150), nullable=False, default="gemini-2.5-flash-lite")
    refinement_provider: Mapped[str | None] = mapped_column(String(50), nullable=True, default="openrouter")
    refinement_model: Mapped[str | None] = mapped_column(String(150), nullable=True, default="openai/gpt-4o")

    framework: Mapped[str] = mapped_column(String(50), nullable=False, default="junit5")
    java_version: Mapped[str] = mapped_column(String(20), nullable=False, default="17")
    build_tool: Mapped[str] = mapped_column(String(50), nullable=False, default="maven")
    max_iterations: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    # Status: created | queued | running | completed | failed | cancelled
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="created")

    # Final summary results (populated after experiment finishes)
    generation_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    test_result_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    line_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    branch_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    mutation_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
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
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="experiments")
    user: Mapped["User"] = relationship("User")
    runs: Mapped[list["ExperimentRun"]] = relationship(
        "ExperimentRun", back_populates="experiment", cascade="all, delete-orphan", order_by="ExperimentRun.iteration.asc()"
    )
    metrics: Mapped[list["ExperimentMetric"]] = relationship(
        "ExperimentMetric", back_populates="experiment", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Experiment id={self.id!r} name={self.name!r} config={self.configuration!r} status={self.status!r}>"
