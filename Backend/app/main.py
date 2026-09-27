"""
TestForge AI — FastAPI Application Entry Point

Run with:
    uvicorn app.main:app --reload --port 8000

API docs:
    http://localhost:8000/docs
    http://localhost:8000/redoc
    http://localhost:8000/api/health
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, engine, get_db
from app.routers import auth, users
from app.routers.api_router import api_router
from app.utils.logger import get_logger

settings = get_settings()
logger = get_logger("testforge.main")


def _seed_dev_users_if_needed() -> None:
    """Ensure standard development test accounts exist and have valid passwords."""
    try:
        import uuid
        from app.database import SessionLocal
        from app.models.user import User
        from app.services.auth_service import hash_password

        db = SessionLocal()
        try:
            dev_accounts = [
                {
                    "email": "demo@testforge.ai",
                    "name": "Demo User",
                    "password": "TestForge@123",
                    "role": "Lead AI Engineer",
                },
                {
                    "email": "student@testforge.ai",
                    "name": "Research Student",
                    "password": "Student@123",
                    "role": "Research Student",
                },
            ]
            for acc in dev_accounts:
                user = db.query(User).filter(User.email == acc["email"]).first()
                if not user:
                    new_user = User(
                        id=str(uuid.uuid4()),
                        email=acc["email"],
                        name=acc["name"],
                        hashed_password=hash_password(acc["password"]),
                        role=acc["role"],
                        is_active=True,
                        is_verified=True,
                    )
                    db.add(new_user)
                    logger.info(f"[SEED] Auto-seeded dev account: {acc['email']}")
                else:
                    user.hashed_password = hash_password(acc["password"])
                    user.is_active = True
                    user.is_verified = True
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Dev user auto-seeding skipped: {e}")


# ── Lifespan — runs on startup / shutdown ─────────────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Create all database tables on startup.
    For production use Alembic migrations instead:  alembic upgrade head
    """
    # Import models so SQLAlchemy knows about them before create_all
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _seed_dev_users_if_needed()

    logger.info(
        f"[READY] TestForge AI API — {settings.APP_ENV.upper()} mode | "
        f"Docs: http://localhost:8000/docs | Health: http://localhost:8000/api/health"
    )
    yield


# ── Application factory ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handlers ─────────────────────────────────────────────────

@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.exception_handler(PermissionError)
async def permission_error_handler(_request: Request, exc: PermissionError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    # Log the real error server-side but return a safe message
    logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again."},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
# Legacy prefix-less routes (keeps existing frontend working)
app.include_router(auth.router)
app.include_router(users.router)

# All new routes under /api prefix
app.include_router(api_router)


# ── Root & Health check ──────────────────────────────────────────────────────
@app.get("/", tags=["System"], summary="API Root endpoint")
def root() -> dict[str, Any]:
    """
    Root endpoint to confirm the service is live.
    Provides API information and links to interactive documentation.
    """
    return {
        "status": "online",
        "service": settings.APP_TITLE,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "message": "TestForge AI Multi-LLM API is running successfully.",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_url": "/health",
        "api_health_url": "/api/health",
    }


@app.get("/health", tags=["System"], summary="Simple health check")
def health_check_root() -> dict[str, str]:
    """Returns 200 OK when the service is running."""
    return {
        "status": "ok",
        "env": settings.APP_ENV,
        "version": settings.APP_VERSION,
    }


@app.get("/api/health", tags=["System"], summary="Health check with database connectivity")
def api_health_check() -> dict[str, Any]:
    """
    Returns database connectivity status.
    Actually tests the DB connection instead of just returning ok.
    """
    from sqlalchemy import text

    db_status = "disconnected"
    try:
        db_gen = get_db()
        db = next(db_gen)
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        db_status = "disconnected"
    finally:
        try:
            db_gen.close()  # type: ignore[union-attr]
        except Exception:
            pass

    return {
        "status": "ok",
        "database": db_status,
        "env": settings.APP_ENV,
        "version": settings.APP_VERSION,
        "ai_providers": {
            "openrouter": "configured" if settings.openrouter_configured else "not_configured",
            "gemini": "configured" if settings.gemini_configured else "not_configured",
            "agentrouter": "configured" if settings.agentrouter_configured else "not_configured",
        },
    }
