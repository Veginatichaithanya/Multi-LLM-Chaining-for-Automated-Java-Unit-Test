"""
Phase 4 Automated Tests: Maven, JUnit 5, and JaCoCo Coverage.

Tests all 10 required scenarios from Section 27:
1. Successful Java compilation
2. Compilation failure
3. Successful JUnit execution
4. Failed JUnit test
5. Maven timeout
6. JaCoCo XML parsing
7. Coverage storage
8. Project ownership
9. Invalid generation ID
10. Unauthorized execution
"""
import os
import shutil
import subprocess
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.engines.jacoco_runner import parse_jacoco_report
from app.engines.maven_runner import (
    compile_project,
    execute_test_pipeline,
    prepare_workspace,
    maven_available,
)
from app.models.coverage_result import CoverageResult
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_result import TestResult
from app.models.user import User


CALCULATOR_JAVA = """\
package com.example;

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

CALCULATOR_TEST_PASS_JAVA = """\
package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    void testAdd() {
        Calculator c = new Calculator();
        assertEquals(5, c.add(2, 3));
    }

    @Test
    void testDivide() {
        Calculator c = new Calculator();
        assertEquals(2, c.divide(6, 3));
        assertThrows(IllegalArgumentException.class, () -> c.divide(10, 0));
    }
}
"""

CALCULATOR_TEST_FAIL_JAVA = """\
package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    void testAddFails() {
        Calculator c = new Calculator();
        assertEquals(999, c.add(2, 3));
    }
}
"""

BROKEN_JAVA = """\
package com.example;

public class BrokenCalculator {
    public int brokenMethod( {
        missing syntax here !!!
    }
}
"""


def _get_auth_token(client: TestClient, email: str = "phase4_user@example.com") -> str:
    client.post("/api/auth/register", json={"email": email, "password": "Password@123", "name": "Phase4 Tester"})
    resp = client.post("/api/auth/login", json={"email": email, "password": "Password@123"})
    return resp.json()["access_token"]


# ── Test 1: Successful Java Compilation ───────────────────────────────────────
@pytest.mark.skipif(not maven_available(), reason="Maven not installed")
def test_successful_java_compilation():
    workspace = prepare_workspace(CALCULATOR_JAVA, CALCULATOR_TEST_PASS_JAVA)
    try:
        res = compile_project(workspace, timeout=60)
        assert res.compilation_success is True
        assert res.status == "completed"
        assert res.return_code == 0
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


# ── Test 2: Compilation Failure ───────────────────────────────────────────────
@pytest.mark.skipif(not maven_available(), reason="Maven not installed")
def test_compilation_failure():
    workspace = prepare_workspace(BROKEN_JAVA, CALCULATOR_TEST_PASS_JAVA)
    try:
        res = compile_project(workspace, timeout=60)
        assert res.compilation_success is False
        assert res.status == "compilation_failed"
        assert res.return_code != 0
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


# ── Test 3: Successful JUnit Execution ────────────────────────────────────────
@pytest.mark.skipif(not maven_available(), reason="Maven not installed")
def test_successful_junit_execution():
    pipeline_res = execute_test_pipeline(
        source_code=CALCULATOR_JAVA,
        test_code=CALCULATOR_TEST_PASS_JAVA,
        with_jacoco=True,
        timeout=120,
    )
    assert pipeline_res.compile_success is True
    assert pipeline_res.execution_success is True
    assert pipeline_res.status == "completed"
    assert pipeline_res.total_tests == 2
    assert pipeline_res.passed_tests == 2
    assert pipeline_res.failed_tests == 0


# ── Test 4: Failed JUnit Test ─────────────────────────────────────────────────
@pytest.mark.skipif(not maven_available(), reason="Maven not installed")
def test_failed_junit_test():
    pipeline_res = execute_test_pipeline(
        source_code=CALCULATOR_JAVA,
        test_code=CALCULATOR_TEST_FAIL_JAVA,
        with_jacoco=True,
        timeout=120,
    )
    assert pipeline_res.compile_success is True
    assert pipeline_res.execution_success is False
    assert pipeline_res.status == "failed"
    assert pipeline_res.total_tests == 1
    assert pipeline_res.failed_tests == 1
    assert pipeline_res.passed_tests == 0


# ── Test 5: Maven Timeout ─────────────────────────────────────────────────────
def test_maven_timeout(monkeypatch):
    def mock_run(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=args[0], timeout=1)

    monkeypatch.setattr(subprocess, "run", mock_run)
    pipeline_res = execute_test_pipeline(CALCULATOR_JAVA, CALCULATOR_TEST_PASS_JAVA, timeout=1)
    assert pipeline_res.status in ("compilation_failed", "timeout")


# ── Test 6: JaCoCo XML Parsing ────────────────────────────────────────────────
def test_jacoco_xml_parsing(tmp_path):
    jacoco_dir = tmp_path / "site" / "jacoco"
    jacoco_dir.mkdir(parents=True)
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<report name="test">
  <counter type="INSTRUCTION" missed="12" covered="88"/>
  <counter type="BRANCH" missed="2" covered="6"/>
  <counter type="LINE" missed="3" covered="17"/>
  <counter type="COMPLEXITY" missed="1" covered="4"/>
  <counter type="METHOD" missed="1" covered="9"/>
  <counter type="CLASS" missed="0" covered="2"/>
</report>
"""
    (jacoco_dir / "jacoco.xml").write_text(xml_content, encoding="utf-8")

