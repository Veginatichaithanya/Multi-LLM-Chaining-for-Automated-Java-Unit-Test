"""
TestResult ORM model.

Table: test_results
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestResult(Base):
    __tablename__ = "test_results"
    __test__ = False

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)

    generation_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("test_generations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")
    tests_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tests_passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tests_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tests_errored: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tests_skipped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    compilation_success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    execution_success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # JaCoCo coverage
    line_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    branch_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    instruction_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    method_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    class_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)

    # PIT mutation testing
    mutation_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    killed_mutations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    survived_mutations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    stdout: Mapped[str | None] = mapped_column(Text, nullable=True)
    stderr: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    project: Mapped["Project"] = relationship("Project", back_populates="test_results")  # type: ignore[name-defined]  # noqa: F821
    coverage_result: Mapped["CoverageResult | None"] = relationship("CoverageResult", back_populates="test_result", uselist=False, cascade="all, delete-orphan")  # type: ignore[name-defined]  # noqa: F821

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Field name compatibility aliases ──────────────────────────────────────
    @property
    def total_tests(self) -> int:
        return self.tests_total

    @total_tests.setter
    def total_tests(self, v: int) -> None:
        self.tests_total = v

    @property
    def passed_tests(self) -> int:
        return self.tests_passed

    @passed_tests.setter
    def passed_tests(self, v: int) -> None:
        self.tests_passed = v

    @property
    def failed_tests(self) -> int:
        return self.tests_failed

    @failed_tests.setter
    def failed_tests(self, v: int) -> None:
        self.tests_failed = v

    @property
    def errors(self) -> int:
        return self.tests_errored

    @errors.setter
    def errors(self, v: int) -> None:
        self.tests_errored = v

    def __repr__(self) -> str:
        return f"<TestResult id={self.id!r} passed={self.tests_passed}/{self.tests_total}>"
