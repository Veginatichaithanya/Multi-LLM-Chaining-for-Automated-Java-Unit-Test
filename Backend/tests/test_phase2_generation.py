"""
Unit and integration tests for Phase 2:
- Model output validation (Java syntax, class declaration, @Test, JUnit imports, no empty output)
- status = "invalid_generation" handling and raw_response retention
- test_generations schema fields (project_id, source_id, framework, raw_response, updated_at)
- Generation response payload compliance (Section 16)
- Generation history GET /api/projects/{id}/generations & GET .../{id} (Section 17)
- Ownership isolation
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from app.services.ai.base import AIResponse
from app.utils.validators import validate_test_output


def test_validator_valid_junit_code():
    valid_code = """
    package com.example;

    import org.junit.jupiter.api.Test;
    import static org.junit.jupiter.api.Assertions.*;

    public class CalculatorTest {
        @Test
        void testAdd() {
            assertEquals(5, 2 + 3);
        }
    }
    """
    is_valid, reason = validate_test_output(valid_code)
    assert is_valid is True
    assert reason is None


def test_validator_empty_code():
    is_valid, reason = validate_test_output("")
    assert is_valid is False
    assert "empty" in reason.lower()

    is_valid, reason = validate_test_output("   \n   ")
    assert is_valid is False
    assert "empty" in reason.lower()


def test_validator_missing_imports():
    code = """
    public class CalculatorTest {
        @Test
        void testAdd() {
            assertEquals(5, 5);
        }
    }
    """
    is_valid, reason = validate_test_output(code)
    assert is_valid is False
    assert "junit" in reason.lower()


def test_validator_missing_class():
    code = """
    import org.junit.jupiter.api.Test;

    @Test
    void standaloneTest() {
        assert(true);
    }
    """
    is_valid, reason = validate_test_output(code)
    assert is_valid is False
    assert "class" in reason.lower()


def test_validator_missing_test_annotation():
    code = """
    import org.junit.jupiter.api.Test;

    public class CalculatorTest {
        void helperMethod() {
            int x = 1;
        }
    }
    """
    is_valid, reason = validate_test_output(code)
    assert is_valid is False
    assert "@test" in reason.lower()


def test_validator_unbalanced_braces():
    code = """
    import org.junit.jupiter.api.Test;

    public class CalculatorTest {
        @Test
        void testAdd() {
            int x = 1;
    }
    """
    is_valid, reason = validate_test_output(code)
    assert is_valid is False
    assert "brace" in reason.lower()


def _get_token_and_project(client, email="phase2_user@example.com"):
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "Phase2@Password123", "name": "Phase2 User"},
    )
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "Phase2@Password123"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj_resp = client.post(
        "/api/projects",
        json={"name": "Phase 2 Test Project", "language": "Java"},
        headers=headers,
    )
    project_id = proj_resp.json()["id"]

    # Upload source file
    calc_code = "public class Calculator { public int add(int a, int b) { return a + b; } }"
    upload_resp = client.post(
        f"/api/projects/{project_id}/source",
        json={"file_name": "Calculator.java", "source_code": calc_code},
        headers=headers,
    )
    source_id = upload_resp.json()["id"]

    return headers, project_id, source_id


def test_generation_valid_and_history(client):
    headers, project_id, source_id = _get_token_and_project(client, "gen_history_user@example.com")

    mock_valid_test = """
    package com.example;
    import org.junit.jupiter.api.Test;
    import static org.junit.jupiter.api.Assertions.*;

    class CalculatorTest {
        @Test
        void add_shouldReturnSum() {
            assertEquals(5, 2 + 3);
        }
    }
    """

    mock_resp = AIResponse(
        provider="gemini",
        model="gemini-2.5-flash-lite",
        content=f"```java\n{mock_valid_test}\n```",
        prompt_tokens=120,
        completion_tokens=85,
        total_tokens=205,
    )

    with patch("app.services.ai.gemini.GeminiProvider.generate", new_callable=AsyncMock, return_value=mock_resp):
        gen_resp = client.post(
            f"/api/projects/{project_id}/generate-tests",
            json={"provider": "gemini", "model": "gemini-2.5-flash-lite", "source_id": source_id},
            headers=headers,
        )
        assert gen_resp.status_code == 201
        data = gen_resp.json()

        # Check section 16 fields
        assert "generation_id" in data
        assert data["project_id"] == project_id
        assert data["source_id"] == source_id
        assert data["provider"] == "gemini"
        assert data["model"] == "gemini-2.5-flash-lite"
        assert data["framework"] == "junit5"
        assert data["status"] == "generated"
        assert "CalculatorTest" in data["test_code"]

        gen_id = data["generation_id"]

        # Check Section 17: GET /api/projects/{project_id}/generations
        history_resp = client.get(f"/api/projects/{project_id}/generations", headers=headers)
        assert history_resp.status_code == 200
        history = history_resp.json()
        assert len(history) >= 1
        assert history[0]["generation_id"] == gen_id
        assert history[0]["status"] == "generated"

        # Check Section 17: GET /api/projects/{project_id}/generations/{generation_id}
        single_resp = client.get(f"/api/projects/{project_id}/generations/{gen_id}", headers=headers)
        assert single_resp.status_code == 200
        single = single_resp.json()
        assert single["generation_id"] == gen_id
        assert single["status"] == "generated"


def test_generation_invalid_output_handling(client):
    headers, project_id, source_id = _get_token_and_project(client, "invalid_gen_user@example.com")

    # Raw model output that doesn't contain JUnit imports or class
    bad_output = "I cannot write this code for you right now."

    mock_resp = AIResponse(
        provider="gemini",
        model="gemini-2.5-flash-lite",
        content=bad_output,
        prompt_tokens=50,
        completion_tokens=20,
        total_tokens=70,
    )

    with patch("app.services.ai.gemini.GeminiProvider.generate", new_callable=AsyncMock, return_value=mock_resp):
        gen_resp = client.post(
            f"/api/projects/{project_id}/generate-tests",
            json={"provider": "gemini", "model": "gemini-2.5-flash-lite", "source_id": source_id},
            headers=headers,
        )
        assert gen_resp.status_code == 201
        data = gen_resp.json()

        # Must fail validation and have status = "invalid_generation"
        assert data["status"] == "invalid_generation"
        assert "Validation failed" in data["error_message"]
        assert data["test_code"] == bad_output


def test_generation_access_control(client):
    headers1, project_id1, _ = _get_token_and_project(client, "user_one@example.com")
    headers2, _, _ = _get_token_and_project(client, "user_two@example.com")

    # User 2 tries to access User 1's generations
    resp = client.get(f"/api/projects/{project_id1}/generations", headers=headers2)
    assert resp.status_code in (403, 404)

