from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.common.database import get_db
from app.common.dependencies import get_current_active_patient, get_current_user
from app.common.models import User, PatientProfile, MedicalFile, UserRole
from app.common.storage import save_uploaded_file, resolve_storage_path, StorageError
from app.config import settings
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


@router.post("/medical-files/upload", response_model=MedicalFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_medical_file_binary(
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db),
):
    """Загрузка медицинского файла (формы/сканы)"""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    try:
        _, relative_path = save_uploaded_file(file, f"patients/{profile.id}/medical")
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить файл",
        ) from exc

    medical_file = MedicalFile(
        patient_id=profile.id,
        file_url=relative_path,
        file_name=file.filename or "document",
        file_type=file.content_type,
        description=description,
    )
    db.add(medical_file)
    db.commit()
    db.refresh(medical_file)
    return medical_file


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


@router.get("/medical-files/{file_id}/download")
async def download_medical_file(
    file_id: int,
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db),
):
    """Скачать файл из ЭМК"""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    medical_file = (
        db.query(MedicalFile)
        .filter(MedicalFile.id == file_id, MedicalFile.patient_id == profile.id)
        .first()
    )
    if not medical_file or not medical_file.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    storage_path = resolve_storage_path(medical_file.file_url)
    if not storage_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not available")

    return FileResponse(
        storage_path,
        filename=medical_file.file_name or "document",
        media_type=medical_file.file_type or "application/octet-stream",
    )


@router.delete("/medical-files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medical_file(
    file_id: int,
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db)
):
    """Удаление медицинского файла"""
    UserService.delete_medical_file(db, current_user.id, file_id)
    return None


@router.post("/profile/avatar")
async def upload_patient_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_patient),
    db: Session = Depends(get_db),
):
    """Загрузка аватара пациента"""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        # Create profile if it doesn't exist
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    try:
        _, relative_path = save_uploaded_file(file, f"avatars/patients/{profile.id}")
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить файл",
        ) from exc

    # Store avatar URL in profile (we'll need to add this field to PatientProfile model)
    # For now, return the URL
    avatar_url = f"{settings.API_V1_PREFIX}/users/profile/avatar/{profile.id}"
    return {"avatar_url": avatar_url}


@router.get("/profile/avatar/{patient_id}")
async def download_patient_avatar(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Скачать аватар пациента"""
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")

    # Try to find avatar file
    from pathlib import Path
    storage_base = Path(settings.STORAGE_PATH if hasattr(settings, 'STORAGE_PATH') else '/app/storage')
    avatar_dir = storage_base / f"avatars/patients/{patient_id}"
    
    if not avatar_dir.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    
    # Find first image file
    for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        avatar_file = list(avatar_dir.glob(f'*{ext}'))
        if avatar_file:
            return FileResponse(avatar_file[0], filename=f"patient-{patient_id}-avatar{ext}")
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar file missing")

