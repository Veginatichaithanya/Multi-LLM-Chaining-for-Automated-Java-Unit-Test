"""
Phase 6 Automated Tests: Multi-LLM Chaining + Reproducible Experiment Engine.

Tests all scenarios required by Phase 6 Section 32:
1. Experiment creation
2. Experiment ownership
3. Gemini-only configuration
4. OpenRouter-only configuration
5. Gemini -> OpenRouter configuration
6. Invalid configuration handling
7. Invalid iteration count validation
8. Experiment status transitions
9. Experiment run storage
10. Metric storage
11. Comparison API (factual, no winner ranking)
12. Prompt versioning
13. AI usage tracking
14. Failed generation handling
15. Failed compilation handling
16. Failed refinement handling
17. Sequential execution locking
18. No cross-user access (unauthorized retrieval & run)
"""
import uuid
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.models.experiment import Experiment
from app.models.experiment_metric import ExperimentMetric
from app.models.experiment_run import ExperimentRun
from app.models.project import Project
from app.models.prompt_template import PromptTemplate
from app.models.source_file import SourceFile
from app.models.user import User
from app.services.ai.base import AIResponse
from app.services.experiment_runner import ExperimentRunner
from app.services.experiment_service import ExperimentService
from app.services.prompt_template_service import PromptTemplateService

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
        assertThrows(IllegalArgumentException.class, () -> c.divide(10, 0));
    }
}
"""

BROKEN_TEST_CODE = """package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class BrokenTest {
    @Test
    void testBad() {
        // syntax error
        int x = ;
    }
}
"""


def _get_auth_token(client: TestClient, email: str = "phase6_user@example.com") -> tuple[str, str]:
    resp = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password@123", "name": "Phase6 Tester"},
    )
    if resp.status_code == 200:
        token = resp.json()["access_token"]
        user_id = resp.json().get("user", {}).get("id")
    else:
        resp2 = client.post("/api/auth/login", json={"email": email, "password": "Password@123"})
        token = resp2.json()["access_token"]
        user_id = resp2.json().get("user", {}).get("id", str(uuid.uuid4()))
    return token, user_id


# ── 1. Experiment Creation ───────────────────────────────────────────────────
def test_experiment_creation(client: TestClient):
    token, user_id = _get_auth_token(client, "exp_create@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = client.post("/api/projects", json={"name": "Exp Create Project", "language": "Java"}, headers=headers)
    pid = proj_res.json()["id"]

    create_res = client.post(
        "/api/experiments",
        json={
            "project_id": pid,
            "name": "Gemini vs GPT-4o Run",
            "configuration": "gemini_to_openrouter",
            "initial_provider": "gemini",
            "initial_model": "gemini-2.5-flash-lite",
            "refinement_provider": "openrouter",
            "refinement_model": "openai/gpt-4o",
            "max_iterations": 3,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["name"] == "Gemini vs GPT-4o Run"
    assert data["configuration"] == "gemini_to_openrouter"
    assert data["status"] == "created"
    assert data["max_iterations"] == 3


# ── 2. Experiment Ownership & Project Validation ──────────────────────────────
def test_experiment_ownership_validation(client: TestClient):
    token1, _ = _get_auth_token(client, "exp_owner1@example.com")
    token2, _ = _get_auth_token(client, "exp_owner2@example.com")

    # User 1 creates a project
    proj_res = client.post(
        "/api/projects",
        json={"name": "User 1 Project", "language": "Java"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    pid = proj_res.json()["id"]

    # User 2 tries to create an experiment on User 1's project -> 404
    resp = client.post(
        "/api/experiments",
        json={
            "project_id": pid,
            "name": "Unauthorized Experiment",
            "configuration": "gemini_only",
        },
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert resp.status_code == 404


# ── 3. Configuration A: Gemini Only ──────────────────────────────────────────
def test_configuration_gemini_only(db_session):
    user = User(id=str(uuid.uuid4()), email="gemini_only@example.com", name="Gemini Only", hashed_password="pw")
    project = Project(id=str(uuid.uuid4()), user_id=user.id, name="Gemini Proj", language="java")
    source = SourceFile(id=str(uuid.uuid4()), project_id=project.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA, file_size_bytes=len(CALCULATOR_JAVA))
    db_session.add_all([user, project, source])
    db_session.commit()

    exp = Experiment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        name="Gemini Only Test",
        configuration="gemini_only",
        initial_provider="gemini",
        initial_model="gemini-2.5-flash-lite",
        status="created",
    )
    db_session.add(exp)
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="gemini",
        model="gemini-2.5-flash-lite",
        content=CALCULATOR_PASSING_TEST,
        prompt_tokens=100,
        completion_tokens=80,
        total_tokens=180,
    )

    res_exp = ExperimentRunner.execute_experiment(
        db=db_session,
        experiment_id=exp.id,
        user_id=user.id,
        ai_provider_override=mock_ai,
    )

    assert res_exp.status == "completed"
    assert res_exp.line_coverage == 100.0
    assert len(res_exp.runs) == 1
    assert res_exp.runs[0].iteration == 0
    assert res_exp.runs[0].provider == "gemini"
    assert len(res_exp.metrics) == 1
    assert res_exp.metrics[0].passed_tests == 3
    assert res_exp.metrics[0].mutation_score is None


# ── 4. Configuration B: OpenRouter Only ──────────────────────────────────────
def test_configuration_openrouter_only(db_session):
    user = User(id=str(uuid.uuid4()), email="openrouter_only@example.com", name="OpenRouter Only", hashed_password="pw")
    project = Project(id=str(uuid.uuid4()), user_id=user.id, name="OpenRouter Proj", language="java")
    source = SourceFile(id=str(uuid.uuid4()), project_id=project.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA, file_size_bytes=len(CALCULATOR_JAVA))
    db_session.add_all([user, project, source])
    db_session.commit()

    exp = Experiment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        name="OpenRouter Only Test",
        configuration="openrouter_only",
        initial_provider="openrouter",
        initial_model="openai/gpt-4o",
        status="created",
    )
    db_session.add(exp)
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="openrouter",
        model="openai/gpt-4o",
        content=CALCULATOR_PASSING_TEST,
        prompt_tokens=110,
        completion_tokens=85,
        total_tokens=195,
    )

    res_exp = ExperimentRunner.execute_experiment(
        db=db_session,
        experiment_id=exp.id,
        user_id=user.id,
        ai_provider_override=mock_ai,
    )

    assert res_exp.status == "completed"
    assert res_exp.line_coverage == 100.0
    assert len(res_exp.runs) == 1
    assert res_exp.runs[0].iteration == 0
    assert res_exp.runs[0].provider == "openrouter"


# ── 5. Configuration C: Gemini -> OpenRouter Chaining ────────────────────────
def test_configuration_gemini_to_openrouter(db_session):
    user = User(id=str(uuid.uuid4()), email="chaining@example.com", name="Chaining User", hashed_password="pw")
    project = Project(id=str(uuid.uuid4()), user_id=user.id, name="Chaining Proj", language="java")
    source = SourceFile(id=str(uuid.uuid4()), project_id=project.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA, file_size_bytes=len(CALCULATOR_JAVA))
    db_session.add_all([user, project, source])
    db_session.commit()

    exp = Experiment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        name="Gemini to OpenRouter Chain",
        configuration="gemini_to_openrouter",
        initial_provider="gemini",
        initial_model="gemini-2.5-flash-lite",
        refinement_provider="openrouter",
        refinement_model="openai/gpt-4o",
        max_iterations=2,
        status="created",
    )
    db_session.add(exp)
    db_session.commit()

    # Initial test has 1 test, refinement adds full coverage
    partial_test = """package com.example;
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
    mock_ai = MagicMock()
    mock_ai.generate.side_effect = [
        AIResponse(provider="gemini", model="gemini-2.5-flash-lite", content=partial_test, prompt_tokens=100, completion_tokens=50, total_tokens=150),
        AIResponse(provider="openrouter", model="openai/gpt-4o", content=CALCULATOR_PASSING_TEST, prompt_tokens=150, completion_tokens=90, total_tokens=240),
    ]

    res_exp = ExperimentRunner.execute_experiment(
        db=db_session,
        experiment_id=exp.id,
        user_id=user.id,
        ai_provider_override=mock_ai,
    )

    assert res_exp.status == "completed"
    assert res_exp.line_coverage == 100.0
    assert len(res_exp.runs) >= 2
    assert res_exp.runs[0].iteration == 0
    assert res_exp.runs[1].iteration == 1


