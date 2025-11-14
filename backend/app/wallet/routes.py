from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.common.database import get_db
from app.common.dependencies import get_current_user
from app.common.models import User, Wallet
from app.wallet.schemas import WalletResponse, WalletTransactionResponse, WalletTransactionList
from app.wallet.service import WalletService

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("/balance", response_model=WalletResponse)
async def get_wallet_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение баланса кошелька"""
    wallet = WalletService.get_wallet(db, current_user.id)
    return wallet


@router.get("/transactions", response_model=WalletTransactionList)
async def get_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение истории транзакций"""
    transactions = WalletService.get_transactions(db, current_user.id, limit, offset)
    return transactions

