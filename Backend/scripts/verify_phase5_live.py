"""
Live End-to-End Verification for Phase 5:
Initial Test -> Maven Compile -> JUnit 5 -> JaCoCo -> Feedback -> Refinement -> PostgreSQL Storage & Retrieval.
"""
import json
import uuid
from unittest.mock import MagicMock

from app.config import get_settings
from app.database import SessionLocal
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_refinement import TestRefinement
from app.models.user import User
from app.services.ai.base import AIResponse
from app.services.auth_service import hash_password
from app.services.refinement_service import RefinementService

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

CALCULATOR_BASELINE_TEST_JAVA = """package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    void testAdd() {
        Calculator c = new Calculator();
        assertEquals(5, c.add(2, 3));
    }
}
"""

CALCULATOR_REFINED_TEST_JAVA = """package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    void testAdd() {
        Calculator c = new Calculator();
        assertEquals(5, c.add(2, 3));
    }

    @Test
    void testSubtract() {
        Calculator c = new Calculator();
        assertEquals(1, c.subtract(4, 3));
    }

    @Test
    void testDivide() {
        Calculator c = new Calculator();
        assertEquals(2, c.divide(6, 3));
        assertThrows(IllegalArgumentException.class, () -> c.divide(1, 0));
    }
}
"""

def main():
    print("=== STARTING LIVE PHASE 5 REFINEMENT VERIFICATION ===")
    settings = get_settings()
    db = SessionLocal()

    try:
        # 1. Setup user in PostgreSQL
        email = f"phase5_e2e_{uuid.uuid4().hex[:6]}@testforge.ai"
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=hash_password("Pass123!"),
            name="Phase 5 Auditor",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"[OK] User created in PostgreSQL: {email}, ID: {user.id}")

        # 2. Setup project in PostgreSQL
        project = Project(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Phase 5 Live E2E Project",
            language="java",
            build_tool="maven",
            status="ready",
        )
        db.add(project)
        db.commit()
        print(f"[OK] Project created: {project.id}")

        # 3. Setup source file in PostgreSQL
        source_file = SourceFile(
            id=str(uuid.uuid4()),
            project_id=project.id,
            file_name="Calculator.java",
            source_code=CALCULATOR_JAVA,
            file_size_bytes=len(CALCULATOR_JAVA.encode("utf-8")),
        )
        db.add(source_file)
        db.commit()
        print(f"[OK] SourceFile created: {source_file.id}")

        # 4. Setup baseline generated test in PostgreSQL
        generation = TestGeneration(
            id=str(uuid.uuid4()),
            project_id=project.id,
            source_file_id=source_file.id,
            user_id=user.id,
            provider="gemini",
            model="gemini-2.5-flash-lite",
            framework="junit5",
            test_code=CALCULATOR_BASELINE_TEST_JAVA,
            status="generated",
        )
        db.add(generation)
        db.commit()
        print(f"[OK] Initial TestGeneration created: {generation.id}")

        # 5. Execute Refinement with mock AI response simulating GPT-4o output
        mock_ai = MagicMock()
        mock_ai.generate.return_value = AIResponse(
            provider="openrouter",
            model="openai/gpt-4o",
            content=f"```java\n{CALCULATOR_REFINED_TEST_JAVA}\n```",
            prompt_tokens=220,
            completion_tokens=150,
            total_tokens=370,
            latency_ms=1850,
        )

        print("\n--- Executing RefinementService.refine_single_step ---")
        refine_res = RefinementService.refine_single_step(
            db=db,
            project_id=project.id,
            user_id=user.id,
            generation_id=generation.id,
            ai_provider_override=mock_ai,
        )

        print("Refinement Result:")
        print(json.dumps({k: v for k, v in refine_res.items() if k != "test_code"}, indent=2))

        assert refine_res["status"] == "completed", f"Expected completed, got {refine_res['status']}"
        assert refine_res["iteration"] == 1
        ref_id = refine_res["refinement_id"]

        # 6. Verify TestRefinement row in PostgreSQL
        ref_db = db.query(TestRefinement).filter(TestRefinement.id == ref_id).first()
        assert ref_db is not None, "TestRefinement row not found in PostgreSQL!"
        print(f"[OK] Verified TestRefinement in PostgreSQL: ID={ref_db.id}")
        print(f"     Compilation status: {ref_db.compilation_status}")
        print(f"     Execution status:   {ref_db.execution_status}")
        print(f"     Line coverage:      {ref_db.line_coverage}%")
        print(f"     Branch coverage:    {ref_db.branch_coverage}%")
        assert ref_db.compilation_status == "success"
        assert ref_db.line_coverage == 100.0
        assert ref_db.branch_coverage == 100.0

        # 7. Verify preservation of original test code
        gen_after = db.query(TestGeneration).filter(TestGeneration.id == generation.id).first()
        assert gen_after.test_code == CALCULATOR_BASELINE_TEST_JAVA, "Original test code was mutated!"
        print(f"[OK] Original TestGeneration code strictly preserved in PostgreSQL")

        # 8. Test get_generation_refinements
        history = RefinementService.get_generation_refinements(db, project.id, generation.id, user.id)
        assert len(history) == 1, f"Expected 1 refinement history item, got {len(history)}"
        assert history[0].iteration == 1
        print(f"[OK] RefinementService.get_generation_refinements succeeded with {len(history)} record(s)")

        # 9. Test list_refinements
        all_refs = RefinementService.list_refinements(db, project.id, user.id)
        assert len(all_refs) >= 1
        print(f"[OK] RefinementService.list_refinements succeeded with {len(all_refs)} record(s)")

        # 10. Test get_refinement by ID
        single_ref = RefinementService.get_refinement(db, project.id, ref_id, user.id)
        assert single_ref.id == ref_id
        print(f"[OK] RefinementService.get_refinement by ID succeeded")

        print("\n=== ALL PHASE 5 LIVE DATABASE & EXECUTION VERIFICATIONS PASSED ===")

    finally:
        db.close()

if __name__ == "__main__":
    main()
