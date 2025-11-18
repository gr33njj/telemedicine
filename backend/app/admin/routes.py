from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.admin.schemas import (
    AdminConsultationCreate,
    AdminConsultationResponse,
    AdminConsultationUpdate,
    AdminDoctorProfileResponse,
    AdminDoctorResponse,
    AdminDoctorSlotsRequest,
    AdminDoctorUpdate,
    AdminScheduleSlotResponse,
    AdminScheduleSlotUpdate,
    AdminStatsResponse,
    AdminTransactionResponse,
    AdminUserResponse,
    AdminUserUpdate,
    AdminWalletTopUpRequest,
    DoctorVerificationUpdate,
    ExchangeRateUpdate,
)
from app.admin.service import AdminService
from app.common.database import get_db
from app.common.dependencies import get_current_admin
from app.common.models import User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    stats = AdminService.get_stats(db)
    return stats


@router.get("/users", response_model=List[AdminUserResponse])
async def get_all_users(
    role: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = AdminService.get_users(db, role, limit, offset)
    return users


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    user_update: AdminUserUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    updated = AdminService.update_user(db, user_id, user_update)
    return updated


@router.get("/doctors/pending", response_model=List[AdminDoctorResponse])
async def get_pending_doctors(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctors = AdminService.get_pending_doctors(db)
    return doctors


@router.get("/doctors", response_model=List[AdminDoctorProfileResponse])
async def get_all_doctor_profiles(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_doctor_profiles(db)


@router.put("/doctors/{doctor_id}/verify", response_model=dict)
async def verify_doctor(
    doctor_id: int,
    verification_data: DoctorVerificationUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    result = AdminService.verify_doctor(db, doctor_id, verification_data)
    return result


@router.get("/doctors/{doctor_id}", response_model=AdminDoctorProfileResponse)
async def get_doctor_profile(
    doctor_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_doctor_profile(db, doctor_id)


@router.patch("/doctors/{doctor_id}", response_model=AdminDoctorProfileResponse)
async def update_doctor_profile(
    doctor_id: int,
    payload: AdminDoctorUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService.update_doctor_profile(db, doctor_id, payload)


@router.post(
    "/doctors/{doctor_id}/slots", response_model=List[AdminScheduleSlotResponse]
)
async def create_doctor_slots(
    doctor_id: int,
    payload: AdminDoctorSlotsRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService.create_doctor_slots(db, doctor_id, payload)


@router.get(
    "/doctors/{doctor_id}/slots", response_model=List[AdminScheduleSlotResponse]
)
async def get_doctor_slots(
    doctor_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_doctor_slots(db, doctor_id)


@router.delete("/doctors/{doctor_id}/slots/{slot_id}", status_code=204)
async def delete_doctor_slot(
    doctor_id: int,
    slot_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    AdminService.delete_doctor_slot(db, doctor_id, slot_id)
    return None


@router.patch(
    "/doctors/{doctor_id}/slots/{slot_id}", response_model=AdminScheduleSlotResponse
)
async def update_doctor_slot(
    doctor_id: int,
    slot_id: int,
    payload: AdminScheduleSlotUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService.update_doctor_slot(db, doctor_id, slot_id, payload)


@router.get(
    "/consultations",
    response_model=List[AdminConsultationResponse],
)
async def get_consultations(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    consultations = AdminService.get_consultations(db, status, limit, offset)
    return consultations


@router.post("/consultations", response_model=AdminConsultationResponse)
async def create_consultation(
    payload: AdminConsultationCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    consultation = AdminService.create_consultation(db, payload)
    return consultation


@router.patch(
    "/consultations/{consultation_id}",
    response_model=AdminConsultationResponse,
)
async def update_consultation_status(
    consultation_id: int,
    payload: AdminConsultationUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    consultation = AdminService.update_consultation_status(db, consultation_id, payload)
    return consultation


@router.put("/exchange-rates", response_model=dict)
async def update_exchange_rates(
    rates_data: ExchangeRateUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    result = AdminService.update_exchange_rates(rates_data)
    return result


@router.get("/transactions", response_model=List[AdminTransactionResponse])
async def get_all_transactions(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    transactions = AdminService.get_all_transactions(db, limit, offset)
    return transactions


@router.post("/wallets/top-up", response_model=AdminTransactionResponse)
async def manual_wallet_top_up(
    payload: AdminWalletTopUpRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    transaction = AdminService.manual_top_up(db, payload)
    return transaction