    cov = parse_jacoco_report(str(tmp_path))
    assert cov.status == "measured"
    assert cov.instruction_coverage == 88.0
    assert cov.branch_coverage == 75.0
    assert cov.line_coverage == 85.0
    assert cov.method_coverage == 90.0
    assert cov.class_coverage == 100.0


# ── Test 7: Coverage Storage in PostgreSQL ───────────────────────────────────
def test_coverage_storage(client: TestClient, db_session: Session):
    token = _get_auth_token(client, "cov_owner@example.com")
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me_resp.json()["id"]

    # Setup project, source, generation, test_result for this user
    proj = Project(id=str(uuid.uuid4()), user_id=user_id, name="Coverage Proj", build_tool="maven")
    db_session.add(proj)
    src = SourceFile(id=str(uuid.uuid4()), project_id=proj.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA)
    db_session.add(src)
    gen = TestGeneration(
        id=str(uuid.uuid4()),
        project_id=proj.id,
        user_id=user_id,
        source_file_id=src.id,
        test_code=CALCULATOR_TEST_PASS_JAVA,
        provider="gemini",
        model="gemini-2.5-flash-lite",
        status="generated",
    )
    db_session.add(gen)
    tr = TestResult(
        id=str(uuid.uuid4()),
        project_id=proj.id,
        generation_id=gen.id,
        status="completed",
        compilation_success=True,
        execution_success=True,
        line_coverage=85.7,
        branch_coverage=75.0,
        instruction_coverage=88.2,
        method_coverage=90.0,
        class_coverage=100.0,
    )
    db_session.add(tr)
    db_session.commit()

    # Call POST /api/projects/{proj.id}/coverage with test_result_id
    resp = client.post(
        f"/api/projects/{proj.id}/coverage",
        headers={"Authorization": f"Bearer {token}"},
        json={"test_result_id": tr.id},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["line_coverage"] == 85.7
    assert data["branch_coverage"] == 75.0
    assert data["instruction_coverage"] == 88.2
    assert data["method_coverage"] == 90.0
    assert data["class_coverage"] == 100.0

    # Verify record in coverage_results table
    cov_db = db_session.query(CoverageResult).filter(CoverageResult.test_result_id == tr.id).first()
    assert cov_db is not None
    assert cov_db.line_coverage == 85.7


# ── Test 8: Project Ownership Enforcement ────────────────────────────────────
def test_project_ownership_forbidden(client: TestClient, db_session: Session):
    token_a = _get_auth_token(client, "user_a@example.com")
    token_b = _get_auth_token(client, "user_b@example.com")

    me_a = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"}).json()

    # User A's project
    proj = Project(id=str(uuid.uuid4()), user_id=me_a["id"], name="A's Secret Project", build_tool="maven")
    db_session.add(proj)
    db_session.commit()

    # User B attempts to run tests on User A's project -> 404 or 403
    resp = client.post(
        f"/api/projects/{proj.id}/run-tests",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"generation_id": str(uuid.uuid4())},
    )
    assert resp.status_code in (403, 404)


# ── Test 9: Invalid Generation ID ────────────────────────────────────────────
def test_invalid_generation_id(client: TestClient, db_session: Session):
    token = _get_auth_token(client, "valid_user@example.com")
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()

    proj = Project(id=str(uuid.uuid4()), user_id=me["id"], name="My Proj", build_tool="maven")
    db_session.add(proj)
    db_session.commit()

    resp = client.post(
        f"/api/projects/{proj.id}/run-tests",
        headers={"Authorization": f"Bearer {token}"},
        json={"generation_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


# ── Test 10: Unauthorized Execution ──────────────────────────────────────────
def test_unauthorized_execution(client: TestClient):
    resp = client.post(
        f"/api/projects/{uuid.uuid4()}/run-tests",
        json={"generation_id": str(uuid.uuid4())},
    )
    assert resp.status_code in (401, 403)
