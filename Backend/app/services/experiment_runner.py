"""
Experiment Runner Engine.

Executes reproducible Multi-LLM test experiments adhering to Phase 6:
- Configuration A: Gemini only
- Configuration B: OpenRouter / GPT-4o only
- Configuration C: Gemini -> OpenRouter / GPT-4o refinement chaining

Ensures sequential execution safety, prompt versioning, detailed run/metric tracking,
and zero fabricated data.
"""
from __future__ import annotations

import asyncio
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import get_settings
from app.engines.maven_runner import execute_test_pipeline, maven_available, java_available
from app.models.ai_usage import AIUsage
from app.models.coverage_result import CoverageResult
from app.models.experiment import Experiment
from app.models.experiment_metric import ExperimentMetric
from app.models.experiment_run import ExperimentRun
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_refinement import TestRefinement
from app.models.test_result import TestResult
from app.services.ai import get_provider
from app.services.ai.base import AIProviderError, AIResponse
from app.services.ai.gemini import GeminiProvider
from app.services.ai.openrouter import OpenRouterProvider
from app.services.feedback_service import FeedbackService
from app.services.prompt_template_service import PromptTemplateService
from app.services.refinement_service import RefinementService
from app.utils.validators import sanitize_test_code, validate_test_output

settings = get_settings()

# Execution lock ensuring sequential Maven builds per project
_PROJECT_LOCKS: Dict[str, threading.Lock] = {}
_GLOBAL_LOCK = threading.Lock()


def _get_project_lock(project_id: str) -> threading.Lock:
    with _GLOBAL_LOCK:
        if project_id not in _PROJECT_LOCKS:
            _PROJECT_LOCKS[project_id] = threading.Lock()
        return _PROJECT_LOCKS[project_id]


def _sync_run_coroutine(coro):
    import concurrent.futures
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


