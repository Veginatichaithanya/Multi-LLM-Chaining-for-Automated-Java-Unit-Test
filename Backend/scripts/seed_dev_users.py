#!/usr/bin/env python3
"""
Development seed script.

Creates development test accounts in the database.
Run this ONLY in development environments.

Usage:
    cd Backend
    python scripts/seed_dev_users.py
"""
from __future__ import annotations

import sys
import os

# Allow imports from the Backend directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
from datetime import datetime, timezone

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.services.auth_service import hash_password

import app.models  # Register all models

# ── Development user definitions ──────────────────────────────────────────────
# These are DEVELOPMENT ACCOUNTS ONLY.
# Do not use these credentials in production.
DEV_USERS = [
    {
        "id": str(uuid.uuid4()),
        "email": "demo@testforge.ai",
        "name": "Demo User",
        "password": "TestForge@123",  # Consistent with frontend mock and docs
        "role": "Lead AI Engineer",
        "is_active": True,
        "is_verified": True,
    },
    {
        "id": str(uuid.uuid4()),
        "email": "student@testforge.ai",
        "name": "Research Student",
        "password": "Student@123",  # Consistent with frontend mock
        "role": "Research Student",
        "is_active": True,
        "is_verified": True,
    },
]


def seed_users() -> None:
    """Seed development users into the database."""
    print("\n[SEED] Creating development database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    created = 0
    updated = 0

    try:
        for user_data in DEV_USERS:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                existing.hashed_password = hash_password(user_data["password"])
                existing.is_active = True
                existing.is_verified = True
                print(f"  [UPDATE] {user_data['email']} password updated to standard dev credentials")
                updated += 1
                continue

            now = datetime.now(timezone.utc)
            user = User(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data["name"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"],
                is_active=user_data["is_active"],
                is_verified=user_data["is_verified"],
                created_at=now,
                updated_at=now,
            )
            db.add(user)
            created += 1
            print(f"  [CREATE] {user_data['email']} (role: {user_data['role']})")

        db.commit()
        print(f"\n[DONE] Seeded {created} user(s), updated {updated}.")
        print("\nDevelopment credentials:")
        for u in DEV_USERS:
            print(f"  Email: {u['email']} | Password: {u['password']}")
        print("\n[WARNING] These are DEVELOPMENT accounts. Change credentials in production.\n")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
