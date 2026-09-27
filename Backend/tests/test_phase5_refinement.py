"""
Phase 5 Automated Tests: OpenRouter / GPT-4o Multi-LLM Iterative Refinement.

Tests all 15 scenarios required by Section 27 and the deterministic E2E integration test from Section 28:
1. OpenRouter provider
2. OpenRouter mocked response
3. OpenRouter error handling
4. Invalid API key handling
5. Refinement prompt creation
6. Refinement result storage
7. Iteration limit validation
8. Refinement history retrieval
9. Project ownership security
10. Invalid generation ID
11. Invalid Java output handling
12. Maven refinement execution
13. JaCoCo coverage feedback in refinement
14. Failed test feedback in refinement
15. No infinite refinement loop
16. Deterministic End-to-End Refinement Integration Test
"""
import json
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.engines.maven_runner import maven_available
from app.models.coverage_result import CoverageResult
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.test_generation import TestGeneration
from app.models.test_refinement import TestRefinement
from app.models.test_result import TestResult
from app.models.user import User
from app.services.ai.base import AINotConfiguredError, AIProviderError, AIResponse
from app.services.ai.openrouter import OpenRouterProvider
from app.services.feedback_service import FeedbackService
from app.services.refinement_service import RefinementService

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

CALCULATOR_INITIAL_TEST_JAVA = """\
package com.example;

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

CALCULATOR_REFINED_TEST_JAVA = """\
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


def _get_auth_token(client: TestClient, email: str = "phase5_user@example.com") -> str:
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password@123", "name": "Phase5 Tester"},
    )
    resp = client.post("/api/auth/login", json={"email": email, "password": "Password@123"})
    return resp.json()["access_token"]


# ── 1. OpenRouter Provider Properties ──────────────────────────────────────────
def test_openrouter_provider():
    provider = OpenRouterProvider()
    assert provider.name == "openrouter"
    assert isinstance(provider.is_configured, bool)
    headers = provider._get_headers()
    assert "Authorization" in headers
    assert "Content-Type" in headers


# ── 2. OpenRouter Mocked Response ──────────────────────────────────────────────
@pytest.mark.anyio
async def test_openrouter_mocked_response():
    provider = OpenRouterProvider()
    mock_resp_data = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "```java\npackage com.example;\npublic class SampleTest {}\n```",
                }
            }
        ],
        "model": "openai/gpt-4o",
        "usage": {
            "prompt_tokens": 120,
            "completion_tokens": 60,
            "total_tokens": 180,
        },
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_resp_data
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        res = await provider.generate(
            system_prompt="You are an expert",
            user_prompt="Write tests",
            model="openai/gpt-4o",
        )

        assert res.provider == "openrouter"
        assert res.model == "openai/gpt-4o"
        assert "SampleTest" in res.content
        assert res.prompt_tokens == 120
        assert res.completion_tokens == 60
        assert res.total_tokens == 180


# ── 3. OpenRouter Error Handling ───────────────────────────────────────────────
@pytest.mark.anyio
async def test_openrouter_error():
    provider = OpenRouterProvider()
    import httpx

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        req = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
        mock_post.side_effect = httpx.HTTPStatusError("Server Error", request=req, response=mock_resp)

        with pytest.raises(AIProviderError):
            await provider.generate(
                system_prompt="sys",
                user_prompt="usr",
                model="openai/gpt-4o",
            )


# ── 4. Invalid API Key Handling ───────────────────────────────────────────────
@pytest.mark.anyio
async def test_invalid_api_key_handling():
    with patch("app.config.Settings.openrouter_configured", False):
        provider = OpenRouterProvider()
        with pytest.raises(AINotConfiguredError):
            await provider.generate(
                system_prompt="sys",
                user_prompt="usr",
            )


# ── 5. Refinement Prompt Creation ──────────────────────────────────────────────
def test_refinement_prompt_creation():
    feedback = FeedbackService.build_feedback(
        source_code=CALCULATOR_JAVA,
        current_test_code=CALCULATOR_INITIAL_TEST_JAVA,
        compile_success=True,
        total_tests=1,
        passed_tests=1,
        failed_tests=0,
        line_coverage=33.3,
        branch_coverage=0.0,
        instruction_coverage=25.0,
        uncovered_lines=[28, 29, 33, 34],
        uncovered_branches=[33],
    )

    prompt = FeedbackService.format_user_prompt(
        source_code=CALCULATOR_JAVA,
        current_test_code=CALCULATOR_INITIAL_TEST_JAVA,
        feedback=feedback,
    )

    assert "Calculator" in prompt
    assert "CalculatorTest" in prompt
    assert "33.3" in prompt
    assert "uncovered_lines" in prompt
    assert "28" in prompt


