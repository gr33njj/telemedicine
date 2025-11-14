from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.common.database import get_db
from app.common.dependencies import get_current_active_doctor, get_current_user
from app.common.models import User, DoctorProfile, DoctorCertificate
from app.doctors.schemas import (
    DoctorProfileCreate, DoctorProfileUpdate, DoctorProfileResponse,
    DoctorCertificateCreate, DoctorCertificateResponse, DoctorListResponse
)
from app.doctors.service import DoctorService

router = APIRouter()


@router.post("/profile", response_model=DoctorProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor_profile(
    profile_data: DoctorProfileCreate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Создание профиля врача"""
    profile = DoctorService.create_doctor_profile(db, current_user.id, profile_data)
    return profile


@router.get("/profile", response_model=DoctorProfileResponse)
async def get_doctor_profile(
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Получение профиля врача"""
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    return profile


@router.put("/profile", response_model=DoctorProfileResponse)
async def update_doctor_profile(
    profile_data: DoctorProfileUpdate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Обновление профиля врача"""
    profile = DoctorService.update_doctor_profile(db, current_user.id, profile_data)
    return profile


@router.post("/certificates", response_model=DoctorCertificateResponse, status_code=status.HTTP_201_CREATED)
async def upload_certificate(
    certificate_data: DoctorCertificateCreate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Загрузка сертификата врача"""
    certificate = DoctorService.upload_certificate(db, current_user.id, certificate_data)
    return certificate


@router.get("/certificates", response_model=List[DoctorCertificateResponse])
async def get_certificates(
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Получение списка сертификатов"""
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not profile:
        return []
    certificates = db.query(DoctorCertificate).filter(DoctorCertificate.doctor_id == profile.id).all()
    return certificates


@router.get("/doctors/list", response_model=List[DoctorListResponse])
@router.get("/list", response_model=List[DoctorListResponse], include_in_schema=False)
async def get_doctors_list(
    specialty: str = None,
    db: Session = Depends(get_db)
):
    """Получение списка врачей"""
    doctors = DoctorService.get_doctors_list(db, specialty)
    return doctors


@router.get("/doctors/{doctor_id}", response_model=DoctorProfileResponse)
@router.get("/{doctor_id}", response_model=DoctorProfileResponse, include_in_schema=False)
async def get_doctor_by_id(
    doctor_id: int,
    db: Session = Depends(get_db)
):
    """Получение информации о враче по ID"""
    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    return doctor

