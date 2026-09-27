"""
Refinement Service.

Coordinates:
- Gathering source, AST analysis, previous execution, and JaCoCo coverage feedback.
- Prompting OpenRouter / GPT-4o for targeted JUnit 5 test refinement.
- Java syntax and structure validation.
- Saving every refinement iteration separately in PostgreSQL (test_refinements).
- Re-executing Maven compilation, JUnit 5, and JaCoCo coverage measurement.
- Stopping condition evaluation (no infinite loops, max 1–5 iterations).
- AI usage tracking in ai_usage.
"""
from __future__ import annotations

import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.config import get_settings
from app.engines.maven_runner import execute_test_pipeline, maven_available, java_available
from app.models.ai_usage import AIUsage
from app.models.coverage_result import CoverageResult
from app.models.project import Project
from app.models.source_analysis import SourceAnalysis
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_refinement import TestRefinement
from app.models.test_result import TestResult
from app.services.ai import get_provider
from app.services.ai.base import AIProviderError
from app.services.ai.openrouter import OpenRouterProvider
from app.services.feedback_service import FeedbackService
from app.services.project_service import ProjectService
from app.services.source_analysis_service import SourceAnalysisService

settings = get_settings()

SYSTEM_PROMPT = """You are an expert Java unit testing engineer specializing in improving automatically generated JUnit 5 tests.

Your task is to refine the existing test suite using actual compilation, execution and coverage feedback.

Rules:
- Return only valid Java test source code.
- Use JUnit 5.
- Do not modify production code.
- Do not invent methods.
- Do not invent constructors.
- Do not remove working tests unnecessarily.
- Preserve useful existing tests.
- Fix compilation errors.
- Fix failing tests.
- Add tests for uncovered behavior.
- Improve branch coverage where possible.
- Add boundary cases.
- Add exception cases where appropriate.
- Keep tests deterministic.
- Avoid unnecessary mocking.
- Do not use JUnit 4.
- Do not create tests that depend on external services.
- Do not add unrelated functionality.
Output:
Only the complete improved JUnit test source."""


