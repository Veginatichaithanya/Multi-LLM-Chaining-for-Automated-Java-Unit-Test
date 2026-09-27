"""
Users router.

Endpoints:
  GET /users/me  — Return the current authenticated user's profile
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.user import UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get the currently authenticated user",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """
    Returns the profile of the user identified by the Bearer token.
    Used by the frontend to restore session state on page refresh.
    """
    return AuthService.to_user_out(current_user)
