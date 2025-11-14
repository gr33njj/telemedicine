from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from decimal import Decimal
from typing import List
from app.common.models import Wallet, WalletTransaction, TransactionType
from app.wallet.schemas import WalletTransactionResponse


class WalletService:
    @staticmethod
    def get_wallet(db: Session, user_id: int) -> Wallet:
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            # Создаем кошелек если его нет
            wallet = Wallet(user_id=user_id, balance=Decimal('0'), frozen_balance=Decimal('0'))
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
        return wallet
    
    @staticmethod
    def add_points(
        db: Session,
        user_id: int,
        amount: Decimal,
        description: str = None,
        transaction_type: TransactionType = TransactionType.PURCHASE,
    ) -> WalletTransaction:
        wallet = WalletService.get_wallet(db, user_id)
        balance_before = wallet.balance
        wallet.balance += amount
        balance_after = wallet.balance
        
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=transaction_type,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            description=description
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    
    @staticmethod
    def freeze_points(
        db: Session,
        user_id: int,
        amount: Decimal,
        consultation_id: int = None,
        description: str = None
    ) -> WalletTransaction:
        wallet = WalletService.get_wallet(db, user_id)
        
        if wallet.balance < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        balance_before = wallet.balance
        wallet.balance -= amount
        wallet.frozen_balance += amount
        balance_after = wallet.balance
        
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.FREEZE,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            related_consultation_id=consultation_id,
            description=description
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    
    @staticmethod
    def debit_points(
        db: Session,
        user_id: int,
        amount: Decimal,
        consultation_id: int = None,
        description: str = None
    ) -> WalletTransaction:
        wallet = WalletService.get_wallet(db, user_id)
        
        if wallet.frozen_balance < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient frozen balance"
            )
        
        balance_before = wallet.frozen_balance
        wallet.frozen_balance -= amount
        balance_after = wallet.frozen_balance
        
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEBIT,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            related_consultation_id=consultation_id,
            description=description
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    
    @staticmethod
    def unfreeze_points(
        db: Session,
        user_id: int,
        amount: Decimal,
        consultation_id: int = None,
        description: str = None
    ) -> WalletTransaction:
        wallet = WalletService.get_wallet(db, user_id)
        
        if wallet.frozen_balance < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient frozen balance"
            )
        
        balance_before = wallet.frozen_balance
        wallet.frozen_balance -= amount
        wallet.balance += amount
        balance_after = wallet.frozen_balance
        
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.UNFREEZE,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            related_consultation_id=consultation_id,
            description=description
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    
    @staticmethod
    def get_transactions(
        db: Session,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        wallet = WalletService.get_wallet(db, user_id)
        
        transactions = db.query(WalletTransaction).filter(
            WalletTransaction.wallet_id == wallet.id
        ).order_by(WalletTransaction.created_at.desc()).limit(limit).offset(offset).all()
        
        total = db.query(WalletTransaction).filter(
            WalletTransaction.wallet_id == wallet.id
        ).count()
        
        return {
            "transactions": transactions,
            "total": total
        }

