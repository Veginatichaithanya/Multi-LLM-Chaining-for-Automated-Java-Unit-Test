"""
Pydantic schemas for test generation endpoints.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class GenerationRequest(BaseModel):
    provider: str = Field(..., examples=["gemini"], description="AI provider: gemini | openrouter")
    model: str = Field(default="", examples=["gemini-1.5-pro"])
    source_id: str = Field(..., description="Source file ID to generate tests for")
    framework: str = Field(default="junit5", examples=["junit5"])


class ChainRequest(BaseModel):
    initial_provider: str = Field(default="gemini", examples=["gemini"])
    initial_model: str = Field(default="", examples=["gemini-1.5-pro"])
    refinement_provider: str = Field(default="openrouter", examples=["openrouter"])
    refinement_model: str = Field(default="openai/gpt-4o", examples=["openai/gpt-4o"])
    source_id: str = Field(..., description="Source file ID")
    framework: str = Field(default="junit5")
    max_iterations: int = Field(default=2, ge=1, le=5)


class GenerationOut(BaseModel):
    generation_id: str
    project_id: str
    source_id: str | None = None
    provider: str
    model: str
    framework: str = "junit5"
    status: str
    test_code: str | None = None
    iteration: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class GenerationHistoryItem(BaseModel):
    generation_id: str
    project_id: str
    source_id: str | None = None
    provider: str
    model: str
    framework: str = "junit5"
    status: str
    iteration: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

