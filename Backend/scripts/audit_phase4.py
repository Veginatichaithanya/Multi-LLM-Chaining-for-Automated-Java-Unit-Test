"""
audit_phase4.py
Directly audits Phase 4 requirements:
1. Maven & Java executable checks
2. Compilation and execution with Calculator.java (passing JUnit 5 tests)
3. Parsing of JUnit results (total, passed, failed, skipped, execution time)
4. JaCoCo XML generation and parsing (instruction, branch, line, method, class coverage)
5. Intentionally failing test fixture -> failure detection & execution_success=False
6. PostgreSQL persistence check (storing TestResult & CoverageResult)
"""
import os
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import json
import uuid
import psycopg
from app.engines.maven_runner import (
    get_maven_executable,
    get_java_executable,
    execute_test_pipeline,
    compile_project,
    prepare_workspace,
)
from app.engines.jacoco_runner import parse_jacoco_report
from app.engines.junit_runner import parse_surefire_reports
from app.database import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_result import TestResult
from app.models.coverage_result import CoverageResult

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

CALCULATOR_PASSING_TEST = """package com.example;

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

CALCULATOR_FAILING_TEST = """package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    void testAddPassing() {
        Calculator calc = new Calculator();
        assertEquals(5, calc.add(2, 3));
    }

    @Test
    void testAddIntentionallyFailing() {
        Calculator calc = new Calculator();
        assertEquals(999, calc.add(2, 3), "Intentional failure for verification");
    }
}
"""

def main():
    print("========================================")
    print("AUDITING PHASE 4 MAVEN & JAVA ENVIRONMENT")
    print("========================================")
    mvn_path = get_maven_executable()
    java_path = get_java_executable()
    print(f"Maven executable: {mvn_path}")
    print(f"Java executable:  {java_path}")
    assert mvn_path and os.path.exists(mvn_path), "Maven executable not found!"
    assert java_path and os.path.exists(java_path), "Java executable not found!"
    print(">> Maven & Java check: PASS\n")

    print("========================================")
    print("AUDITING PHASE 4 PASSING TEST & JACOCO")
    print("========================================")
    pass_res = execute_test_pipeline(
        source_code=CALCULATOR_JAVA,
        test_code=CALCULATOR_PASSING_TEST,
        with_jacoco=True,
        timeout=90,
    )
    print(f"Compile success:    {pass_res.compile_success}")
    print(f"Execution success:  {pass_res.execution_success}")
    print(f"Total tests:        {pass_res.total_tests}")
    print(f"Passed tests:       {pass_res.passed_tests}")
    print(f"Failed tests:       {pass_res.failed_tests}")
    print(f"Skipped tests:      {pass_res.skipped_tests}")
    print(f"Execution time ms:  {pass_res.execution_time_ms}")
    print(f"Coverage object:    {pass_res.coverage}")
    if pass_res.coverage:
        print(f"  Line Coverage:        {pass_res.coverage.line_coverage}%")
        print(f"  Branch Coverage:      {pass_res.coverage.branch_coverage}%")
        print(f"  Instruction Coverage: {pass_res.coverage.instruction_coverage}%")
        print(f"  Method Coverage:      {pass_res.coverage.method_coverage}%")
        print(f"  Class Coverage:       {pass_res.coverage.class_coverage}%")

    assert pass_res.compile_success is True, "Compilation failed!"
    assert pass_res.execution_success is True, "Execution failed!"
    assert pass_res.total_tests == 3, f"Expected 3 tests, got {pass_res.total_tests}"
    assert pass_res.passed_tests == 3, f"Expected 3 passed tests, got {pass_res.passed_tests}"
    assert pass_res.failed_tests == 0, f"Expected 0 failed tests, got {pass_res.failed_tests}"
    assert pass_res.coverage is not None, "JaCoCo coverage is None!"
    assert pass_res.coverage.line_coverage == 100.0, f"Expected 100% line coverage, got {pass_res.coverage.line_coverage}"
    print(">> Passing test execution & JaCoCo: PASS\n")

    print("========================================")
    print("AUDITING PHASE 4 FAILING TEST HANDLING")
    print("========================================")
    fail_res = execute_test_pipeline(
        source_code=CALCULATOR_JAVA,
        test_code=CALCULATOR_FAILING_TEST,
        with_jacoco=True,
        timeout=90,
    )
    print(f"Compile success:    {fail_res.compile_success}")
    print(f"Execution success:  {fail_res.execution_success}")
    print(f"Total tests:        {fail_res.total_tests}")
    print(f"Passed tests:       {fail_res.passed_tests}")
    print(f"Failed tests:       {fail_res.failed_tests}")
    print(f"Surefire report:    {fail_res.surefire_report}")
    if fail_res.surefire_report:
        for t in fail_res.surefire_report.test_cases:
            print(f"  Test: {t.name} -> {t.status}, error: {t.failure_message}")

    assert fail_res.compile_success is True, "Compilation should succeed for failing test!"
    assert fail_res.execution_success is False, "Execution should report False for failing tests!"
    assert fail_res.failed_tests == 1, f"Expected 1 failed test, got {fail_res.failed_tests}"
    assert fail_res.passed_tests == 1, f"Expected 1 passed test, got {fail_res.passed_tests}"
    print(">> Failing test handling: PASS\n")

    print("========================================")
    print("AUDITING POSTGRESQL PERSISTENCE")
    print("========================================")
    db = SessionLocal()
    try:
        # Check an existing user or create temporary
        user = db.query(User).filter(User.email == "audit_phase4@example.com").first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="audit_phase4@example.com",
                name="Phase 4 Auditor",
                hashed_password="hashed_pw_test",
            )
            db.add(user)
            db.commit()

        project = Project(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Phase 4 Audit Project",
            language="java",
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
            test_code=CALCULATOR_PASSING_TEST,
        )
        db.add(gen)
        db.commit()

        test_result = TestResult(
            id=str(uuid.uuid4()),
            project_id=project.id,
            generation_id=gen.id,
            status="completed",
            tests_total=pass_res.total_tests,
            tests_passed=pass_res.passed_tests,
            tests_failed=pass_res.failed_tests,
            tests_skipped=pass_res.skipped_tests,
            compilation_success=pass_res.compile_success,
            execution_success=pass_res.execution_success,
            execution_time_ms=pass_res.execution_time_ms,
            line_coverage=pass_res.coverage.line_coverage if pass_res.coverage else None,
            branch_coverage=pass_res.coverage.branch_coverage if pass_res.coverage else None,
            instruction_coverage=pass_res.coverage.instruction_coverage if pass_res.coverage else None,
            method_coverage=pass_res.coverage.method_coverage if pass_res.coverage else None,
            class_coverage=pass_res.coverage.class_coverage if pass_res.coverage else None,
            stdout=pass_res.stdout[:500],
        )
        db.add(test_result)
        db.commit()

        coverage_result = CoverageResult(
            id=str(uuid.uuid4()),
            project_id=project.id,
            test_result_id=test_result.id,
            line_coverage=pass_res.coverage.line_coverage if pass_res.coverage else None,
            branch_coverage=pass_res.coverage.branch_coverage if pass_res.coverage else None,
            instruction_coverage=pass_res.coverage.instruction_coverage if pass_res.coverage else None,
            method_coverage=pass_res.coverage.method_coverage if pass_res.coverage else None,
            class_coverage=pass_res.coverage.class_coverage if pass_res.coverage else None,
        )
        db.add(coverage_result)
        db.commit()

        # Query back from DB
        queried_result = db.query(TestResult).filter(TestResult.id == test_result.id).first()
        queried_cov = db.query(CoverageResult).filter(CoverageResult.test_result_id == test_result.id).first()

        assert queried_result is not None, "TestResult not found in PostgreSQL!"
        assert queried_cov is not None, "CoverageResult not found in PostgreSQL!"
        assert queried_result.tests_passed == 3, f"Expected 3 passed, got {queried_result.tests_passed}"
        assert queried_cov.line_coverage == 100.0, f"Expected 100% line cov, got {queried_cov.line_coverage}"

        print(f"Stored TestResult ID:     {queried_result.id}")
        print(f"Stored CoverageResult ID: {queried_cov.id}")
        print(f"Stored Line Coverage:     {queried_cov.line_coverage}%")
        print(f"Stored Branch Coverage:   {queried_cov.branch_coverage}%")
        print(">> PostgreSQL persistence check: PASS\n")

    finally:
        db.close()

    print("========================================")
    print("PHASE 4 AUDIT ALL CHECKS PASSED!")
    print("========================================")

if __name__ == "__main__":
    main()
