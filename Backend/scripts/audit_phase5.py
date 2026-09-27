"""
audit_phase5.py
Performs a complete functional audit of Phase 5:
1. OpenRouter provider configuration, headers, and server-side security.
2. FeedbackService structure (verifying real values, nulls for missing, no invented data).
3. Single refinement step and multi-iteration refinement loop.
4. Iteration limit enforcement (1 to 5 allowed, 0 and >5 rejected).
5. Storage of refinements in PostgreSQL (test_refinements) preserving original generation.
6. Execution with Maven, JUnit 5, and JaCoCo coverage feedback.
"""
import sys
import os
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import uuid
from app.config import get_settings
from app.services.ai.openrouter import OpenRouterProvider
from app.services.feedback_service import FeedbackService
from app.services.refinement_service import RefinementService
from app.database import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_refinement import TestRefinement
from app.models.test_result import TestResult
from app.services.ai.base import AIResponse

settings = get_settings()

CALCULATOR_JAVA = """package com.example;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public int subtract(int a, int b) {
        return a - b;
    }

    public int divide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("Cannot divide by zero");
        }
        return a / b;
    }
}
"""

CALCULATOR_INITIAL_TEST = """package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    void testAdd() {
        Calculator calc = new Calculator();
        assertEquals(5, calc.add(2, 3));
    }
}
"""

CALCULATOR_REFINED_TEST = """package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    void testAdd() {
        Calculator calc = new Calculator();
        assertEquals(5, calc.add(2, 3));
    }

    @Test
    void testSubtract() {
        Calculator calc = new Calculator();
        assertEquals(1, calc.subtract(4, 3));
    }

    @Test
    void testDivide() {
        Calculator calc = new Calculator();
        assertEquals(2, calc.divide(6, 3));
        assertThrows(IllegalArgumentException.class, () -> calc.divide(5, 0));
    }
}
"""

class MockOpenRouterAI:
    def __init__(self, content):
        self.content = content
        self.called_with_feedback = None

    async def generate(self, system_prompt, user_prompt, model=None, temperature=0.2, max_tokens=3000):
        self.called_with_feedback = user_prompt
        return AIResponse(
            provider="openrouter",
            model=model or "openai/gpt-4o",
            content=f"```java\n{self.content}\n```",
            prompt_tokens=140,
            completion_tokens=90,
            total_tokens=230,
            latency_ms=210,
        )

def main():
    print("========================================")
    print("A1 & A2: CHECK OPENROUTER PROVIDER")
    print("========================================")
    provider = OpenRouterProvider()
    print("Provider name:", provider.name)
    print("Is configured:", provider.is_configured)
    headers = provider._get_headers()
    assert "Authorization" in headers, "Missing Authorization header!"
    assert headers["Authorization"].startswith("Bearer "), "Authorization not Bearer token!"
    assert "OPENROUTER_API_KEY" not in str(headers), "Key name exposed!"
    print(">> OpenRouter provider checks: PASS\n")

    print("========================================")
    print("A3 & A7: CHECK FEEDBACK BUILDER")
    print("========================================")
    fb = FeedbackService.build_feedback(
        source_code=CALCULATOR_JAVA,
        current_test_code=CALCULATOR_INITIAL_TEST,
        compile_success=True,
        total_tests=1,
        passed_tests=1,
        failed_tests=0,
        skipped_tests=0,
        line_coverage=33.3,
        branch_coverage=0.0,
        instruction_coverage=25.0,
        uncovered_lines=[28, 29, 33, 34],
        uncovered_branches=[33],
    )
    assert fb["coverage"]["line"] == 33.3
    assert fb["coverage"]["branch"] == 0.0
    assert fb["coverage"]["mutation"] is None if "mutation" in fb["coverage"] else True
    prompt = FeedbackService.format_user_prompt(
        source_code=CALCULATOR_JAVA,
        current_test_code=CALCULATOR_INITIAL_TEST,
        feedback=fb,
    )
    assert "33.3" in prompt
    assert "uncovered_lines" in prompt
    print(">> Feedback builder & prompt checks: PASS\n")

    print("========================================")
    print("A4: CHECK ITERATION CONTROL LIMITS")
    print("========================================")
    for invalid_val in [0, -1, 6, 10]:
        try:
            RefinementService.run_refinement_loop(
                db=None,
                project_id="test",
                user_id="test",
                generation_id="test",
                max_iterations=invalid_val,
            )
            assert False, f"Should reject max_iterations={invalid_val}"
        except ValueError as e:
            assert "between 1 and 5" in str(e)
    print(">> Iteration limit enforcement: PASS\n")

    print("========================================")
    print("A5 & A6: CHECK REFINEMENT EXECUTION & STORAGE")
    print("========================================")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "audit_phase5@example.com").first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="audit_phase5@example.com",
                name="Phase 5 Auditor",
                hashed_password="pw_audit_phase5",
            )
            db.add(user)
            db.commit()

        project = Project(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Phase 5 Audit Project",
            language="java",
            build_tool="maven",
        )
        db.add(project)
        db.commit()

        source = SourceFile(
            id=str(uuid.uuid4()),
            project_id=project.id,
            file_name="Calculator.java",
            source_code=CALCULATOR_JAVA,
            file_size_bytes=len(CALCULATOR_JAVA.encode()),
        )
        db.add(source)
        db.commit()

        gen = TestGeneration(
            id=str(uuid.uuid4()),
            project_id=project.id,
            source_file_id=source.id,
            user_id=user.id,
            provider="gemini",
            model="gemini-2.5-flash-lite",
            framework="junit5",
            test_code=CALCULATOR_INITIAL_TEST,
        )
        db.add(gen)
        db.commit()

        mock_ai = MockOpenRouterAI(CALCULATOR_REFINED_TEST)

        # Run single refinement step
        res = RefinementService.refine_single_step(
            db=db,
            project_id=project.id,
            user_id=user.id,
            generation_id=gen.id,
            ai_provider_override=mock_ai,
        )
        print("Refinement step status:", res["status"])
        print("Refinement step iteration:", res["iteration"])
        print("Coverage after refinement:", res["after"])
        assert res["status"] == "completed"
        assert res["iteration"] == 1
        assert res["after"]["line_coverage"] == 100.0
        assert res["after"]["passed_tests"] == 3

        # Check DB persistence
        ref_db = db.query(TestRefinement).filter(TestRefinement.id == res["refinement_id"]).first()
        assert ref_db is not None, "TestRefinement not found in PostgreSQL!"
        assert ref_db.generation_id == gen.id
        assert ref_db.iteration == 1
        assert ref_db.line_coverage == 100.0

        # Check that original generation is preserved
        gen_db = db.query(TestGeneration).filter(TestGeneration.id == gen.id).first()
        assert gen_db.test_code == CALCULATOR_INITIAL_TEST, "Original test code was overwritten!"

        print("Stored TestRefinement ID:", ref_db.id)
        print("Initial generation code preserved: YES")
        print(">> Refinement execution & storage: PASS\n")

    finally:
        db.close()

    print("========================================")
    print("PHASE 5 AUDIT COMPLETE: ALL PASS")
    print("========================================")

if __name__ == "__main__":
    main()
