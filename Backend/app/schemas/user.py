"""
Pydantic schemas for user data returned to clients.

Passwords and hashed_password are NEVER included in these schemas.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    """Public user representation — safe to return to the frontend."""

    id: str
    email: EmailStr
    name: str
    role: str | None = None
    avatar_url: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}
