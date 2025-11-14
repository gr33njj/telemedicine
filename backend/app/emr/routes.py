from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.common.database import get_db
from app.common.dependencies import get_current_user, get_current_active_doctor
from app.common.models import User
from app.emr.schemas import EMRRecordCreate, EMRRecordUpdate, EMRRecordResponse
from app.emr.service import EMRService

router = APIRouter()


@router.post("/records", response_model=EMRRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_emr_record(
    record_data: EMRRecordCreate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Создание записи в ЭМК"""
    record = EMRService.create_record(db, current_user.id, record_data)
    return record


@router.get("/records/patient/{patient_id}", response_model=List[EMRRecordResponse])
async def get_patient_records(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение записей ЭМК пациента"""
    records = EMRService.get_patient_records(db, patient_id, current_user.id)
    return records


@router.get("/records/my", response_model=List[EMRRecordResponse])
async def get_my_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение собственных записей ЭМК"""
    records = EMRService.get_user_records(db, current_user.id)
    return records


@router.get("/records/{record_id}", response_model=EMRRecordResponse)
async def get_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение записи ЭМК"""
    record = EMRService.get_record(db, record_id, current_user.id)
    return record


@router.put("/records/{record_id}", response_model=EMRRecordResponse)
async def update_record(
    record_id: int,
    record_data: EMRRecordUpdate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Обновление записи ЭМК"""
    record = EMRService.update_record(db, record_id, current_user.id, record_data)
    return record

