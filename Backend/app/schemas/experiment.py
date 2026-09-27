"""
Pydantic schemas for Phase 6 multi-LLM experiments.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


VALID_CONFIGURATIONS = {
    "gemini_only",
    "openrouter_only",
    "agentrouter_only",
    "gemini_to_openrouter",
    "gemini_to_agentrouter",
    "openrouter_to_agentrouter",
    # Aliases
    "gemini",
    "openrouter",
    "agentrouter",
    "gemini_to_gpt4o",
    "gemini_agentrouter",
    "openrouter_agentrouter",
}


class ExperimentCreate(BaseModel):
    project_id: str = Field(..., description="Project UUID to run experiment against")
    name: str = Field(..., min_length=1, max_length=200, examples=["Gemini to GPT-4o Chaining Experiment"])
    description: Optional[str] = Field(default=None)
    configuration: str = Field(
        default="gemini_to_openrouter",
        description="Configuration type: 'gemini_only', 'openrouter_only', 'agentrouter_only', 'gemini_to_openrouter', 'gemini_to_agentrouter', or 'openrouter_to_agentrouter'",
    )
    initial_provider: Optional[str] = Field(default=None, description="e.g. 'gemini', 'openrouter', or 'agentrouter'")
    initial_model: Optional[str] = Field(default=None, description="e.g. 'gemini-2.5-flash-lite', 'openai/gpt-4o', or 'gpt-4o'")
    refinement_provider: Optional[str] = Field(default="openrouter")
    refinement_model: Optional[str] = Field(default=None)
    max_iterations: int = Field(default=3, ge=1, le=5, description="Maximum refinement iterations (1-5)")
    framework: str = Field(default="junit5")
    source_id: Optional[str] = Field(default=None, description="Optional specific source file ID")

    @field_validator("configuration")
    @classmethod
    def validate_configuration(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in VALID_CONFIGURATIONS:
            raise ValueError(
                f"Invalid configuration '{v}'. Allowed values: {', '.join(sorted(VALID_CONFIGURATIONS))}"
            )
        return clean

    @field_validator("max_iterations")
    @classmethod
    def validate_max_iterations(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("max_iterations must be between 1 and 5")
        return v


class ExperimentMetricOut(BaseModel):
    id: str
    experiment_id: str
    experiment_run_id: str
    generated_test_count: int = 0
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    skipped_tests: int = 0
    compilation_success: bool = False
    execution_success: bool = False
    line_coverage: Optional[float] = None
    branch_coverage: Optional[float] = None
    instruction_coverage: Optional[float] = None
    method_coverage: Optional[float] = None
    class_coverage: Optional[float] = None
    mutation_score: Optional[float] = None
    total_execution_time_ms: int = 0
    refinement_iterations: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ExperimentRunOut(BaseModel):
    id: str
    experiment_id: str
    iteration: int
    provider: str
    model: str
    generation_id: Optional[str] = None
    test_result_id: Optional[str] = None
    coverage_result_id: Optional[str] = None
    refinement_id: Optional[str] = None
    status: str
    execution_time_ms: int
    created_at: datetime
    metrics: List[ExperimentMetricOut] = []

    model_config = {"from_attributes": True}


class ExperimentOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    configuration: str
    initial_provider: str
    initial_model: str
    refinement_provider: Optional[str] = None
    refinement_model: Optional[str] = None
    framework: str
    java_version: str
    build_tool: str
    max_iterations: int
    status: str
    generation_id: Optional[str] = None
    test_result_id: Optional[str] = None
    line_coverage: Optional[float] = None
    branch_coverage: Optional[float] = None
    mutation_score: Optional[float] = None
    execution_time_ms: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExperimentDetailOut(ExperimentOut):
    runs: List[ExperimentRunOut] = []
    metrics: List[ExperimentMetricOut] = []


class ExperimentComparisonItem(BaseModel):
    id: str
    name: str
    configuration: str
    initial_provider: str
    initial_model: str
    refinement_provider: Optional[str] = None
    refinement_model: Optional[str] = None
    status: str
    line_coverage: Optional[float] = None
    branch_coverage: Optional[float] = None
    instruction_coverage: Optional[float] = None
    method_coverage: Optional[float] = None
    class_coverage: Optional[float] = None
    compilation_success: bool = False
    execution_success: bool = False
    passed_tests: int = 0
    failed_tests: int = 0
    total_tests: int = 0
    execution_time_ms: int = 0
    refinement_iterations: int = 0
    created_at: datetime


class ExperimentCompareResponse(BaseModel):
    experiments: List[ExperimentComparisonItem]


class RunExperimentRequest(BaseModel):
    source_id: Optional[str] = None