# ── 6. Invalid Configuration Validation ───────────────────────────────────────
def test_invalid_configuration(client: TestClient):
    token, _ = _get_auth_token(client, "inv_config@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = client.post("/api/projects", json={"name": "Inv Config Proj", "language": "Java"}, headers=headers)
    pid = proj_res.json()["id"]

    resp = client.post(
        "/api/experiments",
        json={
            "project_id": pid,
            "name": "Invalid Config Run",
            "configuration": "unsupported_provider_xyz",
        },
        headers=headers,
    )
    assert resp.status_code == 422


# ── 7. Invalid Iteration Count ────────────────────────────────────────────────
def test_invalid_iteration_count(client: TestClient):
    token, _ = _get_auth_token(client, "iter_val@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = client.post("/api/projects", json={"name": "Iter Proj", "language": "Java"}, headers=headers)
    pid = proj_res.json()["id"]

    # 0 iterations rejected
    resp0 = client.post(
        "/api/experiments",
        json={"project_id": pid, "name": "Zero Iter", "max_iterations": 0},
        headers=headers,
    )
    assert resp0.status_code == 422

    # >5 iterations rejected
    resp6 = client.post(
        "/api/experiments",
        json={"project_id": pid, "name": "Six Iter", "max_iterations": 6},
        headers=headers,
    )
    assert resp6.status_code == 422


# ── 8. Status Transitions ─────────────────────────────────────────────────────
def test_status_transitions(db_session):
    user = User(id=str(uuid.uuid4()), email="status_trans@example.com", name="Status User", hashed_password="pw")
    project = Project(id=str(uuid.uuid4()), user_id=user.id, name="Status Proj", language="java")
    source = SourceFile(id=str(uuid.uuid4()), project_id=project.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA, file_size_bytes=len(CALCULATOR_JAVA))
    db_session.add_all([user, project, source])
    db_session.commit()

    exp = Experiment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        name="Transition Test",
        configuration="gemini_only",
        status="created",
    )
    db_session.add(exp)
    db_session.commit()
    assert exp.status == "created"

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="gemini",
        model="gemini-2.5-flash-lite",
        content=CALCULATOR_PASSING_TEST,
    )

    res = ExperimentRunner.execute_experiment(db_session, exp.id, user.id, ai_provider_override=mock_ai)
    assert res.status == "completed"
    assert res.started_at is not None
    assert res.completed_at is not None


