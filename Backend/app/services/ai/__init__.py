"""
AI Provider factory.

Usage:
    from app.services.ai import get_provider
    provider = get_provider("gemini")
    response = await provider.generate(system_prompt, user_prompt)
"""
from __future__ import annotations

from app.services.ai.agentrouter import AgentRouterProvider
from app.services.ai.base import AIProvider, AIProviderError, AINotConfiguredError, AIResponse
from app.services.ai.gemini import GeminiProvider
from app.services.ai.openrouter import OpenRouterProvider

_PROVIDERS: dict[str, AIProvider] = {
    "gemini": GeminiProvider(),
    "openrouter": OpenRouterProvider(),
    "agentrouter": AgentRouterProvider(),
}


def get_provider(name: str) -> AIProvider:
    """Return the AI provider instance for the given name.

    Raises ValueError for unknown providers.
    """
    provider = _PROVIDERS.get(name.lower())
    if provider is None:
        available = ", ".join(_PROVIDERS.keys())
        raise ValueError(f"Unknown AI provider: {name!r}. Available: {available}")
    return provider


def list_providers() -> list[str]:
    return list(_PROVIDERS.keys())


__all__ = [
    "get_provider",
    "list_providers",
    "AIProvider",
    "AIProviderError",
    "AINotConfiguredError",
    "AIResponse",
    "GeminiProvider",
    "OpenRouterProvider",
    "AgentRouterProvider",
]
