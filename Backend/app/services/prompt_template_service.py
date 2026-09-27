"""
Prompt Template Service.

Manages versioned prompt templates in PostgreSQL for experiment reproducibility (Phase 6 / Section 26).
"""
from __future__ import annotations

import uuid
from sqlalchemy.orm import Session

from app.models.prompt_template import PromptTemplate

DEFAULT_GENERATION_PROMPT = """You are an expert Java software testing engineer.

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
- Return only the test source code."""

DEFAULT_REFINEMENT_PROMPT = """You are an expert Java unit testing engineer specializing in improving automatically generated JUnit 5 tests.

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


class PromptTemplateService:
    @classmethod
    def get_or_create_template(
        cls,
        db: Session,
        name: str,
        version: str,
        provider: str,
        operation: str,
        default_template: str,
    ) -> PromptTemplate:
        tmpl = (
            db.query(PromptTemplate)
            .filter(PromptTemplate.name == name, PromptTemplate.version == version)
            .first()
        )
        if not tmpl:
            tmpl = PromptTemplate(
                id=str(uuid.uuid4()),
                name=name,
                version=version,
                provider=provider,
                operation=operation,
                template=default_template,
            )
            db.add(tmpl)
            db.commit()
            db.refresh(tmpl)
        return tmpl

    @classmethod
    def get_generation_template(cls, db: Session, version: str = "v1.0") -> PromptTemplate:
        return cls.get_or_create_template(
            db=db,
            name="junit5_generation",
            version=version,
            provider="multi",
            operation="generation",
            default_template=DEFAULT_GENERATION_PROMPT,
        )

    @classmethod
    def get_refinement_template(cls, db: Session, version: str = "v1.0") -> PromptTemplate:
        return cls.get_or_create_template(
            db=db,
            name="junit5_refinement",
            version=version,
            provider="openrouter",
            operation="refinement",
            default_template=DEFAULT_REFINEMENT_PROMPT,
        )
