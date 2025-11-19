from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from app.common.database import get_db
from app.common.dependencies import get_current_active_doctor, get_current_user
from app.common.models import User, DoctorProfile, DoctorCertificate
from app.common.storage import save_uploaded_file, resolve_storage_path, StorageError
from app.doctors.schemas import (
    DoctorProfileCreate, DoctorProfileUpdate, DoctorProfileResponse,
    DoctorCertificateCreate, DoctorCertificateResponse, DoctorListResponse
)
from app.doctors.service import DoctorService

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.post("/profile", response_model=DoctorProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor_profile(
    profile_data: DoctorProfileCreate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Создание профиля врача"""
    profile = DoctorService.create_doctor_profile(db, current_user.id, profile_data)
    return DoctorService.serialize_profile(profile)


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
    return DoctorService.serialize_profile(profile)


@router.put("/profile", response_model=DoctorProfileResponse)
async def update_doctor_profile(
    profile_data: DoctorProfileUpdate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Обновление профиля врача"""
    profile = DoctorService.update_doctor_profile(db, current_user.id, profile_data)
    return DoctorService.serialize_profile(profile)


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


@router.get("/list", response_model=List[DoctorListResponse])
async def get_doctors_list(
    specialty: str = None,
    db: Session = Depends(get_db)
):
    """Получение списка врачей"""
    doctors = DoctorService.get_doctors_list(db, specialty)
    return [DoctorService.serialize_list_item(doc) for doc in doctors]


@router.get("/{doctor_id}", response_model=DoctorProfileResponse)
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
    return DoctorService.serialize_profile(doctor)


@router.post("/profile/avatar")
async def upload_doctor_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db),
):
    """Загрузка аватара врача"""
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    try:
        _, relative_path = save_uploaded_file(file, f"avatars/doctors/{profile.id}")
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить файл",
        ) from exc

    profile.avatar_url = relative_path
    db.commit()
    db.refresh(profile)
    return {"avatar_url": DoctorService.build_avatar_url(profile)}


@router.get("/profile/avatar/{doctor_id}")
async def download_doctor_avatar(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Скачать аватар врача"""
    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
    if not doctor or not doctor.avatar_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")

    path = resolve_storage_path(doctor.avatar_url)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar file missing")

    filename = f"doctor-{doctor_id}-avatar{path.suffix or '.jpg'}"
    return FileResponse(path, filename=filename)

