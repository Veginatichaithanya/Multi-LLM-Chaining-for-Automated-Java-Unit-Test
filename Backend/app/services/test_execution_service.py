"""
Test Execution Service.

Coordinates:
- Verification of project ownership, generation, and source files.
- Gradle detection and graceful rejection.
- Maven compilation, JUnit 5 test execution, and JaCoCo coverage extraction.
- Database persistence for TestResult and CoverageResult.
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from app.engines.maven_runner import execute_test_pipeline, maven_available, java_available
from app.models.coverage_result import CoverageResult
from app.models.project import Project
from app.models.test_generation import TestGeneration
from app.models.test_result import TestResult
from app.services.project_service import ProjectService
from app.services.source_analysis_service import SourceAnalysisService


class TestExecutionService:

    @classmethod
    def run_tests(
        cls,
        db: Session,
        project_id: str,
        generation_id: str,
        user_id: str,
    ) -> dict:
        """
        Execute Maven + JUnit 5 tests for a generated test suite.
        Adheres to Phase 4 rules:
        - Project ownership verification.
        - Gradle check: returns not_supported if gradle.
        - Checks generation and source file existence and ownership.
        - Maven compile first; if fails, JUnit is not run.
        - Results persisted to PostgreSQL.
        """
        project: Project = ProjectService.get_project_or_raise(db, project_id, user_id)

        # ── Section 3: Gradle support check ──────────────────────────────────
        if getattr(project, "build_tool", "").lower() == "gradle":
            return {
                "status": "not_supported",
                "message": "Gradle execution will be implemented in a later phase.",
                "compile_success": False,
                "execution_success": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "skipped_tests": 0,
                "execution_time_ms": 0,
            }

        # ── Verify generation belongs to project ─────────────────────────────
        gen = db.query(TestGeneration).filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not gen:
            raise ValueError(f"Generation {generation_id} not found in project {project_id}")
        if not gen.test_code:
            raise ValueError("Generation has no test code to execute")

        # ── Verify source file belongs to project ────────────────────────────
        source = None
        if gen.source_file_id:
            source = SourceAnalysisService.get_source(db, project_id, gen.source_file_id)
        source_code = source.source_code if source else ""

        # ── Check toolchain availability ──────────────────────────────────────
        if not maven_available() or not java_available():
            return {
                "status": "not_available",
                "message": "Maven or Java 17+ is not available on the server.",
                "compile_success": False,
                "execution_success": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "skipped_tests": 0,
                "execution_time_ms": 0,
            }

        # ── Run pipeline ──────────────────────────────────────────────────────
        pipeline_res = execute_test_pipeline(
            source_code=source_code,
            test_code=gen.test_code,
            with_jacoco=True,
        )

        test_result_id = str(uuid.uuid4())
        cov = pipeline_res.coverage

        result = TestResult(
            id=test_result_id,
            generation_id=gen.id,
            project_id=project_id,
            status=pipeline_res.status,
            compilation_success=pipeline_res.compile_success,
            execution_success=pipeline_res.execution_success,
            tests_total=pipeline_res.total_tests,
            tests_passed=pipeline_res.passed_tests,
            tests_failed=pipeline_res.failed_tests,
            tests_skipped=pipeline_res.skipped_tests,
            tests_errored=pipeline_res.error_count,
            error_count=pipeline_res.error_count,
            execution_time_ms=pipeline_res.execution_time_ms,
            stdout=pipeline_res.stdout,
            stderr=pipeline_res.stderr,
            error_message=pipeline_res.message,
            line_coverage=cov.line_coverage if cov and cov.status == "measured" else None,
            branch_coverage=cov.branch_coverage if cov and cov.status == "measured" else None,
            instruction_coverage=cov.instruction_coverage if cov and cov.status == "measured" else None,
            method_coverage=cov.method_coverage if cov and cov.status == "measured" else None,
            class_coverage=cov.class_coverage if cov and cov.status == "measured" else None,
        )
        db.add(result)

        # If JaCoCo measured coverage, persist to coverage_results
        if cov and cov.status == "measured":
            coverage_record = CoverageResult(
                id=str(uuid.uuid4()),
                project_id=project_id,
                test_result_id=test_result_id,
                instruction_coverage=cov.instruction_coverage,
                branch_coverage=cov.branch_coverage,
                line_coverage=cov.line_coverage,
                method_coverage=cov.method_coverage,
                class_coverage=cov.class_coverage,
            )
            db.add(coverage_record)

        db.commit()
        db.refresh(result)

        # Build test cases list if available
        test_cases_data = []
        if pipeline_res.surefire_report:
            for tc in pipeline_res.surefire_report.test_cases:
                test_cases_data.append({
                    "class_name": tc.class_name,
                    "name": tc.name,
                    "time_seconds": tc.time_seconds,
                    "status": tc.status,
                    "failure_message": tc.failure_message,
                    "error_message": tc.error_message,
                })

        return {
            "test_result_id": result.id,
            "status": result.status,
            "compile_success": result.compilation_success,
            "execution_success": result.execution_success,
            "total_tests": result.tests_total,
            "passed_tests": result.tests_passed,
            "failed_tests": result.tests_failed,
            "skipped_tests": result.tests_skipped,
            "error_count": result.error_count,
            "execution_time_ms": result.execution_time_ms,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "message": pipeline_res.message,
            "test_cases": test_cases_data,
        }

    @classmethod
    def get_or_calculate_coverage(
        cls,
        db: Session,
        project_id: str,
        test_result_id: str,
        user_id: str,
    ) -> CoverageResult:
        """
        Retrieve or calculate JaCoCo coverage for a specific test execution.
        Verifies project ownership.
        """
        ProjectService.get_project_or_raise(db, project_id, user_id)

        test_result = db.query(TestResult).filter(
            TestResult.id == test_result_id,
            TestResult.project_id == project_id,
        ).first()
        if not test_result:
            raise ValueError(f"Test result {test_result_id} not found in project {project_id}")

        # Check if CoverageResult already exists
        existing_cov = db.query(CoverageResult).filter(
            CoverageResult.test_result_id == test_result_id,
            CoverageResult.project_id == project_id,
        ).first()
        if existing_cov:
            return existing_cov

        # If compilation failed, cannot calculate coverage
        if not test_result.compilation_success:
            raise ValueError("Cannot calculate coverage: test compilation previously failed.")

        # If coverage values exist on test_result, create coverage record
        if test_result.line_coverage is not None:
            new_cov = CoverageResult(
                id=str(uuid.uuid4()),
                project_id=project_id,
                test_result_id=test_result_id,
                instruction_coverage=test_result.instruction_coverage,
                branch_coverage=test_result.branch_coverage,
                line_coverage=test_result.line_coverage,
                method_coverage=test_result.method_coverage,
                class_coverage=test_result.class_coverage,
            )
            db.add(new_cov)
            db.commit()
            db.refresh(new_cov)
            return new_cov

        # Run pipeline specifically to generate JaCoCo report
        gen = db.query(TestGeneration).filter(
            TestGeneration.id == test_result.generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not gen or not gen.test_code:
            raise ValueError("Associated test generation not found or missing test code")

        source = SourceAnalysisService.get_source(db, project_id, gen.source_file_id) if gen.source_file_id else None
        source_code = source.source_code if source else ""

        pipeline_res = execute_test_pipeline(
            source_code=source_code,
            test_code=gen.test_code,
            with_jacoco=True,
        )

        cov = pipeline_res.coverage
        if not cov or cov.status != "measured":
            raise ValueError(f"JaCoCo coverage unavailable: {pipeline_res.message or 'No coverage report generated'}")

        # Update test_result
        test_result.line_coverage = cov.line_coverage
        test_result.branch_coverage = cov.branch_coverage
        test_result.instruction_coverage = cov.instruction_coverage
        test_result.method_coverage = cov.method_coverage
        test_result.class_coverage = cov.class_coverage

        new_cov = CoverageResult(
            id=str(uuid.uuid4()),
            project_id=project_id,
            test_result_id=test_result_id,
            instruction_coverage=cov.instruction_coverage,
            branch_coverage=cov.branch_coverage,
            line_coverage=cov.line_coverage,
            method_coverage=cov.method_coverage,
            class_coverage=cov.class_coverage,
        )
        db.add(new_cov)
        db.commit()
        db.refresh(new_cov)
        return new_cov

    @classmethod
    def get_latest_coverage(
        cls,
        db: Session,
        project_id: str,
        user_id: str,
    ) -> Optional[CoverageResult]:
        """Fetch the most recently recorded coverage result for a project."""
        ProjectService.get_project_or_raise(db, project_id, user_id)
        return (
            db.query(CoverageResult)
            .filter(CoverageResult.project_id == project_id)
            .order_by(CoverageResult.created_at.desc())
            .first()
        )

    @classmethod
    def get_coverage_by_id(
        cls,
        db: Session,
        project_id: str,
        coverage_id: str,
        user_id: str,
    ) -> CoverageResult:
        """Fetch a specific coverage result by ID."""
        ProjectService.get_project_or_raise(db, project_id, user_id)
        cov = db.query(CoverageResult).filter(
            CoverageResult.id == coverage_id,
            CoverageResult.project_id == project_id,
        ).first()
        if not cov:
            raise ValueError(f"Coverage result {coverage_id} not found in project {project_id}")
        return cov

    @classmethod
    def list_test_results(
        cls,
        db: Session,
        project_id: str,
        user_id: str,
    ) -> List[TestResult]:
        """List all test execution results for a project."""
        ProjectService.get_project_or_raise(db, project_id, user_id)
        return (
            db.query(TestResult)
            .filter(TestResult.project_id == project_id)
            .order_by(TestResult.created_at.desc())
            .all()
        )

    @classmethod
    def get_test_result(
        cls,
        db: Session,
        project_id: str,
        result_id: str,
        user_id: str,
    ) -> TestResult:
        """Fetch a single test execution result."""
        ProjectService.get_project_or_raise(db, project_id, user_id)
        res = db.query(TestResult).filter(
            TestResult.id == result_id,
            TestResult.project_id == project_id,
        ).first()
        if not res:
            raise ValueError(f"Test result {result_id} not found in project {project_id}")
        return res
