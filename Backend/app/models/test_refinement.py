"""
TestRefinement ORM model.

Table: test_refinements
Tracks iterative multi-LLM test improvements with compilation,
execution, and JaCoCo coverage feedback across iterations.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestRefinement(Base):
    __tablename__ = "test_refinements"
    __test__ = False  # Prevent Pytest from collecting ORM model as a test class

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )

    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    generation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("test_generations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_result_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("test_results.id", ondelete="SET NULL"),
        nullable=True,
    )

    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="openrouter")
    model: Mapped[str] = mapped_column(String(150), nullable=False, default="openai/gpt-4o")
    iteration: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    input_test_code: Mapped[str] = mapped_column(Text, nullable=False)
    refined_test_code: Mapped[str | None] = mapped_column(Text, nullable=True)

    compilation_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    execution_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    line_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    branch_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    instruction_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    mutation_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    feedback_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="test_refinements")  # type: ignore[name-defined]  # noqa: F821
    generation: Mapped["TestGeneration"] = relationship("TestGeneration")  # type: ignore[name-defined]  # noqa: F821
    parent_result: Mapped["TestResult"] = relationship("TestResult")  # type: ignore[name-defined]  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<TestRefinement id={self.id!r} gen={self.generation_id!r} "
            f"iter={self.iteration} status={self.status!r}>"
        )