class ExperimentRunner:

    @classmethod
    def execute_experiment(
        cls,
        db: Session,
        experiment_id: str,
        user_id: str,
        source_id: Optional[str] = None,
        ai_provider_override: Optional[Any] = None,
    ) -> Experiment:
        """
        Main execution workflow for an experiment.
        Acquires project lock and processes the requested configuration sequentially.
        """
        exp = (
            db.query(Experiment)
            .filter(Experiment.id == experiment_id, Experiment.user_id == user_id)
            .first()
        )
        if not exp:
            raise ValueError(f"Experiment {experiment_id} not found")

        project = db.query(Project).filter(Project.id == exp.project_id).first()
        if not project:
            exp.status = "failed"
            exp.error_message = "Associated project not found"
            db.commit()
            return exp

        # Determine target source file
        if source_id:
            src = db.query(SourceFile).filter(SourceFile.id == source_id, SourceFile.project_id == project.id).first()
        else:
            src = db.query(SourceFile).filter(SourceFile.project_id == project.id).first()

        if not src:
            exp.status = "failed"
            exp.error_message = "No Java source file available in this project"
            db.commit()
            return exp

        # Acquire sequential lock for the project
        lock = _get_project_lock(project.id)
        if not lock.acquire(blocking=True, timeout=180):
            exp.status = "failed"
            exp.error_message = "Project build lock timeout: another execution is in progress."
            db.commit()
            return exp

        total_start = time.monotonic()
        exp.status = "running"
        exp.started_at = datetime.now(timezone.utc)
        db.commit()

        try:
            config = exp.configuration.lower().strip()
            if config in ("gemini_only", "gemini"):
                cls._run_gemini_only(db, exp, project, src, ai_provider_override)
            elif config in ("openrouter_only", "openrouter"):
                cls._run_openrouter_only(db, exp, project, src, ai_provider_override)
            elif config in ("agentrouter_only", "agentrouter"):
                cls._run_agentrouter_only(db, exp, project, src, ai_provider_override)
            elif config in (
                "gemini_to_openrouter",
                "gemini_to_gpt4o",
                "gemini_to_agentrouter",
                "gemini_agentrouter",
                "openrouter_to_agentrouter",
                "openrouter_agentrouter",
            ):
                cls._run_gemini_to_openrouter(db, exp, project, src, ai_provider_override)
            else:
                exp.status = "failed"
                exp.error_message = f"Unsupported configuration: {exp.configuration}"

        except Exception as e:
            exp.status = "failed"
            exp.error_message = f"Experiment execution failed: {str(e)}"
        finally:
            lock.release()
            total_elapsed_ms = int((time.monotonic() - total_start) * 1000)
            exp.execution_time_ms = total_elapsed_ms
            exp.completed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(exp)

        return exp

    @classmethod
    def _run_initial_generation(
        cls,
        db: Session,
        exp: Experiment,
        project: Project,
        src: SourceFile,
        provider_name: str,
        model_name: str,
        ai_provider_override: Optional[Any] = None,
    ) -> TestGeneration:
        """Generate initial JUnit 5 tests via specified provider using versioned prompt template."""
        gen_template = PromptTemplateService.get_generation_template(db)
        system_prompt = gen_template.template
        user_prompt = f"### Java Source Code:\n```java\n{src.source_code}\n```\n\nGenerate JUnit 5 unit tests for the above class."

        start_t = time.monotonic()
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        latency_ms = 0
        raw_code = ""

        if ai_provider_override:
            if asyncio.iscoroutinefunction(ai_provider_override.generate):
                ai_resp = _sync_run_coroutine(ai_provider_override.generate(system_prompt, user_prompt, model_name))
            else:
                ai_resp = ai_provider_override.generate(system_prompt, user_prompt, model_name)
            raw_code = ai_resp.content
            prompt_tokens = ai_resp.prompt_tokens or 0
            completion_tokens = ai_resp.completion_tokens or 0
            total_tokens = ai_resp.total_tokens or 0
            latency_ms = ai_resp.latency_ms or int((time.monotonic() - start_t) * 1000)
        else:
            provider = get_provider(provider_name)
            ai_resp = _sync_run_coroutine(provider.generate(system_prompt, user_prompt, model=model_name))
            raw_code = ai_resp.content
            prompt_tokens = ai_resp.prompt_tokens or 0
            completion_tokens = ai_resp.completion_tokens or 0
            total_tokens = ai_resp.total_tokens or 0
            latency_ms = ai_resp.latency_ms or int((time.monotonic() - start_t) * 1000)

        # Record AI Usage
        usage = AIUsage(
            id=str(uuid.uuid4()),
            user_id=exp.user_id,
            project_id=project.id,
            provider=provider_name,
            model=model_name,
            operation="generation",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            status="success",
        )
        db.add(usage)

        clean_code = sanitize_test_code(raw_code)
        gen = TestGeneration(
            id=str(uuid.uuid4()),
            project_id=project.id,
            source_file_id=src.id,
            user_id=exp.user_id,
            provider=provider_name,
            model=model_name,
            framework="junit5",
            test_code=clean_code,
            raw_response=raw_code,
            status="generated",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            iteration=0,
        )
        db.add(gen)
        db.commit()
        db.refresh(gen)
        return gen

    @classmethod
    def _execute_and_record_run(
        cls,
        db: Session,
        exp: Experiment,
        iteration: int,
        provider: str,
        model: str,
        test_code: str,
        source_code: str,
        generation_id: Optional[str] = None,
        refinement_id: Optional[str] = None,
    ) -> tuple[ExperimentRun, ExperimentMetric, PipelineExecutionResult]:
        """Compile and execute tests using Maven, JUnit 5, and JaCoCo, persisting run & metric."""
        exec_start = time.monotonic()
        pipeline_res = execute_test_pipeline(
            source_code=source_code,
            test_code=test_code,
            with_jacoco=True,
        )
        exec_time_ms = int((time.monotonic() - exec_start) * 1000)

        # Execute PIT mutation testing if compilation and test execution succeeded
        mutation_score = None
        killed_mut = 0
        survived_mut = 0
        if pipeline_res.compile_success:
            try:
                from app.engines.pit_runner import run_mutation_testing
                pit_res = run_mutation_testing(source_code=source_code, test_code=test_code)
                if pit_res.status == "completed" and pit_res.mutation_score is not None:
                    mutation_score = pit_res.mutation_score
                    killed_mut = pit_res.killed_mutations
                    survived_mut = pit_res.survived_mutations
            except Exception as e:
                print(f"[ExperimentRunner] PIT execution failed: {e}")

        # Create TestResult
        test_result_id = str(uuid.uuid4())
        cov = pipeline_res.coverage

        tr = TestResult(
            id=test_result_id,
            generation_id=generation_id,
            project_id=exp.project_id,
            status=pipeline_res.status,
            compilation_success=pipeline_res.compile_success,
            execution_success=pipeline_res.execution_success,
            tests_total=pipeline_res.total_tests,
            tests_passed=pipeline_res.passed_tests,
            tests_failed=pipeline_res.failed_tests,
            tests_skipped=pipeline_res.skipped_tests,
            error_count=pipeline_res.error_count,
            execution_time_ms=pipeline_res.execution_time_ms,
            line_coverage=cov.line_coverage if cov else None,
            branch_coverage=cov.branch_coverage if cov else None,
            instruction_coverage=cov.instruction_coverage if cov else None,
            method_coverage=cov.method_coverage if cov else None,
            class_coverage=cov.class_coverage if cov else None,
            mutation_score=mutation_score,
            killed_mutations=killed_mut,
            survived_mutations=survived_mut,
            stdout=pipeline_res.stdout[-30000:] if pipeline_res.stdout else None,
            stderr=pipeline_res.stderr[-5000:] if pipeline_res.stderr else None,
            error_message=pipeline_res.message,
        )
        db.add(tr)

        cov_id = None
        if cov and cov.status == "measured":
            cov_id = str(uuid.uuid4())
            cr = CoverageResult(
                id=cov_id,
                project_id=exp.project_id,
                test_result_id=test_result_id,
                instruction_coverage=cov.instruction_coverage,
                branch_coverage=cov.branch_coverage,
                line_coverage=cov.line_coverage,
                method_coverage=cov.method_coverage,
                class_coverage=cov.class_coverage,
            )
            db.add(cr)

        # Create ExperimentRun
        run_id = str(uuid.uuid4())
        exp_run = ExperimentRun(
            id=run_id,
            experiment_id=exp.id,
            iteration=iteration,
            provider=provider,
            model=model,
            generation_id=generation_id,
            test_result_id=test_result_id,
            coverage_result_id=cov_id,
            refinement_id=refinement_id,
            status=pipeline_res.status,
            execution_time_ms=exec_time_ms,
        )
        db.add(exp_run)

        # Count @Test occurrences in test_code
        generated_count = test_code.count("@Test")

        # Create ExperimentMetric with factual mutation score
        metric = ExperimentMetric(
            id=str(uuid.uuid4()),
            experiment_id=exp.id,
            experiment_run_id=run_id,
            generated_test_count=generated_count,
            total_tests=pipeline_res.total_tests,
            passed_tests=pipeline_res.passed_tests,
            failed_tests=pipeline_res.failed_tests,
            skipped_tests=pipeline_res.skipped_tests,
            compilation_success=pipeline_res.compile_success,
            execution_success=pipeline_res.execution_success,
            line_coverage=cov.line_coverage if cov else None,
            branch_coverage=cov.branch_coverage if cov else None,
            instruction_coverage=cov.instruction_coverage if cov else None,
            method_coverage=cov.method_coverage if cov else None,
            class_coverage=cov.class_coverage if cov else None,
            mutation_score=mutation_score,
            total_execution_time_ms=exec_time_ms,
            refinement_iterations=iteration,
        )
        db.add(metric)
        db.commit()

        return exp_run, metric, pipeline_res

    @classmethod
    def _run_gemini_only(
        cls,
        db: Session,
        exp: Experiment,
        project: Project,
        src: SourceFile,
        ai_provider_override: Optional[Any] = None,
    ) -> None:
        """Configuration A: Gemini single-model test generation and measurement."""
        provider = exp.initial_provider or "gemini"
        model = exp.initial_model or "gemini-2.5-flash-lite"

        gen = cls._run_initial_generation(
            db, exp, project, src, provider, model, ai_provider_override
        )
        exp.generation_id = gen.id

        run, metric, res = cls._execute_and_record_run(
            db=db,
            exp=exp,
            iteration=0,
            provider=provider,
            model=model,
            test_code=gen.test_code,
            source_code=src.source_code,
            generation_id=gen.id,
        )

        exp.test_result_id = run.test_result_id
        exp.line_coverage = metric.line_coverage
        exp.branch_coverage = metric.branch_coverage
        exp.mutation_score = metric.mutation_score
        exp.status = "completed" if res.compile_success else "failed"
        db.commit()

    @classmethod
    def _run_openrouter_only(
        cls,
        db: Session,
        exp: Experiment,
        project: Project,
        src: SourceFile,
        ai_provider_override: Optional[Any] = None,
    ) -> None:
        """Configuration B: OpenRouter / GPT-4o single-model test generation and measurement."""
        provider = exp.initial_provider or "openrouter"
        model = exp.initial_model or "openai/gpt-4o"

        gen = cls._run_initial_generation(
            db, exp, project, src, provider, model, ai_provider_override
        )
        exp.generation_id = gen.id

        run, metric, res = cls._execute_and_record_run(
            db=db,
            exp=exp,
            iteration=0,
            provider=provider,
            model=model,
            test_code=gen.test_code,
            source_code=src.source_code,
            generation_id=gen.id,
        )

        exp.test_result_id = run.test_result_id
        exp.line_coverage = metric.line_coverage
        exp.branch_coverage = metric.branch_coverage
        exp.mutation_score = metric.mutation_score
        exp.status = "completed" if res.compile_success else "failed"
        db.commit()

    @classmethod
    def _run_agentrouter_only(
        cls,
        db: Session,
        exp: Experiment,
        project: Project,
        src: SourceFile,
        ai_provider_override: Optional[Any] = None,
    ) -> None:
        """Configuration: AgentRouter single-model test generation and measurement."""
        provider = exp.initial_provider or "agentrouter"
        model = exp.initial_model or (settings.AGENTROUTER_MODEL or "gpt-4o")

        gen = cls._run_initial_generation(
            db, exp, project, src, provider, model, ai_provider_override
        )
        exp.generation_id = gen.id

        run, metric, res = cls._execute_and_record_run(
            db=db,
            exp=exp,
            iteration=0,
            provider=provider,
            model=model,
            test_code=gen.test_code,
            source_code=src.source_code,
            generation_id=gen.id,
        )

        exp.test_result_id = run.test_result_id
        exp.line_coverage = metric.line_coverage
        exp.branch_coverage = metric.branch_coverage
        exp.mutation_score = metric.mutation_score
        exp.status = "completed" if res.compile_success else "failed"
        db.commit()

    @classmethod
    def _run_gemini_to_openrouter(
        cls,
        db: Session,
        exp: Experiment,
        project: Project,
        src: SourceFile,
        ai_provider_override: Optional[Any] = None,
    ) -> None:
        """Configuration C: Gemini initial generation -> OpenRouter GPT-4o iterative refinement."""
        init_provider = exp.initial_provider or "gemini"
        init_model = exp.initial_model or "gemini-2.5-flash-lite"
        ref_provider = exp.refinement_provider or "openrouter"
        ref_model = exp.refinement_model or "openai/gpt-4o"
        max_iters = min(max(1, exp.max_iterations), 5)

        # Step 0: Initial Generation (Gemini) — Single-LLM Baseline
        gen = cls._run_initial_generation(
            db, exp, project, src, init_provider, init_model, ai_provider_override
        )
        exp.generation_id = gen.id

        run0, metric0, res0 = cls._execute_and_record_run(
            db=db,
            exp=exp,
            iteration=0,
            provider=init_provider,
            model=init_model,
            test_code=gen.test_code,
            source_code=src.source_code,
            generation_id=gen.id,
        )

        latest_test_result_id = run0.test_result_id
        latest_line_cov = metric0.line_coverage
        latest_branch_cov = metric0.branch_coverage
        latest_mutation_score = metric0.mutation_score

        # Step 1..N: Refinement Iterations — Multi-LLM Refinement
        for iter_num in range(1, max_iters + 1):
            ref_res = RefinementService.refine_single_step(
                db=db,
                project_id=project.id,
                user_id=exp.user_id,
                generation_id=gen.id,
                provider_name=ref_provider,
                model=ref_model,
                ai_provider_override=ai_provider_override,
            )

            # Link to Refinement record
            ref_record = db.query(TestRefinement).filter(TestRefinement.id == ref_res["refinement_id"]).first()

            # Record run & metric for this refinement iteration
            after = ref_res.get("after", {})
            iter_line_cov = after.get("line_coverage")
            iter_branch_cov = after.get("branch_coverage")
            ref_mutation_score = ref_record.mutation_score if (ref_record and ref_record.mutation_score is not None) else after.get("mutation_score")
            
            if iter_line_cov is not None:
                latest_line_cov = iter_line_cov
            if iter_branch_cov is not None:
                latest_branch_cov = iter_branch_cov
            if ref_mutation_score is not None:
                latest_mutation_score = ref_mutation_score

            # Query latest test result created during refinement
            latest_tr = (
                db.query(TestResult)
                .filter(TestResult.generation_id == gen.id, TestResult.project_id == project.id)
                .order_by(TestResult.created_at.desc())
                .first()
            )
            if latest_tr:
                latest_test_result_id = latest_tr.id

            run_record = ExperimentRun(
                id=str(uuid.uuid4()),
                experiment_id=exp.id,
                iteration=iter_num,
                provider=ref_provider,
                model=ref_model,
                generation_id=gen.id,
                test_result_id=latest_test_result_id,
                coverage_result_id=latest_tr.coverage_result.id if (latest_tr and latest_tr.coverage_result) else None,
                refinement_id=ref_record.id if ref_record else None,
                status=ref_res["status"],
                execution_time_ms=latest_tr.execution_time_ms if latest_tr else 0,
            )
            db.add(run_record)

            metric_record = ExperimentMetric(
                id=str(uuid.uuid4()),
                experiment_id=exp.id,
                experiment_run_id=run_record.id,
                generated_test_count=(ref_res.get("test_code") or "").count("@Test"),
                total_tests=(after.get("passed_tests", 0) + after.get("failed_tests", 0)),
                passed_tests=after.get("passed_tests", 0),
                failed_tests=after.get("failed_tests", 0),
                skipped_tests=0,
                compilation_success=(ref_record.compilation_status == "success") if ref_record else False,
                execution_success=(after.get("failed_tests", 0) == 0 and ref_record and ref_record.compilation_status == "success"),
                line_coverage=iter_line_cov,
                branch_coverage=iter_branch_cov,
                instruction_coverage=ref_record.instruction_coverage if ref_record else None,
                method_coverage=None,
                class_coverage=None,
                mutation_score=ref_mutation_score,
                total_execution_time_ms=latest_tr.execution_time_ms if latest_tr else 0,
                refinement_iterations=iter_num,
            )
            db.add(metric_record)
            db.commit()

            # Stopping conditions: failure or all mutants killed and 100% coverage
            if ref_res["status"] in ("failed", "invalid_output"):
                break
            if after.get("failed_tests", 0) == 0 and latest_line_cov == 100.0 and (latest_branch_cov is None or latest_branch_cov == 100.0) and (ref_mutation_score is not None and ref_mutation_score == 100.0):
                break

        exp.test_result_id = latest_test_result_id
        exp.line_coverage = latest_line_cov
        exp.branch_coverage = latest_branch_cov
        exp.mutation_score = latest_mutation_score
        exp.status = "completed"
        db.commit()
