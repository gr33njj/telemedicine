from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
from app.common.models import (
    User,
    RefreshToken,
    UserRole,
    Wallet,
    PatientProfile,
    DoctorProfile,
)
from app.common.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.auth.schemas import UserRegister, UserLogin
import secrets


class AuthService:
    @staticmethod
    def register_user(db: Session, user_data: UserRegister) -> User:
        # Проверка существования пользователя
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Создание пользователя
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            role=UserRole(user_data.role) if user_data.role else UserRole.PATIENT,
            is_verified=False
        )
        db.add(user)
        db.flush()
        
        # Создание кошелька и профилей
        wallet = Wallet(user_id=user.id, balance=0, frozen_balance=0)
        db.add(wallet)

        patient_profile = PatientProfile(user_id=user.id)
        db.add(patient_profile)

        if user.role == UserRole.DOCTOR:
            doctor_profile = DoctorProfile(
                user_id=user.id,
                verification_status="pending",
                is_verified=False,
            )
            db.add(doctor_profile)
        
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def authenticate_user(db: Session, login_data: UserLogin) -> User:
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return user
    
    @staticmethod
    def create_tokens(db: Session, user: User) -> dict:
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        refresh_token = create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        # Сохранение refresh token в БД
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        db_refresh_token = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=expires_at
        )
        db.add(db_refresh_token)
        db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> dict:
        payload = decode_token(refresh_token)
        if payload is None or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Проверка токена в БД
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token
        ).first()
        
        if not db_token or db_token.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired or invalid"
            )
        
        user = db.query(User).filter(User.id == db_token.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Создание новых токенов
        access_token_expires = timedelta(minutes=30)
        new_access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        new_refresh_token = create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        # Удаление старого refresh token и добавление нового
        db.delete(db_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        db_new_refresh_token = RefreshToken(
            user_id=user.id,
            token=new_refresh_token,
            expires_at=expires_at
        )
        db.add(db_new_refresh_token)
        db.commit()
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    @staticmethod
    def verify_email(db: Session, email: str, code: str) -> bool:
        # Здесь должна быть логика проверки кода из email
        # Для упрощения, просто помечаем как verified
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_verified = True
        db.commit()
        return True
    
    @staticmethod
    def logout(db: Session, refresh_token: str) -> bool:
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token
        ).first()
        
        if db_token:
            db.delete(db_token)
            db.commit()
        
        return True