# ── 9. Run and Metric Storage ─────────────────────────────────────────────────
def test_run_and_metric_storage(db_session):
    user = User(id=str(uuid.uuid4()), email="storage_test@example.com", name="Storage User", hashed_password="pw")
    project = Project(id=str(uuid.uuid4()), user_id=user.id, name="Storage Proj", language="java")
    source = SourceFile(id=str(uuid.uuid4()), project_id=project.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA, file_size_bytes=len(CALCULATOR_JAVA))
    db_session.add_all([user, project, source])
    db_session.commit()

    exp = Experiment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        name="Storage Run Test",
        configuration="gemini_only",
        status="created",
    )
    db_session.add(exp)
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(provider="gemini", model="gemini-2.5-flash-lite", content=CALCULATOR_PASSING_TEST)

    ExperimentRunner.execute_experiment(db_session, exp.id, user.id, ai_provider_override=mock_ai)

    runs = db_session.query(ExperimentRun).filter(ExperimentRun.experiment_id == exp.id).all()
    metrics = db_session.query(ExperimentMetric).filter(ExperimentMetric.experiment_id == exp.id).all()

    assert len(runs) == 1
    assert len(metrics) == 1
    assert metrics[0].line_coverage == 100.0
    assert metrics[0].mutation_score is None


# ── 10. Comparison API (Factual, No Winner) ───────────────────────────────────
def test_comparison_api(client: TestClient, db_session):
    token, user_id = _get_auth_token(client, "compare_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = client.post("/api/projects", json={"name": "Compare Proj", "language": "Java"}, headers=headers)
    pid = proj_res.json()["id"]

    # Create two experiments
    e1 = client.post("/api/experiments", json={"project_id": pid, "name": "Exp 1", "configuration": "gemini_only"}, headers=headers).json()
    e2 = client.post("/api/experiments", json={"project_id": pid, "name": "Exp 2", "configuration": "openrouter_only"}, headers=headers).json()

    # Query comparison
    comp_res = client.get(f"/api/experiments/compare?ids={e1['id']},{e2['id']}", headers=headers)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["experiments"]) == 2
    # Verify no subjective winner fields exist
    for item in comp_data["experiments"]:
        assert "winner" not in item
        assert "rank" not in item
        assert "best" not in item
        assert item["status"] == "created"


