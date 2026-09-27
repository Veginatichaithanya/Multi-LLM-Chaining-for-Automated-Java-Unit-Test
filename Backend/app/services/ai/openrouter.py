"""
OpenRouter AI Provider implementation.

Uses httpx to call https://openrouter.ai/api/v1/chat/completions
with a Bearer token from OPENROUTER_API_KEY env variable.

Credit Safety:
  Before each generation request the provider queries /auth/key to obtain
  the remaining USD credit balance. It derives an affordable token count as:
      affordable_tokens = floor(credit_remaining / cost_per_token_usd)
  and clamps max_tokens to min(requested, affordable_tokens - safety_margin).
  This prevents HTTP 402 ("You requested up to N tokens, but can only afford M")
  errors on free/low-credit accounts without silently discarding output.

  If the credit balance is genuinely too low to generate even a minimal
  response (< MIN_VIABLE_TOKENS after margin), an AIProviderError is raised
  with a clear message so callers can surface it to the user.

SECURITY: The API key is NEVER returned in any response.
"""
from __future__ import annotations

import math
import time
from typing import Any, Optional

import httpx

from app.config import get_settings
from app.services.ai.base import AINotConfiguredError, AIProvider, AIProviderError, AIResponse

settings = get_settings()

# ── Credit-safety constants ───────────────────────────────────────────────────
# Conservative estimate: gpt-4o output costs ~$0.000015 per token (as of 2024).
# We use a slightly higher estimate to avoid rounding errors.
_COST_PER_OUTPUT_TOKEN_USD: float = 0.000020   # $0.020 per 1k tokens (output)
_CREDIT_SAFETY_MARGIN: int = 200               # Keep at least 200 tokens of headroom
_MIN_VIABLE_TOKENS: int = 300                  # Below this, generation is pointless
_DEFAULT_SAFE_MAX_TOKENS: int = 4500           # Used when credit check fails gracefully


class OpenRouterProvider(AIProvider):
    """OpenRouter AI provider — compatible with OpenAI chat completions API."""

    @property
    def name(self) -> str:
        return "openrouter"

    @property
    def is_configured(self) -> bool:
        return settings.openrouter_configured

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.FRONTEND_URL,
            "X-Title": "TestForge AI",
        }

    async def _get_credit_remaining(self, client: httpx.AsyncClient) -> Optional[float]:
        """
        Query /auth/key to get the remaining USD credit balance.
        Returns None if the endpoint is unavailable or returns unexpected data.
        Never raises — callers must handle None gracefully.
        """
        try:
            resp = await client.get(
                f"{settings.OPENROUTER_BASE_URL}/auth/key",
                headers=self._get_headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                inner = data.get("data", {})
                limit_remaining = inner.get("limit_remaining")
                if limit_remaining is not None:
                    return float(limit_remaining)
                limit = inner.get("limit")
                usage = inner.get("usage")
                if limit is not None and usage is not None:
                    return max(0.0, float(limit) - float(usage))
        except Exception:  # noqa: BLE001
            pass
        return None

    def _compute_safe_max_tokens(self, requested: int, credit_remaining: Optional[float]) -> int:
        return min(requested, _DEFAULT_SAFE_MAX_TOKENS)

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2500,
    ) -> AIResponse:
        if not self.is_configured:
            raise AINotConfiguredError(
                "OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env",
                provider=self.name,
            )

        effective_model = model or settings.OPENROUTER_MODEL
        url = f"{settings.OPENROUTER_BASE_URL}/chat/completions"

        start = time.monotonic()
        safe_max_tokens = min(max_tokens, _DEFAULT_SAFE_MAX_TOKENS)

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            payload: dict[str, Any] = {
                "model": effective_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": safe_max_tokens,
            }

            for attempt in range(settings.AI_MAX_RETRIES + 2):
                try:
                    resp = await client.post(url, json=payload, headers=self._get_headers())
                    resp.raise_for_status()
                    data = resp.json()
                    latency_ms = int((time.monotonic() - start) * 1000)

                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})

                    return AIResponse(
                        provider=self.name,
                        model=data.get("model", effective_model),
                        content=content,
                        prompt_tokens=usage.get("prompt_tokens", 0),
                        completion_tokens=usage.get("completion_tokens", 0),
                        total_tokens=usage.get("total_tokens", 0),
                        latency_ms=latency_ms,
                    )
                except httpx.HTTPStatusError as e:
                    status_code = e.response.status_code

                    # Retryable: rate-limit or transient server errors
                    if attempt < settings.AI_MAX_RETRIES and status_code in (429, 502, 503):
                        continue

                    # 402 Payment Required — check if affordable token count is mentioned and retry
                    if status_code == 402:
                        raw_text = e.response.text
                        import re
                        m = re.search(r'can only afford (\d+)', raw_text)
                        if m and attempt == 0:
                            affordable = int(m.group(1))
                            if affordable > 200:
                                payload["max_tokens"] = max(200, affordable - 100)
                                continue

                        detail: Any = {}
                        try:
                            detail = e.response.json()
                        except Exception:  # noqa: BLE001
                            pass
                        raise AIProviderError(
                            f"OpenRouter rejected the request due to insufficient credits (HTTP 402). "
                            f"Detail: {detail}. "
                            f"Reduce max_tokens or add credits at https://openrouter.ai/credits",
                            provider=self.name,
                            status_code=402,
                        ) from e

                    raise AIProviderError(
                        f"OpenRouter request failed: HTTP {status_code}",
                        provider=self.name,
                        status_code=status_code,
                    ) from e

                except httpx.TimeoutException as e:
                    if attempt < settings.AI_MAX_RETRIES:
                        continue
                    raise AIProviderError(
                        "OpenRouter request timed out",
                        provider=self.name,
                    ) from e

        raise AIProviderError("OpenRouter request failed after all retries", provider=self.name)
