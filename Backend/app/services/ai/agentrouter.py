"""
AgentRouter AI Provider implementation.

AgentRouter exposes an OpenAI-compatible chat completions API at
https://co.agentrouter.org/v1/chat/completions — authenticated via Bearer token.

SECURITY: The API key is NEVER returned in any response, log, or client bundle.
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from app.config import get_settings
from app.services.ai.base import AINotConfiguredError, AIProvider, AIProviderError, AIResponse

settings = get_settings()

_INFERENCE_ENDPOINT = "/chat/completions"


class AgentRouterProvider(AIProvider):
    """
    AgentRouter AI provider.

    Uses the OpenAI-compatible chat completions endpoint at
    https://co.agentrouter.org/v1 with Bearer token authentication.
    """

    @property
    def name(self) -> str:
        return "agentrouter"

    @property
    def is_configured(self) -> bool:
        return settings.agentrouter_configured

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.AGENTROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.FRONTEND_URL,
            "X-Title": "TestForge AI",
        }

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 8192,
    ) -> AIResponse:
        if not bool(settings.AGENTROUTER_API_KEY.strip()):
            raise AINotConfiguredError(
                "AgentRouter API key is not configured. Set AGENTROUTER_API_KEY in .env",
                provider=self.name,
            )

        effective_model = (model or settings.AGENTROUTER_MODEL or "").strip()
        if not effective_model:
            raise AIProviderError(
                message="AgentRouter model is not configured.",
                provider=self.name,
                status_code=400,
                error_code="AGENTROUTER_MODEL_NOT_CONFIGURED",
            )

        base_url = settings.AGENTROUTER_BASE_URL.rstrip("/")
        url = f"{base_url}{_INFERENCE_ENDPOINT}"

        payload: dict[str, Any] = {
            "model": effective_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            for attempt in range(settings.AI_MAX_RETRIES + 1):
                try:
                    resp = await client.post(url, json=payload, headers=self._get_headers())
                    latency_ms = int((time.monotonic() - start) * 1000)

                    if resp.status_code == 401:
                        raise AIProviderError(
                            "AgentRouter authentication failed.",
                            provider=self.name,
                            status_code=401,
                            error_code="UNAUTHORIZED",
                        )
                    if resp.status_code == 403:
                        raise AIProviderError(
                            "AgentRouter access forbidden.",
                            provider=self.name,
                            status_code=403,
                            error_code="FORBIDDEN",
                        )
                    if resp.status_code == 404:
                        raise AIProviderError(
                            "AgentRouter endpoint or model was not found.",
                            provider=self.name,
                            status_code=404,
                            error_code="NOT_FOUND",
                        )
                    if resp.status_code == 429:
                        if attempt < settings.AI_MAX_RETRIES:
                            continue
                        raise AIProviderError(
                            "AgentRouter rate limit reached.",
                            provider=self.name,
                            status_code=429,
                            error_code="RATE_LIMITED",
                        )
                    if resp.status_code in (500, 502, 503):
                        if attempt < settings.AI_MAX_RETRIES:
                            continue
                        raise AIProviderError(
                            "AgentRouter service temporarily unavailable.",
                            provider=self.name,
                            status_code=resp.status_code,
                            error_code="UNAVAILABLE",
                        )

                    resp.raise_for_status()

                    try:
                        data = resp.json()
                    except Exception as json_err:
                        raise AIProviderError(
                            "AgentRouter returned invalid JSON response.",
                            provider=self.name,
                            status_code=502,
                            error_code="INVALID_JSON",
                        ) from json_err

                    choices = data.get("choices")
                    if not choices or not isinstance(choices, list) or len(choices) == 0:
                        raise AIProviderError(
                            "AgentRouter returned an empty or malformed response.",
                            provider=self.name,
                            status_code=502,
                            error_code="MALFORMED_RESPONSE",
                        )

                    first_choice = choices[0]
                    message = first_choice.get("message")
                    if not message or not isinstance(message, dict):
                        raise AIProviderError(
                            "AgentRouter returned missing message in response.",
                            provider=self.name,
                            status_code=502,
                            error_code="MALFORMED_RESPONSE",
                        )

                    content = message.get("content")
                    if content is None or not str(content).strip():
                        raise AIProviderError(
                            "AgentRouter returned an empty response.",
                            provider=self.name,
                            status_code=502,
                            error_code="EMPTY_RESPONSE",
                        )

                    usage = data.get("usage") or {}
                    prompt_tokens = usage.get("prompt_tokens")
                    completion_tokens = usage.get("completion_tokens")
                    total_tokens = usage.get("total_tokens")

                    return AIResponse(
                        provider=self.name,
                        model=data.get("model", effective_model),
                        content=str(content),
                        prompt_tokens=prompt_tokens if prompt_tokens is not None else 0,
                        completion_tokens=completion_tokens if completion_tokens is not None else 0,
                        total_tokens=total_tokens if total_tokens is not None else 0,
                        latency_ms=latency_ms,
                    )
                except httpx.TimeoutException as e:
                    if attempt < settings.AI_MAX_RETRIES:
                        continue
                    raise AIProviderError(
                        "AgentRouter request timed out.",
                        provider=self.name,
                        status_code=504,
                        error_code="TIMEOUT",
                    ) from e
                except httpx.RequestError as e:
                    if attempt < settings.AI_MAX_RETRIES:
                        continue
                    raise AIProviderError(
                        f"AgentRouter connection error: {type(e).__name__}",
                        provider=self.name,
                        status_code=503,
                        error_code="CONNECTION_ERROR",
                    ) from e

        raise AIProviderError("AgentRouter request failed after all retries", provider=self.name)

    async def health_check(self) -> dict[str, object]:
        return {
            "configured": self.is_configured,
            "model": settings.AGENTROUTER_MODEL or None,
        }
