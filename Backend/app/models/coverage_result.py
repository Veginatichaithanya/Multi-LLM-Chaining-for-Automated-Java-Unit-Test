"""
CoverageResult ORM model.

Table: coverage_results
Phase 4 / Section 16 compliance.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CoverageResult(Base):
    __tablename__ = "coverage_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_result_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("test_results.id", ondelete="CASCADE"), nullable=False, index=True
    )

    instruction_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    branch_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    line_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    method_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    class_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)

    project: Mapped["Project"] = relationship("Project")  # type: ignore[name-defined]  # noqa: F821
    test_result: Mapped["TestResult"] = relationship("TestResult", back_populates="coverage_result")  # type: ignore[name-defined]  # noqa: F821

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<CoverageResult id={self.id!r} line={self.line_coverage} branch={self.branch_coverage}>"
