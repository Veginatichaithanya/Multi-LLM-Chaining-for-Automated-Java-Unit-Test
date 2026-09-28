"""
Application configuration using pydantic-settings.

All values can be overridden via environment variables or a `.env` file.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'testforge.db').resolve().as_posix()}"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _resolve_sqlite_path(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("sqlite:///./"):
            rel = v.replace("sqlite:///./", "")
            abs_p = (BACKEND_DIR / rel).resolve().as_posix()
            return f"sqlite:///{abs_p}"
        return v

    # ── JWT ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    # Alias: JWT_SECRET_KEY maps to SECRET_KEY via .env
    JWT_SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours default

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:5173"

    # ── SMTP Email ────────────────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@testforge.ai"
    SMTP_USE_TLS: bool = True

    # ── App ──────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_TITLE: str = "TestForge AI API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = (
        "REST API for the TestForge AI Multi-LLM Unit Test Generation platform."
    )

    # ── OpenRouter AI ─────────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "openai/gpt-4o"

    # ── Google Gemini ─────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # ── AgentRouter ───────────────────────────────────────────────────────────
    AGENTROUTER_API_KEY: str = ""
    AGENTROUTER_BASE_URL: str = "https://co.agentrouter.org/v1"
    AGENTROUTER_MODEL: str = ""

    # ── AI Execution Settings ─────────────────────────────────────────────────
    AI_TIMEOUT_SECONDS: int = 120
    AI_MAX_RETRIES: int = 2
    AI_MAX_PROMPT_CHARS: int = 50_000
    AI_MAX_SOURCE_CHARS: int = 100_000
    AI_MAX_REFINEMENT_ITERATIONS: int = 5

    # ── Java Execution ────────────────────────────────────────────────────────
    JAVA_HOME: str = ""
    MAVEN_HOME: str = ""
    JAVA_EXECUTION_TIMEOUT_SECONDS: int = 120
    JAVA_MAX_SOURCE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB per Java file (Phase 3)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, v: str) -> str:
        """Accept comma-separated string from env (kept as str, parsed by property)."""
        return v

    @property
    def effective_secret_key(self) -> str:
        """Return JWT_SECRET_KEY if set, otherwise SECRET_KEY."""
        return self.JWT_SECRET_KEY.strip() or self.SECRET_KEY

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        # Always include FRONTEND_URL
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def openrouter_configured(self) -> bool:
        return bool(self.OPENROUTER_API_KEY.strip())

    @property
    def gemini_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY.strip())

    @property
    def agentrouter_configured(self) -> bool:
        return bool(self.AGENTROUTER_API_KEY.strip())

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST.strip() and self.SMTP_USER.strip() and self.SMTP_PASSWORD.strip())


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — safe to import anywhere."""
    return Settings()
