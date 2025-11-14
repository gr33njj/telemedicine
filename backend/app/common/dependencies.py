from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.common.database import get_db
from app.common.models import User, UserRole
from app.common.security import decode_token

security = HTTPBearer()


class TokenValidationError(ValueError):
    """Raised when a token cannot be validated."""


def get_user_by_token(db: Session, token: str) -> User:
    """Возвращает пользователя по строковому JWT токену или бросает TokenValidationError."""
    payload = decode_token(token)

    if payload is None:
        raise TokenValidationError("invalid_token")

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise TokenValidationError("invalid_token")

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise TokenValidationError("invalid_token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise TokenValidationError("user_not_found")

    if not user.is_active:
        raise TokenValidationError("inactive_user")

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials

    try:
        return get_user_by_token(db, token)
    except TokenValidationError as exc:
        detail_map = {
            "invalid_token": "Invalid authentication credentials",
            "user_not_found": "User not found",
            "inactive_user": "Inactive user",
        }
        detail = detail_map.get(str(exc), "Invalid authentication credentials")
        status_code = status.HTTP_403_FORBIDDEN if str(exc) == "inactive_user" else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(
            status_code=status_code,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_active_patient(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_active_doctor(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

