from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.common.database import get_db
from app.common.dependencies import get_current_user
from app.common.models import User
from app.payments.schemas import PaymentCreate, PaymentResponse, PaymentCallback
from app.payments.service import PaymentService

router = APIRouter()


@router.post("/create", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание платежа для покупки поинтов"""
    payment = PaymentService.create_payment(db, current_user.id, payment_data)
    return payment


@router.post("/callback/stripe")
async def stripe_callback(
    callback_data: PaymentCallback,
    db: Session = Depends(get_db)
):
    """Callback от Stripe"""
    result = PaymentService.process_callback(db, "stripe", callback_data)
    return result


@router.post("/callback/cloudpayments")
async def cloudpayments_callback(
    callback_data: PaymentCallback,
    db: Session = Depends(get_db)
):
    """Callback от CloudPayments"""
    result = PaymentService.process_callback(db, "cloudpayments", callback_data)
    return result


@router.get("/history", response_model=list[PaymentResponse])
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение истории платежей"""
    payments = PaymentService.get_payment_history(db, current_user.id)
    return payments

