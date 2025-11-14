from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PaymentCreate(BaseModel):
    amount: Decimal
    currency: str = "RUB"  # RUB, USD, EUR
    payment_provider: str = "stripe"  # stripe, cloudpayments, yookassa


class PaymentResponse(BaseModel):
    id: int
    user_id: int
    amount: Decimal
    currency: str
    points_amount: int
    payment_provider: str
    provider_transaction_id: Optional[str]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PaymentCallback(BaseModel):
    transaction_id: str
    status: str
    amount: Optional[Decimal] = None

