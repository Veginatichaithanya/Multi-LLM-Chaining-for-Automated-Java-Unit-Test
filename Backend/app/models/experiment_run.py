"""
ExperimentRun ORM model.

Table: experiment_runs
Phase 6 / Section 3 compliance: tracks every execution stage and iteration of an experiment.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExperimentRun(Base):
    __tablename__ = "experiment_runs"
    __test__ = False

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    experiment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False, index=True
    )

    iteration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(150), nullable=False)

    generation_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("test_generations.id", ondelete="SET NULL"), nullable=True
    )
    test_result_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("test_results.id", ondelete="SET NULL"), nullable=True
    )
    coverage_result_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("coverage_results.id", ondelete="SET NULL"), nullable=True
    )
    refinement_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("test_refinements.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    experiment: Mapped["Experiment"] = relationship("Experiment", back_populates="runs")  # type: ignore[name-defined]  # noqa: F821
    metrics: Mapped[list["ExperimentMetric"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "ExperimentMetric", back_populates="experiment_run", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ExperimentRun id={self.id!r} exp={self.experiment_id!r} iter={self.iteration}>"
