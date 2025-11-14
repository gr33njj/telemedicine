from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.common.database import get_db
from app.common.dependencies import get_current_user
from app.common.models import User, UserRole
from app.services.withdrawal_service import WithdrawalService
from app.withdrawals import schemas

router = APIRouter(tags=["withdrawals"])


@router.post("/withdrawals/request", response_model=schemas.WithdrawalResponse)
def request_withdrawal(
    request: schemas.WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать запрос на вывод средств (для врачей)"""
    
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только врачи могут выводить средства"
        )
    
    try:
        from app.common.models import DoctorProfile
        doctor_profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == current_user.id
        ).first()
        
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль врача не найден"
            )
        
        withdrawal = WithdrawalService.request_withdrawal(
            db,
            doctor_id=doctor_profile.id,
            amount=Decimal(str(request.amount)),
            bank_account=request.bank_account,
            bank_name=request.bank_name
        )
        return schemas.WithdrawalResponse.from_orm(withdrawal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/withdrawals/{withdrawal_id}/approve", response_model=schemas.WithdrawalResponse)
def approve_withdrawal(
    withdrawal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Одобрить вывод (только для администратора)"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администраторы могут одобрять выводы"
        )
    
    try:
        withdrawal = WithdrawalService.approve_withdrawal(db, withdrawal_id)
        return schemas.WithdrawalResponse.from_orm(withdrawal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/withdrawals/{withdrawal_id}/complete", response_model=schemas.WithdrawalResponse)
def complete_withdrawal(
    withdrawal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Завершить вывод (только для администратора)"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администраторы могут завершать выводы"
        )
    
    try:
        withdrawal = WithdrawalService.complete_withdrawal(db, withdrawal_id)
        return schemas.WithdrawalResponse.from_orm(withdrawal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/withdrawals/{withdrawal_id}/reject", response_model=schemas.WithdrawalResponse)
def reject_withdrawal(
    withdrawal_id: int,
    reject_request: schemas.RejectWithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отклонить вывод (только для администратора)"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администраторы могут отклонять выводы"
        )
    
    try:
        withdrawal = WithdrawalService.reject_withdrawal(
            db,
            withdrawal_id,
            reason=reject_request.reason
        )
        return schemas.WithdrawalResponse.from_orm(withdrawal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/withdrawals/history", response_model=List[schemas.WithdrawalResponse])
def get_withdrawal_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю выводов врача"""
    
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только врачи могут просматривать историю выводов"
        )
    
    try:
        from app.common.models import DoctorProfile
        doctor_profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == current_user.id
        ).first()
        
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль врача не найден"
            )
        
        withdrawals = WithdrawalService.get_withdrawal_history(db, doctor_profile.id)
        return [schemas.WithdrawalResponse.from_orm(w) for w in withdrawals]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/withdrawals/earnings", response_model=schemas.DoctorEarningsResponse)
def get_doctor_earnings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить информацию о заработках врача"""
    
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только врачи могут просматривать свои заработки"
        )
    
    try:
        from app.common.models import DoctorProfile
        doctor_profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == current_user.id
        ).first()
        
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль врача не найден"
            )
        
        earnings = WithdrawalService.get_doctor_earnings(db, doctor_profile.id)
        return schemas.DoctorEarningsResponse.from_orm(earnings)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

