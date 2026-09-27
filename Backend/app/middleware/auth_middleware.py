"""
JWT authentication dependency.

Usage in a protected route:
    from app.middleware.auth_middleware import get_current_user

    @router.get("/me")
    def me(current_user: User = Depends(get_current_user)):
        ...
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService, decode_access_token

_bearer_scheme = HTTPBearer(auto_error=True)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency.

    Extracts the Bearer token from the Authorization header,
    validates it, and returns the corresponding User row.

    Raises HTTP 401 if the token is missing, invalid, or expired.
    Raises HTTP 403 if the user account is inactive.
    """
    try:
        token_data = decode_access_token(credentials.credentials)
    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    user = AuthService.get_user_by_id(db, token_data.sub)
    if user is None:
        raise _CREDENTIALS_EXCEPTION
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return user
