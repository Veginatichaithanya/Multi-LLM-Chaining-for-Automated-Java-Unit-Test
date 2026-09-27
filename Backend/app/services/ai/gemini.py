"""
Google Gemini AI Provider implementation.

Uses httpx to call the Gemini generateContent REST API.
API key comes from GEMINI_API_KEY env variable only — never from the frontend.

SECURITY: The API key is NEVER returned in any response.
"""
from __future__ import annotations

import time

import httpx

from app.config import get_settings
from app.services.ai.base import AINotConfiguredError, AIProvider, AIProviderError, AIResponse

settings = get_settings()

_GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiProvider(AIProvider):
    """Google Gemini AI provider."""

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def is_configured(self) -> bool:
        return settings.gemini_configured

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 8192,
    ) -> AIResponse:
        if not self.is_configured:
            raise AINotConfiguredError(
                "Gemini API key is not configured. Set GEMINI_API_KEY in .env",
                provider=self.name,
            )

        effective_model = model or settings.GEMINI_MODEL
        url = f"{_GEMINI_API_BASE}/models/{effective_model}:generateContent"

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}], "role": "user"}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        params = {"key": settings.GEMINI_API_KEY}

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            for attempt in range(max(4, settings.AI_MAX_RETRIES + 2)):
                try:
                    resp = await client.post(url, json=payload, params=params)
                    resp.raise_for_status()
                    data = resp.json()
                    latency_ms = int((time.monotonic() - start) * 1000)

                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise AIProviderError("Gemini returned no candidates", provider=self.name)

                    candidate = candidates[0]

                    # Check finish reason for blocked / safety-filtered responses
                    finish_reason = candidate.get("finishReason", "")
                    if finish_reason in ("SAFETY", "RECITATION", "PROHIBITED_CONTENT"):
                        raise AIProviderError(
                            f"Gemini response blocked by safety filter (finishReason={finish_reason}). "
                            "Try rephrasing your prompt.",
                            provider=self.name,
                        )

                    # Defensive extraction — parts may be empty or text key may be missing
                    parts = candidate.get("content", {}).get("parts", [])
                    if not parts:
                        raise AIProviderError(
                            "Gemini returned an empty response (no parts). "
                            f"finishReason={finish_reason!r}. "
                            "The model may have produced no output — try again or reduce prompt size.",
                            provider=self.name,
                        )

                    text_parts = [p.get("text", "") for p in parts if "text" in p]
                    if not text_parts:
                        raise AIProviderError(
                            "Gemini response contained no text output. "
                            f"finishReason={finish_reason!r}.",
                            provider=self.name,
                        )

                    content = "".join(text_parts)
                    usage_meta = data.get("usageMetadata", {})

                    return AIResponse(
                        provider=self.name,
                        model=effective_model,
                        content=content,
                        prompt_tokens=usage_meta.get("promptTokenCount", 0),
                        completion_tokens=usage_meta.get("candidatesTokenCount", 0),
                        total_tokens=usage_meta.get("totalTokenCount", 0),
                        latency_ms=latency_ms,
                    )
                except httpx.HTTPStatusError as e:
                    if attempt < settings.AI_MAX_RETRIES and e.response.status_code in (429, 502, 503):
                        import asyncio
                        await asyncio.sleep(2.0 * (attempt + 1))
                        continue
                    raise AIProviderError(
                        f"Gemini request failed: HTTP {e.response.status_code}",
                        provider=self.name,
                        status_code=e.response.status_code,
                    ) from e
                except httpx.TimeoutException as e:
                    if attempt < settings.AI_MAX_RETRIES:
                        continue
                    raise AIProviderError(
                        "Gemini request timed out",
                        provider=self.name,
                    ) from e

        raise AIProviderError("Gemini request failed after all retries", provider=self.name)
