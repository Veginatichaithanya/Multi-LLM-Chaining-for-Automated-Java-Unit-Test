"""
ExperimentMetric ORM model.

Table: experiment_metrics
Phase 6 / Section 4 compliance: stores comprehensive factual metrics per run.
NOTE: mutation_score is explicitly kept NULL until PIT mutation testing is integrated.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExperimentMetric(Base):
    __tablename__ = "experiment_metrics"
    __test__ = False

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    experiment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    experiment_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("experiment_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    generated_test_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    passed_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    compilation_success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    execution_success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    line_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    branch_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    instruction_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    method_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    class_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Mutation score: strictly NULL until PIT is executed
    mutation_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    total_execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    refinement_iterations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    experiment: Mapped["Experiment"] = relationship("Experiment", back_populates="metrics")  # type: ignore[name-defined]  # noqa: F821
    experiment_run: Mapped["ExperimentRun"] = relationship("ExperimentRun", back_populates="metrics")  # type: ignore[name-defined]  # noqa: F821

    def __repr__(self) -> str:
        return f"<ExperimentMetric id={self.id!r} run={self.experiment_run_id!r} line={self.line_coverage}>"
