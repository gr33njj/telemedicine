from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.common.database import get_db
from app.common.dependencies import get_current_active_patient
from app.common.models import User, PatientProfile, MedicalFile
from app.users.schemas import (
    PatientProfileCreate, PatientProfileUpdate, PatientProfileResponse,
    MedicalFileCreate, MedicalFileResponse
)
from app.users.service import UserService

router = APIRouter()


@router.post("/profile", response_model=PatientProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_profile(
    profile_data: PatientProfileCreate,
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db)
):
    """Создание профиля пациента"""
    profile = UserService.create_patient_profile(db, current_user.id, profile_data)
    return profile


@router.get("/profile", response_model=PatientProfileResponse)
async def get_patient_profile(
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db)
):
    """Получение профиля пациента"""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    return profile


@router.put("/profile", response_model=PatientProfileResponse)
async def update_patient_profile(
    profile_data: PatientProfileUpdate,
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db)
):
    """Обновление профиля пациента"""
    profile = UserService.update_patient_profile(db, current_user.id, profile_data)
    return profile


@router.post("/medical-files", response_model=MedicalFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_medical_file(
    file_data: MedicalFileCreate,
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db)
):
    """Загрузка медицинского файла"""
    file = UserService.upload_medical_file(db, current_user.id, file_data)
    return file


@router.get("/medical-files", response_model=List[MedicalFileResponse])
async def get_medical_files(
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db)
):
    """Получение списка медицинских файлов"""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        return []
    files = db.query(MedicalFile).filter(MedicalFile.patient_id == profile.id).all()
    return files


@router.delete("/medical-files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medical_file(
    file_id: int,
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db)
):
    """Удаление медицинского файла"""
    UserService.delete_medical_file(db, current_user.id, file_id)
    return None

