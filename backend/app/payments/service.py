from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from decimal import Decimal
from datetime import datetime
from typing import List
from app.common.models import Payment
from app.config import settings
from app.payments.schemas import PaymentCreate, PaymentCallback
from app.wallet.service import WalletService

try:
    import stripe
    # Инициализация Stripe
    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
except ImportError:
    stripe = None


class PaymentService:
    @staticmethod
    def calculate_points(amount: Decimal, currency: str) -> int:
        """Конвертация суммы в поинты согласно курсу"""
        exchange_rates = {
            "RUB": settings.POINTS_EXCHANGE_RATE_RUB,
            "USD": settings.POINTS_EXCHANGE_RATE_USD,
            "EUR": settings.POINTS_EXCHANGE_RATE_EUR,
        }
        
        rate = exchange_rates.get(currency.upper(), settings.POINTS_EXCHANGE_RATE_RUB)
        points = int(float(amount) * rate)
        return points
    
    @staticmethod
    def create_payment(
        db: Session,
        user_id: int,
        payment_data: PaymentCreate
    ) -> Payment:
        points_amount = PaymentService.calculate_points(payment_data.amount, payment_data.currency)
        
        payment = Payment(
            user_id=user_id,
            amount=payment_data.amount,
            currency=payment_data.currency,
            points_amount=points_amount,
            payment_provider=payment_data.payment_provider,
            status="pending"
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        # Создание платежа в платежной системе
        if payment_data.payment_provider == "stripe" and settings.STRIPE_SECRET_KEY and stripe:
            try:
                intent = stripe.PaymentIntent.create(
                    amount=int(float(payment_data.amount) * 100),  # Конвертация в центы
                    currency=payment_data.currency.lower(),
                    metadata={
                        "payment_id": payment.id,
                        "user_id": user_id,
                        "points_amount": points_amount
                    }
                )
                payment.provider_transaction_id = intent.id
                db.commit()
            except Exception as e:
                payment.status = "failed"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment creation failed: {str(e)}"
                )
        
        return payment
    
    @staticmethod
    def process_callback(
        db: Session,
        provider: str,
        callback_data: PaymentCallback
    ) -> dict:
        payment = db.query(Payment).filter(
            Payment.provider_transaction_id == callback_data.transaction_id
        ).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        if callback_data.status == "completed" or callback_data.status == "succeeded":
            payment.status = "completed"
            payment.completed_at = datetime.utcnow()
            
            # Начисление поинтов
            WalletService.add_points(
                db,
                payment.user_id,
                Decimal(payment.points_amount),
                f"Payment #{payment.id}"
            )
            
            db.commit()
            return {"status": "success", "message": "Payment processed"}
        
        elif callback_data.status == "failed":
            payment.status = "failed"
            db.commit()
            return {"status": "failed", "message": "Payment failed"}
        
        return {"status": "pending", "message": "Payment pending"}
    
    @staticmethod
    def get_payment_history(
        db: Session,
        user_id: int
    ) -> List[Payment]:
        return db.query(Payment).filter(
            Payment.user_id == user_id
        ).order_by(Payment.created_at.desc()).all()

