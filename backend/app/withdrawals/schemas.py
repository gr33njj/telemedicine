from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class WithdrawalRequest(BaseModel):
    """Запрос на вывод средств"""
    amount: Decimal
    bank_account: str
    bank_name: str


class RejectWithdrawalRequest(BaseModel):
    """Запрос на отклонение вывода"""
    reason: str


class WithdrawalResponse(BaseModel):
    """Ответ с информацией о выводе"""
    id: int
    doctor_id: int
    amount: Decimal
    status: str
    bank_account: Optional[str]
    bank_name: Optional[str]
    created_at: datetime
    approved_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class DoctorEarningsResponse(BaseModel):
    """Информация о заработках врача"""
    id: int
    doctor_id: int
    total_earned: Decimal
    available_balance: Decimal
    total_withdrawn: Decimal
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

