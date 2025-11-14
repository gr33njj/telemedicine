from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, field_validator, model_validator


class AdminStatsResponse(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    total_consultations: int
    total_revenue_points: int
    active_doctors: int


class AdminUserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime]
    full_name: Optional[str]
    wallet_balance: Optional[Decimal]
    patient_profile_id: Optional[int]
    doctor_profile_id: Optional[int]


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class DoctorVerificationUpdate(BaseModel):
    verification_status: str  # approved, rejected
    notes: Optional[str] = None


class AdminDoctorResponse(BaseModel):
    id: int
    user_id: int
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    specialty: Optional[str]
    experience_years: Optional[int]
    created_at: Optional[datetime]
    short_description: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    consultation_price_points: Optional[int] = None
    is_verified: Optional[bool] = None


class AdminDoctorProfileResponse(BaseModel):
    id: int
    user_id: int
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    middle_name: Optional[str]
    specialty: Optional[str]
    experience_years: Optional[int]
    consultation_price_points: Optional[int]
    short_description: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    rating: Optional[float]
    reviews_count: Optional[int]
    is_verified: bool
    verification_status: str
    created_at: Optional[datetime]


class ExchangeRateUpdate(BaseModel):
    rate_rub: Optional[float] = None
    rate_usd: Optional[float] = None
    rate_eur: Optional[float] = None


class AdminConsultationResponse(BaseModel):
    id: int
    status: str
    points_cost: int
    patient_name: Optional[str]
    patient_email: Optional[str]
    doctor_name: Optional[str]
    doctor_email: Optional[str]
    slot_start_time: Optional[datetime]
    slot_end_time: Optional[datetime]
    created_at: datetime


class AdminConsultationCreate(BaseModel):
    patient_user_id: Optional[int] = None
    patient_email: Optional[str] = None
    doctor_user_id: Optional[int] = None
    doctor_email: Optional[str] = None
    start_time: datetime
    duration_minutes: int = 30
    points_cost: int = 100
    auto_top_up: bool = True

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("duration_minutes must be positive")
        return value

    @field_validator("points_cost")
    @classmethod
    def validate_points(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("points_cost must be positive")
        return value

    @model_validator(mode="after")
    def validate_identifiers(self):
        if not (self.patient_user_id or self.patient_email):
            raise ValueError("Patient identifier (user_id or email) is required")
        if not (self.doctor_user_id or self.doctor_email):
            raise ValueError("Doctor identifier (user_id or email) is required")
        return self


class AdminConsultationUpdate(BaseModel):
    status: str  # completed | cancelled
    reason: Optional[str] = None


class AdminTransactionResponse(BaseModel):
    id: int
    wallet_id: int
    transaction_type: str
    amount: float
    balance_before: Optional[float]
    balance_after: Optional[float]
    description: Optional[str]
    related_consultation_id: Optional[int]
    created_at: Optional[datetime]


class AdminDoctorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    specialty: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_price_points: Optional[int] = None
    short_description: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    verification_status: Optional[str] = None  # approved / rejected / pending


class AdminDoctorSlot(BaseModel):
    start_time: datetime
    end_time: datetime

    @field_validator("end_time")
    @classmethod
    def validate_times(cls, end, info):
        start = info.data.get("start_time")
        if start and end <= start:
            raise ValueError("end_time must be after start_time")
        return end


class AdminDoctorSlotsRequest(BaseModel):
    slots: List[AdminDoctorSlot]

    @model_validator(mode="after")
    def validate_slots(self):
        if not self.slots:
            raise ValueError("At least one slot is required")
        return self


class AdminScheduleSlotResponse(BaseModel):
    id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    is_available: bool
    is_reserved: bool

    class Config:
        from_attributes = True


class AdminWalletTopUpRequest(BaseModel):
    target_user_id: Optional[int] = None
    target_email: Optional[str] = None
    amount: Decimal
    description: Optional[str] = "Пополнение администратором"

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: Decimal) -> Decimal:
        if value is None or value <= 0:
            raise ValueError("amount must be greater than zero")
        return value

    @model_validator(mode="after")
    def validate_target(self):
        if not (self.target_user_id or self.target_email):
            raise ValueError("User identifier (user_id or email) is required")
        return self