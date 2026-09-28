"""
Authentication router.

Endpoints:
  POST /auth/register          — Create a new account
  POST /auth/login             — Login and receive a JWT
  GET  /auth/me                — Get current user (alias for /users/me)
  POST /auth/forgot-password   — Request a password reset link
  POST /auth/reset-password    — Reset password using a one-time token
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.password_reset import PasswordReset
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.services.auth_service import AuthService, hash_password, verify_password
from app.services.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Create a new user account and return an access token immediately
    so the user is logged in after signup without an extra round-trip.
    Also accessible as POST /api/auth/signup.
    """
    try:
        user = AuthService.register_user(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    token = AuthService.build_token(user)
    return TokenResponse(
        access_token=token,
        user=AuthService.to_user_out(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a JWT access token",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Validate credentials and return a JWT bearer token plus the user profile.
    Also accessible as POST /api/auth/login.
    """
    try:
        user = AuthService.authenticate_user(db, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    token = AuthService.build_token(user)
    return TokenResponse(
        access_token=token,
        user=AuthService.to_user_out(user),
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get the currently authenticated user",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Returns the profile of the authenticated user. Alias for GET /users/me."""
    return AuthService.to_user_out(current_user)


# ── Forgot Password ───────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_url: str | None = None
    email_sent: bool = False


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


_RESET_TOKEN_EXPIRY_HOURS = 1


def _hash_token(token: str) -> str:
    """Hash a reset token for secure storage using SHA-256."""
    return hashlib.sha256(token.encode()).hexdigest()


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request a password reset link",
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """
    Generates a password reset token.
    If SMTP is configured, sends a live password reset email.
    In development mode or if SMTP is unconfigured, returns the reset URL directly for testing.
    """
    settings = get_settings()
    user = AuthService.get_user_by_email(db, payload.email)

    if not user:
        return ForgotPasswordResponse(
            message="If an account exists for this email, password reset instructions have been sent.",
            email_sent=False,
        )

    # Generate a secure random token
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=_RESET_TOKEN_EXPIRY_HOURS)

    # Invalidate existing unused tokens for this user
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.used_at.is_(None),
    ).delete()

    reset = PasswordReset(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset)
    db.commit()

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    email_sent = EmailService.send_password_reset_email(payload.email, reset_url)

    # Expose the direct reset link in dev mode or if SMTP is not active
    expose_link = (not email_sent) or (settings.APP_ENV == "development")

    return ForgotPasswordResponse(
        message=(
            "A password reset link has been dispatched to your email."
            if email_sent
            else "Password reset request processed."
        ),
        reset_url=reset_url if expose_link else None,
        email_sent=email_sent,
    )


@router.post(
    "/reset-password",
    summary="Reset password using a one-time reset token",
)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Reset password using a secure one-time token.
    The token is invalidated after use.
    """
    token_hash = _hash_token(payload.token)

    reset = db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.used_at.is_(None),
    ).first()

    if not reset or reset.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Validate new password
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )

    # Update password
    user = AuthService.get_user_by_id(db, reset.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    user.updated_at = datetime.now(timezone.utc)
    reset.used_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password has been successfully reset. You can now log in."}
