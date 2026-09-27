"""
Pydantic schemas for test execution and coverage endpoints.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExecutionRequest(BaseModel):
    generation_id: str = Field(..., description="Generation ID to execute")


class TestCaseResult(BaseModel):
    class_name: str
    name: str
    time_seconds: float = 0.0
    status: str = "passed"
    failure_message: Optional[str] = None
    error_message: Optional[str] = None


class TestExecutionResult(BaseModel):
    test_result_id: Optional[str] = None
    result_id: Optional[str] = None
    generation_id: Optional[str] = None
    status: str = "not_run"
    compile_success: bool = False
    execution_success: bool = False
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    skipped_tests: int = 0
    error_count: int = 0
    execution_time_ms: int = 0
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    message: Optional[str] = None
    error_message: Optional[str] = None
    test_cases: List[Dict[str, Any]] = Field(default_factory=list)

    # Backwards compatibility properties
    @property
    def tests_total(self) -> int:
        return self.total_tests

    @property
    def tests_passed(self) -> int:
        return self.passed_tests

    @property
    def tests_failed(self) -> int:
        return self.failed_tests

    @property
    def tests_errored(self) -> int:
        return self.error_count

    @property
    def tests_skipped(self) -> int:
        return self.skipped_tests


class CoverageRequest(BaseModel):
    test_result_id: Optional[str] = Field(None, description="TestResult ID to evaluate coverage for")
    generation_id: Optional[str] = Field(None, description="Fallback generation ID")


class CoverageResult(BaseModel):
    id: Optional[str] = None
    result_id: Optional[str] = None
    project_id: Optional[str] = None
    test_result_id: Optional[str] = None
    line_coverage: Optional[float] = None
    branch_coverage: Optional[float] = None
    instruction_coverage: Optional[float] = None
    method_coverage: Optional[float] = None
    class_coverage: Optional[float] = None
    status: str = "not_measured"
    created_at: Optional[str] = None
    error_message: Optional[str] = None


class MutationResult(BaseModel):
    result_id: Optional[str] = None
    generation_id: Optional[str] = None
    mutation_score: Optional[float] = None
    killed_mutations: int = 0
    survived_mutations: int = 0
    total_mutations: int = 0
    status: str = "not_run"
    error_message: Optional[str] = None
