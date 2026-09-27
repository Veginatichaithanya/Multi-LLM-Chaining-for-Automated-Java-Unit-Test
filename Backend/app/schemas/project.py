"""
Pydantic schemas for Project endpoints.

Conforms strictly to Phase 2 specifications.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, examples=["Calculator Testing"])
    description: Optional[str] = Field(default=None, max_length=2000, examples=["JUnit test generation project"])
    language: str = Field(default="Java", max_length=50, examples=["Java"])
    java_version: str = Field(default="17", max_length=20, examples=["17"])
    build_tool: str = Field(default="Maven", max_length=50, examples=["Maven"])


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    language: Optional[str] = Field(default=None, max_length=50)
    java_version: Optional[str] = Field(default=None, max_length=20)
    build_tool: Optional[str] = Field(default=None, max_length=50)
    status: Optional[str] = Field(default=None)


class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    language: str = "Java"
    java_version: Optional[str] = "17"
    build_tool: str = "Maven"
    status: str = "Draft"
    user_id: Optional[str] = None
    owner_id: Optional[str] = None
    source_file_count: int = 0
    latest_coverage: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectOut]
    total: int