class RefinementService:

    @classmethod
    def _clean_code(cls, raw: str) -> str:
        """Strip markdown fences (```java ... ```) and balance truncated braces."""
        from app.utils.validators import sanitize_test_code
        return sanitize_test_code(raw)

    @classmethod
    def _validate_java_code(cls, code: str) -> Tuple[bool, str]:
        """Validate that the returned string is valid Java test code."""
        if not code or not code.strip():
            return False, "Refined code is empty"
        if not ("class " in code or "public class " in code):
            return False, "Missing Java class declaration"
        if "@Test" not in code:
            return False, "Missing @Test annotation"
        if "org.junit.jupiter" not in code and "org.junit" not in code:
            return False, "Missing JUnit imports"
        # Balanced braces check
        open_b = code.count("{")
        close_b = code.count("}")
        if open_b != close_b:
            return False, f"Unbalanced braces in test code (open: {open_b}, close: {close_b})"
        return True, "Valid"

    @classmethod
    def _log_ai_usage(
        cls,
        db: Session,
        project_id: str,
        user_id: str,
        provider: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: int,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        """Record OpenRouter token usage and latency in PostgreSQL ai_usage."""
        try:
            usage = AIUsage(
                id=str(uuid.uuid4()),
                project_id=project_id,
                user_id=user_id,
                provider=provider,
                model=model,
                operation="refine",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                latency_ms=latency_ms,
                status=status,
                error_message=error_message,
            )
            db.add(usage)
            db.commit()
        except Exception as e:
            db.rollback()

    @classmethod
    def _check_project_access(cls, db: Session, project_id: str, user_id: str) -> Project:
        """Verify project exists and user owns it. Raises PermissionError on mismatch."""
        proj = db.query(Project).filter(Project.id == project_id).first()
        if not proj:
            raise ValueError(f"Project {project_id} not found")
        if proj.user_id != user_id:
            raise PermissionError("Access denied to this project")
        return proj

    @classmethod
    def refine_single_step(
        cls,
        db: Session,
        project_id: str,
        user_id: str,
        generation_id: str,
        provider_name: str = "openrouter",
        model: Optional[str] = None,
        ai_provider_override: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Perform a single refinement iteration:
        1. Retrieve generation, source, and previous test & coverage metrics.
        2. Build structured feedback.
        3. Prompt OpenRouter (or mock).
        4. Validate returned Java.
        5. Persist TestRefinement in PostgreSQL.
        6. Re-execute Maven + JUnit 5 + JaCoCo pipeline.
        7. Record updated execution & coverage on TestRefinement.
        8. Return structured before/after comparison.
        """
        cls._check_project_access(db, project_id, user_id)

        # ── 1. Retrieve Generation ─────────────────────────────────────────────
        gen = db.query(TestGeneration).filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not gen:
            raise ValueError(f"Generation {generation_id} not found in project {project_id}")

        # ── 2. Retrieve Source Code & Analysis ─────────────────────────────────
        source = None
        if gen.source_file_id:
            source = db.query(SourceFile).filter(
                SourceFile.id == gen.source_file_id,
                SourceFile.project_id == project_id,
            ).first()
        source_code = source.source_code if source else ""

        # Retrieve AST analysis if present
        source_analysis_data = None
        if gen.source_file_id:
            analysis_rec = db.query(SourceAnalysis).filter(
                SourceAnalysis.source_file_id == gen.source_file_id
            ).first()
            if analysis_rec and analysis_rec.analysis_json:
                source_analysis_data = analysis_rec.analysis_json

        # ── 3. Determine Current Test Code & Prior Iterations ──────────────────
        prior_refinements: List[TestRefinement] = (
            db.query(TestRefinement)
            .filter(
                TestRefinement.project_id == project_id,
                TestRefinement.generation_id == generation_id,
            )
            .order_by(TestRefinement.iteration.asc())
            .all()
        )

        current_iteration = len(prior_refinements) + 1
        current_test_code = (
            prior_refinements[-1].refined_test_code
            if prior_refinements and prior_refinements[-1].refined_test_code
            else gen.test_code
        )

        # ── 4. Retrieve or Measure Initial Baseline Metrics ("Before") ─────────
        latest_test_result: Optional[TestResult] = (
            db.query(TestResult)
            .filter(
                TestResult.project_id == project_id,
                TestResult.generation_id == generation_id,
            )
            .order_by(TestResult.created_at.desc())
            .first()
        )

        # If baseline has not been measured yet, execute once to have real baseline metrics
        if not latest_test_result and maven_available() and java_available():
            baseline_exec = execute_test_pipeline(
                source_code=source_code,
                test_code=current_test_code,
                with_jacoco=True,
            )
            baseline_cov = baseline_exec.coverage
            tr_id = str(uuid.uuid4())
            latest_test_result = TestResult(
                id=tr_id,
                generation_id=gen.id,
                project_id=project_id,
                status=baseline_exec.status,
                compilation_success=baseline_exec.compile_success,
                execution_success=baseline_exec.execution_success,
                tests_total=baseline_exec.total_tests,
                tests_passed=baseline_exec.passed_tests,
                tests_failed=baseline_exec.failed_tests,
                tests_skipped=baseline_exec.skipped_tests,
                tests_errored=baseline_exec.error_count,
                error_count=baseline_exec.error_count,
                execution_time_ms=baseline_exec.execution_time_ms,
                stdout=baseline_exec.stdout,
                stderr=baseline_exec.stderr,
                error_message=baseline_exec.message,
                line_coverage=baseline_cov.line_coverage if baseline_cov and baseline_cov.status == "measured" else None,
                branch_coverage=baseline_cov.branch_coverage if baseline_cov and baseline_cov.status == "measured" else None,
                instruction_coverage=baseline_cov.instruction_coverage if baseline_cov and baseline_cov.status == "measured" else None,
                method_coverage=baseline_cov.method_coverage if baseline_cov and baseline_cov.status == "measured" else None,
                class_coverage=baseline_cov.class_coverage if baseline_cov and baseline_cov.status == "measured" else None,
            )
            db.add(latest_test_result)
            if baseline_cov and baseline_cov.status == "measured":
                db.add(
                    CoverageResult(
                        id=str(uuid.uuid4()),
                        project_id=project_id,
                        test_result_id=tr_id,
                        instruction_coverage=baseline_cov.instruction_coverage,
                        branch_coverage=baseline_cov.branch_coverage,
                        line_coverage=baseline_cov.line_coverage,
                        method_coverage=baseline_cov.method_coverage,
                        class_coverage=baseline_cov.class_coverage,
                    )
                )
            db.commit()

        # Build "before" metrics
        before_metrics = {
            "line_coverage": latest_test_result.line_coverage if latest_test_result else None,
            "branch_coverage": latest_test_result.branch_coverage if latest_test_result else None,
            "passed_tests": latest_test_result.tests_passed if latest_test_result else 0,
            "failed_tests": latest_test_result.tests_failed if latest_test_result else 0,
        }

        # ── 5. Build Structured Feedback ──────────────────────────────────────
        failures_list = []
        if latest_test_result and latest_test_result.tests_failed > 0:
            failures_list.append({
                "message": latest_test_result.error_message or "One or more tests failed during JUnit execution",
                "stderr": latest_test_result.stderr[-500:] if latest_test_result.stderr else None,
            })

        feedback = FeedbackService.build_feedback(
            source_code=source_code,
            current_test_code=current_test_code,
            source_analysis=source_analysis_data,
            compile_success=latest_test_result.compilation_success if latest_test_result else True,
            compile_errors=latest_test_result.stderr if (latest_test_result and not latest_test_result.compilation_success) else None,
            total_tests=latest_test_result.tests_total if latest_test_result else None,
            passed_tests=latest_test_result.tests_passed if latest_test_result else None,
            failed_tests=latest_test_result.tests_failed if latest_test_result else None,
            skipped_tests=latest_test_result.tests_skipped if latest_test_result else None,
            failures=failures_list,
            line_coverage=latest_test_result.line_coverage if latest_test_result else None,
            branch_coverage=latest_test_result.branch_coverage if latest_test_result else None,
            instruction_coverage=latest_test_result.instruction_coverage if latest_test_result else None,
            method_coverage=latest_test_result.method_coverage if latest_test_result else None,
            class_coverage=latest_test_result.class_coverage if latest_test_result else None,
            previous_refinements=[
                {
                    "iteration": r.iteration,
                    "line_coverage": r.line_coverage,
                    "status": r.status,
                }
                for r in prior_refinements
            ],
        )

        user_prompt = FeedbackService.format_user_prompt(
            source_code=source_code,
            current_test_code=current_test_code,
            feedback=feedback,
            source_analysis=source_analysis_data,
        )

        # ── 6. Call AI Provider (OpenRouter / Gemini / AgentRouter) ─────────────
        effective_provider = provider_name or "openrouter"
        if effective_provider == "agentrouter":
            effective_model = model or settings.AGENTROUTER_MODEL
        elif effective_provider == "gemini":
            effective_model = model or settings.GEMINI_MODEL
        else:
            effective_model = model or settings.OPENROUTER_MODEL

        refinement_id = str(uuid.uuid4())
        refined_code = ""
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        latency_ms = 0
        refine_status = "completed"
        error_msg = None

        def _execute_coroutine(fn, *a, **kw):
            import asyncio
            import concurrent.futures

            async def _run():
                return await fn(*a, **kw)

            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop is not None and loop.is_running():
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    return pool.submit(asyncio.run, _run()).result()
            else:
                return asyncio.run(_run())

        start_time = time.monotonic()
        try:
            if ai_provider_override:
                # Synchronous or async override used in unit tests
                import asyncio
                if asyncio.iscoroutinefunction(ai_provider_override.generate):
                    ai_resp = _execute_coroutine(
                        ai_provider_override.generate,
                        SYSTEM_PROMPT,
                        user_prompt,
                        effective_model,
                    )
                else:
                    ai_resp = ai_provider_override.generate(SYSTEM_PROMPT, user_prompt, effective_model)
            else:
                provider = get_provider(effective_provider)
                ai_resp = _execute_coroutine(
                    provider.generate,
                    SYSTEM_PROMPT,
                    user_prompt,
                    effective_model,
                    0.2,
                    4096,
                )

            latency_ms = ai_resp.latency_ms or int((time.monotonic() - start_time) * 1000)
            prompt_tokens = ai_resp.prompt_tokens
            completion_tokens = ai_resp.completion_tokens
            total_tokens = ai_resp.total_tokens
            refined_code = cls._clean_code(ai_resp.content)

            # Validate Java syntax
            valid, reason = cls._validate_java_code(refined_code)
            if not valid:
                refine_status = "invalid_output"
                error_msg = f"Model output failed validation: {reason}"

            cls._log_ai_usage(
                db=db,
                project_id=project_id,
                user_id=user_id,
                provider=effective_provider,
                model=effective_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
                status="success" if valid else "error",
                error_message=error_msg,
            )

        except Exception as e:
            latency_ms = int((time.monotonic() - start_time) * 1000)
            refine_status = "failed"
            error_msg = f"AI refinement request failed: {str(e)}"
            cls._log_ai_usage(
                db=db,
                project_id=project_id,
                user_id=user_id,
                provider=effective_provider,
                model=effective_model,
                prompt_tokens=0,
                completion_tokens=0,
                latency_ms=latency_ms,
                status="error",
                error_message=error_msg,
            )

        # ── 7. Re-execute Maven + JUnit 5 + JaCoCo on Refined Code ─────────────
        compile_status = None
        exec_status = None
        after_line = None
        after_branch = None
        after_instruction = None
        after_method = None
        after_class = None
        passed_tests = 0
        failed_tests = 0
        new_test_result_id = None
        after_mutation = None
        killed_mut = 0
        survived_mut = 0

        if refine_status == "completed" and maven_available() and java_available():
            exec_res = execute_test_pipeline(
                source_code=source_code,
                test_code=refined_code,
                with_jacoco=True,
            )
            compile_status = "success" if exec_res.compile_success else "failed"
            exec_status = exec_res.status
            passed_tests = exec_res.passed_tests
            failed_tests = exec_res.failed_tests

            new_test_result_id = str(uuid.uuid4())
            cov = exec_res.coverage
            if cov and cov.status == "measured":
                after_line = cov.line_coverage
                after_branch = cov.branch_coverage
                after_instruction = cov.instruction_coverage
                after_method = cov.method_coverage
            if exec_res.compile_success and exec_res.execution_success:
                try:
                    from app.engines.pit_runner import run_mutation_testing
                    pit_res = run_mutation_testing(source_code, refined_code)
                    if pit_res.status == "completed" and pit_res.mutation_score is not None:
                        after_mutation = pit_res.mutation_score
                        killed_mut = pit_res.killed_mutations
                        survived_mut = pit_res.survived_mutations
                except Exception as e:
                    print(f"[RefinementService] PIT execution failed: {e}")

            tr_record = TestResult(
                id=new_test_result_id,
                generation_id=gen.id,
                project_id=project_id,
                status=exec_res.status,
                compilation_success=exec_res.compile_success,
                execution_success=exec_res.execution_success,
                tests_total=exec_res.total_tests,
                tests_passed=exec_res.passed_tests,
                tests_failed=exec_res.failed_tests,
                tests_skipped=exec_res.skipped_tests,
                tests_errored=exec_res.error_count,
                error_count=exec_res.error_count,
                execution_time_ms=exec_res.execution_time_ms,
                stdout=exec_res.stdout,
                stderr=exec_res.stderr,
                error_message=exec_res.message,
                line_coverage=after_line,
                branch_coverage=after_branch,
                instruction_coverage=after_instruction,
                method_coverage=after_method,
                class_coverage=after_class,
                mutation_score=after_mutation,
                killed_mutations=killed_mut,
                survived_mutations=survived_mut,
            )
            db.add(tr_record)

            if cov and cov.status == "measured":
                db.add(
                    CoverageResult(
                        id=str(uuid.uuid4()),
                        project_id=project_id,
                        test_result_id=new_test_result_id,
                        instruction_coverage=after_instruction,
                        branch_coverage=after_branch,
                        line_coverage=after_line,
                        method_coverage=after_method,
                        class_coverage=after_class,
                    )
                )

        # ── 8. Persist TestRefinement Record in PostgreSQL ─────────────────────
        refinement_record = TestRefinement(
            id=refinement_id,
            project_id=project_id,
            generation_id=generation_id,
            parent_result_id=new_test_result_id or (latest_test_result.id if latest_test_result else None),
            provider=effective_provider,
            model=effective_model,
            iteration=current_iteration,
            input_test_code=current_test_code,
            refined_test_code=refined_code or None,
            compilation_status=compile_status,
            execution_status=exec_status,
            line_coverage=after_line,
            branch_coverage=after_branch,
            instruction_coverage=after_instruction,
            mutation_score=after_mutation,
            feedback_json=feedback,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            status=refine_status,
            error_message=error_msg,
        )
        db.add(refinement_record)
        db.commit()

        # Build "after" metrics
        after_metrics = {
            "line_coverage": after_line,
            "branch_coverage": after_branch,
            "mutation_score": after_mutation,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
        }

        return {
            "refinement_id": refinement_id,
            "generation_id": generation_id,
            "iteration": current_iteration,
            "provider": effective_provider,
            "model": effective_model,
            "status": refine_status,
            "test_code": refined_code or current_test_code,
            "before": before_metrics,
            "after": after_metrics,
            "error_message": error_msg,
        }

    @classmethod
    def run_refinement_loop(
        cls,
        db: Session,
        project_id: str,
        user_id: str,
        generation_id: str,
        max_iterations: int = 3,
        provider_name: str = "openrouter",
        model: Optional[str] = None,
        ai_provider_override: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Execute automated iterative refinement up to max_iterations (1 to 5).
        Stopping conditions:
        1. max_iterations reached.
        2. Compilation remains unsuccessful or invalid.
        3. All tests pass and 100% line & branch coverage achieved.
        4. No improvement detected over consecutive iterations.
        """
        if max_iterations < 1 or max_iterations > 5:
            raise ValueError("max_iterations must be between 1 and 5")

        cls._check_project_access(db, project_id, user_id)

        iterations_completed: List[Dict[str, Any]] = []
        final_status = "completed"

        for step in range(max_iterations):
            step_res = cls.refine_single_step(
                db=db,
                project_id=project_id,
                user_id=user_id,
                generation_id=generation_id,
                provider_name=provider_name,
                model=model,
                ai_provider_override=ai_provider_override,
            )
            iterations_completed.append(step_res)

            # Stopping condition checks
            if step_res["status"] in ("failed", "invalid_output"):
                final_status = step_res["status"]
                break

            after = step_res.get("after", {})
            line_cov = after.get("line_coverage")
            branch_cov = after.get("branch_coverage")
            failed_count = after.get("failed_tests", 0)

            # Condition: Perfect 100% line & branch coverage with 0 failures
            if failed_count == 0 and line_cov == 100.0 and (branch_cov is None or branch_cov == 100.0):
                final_status = "target_coverage_reached"
                break

        latest_iter = iterations_completed[-1] if iterations_completed else {}
        return {
            "generation_id": generation_id,
            "project_id": project_id,
            "iterations_count": len(iterations_completed),
            "final_status": final_status,
            "final_test_code": latest_iter.get("test_code"),
            "iterations": iterations_completed,
        }

    @classmethod
    def list_refinements(
        cls,
        db: Session,
        project_id: str,
        user_id: str,
    ) -> List[TestRefinement]:
        """List all test refinements for a project."""
        cls._check_project_access(db, project_id, user_id)
        return (
            db.query(TestRefinement)
            .filter(TestRefinement.project_id == project_id)
            .order_by(TestRefinement.created_at.desc())
            .all()
        )

    @classmethod
    def get_refinement(
        cls,
        db: Session,
        project_id: str,
        refinement_id: str,
        user_id: str,
    ) -> TestRefinement:
        """Get a specific test refinement by ID."""
        cls._check_project_access(db, project_id, user_id)
        refinement = (
            db.query(TestRefinement)
            .filter(
                TestRefinement.id == refinement_id,
                TestRefinement.project_id == project_id,
            )
            .first()
        )
        if not refinement:
            raise ValueError(f"Refinement {refinement_id} not found in project {project_id}")
        return refinement

    @classmethod
    def get_generation_refinements(
        cls,
        db: Session,
        project_id: str,
        generation_id: str,
        user_id: str,
    ) -> List[TestRefinement]:
        """Get all refinements for a specific generation ordered by iteration ASC."""
        cls._check_project_access(db, project_id, user_id)
        return (
            db.query(TestRefinement)
            .filter(
                TestRefinement.project_id == project_id,
                TestRefinement.generation_id == generation_id,
            )
            .order_by(TestRefinement.iteration.asc())
            .all()
        )
