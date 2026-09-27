"""
Pydantic schemas for source code endpoints.

Conforms strictly to Phase 2 specifications.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class SourceCreate(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255, examples=["Calculator.java"])
    source_code: str = Field(..., min_length=1, examples=["public class Calculator { ... }"])


class SourceUpdate(BaseModel):
    file_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    source_code: Optional[str] = Field(default=None, min_length=1)


class SourceOut(BaseModel):
    id: str
    project_id: str
    file_name: str
    language: str = "Java"
    file_size: int = 0
    file_size_bytes: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SourceOutWithCode(SourceOut):
    source_code: str


class MethodInfo(BaseModel):
    name: str
    return_type: str
    parameters: List[Any]
    visibility: str
    is_static: bool = False
    throws: List[str] = []


class ComplexityInfo(BaseModel):
    method_count: int
    branch_count: int
    constructor_count: int
    field_count: int
    line_count: int


class JavaAnalysisResult(BaseModel):
    class_name: str
    package: Optional[str] = None
    imports: List[str] = []
    methods: List[MethodInfo] = []
    constructors: List[MethodInfo] = []
    complexity: Optional[ComplexityInfo] = None
    analysis_notes: List[str] = []


class AnalysisRequest(BaseModel):
    source_id: Optional[str] = Field(default=None, description="UUID of source file to analyze")


class AnalysisErrorDetail(BaseModel):
    code: str
    message: str


class AnalysisResponse(BaseModel):
    analysis_id: str
    source_id: str
    status: str = "completed"
    analysis: dict[str, Any]


class AnalysisErrorResponse(BaseModel):
    status: str = "failed"
    error: AnalysisErrorDetail
