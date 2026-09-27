"""
AI provider tests — uses mocking to avoid real API calls.
Conforms strictly to Phase 2 specification Section 35.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from app.services.ai.base import AIResponse


def _get_token(client):
    client.post("/api/auth/register", json={
        "email": "ai@example.com", "password": "Secure@Pass1", "name": "AI User",
    })
    resp = client.post("/api/auth/login", json={"email": "ai@example.com", "password": "Secure@Pass1"})
    return resp.json()["access_token"]


def test_ai_health_endpoint(client):
    """AI health endpoint returns status of configured providers."""
    resp = client.get("/api/ai/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "openrouter" in data
    assert "gemini" in data
    assert "agentrouter" in data


@pytest.mark.asyncio
async def test_openrouter_mocked(client):
    """OpenRouter test endpoint returns mocked generation without calling external API."""
    token = _get_token(client)
    mock_resp = AIResponse(
        provider="openrouter",
        model="openai/gpt-4o",
        content="public class CalculatorTest {}",
        prompt_tokens=50,
        completion_tokens=25,
        total_tokens=75,
        latency_ms=120,
    )
    with patch("app.services.ai.openrouter.OpenRouterProvider.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_resp
        resp = client.post(
            "/api/ai/openrouter/test",
            json={"prompt": "Generate test for Calculator"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["provider"] == "openrouter"
        assert "CalculatorTest" in data["content"]


@pytest.mark.asyncio
async def test_gemini_mocked(client):
    """Gemini test endpoint returns mocked generation without calling external API."""
    token = _get_token(client)
    mock_resp = AIResponse(
        provider="gemini",
        model="gemini-1.5-pro",
        content="import org.junit.jupiter.api.Test;\npublic class CalculatorTest {}",
        prompt_tokens=40,
        completion_tokens=20,
        total_tokens=60,
        latency_ms=110,
    )
    with patch("app.services.ai.gemini.GeminiProvider.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_resp
        resp = client.post(
            "/api/ai/gemini/test",
            json={"prompt": "Generate test for Calculator"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["provider"] == "gemini"
        assert "CalculatorTest" in data["content"]


def test_invalid_project_id(client):
    """Non-existent project should return 404."""
    token = _get_token(client)
    resp = client.get("/api/projects/nonexistent-id", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404
