from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.common.database import get_db
from app.common.dependencies import get_current_active_doctor, get_current_user
from app.common.models import User, ScheduleSlot, DoctorProfile
from app.schedule.schemas import (
    ScheduleSlotCreate, ScheduleSlotResponse, ScheduleSlotBulkCreate,
    AvailableSlotsResponse
)
from app.schedule.service import ScheduleService

router = APIRouter()


@router.post("/schedule/slots", response_model=ScheduleSlotResponse, status_code=status.HTTP_201_CREATED)
@router.post("/slots", response_model=ScheduleSlotResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_slot(
    slot_data: ScheduleSlotCreate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Создание слота расписания для врача"""
    slot = ScheduleService.create_slot(db, current_user.id, slot_data)
    return slot


@router.post("/schedule/slots/bulk", response_model=List[ScheduleSlotResponse], status_code=status.HTTP_201_CREATED)
@router.post("/slots/bulk", response_model=List[ScheduleSlotResponse], status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_slots_bulk(
    slots_data: ScheduleSlotBulkCreate,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Массовое создание слотов расписания"""
    slots = ScheduleService.create_slots_bulk(db, current_user.id, slots_data)
    return slots


@router.get("/schedule/slots", response_model=List[ScheduleSlotResponse])
@router.get("/slots", response_model=List[ScheduleSlotResponse], include_in_schema=False)
async def get_doctor_slots(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Получение слотов расписания врача"""
    slots = ScheduleService.get_doctor_slots(db, current_user.id, start_date, end_date)
    return slots


@router.get("/schedule/available", response_model=List[AvailableSlotsResponse])
@router.get("/available", response_model=List[AvailableSlotsResponse], include_in_schema=False)
async def get_available_slots(
    doctor_id: Optional[int] = None,
    specialty: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Получение доступных слотов для записи"""
    slots = ScheduleService.get_available_slots(db, doctor_id, specialty, start_date, end_date)
    return slots


@router.delete("/schedule/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
async def delete_slot(
    slot_id: int,
    current_user: User = Depends(get_current_active_doctor),
    db: Session = Depends(get_db)
):
    """Удаление слота расписания"""
    ScheduleService.delete_slot(db, current_user.id, slot_id)
    return None

