"""
Structured logger for TestForge AI.

SECURITY: Never logs API keys, passwords, JWT secrets, or database credentials.
"""
from __future__ import annotations

import logging
import sys

_REDACTED_KEYS = {
    "api_key", "apikey", "password", "secret", "token", "authorization",
    "openrouter_api_key", "gemini_api_key", "agentrouter_api_key",
    "jwt_secret_key", "secret_key", "database_url",
}


def _redact(data: dict) -> dict:
    """Return a copy of data with sensitive keys redacted."""
    return {
        k: "[REDACTED]" if k.lower().replace("-", "_") in _REDACTED_KEYS else v
        for k, v in data.items()
    }


def get_logger(name: str) -> logging.Logger:
    """Get a named logger with standard configuration."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


# Default application logger
logger = get_logger("testforge")
