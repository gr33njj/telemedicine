from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: Decimal
    frozen_balance: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


class WalletTransactionResponse(BaseModel):
    id: int
    wallet_id: int
    transaction_type: str
    amount: Decimal
    balance_before: Optional[Decimal]
    balance_after: Optional[Decimal]
    description: Optional[str]
    related_consultation_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class WalletTransactionList(BaseModel):
    transactions: list[WalletTransactionResponse]
    total: int