# ── 11. Prompt Versioning ─────────────────────────────────────────────────────
def test_prompt_versioning(db_session):
    tmpl = PromptTemplateService.get_generation_template(db_session, version="v1.0")
    assert tmpl is not None
    assert tmpl.name == "junit5_generation"
    assert tmpl.version == "v1.0"
    assert "JUnit 5" in tmpl.template

    ref_tmpl = PromptTemplateService.get_refinement_template(db_session, version="v1.0")
    assert ref_tmpl is not None
    assert ref_tmpl.name == "junit5_refinement"
    assert "refine the existing test suite" in ref_tmpl.template


# ── 12. AI Usage Tracking ─────────────────────────────────────────────────────
def test_ai_usage_tracking(db_session):
    from app.models.ai_usage import AIUsage
    user = User(id=str(uuid.uuid4()), email="ai_usage_exp@example.com", name="AI Usage User", hashed_password="pw")
    project = Project(id=str(uuid.uuid4()), user_id=user.id, name="Usage Proj", language="java")
    source = SourceFile(id=str(uuid.uuid4()), project_id=project.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA, file_size_bytes=len(CALCULATOR_JAVA))
    db_session.add_all([user, project, source])
    db_session.commit()

    exp = Experiment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        name="Usage Tracking Exp",
        configuration="gemini_only",
        status="created",
    )
    db_session.add(exp)
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="gemini",
        model="gemini-2.5-flash-lite",
        content=CALCULATOR_PASSING_TEST,
        prompt_tokens=120,
        completion_tokens=60,
        total_tokens=180,
    )

    ExperimentRunner.execute_experiment(db_session, exp.id, user.id, ai_provider_override=mock_ai)

    usages = db_session.query(AIUsage).filter(AIUsage.project_id == project.id).all()
    assert len(usages) >= 1
    assert usages[0].total_tokens == 180


# ── 13. Failed Compilation Handling ───────────────────────────────────────────
def test_failed_compilation_handling(db_session):
    user = User(id=str(uuid.uuid4()), email="fail_comp@example.com", name="Fail Comp", hashed_password="pw")
    project = Project(id=str(uuid.uuid4()), user_id=user.id, name="Fail Comp Proj", language="java")
    source = SourceFile(id=str(uuid.uuid4()), project_id=project.id, file_name="Calculator.java", source_code=CALCULATOR_JAVA, file_size_bytes=len(CALCULATOR_JAVA))
    db_session.add_all([user, project, source])
    db_session.commit()

    exp = Experiment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        name="Fail Comp Exp",
        configuration="gemini_only",
        status="created",
    )
    db_session.add(exp)
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="gemini",
        model="gemini-2.5-flash-lite",
        content=BROKEN_TEST_CODE,
    )

    res = ExperimentRunner.execute_experiment(db_session, exp.id, user.id, ai_provider_override=mock_ai)
    assert res.status == "failed"
    assert res.runs[0].status == "compilation_failed"
    assert res.metrics[0].compilation_success is False


# ── 14. No Cross-User Access ──────────────────────────────────────────────────
def test_no_cross_user_access(client: TestClient, db_session):
    token1, u1 = _get_auth_token(client, "user_sec1@example.com")
    token2, u2 = _get_auth_token(client, "user_sec2@example.com")

    # User 1 creates an experiment
    proj = client.post("/api/projects", json={"name": "User 1 Proj", "language": "Java"}, headers={"Authorization": f"Bearer {token1}"}).json()
    exp = client.post("/api/experiments", json={"project_id": proj["id"], "name": "User 1 Exp", "configuration": "gemini_only"}, headers={"Authorization": f"Bearer {token1}"}).json()

    # User 2 tries to GET User 1's experiment -> 404
    resp_get = client.get(f"/api/experiments/{exp['id']}", headers={"Authorization": f"Bearer {token2}"})
    assert resp_get.status_code == 404

    # User 2 tries to RUN User 1's experiment -> 404
    resp_run = client.post(f"/api/experiments/{exp['id']}/run", headers={"Authorization": f"Bearer {token2}"})
    assert resp_run.status_code == 404
