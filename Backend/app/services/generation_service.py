"""
Test Generation Service.

Builds structured prompts, calls AI providers, extracts clean Java test code,
and stores results. Includes AI usage tracking.
"""
from __future__ import annotations

import json
import time
import uuid

from sqlalchemy.orm import Session

from app.models.ai_usage import AIUsage
from app.models.project import Project
from app.models.test_generation import TestGeneration
from app.services.ai import get_provider
from app.services.ai.base import AIProviderError, AINotConfiguredError
from app.services.source_analysis_service import SourceAnalysisService
from app.utils.validators import sanitize_test_code, validate_provider_name, validate_test_output

_GENERATION_SYSTEM_PROMPT = """\
You are an expert Java software testing engineer.

Your task is to generate high-quality JUnit 5 unit tests for the supplied Java source.

Requirements:
- Use JUnit 5.
- Generate compilable Java code.
- Cover normal cases.
- Cover boundary cases.
- Cover invalid inputs where applicable.
- Cover exception cases.
- Cover branches where possible.
- Use meaningful test names.
- Follow Arrange-Act-Assert structure.
- Do not modify production code.
- Do not invent methods that do not exist.
- Do not invent constructors.
- Do not use JUnit 4.
- Do not use Mockito unless mocking is actually required.
- Return only the test source code.
"""

_REFINEMENT_SYSTEM_PROMPT = """\
You are an expert Java unit testing engineer.

You are refining an existing JUnit 5 test suite based on:
1. Compilation errors (if any)
2. Test failures (if any)
3. Coverage gaps (uncovered lines and branches)

Requirements:
- Fix ALL compilation errors
- Fix ALL failing tests
- Add tests to cover uncovered lines and branches
- Keep existing passing tests
- Generate ONLY valid compilable Java code
- Do NOT include markdown fences or explanations
"""


def _build_generation_prompt(
    source_code: str,
    class_name: str,
    analysis_json: dict | str,
    java_version: str = "17",
    build_tool: str = "Maven",
    existing_tests: str = "",
) -> str:
    analysis_str = json.dumps(analysis_json, indent=2) if isinstance(analysis_json, dict) else str(analysis_json)
    return f"""Target Class: {class_name}
Java Version: {java_version}
Build Tool: {build_tool}

1. SOURCE ANALYSIS:
{analysis_str}

2. JAVA SOURCE CODE:
```java
{source_code}
```

3. EXISTING TEST INFORMATION:
{existing_tests or "No existing tests available."}

Generate the complete, robust, compilable JUnit 5 unit test class for {class_name}.
Output ONLY the raw Java code without markdown code blocks or explanations."""


def _build_refinement_prompt(
    source_code: str,
    test_code: str,
    compilation_errors: str,
    test_failures: str,
    coverage_info: str,
    iteration: int,
) -> str:
    return f"""Refine the following JUnit 5 tests. This is refinement iteration {iteration}.

ORIGINAL SOURCE CODE:
```java
{source_code}
```

CURRENT TEST CODE:
```java
{test_code}
```

COMPILATION ERRORS:
{compilation_errors or "None"}

TEST FAILURES:
{test_failures or "None"}

COVERAGE GAPS:
{coverage_info or "No coverage data available"}

Fix all errors, improve test coverage, and return the complete improved JUnit 5 test class.
Output ONLY raw Java code without markdown fences."""


def _track_usage(
    db: Session,
    user_id: str,
    project_id: str,
    provider: str,
    model: str,
    operation: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    latency_ms: int,
    status: str = "success",
    error_message: str | None = None,
) -> None:
    usage = AIUsage(
        id=str(uuid.uuid4()),
        user_id=user_id,
        project_id=project_id,
        provider=provider,
        model=model,
        operation=operation,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        latency_ms=latency_ms,
        status=status,
        error_message=error_message,
    )
    db.add(usage)
    db.commit()


