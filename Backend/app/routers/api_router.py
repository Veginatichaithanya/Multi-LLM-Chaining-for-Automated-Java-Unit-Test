"""
Master /api prefix router.

Mounts all sub-routers under /api so the frontend can call:
  /api/auth/signup
  /api/auth/login
  /api/auth/me
  /api/auth/forgot-password
  /api/auth/reset-password
  /api/projects
  /api/projects/{id}/source
  /api/projects/{id}/analyze
  /api/ai/health
  /api/projects/{id}/generate-tests
  /api/projects/{id}/refine-tests
  /api/projects/{id}/run-tests
  /api/projects/{id}/coverage
  /api/projects/{id}/mutation-test
  /api/experiments
  /api/experiments/{id}/run
  /api/projects/{id}/report
  /api/experiments/{id}/report

The existing /auth/* and /users/* routes remain working for backward compat.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.routers import auth, users
from app.routers import (
    analysis,
    ai,
    coverage,
    execution,
    experiments,
    generation,
    projects,
    refinement,
    reports,
    results,
    source,
)

# Master /api router
api_router = APIRouter(prefix="/api")

# Auth — also adds /api/auth/* aliases
api_router.include_router(auth.router)

# Users — /api/users/me
api_router.include_router(users.router)

# Projects CRUD
api_router.include_router(projects.router)

# Source code management + analysis
api_router.include_router(source.router)
api_router.include_router(analysis.router)

# AI providers
api_router.include_router(ai.router)

# Test generation + multi-LLM chain
api_router.include_router(generation.router)
api_router.include_router(refinement.router)

# Test execution + coverage + mutation
api_router.include_router(execution.router)
api_router.include_router(coverage.router)

# Experiments
api_router.include_router(experiments.router)

# Reports
api_router.include_router(reports.router)

# Results & Discussion (research figures)
api_router.include_router(results.router)

__all__ = ["api_router"]
