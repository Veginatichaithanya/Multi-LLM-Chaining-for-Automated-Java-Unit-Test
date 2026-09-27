"""
Abstract AI Provider base class.

All AI provider implementations must inherit from this class.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class AIProviderError(Exception):
    """Raised when an AI provider call fails."""
    def __init__(
        self,
        message: str,
        provider: str,
        status_code: int | None = None,
        error_code: str | None = None,
    ):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code
        self.error_code = error_code


class AINotConfiguredError(AIProviderError):
    """Raised when a provider is not configured (missing API key)."""
    pass


class AIResponse:
    def __init__(
        self,
        provider: str,
        model: str,
        content: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0,
        latency_ms: int = 0,
    ):
        self.provider = provider
        self.model = model
        self.content = content
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens
        self.latency_ms = latency_ms

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "content": self.content,
            "usage": {
                "prompt_tokens": self.prompt_tokens,
                "completion_tokens": self.completion_tokens,
                "total_tokens": self.total_tokens,
            },
            "latency_ms": self.latency_ms,
        }


class AIProvider(ABC):
    """Abstract base class for all AI providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier (e.g. openrouter, gemini)."""
        ...

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """True if the provider has a valid API key configured."""
        ...

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 8192,
    ) -> AIResponse:
        """Send a chat completion request and return structured response."""
        ...

    async def refine(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
    ) -> AIResponse:
        """Refine/improve content — defaults to generate() with same interface."""
        return await self.generate(system_prompt, user_prompt, model)

    async def generate_tests(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 8192,
    ) -> AIResponse:
        """Generate test cases adhering to Phase 3 method name specification."""
        return await self.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def refine_tests(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
    ) -> AIResponse:
        """Refine test cases adhering to Phase 3 method name specification."""
        return await self.refine(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
        )

    async def health_check(self) -> dict[str, Any]:
        """Check provider availability. Returns status dict."""
        return {
            "provider": self.name,
            "configured": self.is_configured,
            "status": "available" if self.is_configured else "not_configured",
        }
