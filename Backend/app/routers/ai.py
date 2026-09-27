"""
AI provider health and test API router.

SECURITY:
- Never exposes API keys in responses
- Model and provider info only — no credentials
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.ai import get_provider
from app.services.ai.base import AINotConfiguredError, AIProviderError

router = APIRouter(prefix="/ai", tags=["AI"])


class AITestRequest(BaseModel):
    prompt: str
    model: str | None = None


class AITestResponse(BaseModel):
    provider: str
    model: str
    content: str
    usage: dict[str, int] = {}


class AgentRouterConnectionTestResponse(BaseModel):
    provider: str
    status: str
    model: str | None = None
    response: str | None = None
    error_code: str | None = None
    message: str | None = None


@router.get("/health", summary="Check AI provider availability")
async def ai_health() -> dict[str, Any]:
    """
    Check which AI providers are configured and available.
    Does NOT expose API keys or credentials.
    """
    from app.config import get_settings
    settings = get_settings()
    return {
        "gemini": {
            "configured": settings.gemini_configured,
        },
        "openrouter": {
            "configured": settings.openrouter_configured,
        },
        "agentrouter": {
            "configured": settings.agentrouter_configured,
            "model": settings.AGENTROUTER_MODEL or None,
        },
    }


@router.post(
    "/providers/agentrouter/test",
    response_model=AgentRouterConnectionTestResponse,
    summary="Controlled connection test for AgentRouter",
)
async def test_agentrouter_connection(
    current_user: User = Depends(get_current_user),
) -> AgentRouterConnectionTestResponse:
    from app.config import get_settings
    settings = get_settings()
    provider = get_provider("agentrouter")

    if not bool(settings.AGENTROUTER_API_KEY.strip()):
        return AgentRouterConnectionTestResponse(
            provider="agentrouter",
            status="failed",
            error_code="NOT_CONFIGURED",
            message="AgentRouter API key is not configured. Set AGENTROUTER_API_KEY in .env",
        )

    model_to_test = (settings.AGENTROUTER_MODEL or "").strip()
    if not model_to_test:
        return AgentRouterConnectionTestResponse(
            provider="agentrouter",
            status="failed",
            error_code="AGENTROUTER_MODEL_NOT_CONFIGURED",
            message="AgentRouter model is not configured.",
        )

    try:
        resp = await provider.generate(
            system_prompt="You are a system health check assistant.",
            user_prompt="Reply with exactly: OK",
            model=model_to_test,
            max_tokens=10,
        )
        return AgentRouterConnectionTestResponse(
            provider="agentrouter",
            status="connected",
            model=resp.model,
            response=resp.content.strip(),
        )
    except AIProviderError as e:
        return AgentRouterConnectionTestResponse(
            provider="agentrouter",
            status="failed",
            error_code=e.error_code or "PROVIDER_ERROR",
            message=str(e),
        )
    except Exception:
        return AgentRouterConnectionTestResponse(
            provider="agentrouter",
            status="failed",
            error_code="CONNECTION_FAILED",
            message="AgentRouter connection failed.",
        )



@router.post(
    "/openrouter/test",
    response_model=AITestResponse,
    summary="Test the OpenRouter AI provider",
)
async def test_openrouter(
    payload: AITestRequest,
    current_user: User = Depends(get_current_user),
) -> AITestResponse:
    """Send a test prompt to OpenRouter. Requires authentication."""
    provider = get_provider("openrouter")
    try:
        response = await provider.generate(
            system_prompt="You are a helpful assistant.",
            user_prompt=payload.prompt,
            model=payload.model or None,
        )
    except AINotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AI_NOT_CONFIGURED", "message": str(e), "provider": "openrouter"},
        )
    except AIProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "AI_PROVIDER_ERROR", "message": str(e), "provider": "openrouter"},
        )
    return AITestResponse(
        provider=response.provider,
        model=response.model,
        content=response.content,
        usage={
            "prompt_tokens": response.prompt_tokens,
            "completion_tokens": response.completion_tokens,
            "total_tokens": response.total_tokens,
        },
    )


@router.post(
    "/agentrouter/test",
    response_model=AITestResponse,
    summary="Test the AgentRouter AI provider",
)
async def test_agentrouter(
    payload: AITestRequest,
    current_user: User = Depends(get_current_user),
) -> AITestResponse:
    """Send a test prompt to AgentRouter. Requires authentication."""
    provider = get_provider("agentrouter")
    try:
        response = await provider.generate(
            system_prompt="You are a helpful assistant.",
            user_prompt=payload.prompt,
            model=payload.model or None,
        )
    except AINotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AI_NOT_CONFIGURED", "message": str(e), "provider": "agentrouter"},
        )
    except AIProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "AI_PROVIDER_ERROR", "message": str(e), "provider": "agentrouter"},
        )
    return AITestResponse(
        provider=response.provider,
        model=response.model,
        content=response.content,
        usage={
            "prompt_tokens": response.prompt_tokens,
            "completion_tokens": response.completion_tokens,
            "total_tokens": response.total_tokens,
        },
    )


@router.post(
    "/gemini/test",
    response_model=AITestResponse,
    summary="Test the Gemini AI provider",
)
async def test_gemini(
    payload: AITestRequest,
    current_user: User = Depends(get_current_user),
) -> AITestResponse:
    """Send a test prompt to Gemini. Requires authentication."""
    provider = get_provider("gemini")
    try:
        response = await provider.generate(
            system_prompt="You are a helpful assistant.",
            user_prompt=payload.prompt,
            model=payload.model or None,
        )
    except AINotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AI_NOT_CONFIGURED", "message": str(e), "provider": "gemini"},
        )
    except AIProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "AI_PROVIDER_ERROR", "message": str(e), "provider": "gemini"},
        )
    return AITestResponse(
        provider=response.provider,
        model=response.model,
        content=response.content,
        usage={
            "prompt_tokens": response.prompt_tokens,
            "completion_tokens": response.completion_tokens,
            "total_tokens": response.total_tokens,
        },
    )