# ── 6. Refinement Result Storage ───────────────────────────────────────────────
def test_refinement_result_storage(db_session):
    user = User(
        id=str(uuid.uuid4()),
        email="refine_user@example.com",
        name="Refine User",
        hashed_password="hash",
    )
    project = Project(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Refine Storage Project",
        language="java",
    )
    source = SourceFile(
        id=str(uuid.uuid4()),
        project_id=project.id,
        file_name="Calculator.java",
        source_code=CALCULATOR_JAVA,
        file_size_bytes=len(CALCULATOR_JAVA.encode()),
    )
    gen = TestGeneration(
        id=str(uuid.uuid4()),
        project_id=project.id,
        source_file_id=source.id,
        user_id=user.id,
        provider="gemini",
        model="gemini-2.5-flash-lite",
        framework="junit5",
        test_code=CALCULATOR_INITIAL_TEST_JAVA,
    )
    db_session.add_all([user, project, source, gen])
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="openrouter",
        model="openai/gpt-4o",
        content=f"```java\n{CALCULATOR_REFINED_TEST_JAVA}\n```",
        prompt_tokens=100,
        completion_tokens=80,
        total_tokens=180,
        latency_ms=250,
    )

    res = RefinementService.refine_single_step(
        db=db_session,
        project_id=project.id,
        user_id=user.id,
        generation_id=gen.id,
        ai_provider_override=mock_ai,
    )

    assert res["status"] == "completed"
    assert res["iteration"] == 1
    assert "CalculatorTest" in res["test_code"]

    # Verify stored in DB
    ref_db = db_session.query(TestRefinement).filter(TestRefinement.id == res["refinement_id"]).first()
    assert ref_db is not None
    assert ref_db.iteration == 1
    assert ref_db.generation_id == gen.id
    assert ref_db.provider == "openrouter"
    assert ref_db.total_tokens == 180


