"""
Database engine, session factory, and Base declarative class.

Usage:
    from app.database import get_db, Base

    # Dependency injection in FastAPI route:
    def my_route(db: Session = Depends(get_db)):
        ...
"""
from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────────────
# SQLite needs check_same_thread=False for FastAPI's threading model.
# PostgreSQL does not need this kwarg.
connect_args = {"check_same_thread": False} if settings.is_sqlite else {}

engine_kwargs = {
    "connect_args": connect_args,
    "echo": False,
    "pool_pre_ping": True,  # Detect stale connections
}

if not settings.is_sqlite:
    # PostgreSQL pooling parameters optimized for cloud environments like Render
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,  # Recycle connection every 5 minutes to prevent dropped Render sockets
    })

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

# Enable WAL mode for SQLite to allow concurrent reads during writes
if settings.is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ── Declarative base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """All ORM models inherit from this class."""
    pass


# ── Dependency ────────────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session and
    guarantees it is closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