class GenerationService:

    @staticmethod
    async def generate_tests(
        db: Session,
        project_id: str,
        user_id: str,
        source_id: str,
        provider_name: str,
        model: str,
        framework: str = "junit5",
    ) -> TestGeneration:
        validate_provider_name(provider_name)

        # Load source
        source = SourceAnalysisService.get_source(db, project_id, source_id)
        if source is None:
            raise ValueError("Source file not found")

        # Load project details for Java version & build tool
        project = db.query(Project).filter(Project.id == project_id).first()
        java_ver = project.java_version if project else "17"
        build_tool = project.build_tool if project else "Maven"

        # Load or generate structured source analysis
        stored_analysis = SourceAnalysisService.get_latest_analysis(db, project_id, source_id)
        if not stored_analysis:
            stored_analysis = SourceAnalysisService.analyze_and_store(db, project_id, source_id)
        analysis_data = stored_analysis.analysis_json

        classes = analysis_data.get("classes", [])
        primary_class_name = classes[0]["name"] if classes else "TargetClass"

        # Build Phase 3 structured prompt
        user_prompt = _build_generation_prompt(
            source_code=source.source_code,
            class_name=primary_class_name,
            analysis_json=analysis_data,
            java_version=java_ver,
            build_tool=build_tool,
        )

        # Create generation record
        gen = TestGeneration(
            id=str(uuid.uuid4()),
            project_id=project_id,
            source_file_id=source_id,
            user_id=user_id,
            provider=provider_name,
            model=model or "",
            framework=framework,
            status="generating",
        )
        db.add(gen)
        db.commit()

        # Call AI provider
        ai = get_provider(provider_name)
        start = time.monotonic()
        try:
            response = await ai.generate(
                system_prompt=_GENERATION_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                model=model or None,
            )
            latency_ms = int((time.monotonic() - start) * 1000)

            raw_response = response.content
            test_code = sanitize_test_code(raw_response)

            gen.raw_response = raw_response
            gen.test_code = test_code
            gen.model = response.model
            gen.prompt_tokens = response.prompt_tokens
            gen.completion_tokens = response.completion_tokens

            # Validate generated JUnit test output
            is_valid, failure_reason = validate_test_output(test_code)
            if not is_valid:
                gen.status = "invalid_generation"
                gen.error_message = f"Validation failed: {failure_reason}"
            else:
                gen.status = "generated"

            db.commit()
            db.refresh(gen)

            _track_usage(
                db, user_id, project_id, provider_name, response.model,
                "generate", response.prompt_tokens, response.completion_tokens,
                response.total_tokens, latency_ms,
            )

        except (AIProviderError, AINotConfiguredError) as e:
            gen.status = "failed"
            gen.error_message = str(e)
            db.commit()
            db.refresh(gen)
            _track_usage(
                db, user_id, project_id, provider_name, model or "",
                "generate", 0, 0, 0,
                int((time.monotonic() - start) * 1000),
                status="error", error_message=str(e),
            )
        except Exception as e:
            gen.status = "failed"
            gen.error_message = f"Unexpected generation error: {str(e)}"
            db.commit()
            db.refresh(gen)
            _track_usage(
                db, user_id, project_id, provider_name, model or "",
                "generate", 0, 0, 0,
                int((time.monotonic() - start) * 1000),
                status="error", error_message=str(e),
            )

        return gen

    @staticmethod
    async def refine_tests(
        db: Session,
        project_id: str,
        user_id: str,
        generation_id: str,
        provider_name: str,
        model: str,
        max_iterations: int,
        compilation_errors: str = "",
        test_failures: str = "",
        coverage_info: str = "",
    ) -> TestGeneration:
        validate_provider_name(provider_name)

        # Load original generation
        original = db.query(TestGeneration).filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not original:
            raise ValueError("Generation not found")
        if not original.test_code:
            raise ValueError("Cannot refine — no test code in original generation")

        # Load source
        source_id = original.source_file_id
        source = SourceAnalysisService.get_source(db, project_id, source_id) if source_id else None
        source_code = source.source_code if source else ""

        iteration_count = min(max_iterations, 5)  # hard cap

        current_test_code = original.test_code
        last_gen = original

        for i in range(1, iteration_count + 1):
            user_prompt = _build_refinement_prompt(
                source_code, current_test_code,
                compilation_errors, test_failures, coverage_info, i,
            )

            refined_gen = TestGeneration(
                id=str(uuid.uuid4()),
                project_id=project_id,
                source_file_id=source_id,
                user_id=user_id,
                provider=provider_name,
                model=model or "",
                framework=original.framework,
                status="generating",
                iteration=i,
                parent_generation_id=last_gen.id,
            )
            db.add(refined_gen)
            db.commit()

            ai = get_provider(provider_name)
            start = time.monotonic()
            try:
                response = await ai.refine(
                    system_prompt=_REFINEMENT_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    model=model or None,
                )
                latency_ms = int((time.monotonic() - start) * 1000)

                raw_response = response.content
                test_code = sanitize_test_code(raw_response)

                refined_gen.raw_response = raw_response
                refined_gen.test_code = test_code
                refined_gen.model = response.model
                refined_gen.prompt_tokens = response.prompt_tokens
                refined_gen.completion_tokens = response.completion_tokens

                # Validate refined JUnit test output
                is_valid, failure_reason = validate_test_output(test_code)
                if not is_valid:
                    refined_gen.status = "invalid_generation"
                    refined_gen.error_message = f"Validation failed: {failure_reason}"
                else:
                    refined_gen.status = "generated"

                db.commit()
                db.refresh(refined_gen)

                _track_usage(
                    db, user_id, project_id, provider_name, response.model,
                    "refine", response.prompt_tokens, response.completion_tokens,
                    response.total_tokens, latency_ms,
                )

                current_test_code = test_code
                last_gen = refined_gen

            except (AIProviderError, AINotConfiguredError) as e:
                refined_gen.status = "failed"
                refined_gen.error_message = str(e)
                db.commit()
                _track_usage(
                    db, user_id, project_id, provider_name, model or "",
                    "refine", 0, 0, 0,
                    int((time.monotonic() - start) * 1000),
                    status="error", error_message=str(e),
                )
                break
            except Exception as e:
                refined_gen.status = "failed"
                refined_gen.error_message = f"Unexpected refinement error: {str(e)}"
                db.commit()
                _track_usage(
                    db, user_id, project_id, provider_name, model or "",
                    "refine", 0, 0, 0,
                    int((time.monotonic() - start) * 1000),
                    status="error", error_message=str(e),
                )
                break

        return last_gen