# ── 7. Iteration Limit Validation ──────────────────────────────────────────────
def test_iteration_limit(client: TestClient, db_session):
    token = _get_auth_token(client, "limit_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = client.post("/api/projects", json={"name": "Limit Project", "language": "Java"}, headers=headers)
    pid = proj_res.json()["id"]

    # Test max_iterations = 0 -> 422
    resp0 = client.post(
        f"/api/projects/{pid}/refine-tests",
        json={"generation_id": str(uuid.uuid4()), "max_iterations": 0},
        headers=headers,
    )
    assert resp0.status_code == 422

    # Test max_iterations = 6 -> 422
    resp6 = client.post(
        f"/api/projects/{pid}/refine-tests",
        json={"generation_id": str(uuid.uuid4()), "max_iterations": 6},
        headers=headers,
    )
    assert resp6.status_code == 422


# ── 8. Refinement History Retrieval ────────────────────────────────────────────
def test_refinement_history(client: TestClient, db_session):
    token = _get_auth_token(client, "history_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = client.post("/api/projects", json={"name": "Hist Project", "language": "Java"}, headers=headers)
    pid = proj_res.json()["id"]

    user_db = db_session.query(User).filter(User.email == "history_user@example.com").first()
    gen_id = str(uuid.uuid4())
    gen = TestGeneration(
        id=gen_id,
        project_id=pid,
        user_id=user_db.id,
        provider="gemini",
        model="gemini-2.5-flash-lite",
        framework="junit5",
        test_code=CALCULATOR_INITIAL_TEST_JAVA,
    )
    db_session.add(gen)

    # Insert 2 manual refinements
    ref1 = TestRefinement(
        id=str(uuid.uuid4()),
        project_id=pid,
        generation_id=gen_id,
        iteration=1,
        input_test_code=CALCULATOR_INITIAL_TEST_JAVA,
        refined_test_code=CALCULATOR_REFINED_TEST_JAVA,
        provider="openrouter",
        model="openai/gpt-4o",
        status="completed",
    )
    ref2 = TestRefinement(
        id=str(uuid.uuid4()),
        project_id=pid,
        generation_id=gen_id,
        iteration=2,
        input_test_code=CALCULATOR_REFINED_TEST_JAVA,
        refined_test_code=CALCULATOR_REFINED_TEST_JAVA,
        provider="openrouter",
        model="openai/gpt-4o",
        status="completed",
    )
    db_session.add_all([ref1, ref2])
    db_session.commit()

    resp = client.get(f"/api/projects/{pid}/generations/{gen_id}/refinements", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 2
    assert items[0]["iteration"] == 1
    assert items[1]["iteration"] == 2


# ── 9. Project Ownership Security ──────────────────────────────────────────────
def test_project_ownership(client: TestClient, db_session):
    owner_token = _get_auth_token(client, "owner_user@example.com")
    other_token = _get_auth_token(client, "other_user@example.com")

    resp = client.post(
        "/api/projects",
        json={"name": "Secure Project", "language": "Java"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    pid = resp.json()["id"]

    # Other user attempts refinement
    bad_resp = client.post(
        f"/api/projects/{pid}/refine-tests",
        json={"generation_id": str(uuid.uuid4()), "max_iterations": 3},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert bad_resp.status_code == 403


# ── 10. Invalid Generation ID ──────────────────────────────────────────────────
def test_invalid_generation_id(client: TestClient, db_session):
    token = _get_auth_token(client, "inv_gen_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/projects",
        json={"name": "Inv Gen Project", "language": "Java"},
        headers=headers,
    )
    pid = resp.json()["id"]

    fake_gen_id = str(uuid.uuid4())
    bad_resp = client.post(
        f"/api/projects/{pid}/refine-tests",
        json={"generation_id": fake_gen_id, "max_iterations": 3},
        headers=headers,
    )
    assert bad_resp.status_code == 404


# ── 11. Invalid Java Output Handling ───────────────────────────────────────────
def test_invalid_java_output_handling(db_session):
    user = User(
        id=str(uuid.uuid4()),
        email="inv_java@example.com",
        name="Invalid Java Tester",
        hashed_password="hash",
    )
    project = Project(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Invalid Java Project",
        language="java",
    )
    gen = TestGeneration(
        id=str(uuid.uuid4()),
        project_id=project.id,
        user_id=user.id,
        provider="gemini",
        model="gemini-2.5-flash-lite",
        framework="junit5",
        test_code=CALCULATOR_INITIAL_TEST_JAVA,
    )
    db_session.add_all([user, project, gen])
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="openrouter",
        model="openai/gpt-4o",
        content="I am sorry, I cannot generate unit tests for this class.",
        prompt_tokens=50,
        completion_tokens=15,
        total_tokens=65,
    )

    res = RefinementService.refine_single_step(
        db=db_session,
        project_id=project.id,
        user_id=user.id,
        generation_id=gen.id,
        ai_provider_override=mock_ai,
    )

    assert res["status"] == "invalid_output"
    assert "failed validation" in res["error_message"]


# ── 12. Maven Refinement Execution ─────────────────────────────────────────────
@pytest.mark.skipif(not maven_available(), reason="Maven not installed")
def test_maven_refinement_execution(db_session):
    user = User(
        id=str(uuid.uuid4()),
        email="mvn_refine@example.com",
        name="Mvn Refine",
        hashed_password="hash",
    )
    project = Project(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Mvn Refine Project",
        language="java",
        build_tool="maven",
    )
    source = SourceFile(
        id=str(uuid.uuid4()),
        project_id=project.id,
        file_name="Calculator.java",
        source_code=CALCULATOR_JAVA,
        file_size_bytes=len(CALCULATOR_JAVA.encode()),
    )
    gen = TestGeneration(
        id=str(uuid.uuid4()),
        project_id=project.id,
        source_file_id=source.id,
        user_id=user.id,
        provider="gemini",
        model="gemini-2.5-flash-lite",
        framework="junit5",
        test_code=CALCULATOR_INITIAL_TEST_JAVA,
    )
    db_session.add_all([user, project, source, gen])
    db_session.commit()

    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="openrouter",
        model="openai/gpt-4o",
        content=CALCULATOR_REFINED_TEST_JAVA,
        prompt_tokens=100,
        completion_tokens=100,
        total_tokens=200,
    )

    res = RefinementService.refine_single_step(
        db=db_session,
        project_id=project.id,
        user_id=user.id,
        generation_id=gen.id,
        ai_provider_override=mock_ai,
    )

    assert res["status"] == "completed"
    after = res["after"]
    assert after["passed_tests"] == 3
    assert after["failed_tests"] == 0
    assert after["line_coverage"] == 100.0


# ── 13. JaCoCo Feedback Passed to Refinement ───────────────────────────────────
def test_jacoco_feedback_passed_to_refinement():
    fb = FeedbackService.build_feedback(
        source_code=CALCULATOR_JAVA,
        current_test_code=CALCULATOR_INITIAL_TEST_JAVA,
        line_coverage=50.0,
        branch_coverage=40.0,
        instruction_coverage=45.0,
        method_coverage=66.7,
        class_coverage=100.0,
        uncovered_lines=[28, 29],
        uncovered_branches=[33],
    )
    assert fb["coverage"]["line"] == 50.0
    assert fb["coverage"]["branch"] == 40.0
    assert fb["coverage"]["instruction"] == 45.0
    assert fb["uncovered_lines"] == [28, 29]
    assert fb["uncovered_branches"] == [33]


# ── 14. Failed Tests Passed to Refinement ──────────────────────────────────────
def test_failed_tests_passed_to_refinement():
    failures = [
        {"test": "testDivideByZero", "message": "Expected IllegalArgumentException"}
    ]
    fb = FeedbackService.build_feedback(
        source_code=CALCULATOR_JAVA,
        current_test_code=CALCULATOR_INITIAL_TEST_JAVA,
        compile_success=True,
        failed_tests=1,
        passed_tests=2,
        failures=failures,
    )
    assert fb["test_execution"]["failed"] == 1
    assert len(fb["failures"]) == 1
    assert fb["failures"][0]["test"] == "testDivideByZero"


# ── 15. No Infinite Refinement Loop ────────────────────────────────────────────
def test_no_infinite_refinement_loop(db_session):
    user = User(
        id=str(uuid.uuid4()),
        email="loop_user@example.com",
        name="Loop User",
        hashed_password="hash",
    )
    project = Project(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="Loop Project",
        language="java",
    )
    gen = TestGeneration(
        id=str(uuid.uuid4()),
        project_id=project.id,
        user_id=user.id,
        provider="gemini",
        model="gemini-2.5-flash-lite",
        framework="junit5",
        test_code=CALCULATOR_INITIAL_TEST_JAVA,
    )
    db_session.add_all([user, project, gen])
    db_session.commit()

    mock_ai = MagicMock()
    # Return valid code each time
    mock_ai.generate.return_value = AIResponse(
        provider="openrouter",
        model="openai/gpt-4o",
        content=CALCULATOR_REFINED_TEST_JAVA,
        prompt_tokens=50,
        completion_tokens=50,
        total_tokens=100,
    )

    res = RefinementService.run_refinement_loop(
        db=db_session,
        project_id=project.id,
        user_id=user.id,
        generation_id=gen.id,
        max_iterations=3,
        ai_provider_override=mock_ai,
    )

    assert res["iterations_count"] <= 3
    assert res["iterations_count"] >= 1


# ── 16. Deterministic End-to-End Refinement Integration Test (Section 28) ──────
@pytest.mark.skipif(not maven_available(), reason="Maven not installed")
def test_deterministic_e2e_refinement(db_session):
    user = User(
        id=str(uuid.uuid4()),
        email="e2e_refine@example.com",
        name="E2E Refiner",
        hashed_password="hash",
    )
    project = Project(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name="E2E Refine Project",
        language="java",
        build_tool="maven",
    )
    source = SourceFile(
        id=str(uuid.uuid4()),
        project_id=project.id,
        file_name="Calculator.java",
        source_code=CALCULATOR_JAVA,
        file_size_bytes=len(CALCULATOR_JAVA.encode()),
    )
    gen = TestGeneration(
        id=str(uuid.uuid4()),
        project_id=project.id,
        source_file_id=source.id,
        user_id=user.id,
        provider="gemini",
        model="gemini-2.5-flash-lite",
        framework="junit5",
        test_code=CALCULATOR_INITIAL_TEST_JAVA,
    )
    db_session.add_all([user, project, source, gen])
    db_session.commit()

    # Refinement iteration 1: adds subtract and divide
    mock_ai = MagicMock()
    mock_ai.generate.return_value = AIResponse(
        provider="openrouter",
        model="openai/gpt-4o",
        content=CALCULATOR_REFINED_TEST_JAVA,
        prompt_tokens=150,
        completion_tokens=120,
        total_tokens=270,
    )

    loop_res = RefinementService.run_refinement_loop(
        db=db_session,
        project_id=project.id,
        user_id=user.id,
        generation_id=gen.id,
        max_iterations=2,
        ai_provider_override=mock_ai,
    )

    assert loop_res["iterations_count"] >= 1
    assert loop_res["final_status"] in ("completed", "target_coverage_reached")

    # Verify original generation code is strictly preserved
    gen_db = db_session.query(TestGeneration).filter(TestGeneration.id == gen.id).first()
    assert gen_db.test_code == CALCULATOR_INITIAL_TEST_JAVA

    # Verify refinement records stored
    refinements = (
        db_session.query(TestRefinement)
        .filter(TestRefinement.generation_id == gen.id)
        .order_by(TestRefinement.iteration.asc())
        .all()
    )
    assert len(refinements) >= 1
    first_ref = refinements[0]
    assert first_ref.iteration == 1
    assert first_ref.line_coverage == 100.0
    assert first_ref.branch_coverage == 100.0
