"""
Pydantic schemas for authentication endpoints.
"""
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    """Body for POST /auth/login"""

    email: EmailStr = Field(..., examples=["demo@testforge.ai"])
    password: str = Field(..., min_length=6, examples=["TestForge@123"])


class RegisterRequest(BaseModel):
    """Body for POST /auth/register"""

    email: EmailStr = Field(..., examples=["new@testforge.ai"])
    password: str = Field(
        ...,
        min_length=8,
        description="Minimum 8 characters",
        examples=["MySecure@123"],
    )
    name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        examples=["Jane Smith"],
    )
    role: str | None = Field(
        default=None,
        max_length=100,
        examples=["Research Student"],
    )

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class TokenResponse(BaseModel):
    """Response body for successful authentication."""

    access_token: str
    token_type: str = "bearer"
    user: "UserOut"  # embedded user payload — avoids a second /me call

    model_config = {"from_attributes": True}


class TokenData(BaseModel):
    """Payload encoded inside the JWT."""

    sub: str          # user ID
    email: str


# Resolve forward ref
from app.schemas.user import UserOut  # noqa: E402
TokenResponse.model_rebuild()
