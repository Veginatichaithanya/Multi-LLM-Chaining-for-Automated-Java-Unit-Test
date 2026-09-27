"""
Pydantic schemas for test refinement endpoints.
Adheres strictly to Phase 5 Sections 7, 8, 9, 10, 14.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RefineTestsRequest(BaseModel):
    generation_id: str = Field(..., description="ID of the test generation to refine")
    max_iterations: int = Field(default=3, ge=1, le=5, description="Maximum refinement iterations (1–5)")
    model: Optional[str] = Field(default=None, description="AI model to use (defaults to provider configured model)")
    provider: Optional[str] = Field(default="openrouter", description="AI provider (default: openrouter)")


class RefinementMetrics(BaseModel):
    line_coverage: Optional[float] = None
    branch_coverage: Optional[float] = None
    passed_tests: Optional[int] = 0
    failed_tests: Optional[int] = 0


class RefinementResponse(BaseModel):
    refinement_id: str
    generation_id: str
    iteration: int
    provider: str
    model: str
    status: str
    test_code: str
    before: RefinementMetrics
    after: RefinementMetrics
    error_message: Optional[str] = None


class RefinementRecordOut(BaseModel):
    id: str
    project_id: str
    generation_id: str
    parent_result_id: Optional[str] = None
    provider: str
    model: str
    iteration: int
    input_test_code: str
    refined_test_code: Optional[str] = None
    compilation_status: Optional[str] = None
    execution_status: Optional[str] = None
    line_coverage: Optional[float] = None
    branch_coverage: Optional[float] = None
    instruction_coverage: Optional[float] = None
    mutation_score: Optional[float] = None
    feedback_json: Optional[Dict[str, Any]] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RefinementRunSummary(BaseModel):
    generation_id: str
    project_id: str
    iterations_count: int
    final_status: str
    final_test_code: Optional[str] = None
    iterations: List[RefinementResponse]
