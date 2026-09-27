"""
Live End-to-End Verification for Phase 4:
Maven Compile -> JUnit 5 Execution -> Surefire XML -> JaCoCo XML -> PostgreSQL -> Retrieval.
"""
import json
import os
import sys
import uuid

from app.config import get_settings
from app.database import SessionLocal
from app.models.coverage_result import CoverageResult
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_result import TestResult
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password
from app.services.test_execution_service import TestExecutionService

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

CALCULATOR_TEST_JAVA = """package com.example;

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
    print("=== STARTING LIVE PHASE 4 VERIFICATION ===")
    settings = get_settings()
    db = SessionLocal()

    try:
        # 1. Setup user in PostgreSQL
        email = f"phase4_e2e_{uuid.uuid4().hex[:6]}@testforge.ai"
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=hash_password("Pass123!"),
            name="Phase 4 Auditor",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        token = create_access_token({"sub": user.id, "email": email})
        print(f"[OK] User created: {email}, ID: {user.id}")

        # 2. Setup project in PostgreSQL
        project = Project(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Phase 4 Live E2E Project",
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

        # 4. Setup generated test in PostgreSQL
        generation = TestGeneration(
            id=str(uuid.uuid4()),
            project_id=project.id,
            source_file_id=source_file.id,
            user_id=user.id,
            provider="gemini",
            model="gemini-2.5-flash-lite",
            framework="junit5",
            test_code=CALCULATOR_TEST_JAVA,
            status="generated",
        )
        db.add(generation)
        db.commit()
        print(f"[OK] TestGeneration created: {generation.id}")

        # 5. Execute live Maven & JUnit 5 pipeline via TestExecutionService
        print("\n--- Executing TestExecutionService.run_tests ---")
        exec_res = TestExecutionService.run_tests(
            db=db,
            project_id=project.id,
            generation_id=generation.id,
            user_id=user.id,
        )
        print("Execution Response:")
        print(json.dumps({k: v for k, v in exec_res.items() if k not in ("stdout", "stderr")}, indent=2))

        assert exec_res["compile_success"] is True, "Compilation failed!"
        assert exec_res["execution_success"] is True, "Test execution failed!"
        assert exec_res["total_tests"] == 3, f"Expected 3 tests, got {exec_res['total_tests']}"
        assert exec_res["passed_tests"] == 3, f"Expected 3 passed, got {exec_res['passed_tests']}"
        assert exec_res["failed_tests"] == 0, f"Expected 0 failed, got {exec_res['failed_tests']}"
        test_result_id = exec_res["test_result_id"]
        print(f"[OK] TestResult recorded: {test_result_id}")

        # 6. Verify TestResult in PostgreSQL
        tr_db = db.query(TestResult).filter(TestResult.id == test_result_id).first()
        assert tr_db is not None, "TestResult not found in PostgreSQL!"
        print(f"[OK] Verified TestResult in PostgreSQL: status={tr_db.status}, tests={tr_db.tests_passed}/{tr_db.tests_total}")

        # 7. Check CoverageResult in PostgreSQL
        cov_db = db.query(CoverageResult).filter(CoverageResult.test_result_id == test_result_id).first()
        assert cov_db is not None, "CoverageResult not found in PostgreSQL!"
        print(f"[OK] Verified CoverageResult in PostgreSQL:")
        print(f"     Line coverage:        {cov_db.line_coverage}%")
        print(f"     Branch coverage:      {cov_db.branch_coverage}%")
        print(f"     Instruction coverage: {cov_db.instruction_coverage}%")
        print(f"     Method coverage:      {cov_db.method_coverage}%")
        print(f"     Class coverage:       {cov_db.class_coverage}%")
        assert isinstance(cov_db.line_coverage, float), "Line coverage is not a float!"
        assert isinstance(cov_db.instruction_coverage, float), "Instruction coverage is not a float!"

        # 8. Test get_latest_coverage
        latest_cov = TestExecutionService.get_latest_coverage(db, project.id, user.id)
        assert latest_cov is not None, "get_latest_coverage returned None!"
        assert latest_cov.id == cov_db.id, "Latest coverage mismatch!"
        print(f"[OK] TestExecutionService.get_latest_coverage succeeded (id={latest_cov.id})")

        # 9. Test get_coverage_by_id
        by_id_cov = TestExecutionService.get_coverage_by_id(db, project.id, cov_db.id, user.id)
        assert by_id_cov.id == cov_db.id, "get_coverage_by_id mismatch!"
        print(f"[OK] TestExecutionService.get_coverage_by_id succeeded")

        # 10. Test list_test_results
        results_list = TestExecutionService.list_test_results(db, project.id, user.id)
        assert len(results_list) >= 1, "list_test_results is empty!"
        print(f"[OK] TestExecutionService.list_test_results returned {len(results_list)} results")

        # 11. Test Gradle rejection rule
        gradle_proj = Project(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Gradle Proj",
            build_tool="gradle",
        )
        db.add(gradle_proj)
        db.commit()
        gradle_res = TestExecutionService.run_tests(
            db=db,
            project_id=gradle_proj.id,
            generation_id=generation.id,
            user_id=user.id,
        )
        assert gradle_res["status"] == "not_supported", f"Expected not_supported, got {gradle_res['status']}"
        assert "Gradle execution will be implemented in a later phase." in gradle_res["message"]
        print(f"[OK] Gradle project rejection verified: {gradle_res}")

        print("\n=== ALL PHASE 4 LIVE DATABASE & EXECUTION VERIFICATIONS PASSED ===")

    finally:
        db.close()

if __name__ == "__main__":
    main()
