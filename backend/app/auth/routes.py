from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.common.database import get_db
from app.common.dependencies import get_current_user
from app.common.models import User
from app.auth.schemas import UserRegister, UserLogin, Token, TokenRefresh, UserResponse, EmailVerification
from app.auth.service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """Регистрация нового пользователя"""
    user = AuthService.register_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Авторизация пользователя"""
    user = AuthService.authenticate_user(db, login_data)
    tokens = AuthService.create_tokens(db, user)
    return tokens


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """Обновление access token"""
    tokens = AuthService.refresh_access_token(db, token_data.refresh_token)
    return tokens


@router.post("/verify-email")
async def verify_email(
    verification_data: EmailVerification,
    db: Session = Depends(get_db)
):
    """Подтверждение email"""
    result = AuthService.verify_email(db, verification_data.email, verification_data.code)
    return {"verified": result}


@router.post("/logout")
async def logout(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """Выход из системы"""
    result = AuthService.logout(db, token_data.refresh_token)
    return {"logged_out": result}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Получение информации о текущем пользователе"""
    return current_user

