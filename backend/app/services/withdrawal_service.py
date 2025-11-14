from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
import logging

from app.common.models import (
    Withdrawal, WithdrawalStatus, DoctorEarnings, DoctorProfile,
    Notification, WalletTransaction, TransactionType, Wallet
)

logger = logging.getLogger(__name__)

MINIMUM_WITHDRAWAL = Decimal(500)  # Минимум 500 рублей


class WithdrawalService:
    """Сервис для управления выводом средств"""
    
    @staticmethod
    def request_withdrawal(
        db: Session,
        doctor_id: int,
        amount: Decimal,
        bank_account: str,
        bank_name: str
    ) -> Withdrawal:
        """
        Создать запрос на вывод средств:
        1. Проверить баланс
        2. Создать запрос на вывод
        3. Отправить уведомление администратору
        """
        
        # Проверить профиль врача
        doctor = db.query(DoctorProfile).filter(
            DoctorProfile.id == doctor_id
        ).first()
        
        if not doctor:
            raise ValueError("Врач не найден")
        
        # Получить earnings
        earnings = db.query(DoctorEarnings).filter(
            DoctorEarnings.doctor_id == doctor_id
        ).first()
        
        if not earnings:
            raise ValueError("Earnings не найдены")
        
        # Проверка минимума
        if amount < MINIMUM_WITHDRAWAL:
            raise ValueError(f"Минимальная сумма вывода: {MINIMUM_WITHDRAWAL}")
        
        # Проверка баланса
        if Decimal(earnings.available_balance) < amount:
            raise ValueError("Недостаточно средств на балансе")
        
        # Создать запрос на вывод
        withdrawal = Withdrawal(
            doctor_id=doctor_id,
            amount=amount,
            bank_account=bank_account,  # В production нужно шифровать
            bank_name=bank_name,
            status=WithdrawalStatus.PENDING,
            description=f"Запрос на вывод {amount} руб."
        )
        db.add(withdrawal)
        
        # Вычесть из доступного баланса (но не из заработанного)
        earnings.available_balance -= amount
        
        # Создать уведомление администратору
        admin_notification = Notification(
            user_id=1,  # Администратор (нужно получать ID админа)
            title="Новый запрос на вывод средств",
            message=f"Врач {doctor.first_name} {doctor.last_name} запросил вывод {amount} руб.",
            notification_type="push"
        )
        
        # Уведомить врача
        doctor_notification = Notification(
            user_id=doctor.user_id,
            title="Запрос на вывод создан",
            message=f"Ваш запрос на вывод {amount} руб. находится на рассмотрении",
            notification_type="push"
        )
        
        db.add(admin_notification)
        db.add(doctor_notification)
        db.commit()
        
        logger.info(f"Запрос на вывод создан: {withdrawal.id}, врач: {doctor_id}, сумма: {amount}")
        
        return withdrawal
    
    @staticmethod
    def approve_withdrawal(db: Session, withdrawal_id: int) -> Withdrawal:
        """Одобрить запрос на вывод (выполняется администратором)"""
        withdrawal = db.query(Withdrawal).filter(
            Withdrawal.id == withdrawal_id
        ).first()
        
        if not withdrawal:
            raise ValueError("Запрос не найден")
        
        if withdrawal.status != WithdrawalStatus.PENDING:
            raise ValueError("Можно одобрить только запросы в статусе PENDING")
        
        withdrawal.status = WithdrawalStatus.APPROVED
        withdrawal.approved_at = datetime.utcnow()
        
        # Уведомить врача
        doctor = db.query(DoctorProfile).filter(
            DoctorProfile.id == withdrawal.doctor_id
        ).first()
        
        notification = Notification(
            user_id=doctor.user_id,
            title="Запрос на вывод одобрен",
            message=f"Ваш запрос на вывод {withdrawal.amount} руб. одобрен",
            notification_type="push"
        )
        
        db.add(notification)
        db.commit()
        
        logger.info(f"Запрос на вывод одобрен: {withdrawal_id}")
        
        return withdrawal
    
    @staticmethod
    def complete_withdrawal(db: Session, withdrawal_id: int) -> Withdrawal:
        """
        Завершить вывод (денежные средства отправлены):
        1. Изменить статус
        2. Вычесть из total_withdrawn
        """
        withdrawal = db.query(Withdrawal).filter(
            Withdrawal.id == withdrawal_id
        ).first()
        
        if not withdrawal:
            raise ValueError("Запрос не найден")
        
        if withdrawal.status != WithdrawalStatus.APPROVED:
            raise ValueError("Можно завершить только одобренные запросы")
        
        withdrawal.status = WithdrawalStatus.COMPLETED
        withdrawal.completed_at = datetime.utcnow()
        
        # Обновить earnings
        earnings = db.query(DoctorEarnings).filter(
            DoctorEarnings.doctor_id == withdrawal.doctor_id
        ).first()
        
        if earnings:
            earnings.total_withdrawn += withdrawal.amount
        
        # Уведомить врача
        doctor = db.query(DoctorProfile).filter(
            DoctorProfile.id == withdrawal.doctor_id
        ).first()
        
        notification = Notification(
            user_id=doctor.user_id,
            title="Средства выведены",
            message=f"Средства в размере {withdrawal.amount} руб. переведены на ваш счет",
            notification_type="push"
        )
        
        db.add(notification)
        db.commit()
        
        logger.info(f"Вывод завершен: {withdrawal_id}")
        
        return withdrawal
    
    @staticmethod
    def reject_withdrawal(db: Session, withdrawal_id: int, reason: str) -> Withdrawal:
        """Отклонить запрос на вывод"""
        withdrawal = db.query(Withdrawal).filter(
            Withdrawal.id == withdrawal_id
        ).first()
        
        if not withdrawal:
            raise ValueError("Запрос не найден")
        
        if withdrawal.status != WithdrawalStatus.PENDING:
            raise ValueError("Можно отклонить только запросы в статусе PENDING")
        
        withdrawal.status = WithdrawalStatus.REJECTED
        
        # Вернуть деньги на available_balance
        earnings = db.query(DoctorEarnings).filter(
            DoctorEarnings.doctor_id == withdrawal.doctor_id
        ).first()
        
        if earnings:
            earnings.available_balance += withdrawal.amount
        
        # Уведомить врача
        doctor = db.query(DoctorProfile).filter(
            DoctorProfile.id == withdrawal.doctor_id
        ).first()
        
        notification = Notification(
            user_id=doctor.user_id,
            title="Запрос на вывод отклонен",
            message=f"Ваш запрос на вывод отклонен. Причина: {reason}",
            notification_type="push"
        )
        
        db.add(notification)
        db.commit()
        
        logger.info(f"Запрос на вывод отклонен: {withdrawal_id}")
        
        return withdrawal
    
    @staticmethod
    def get_withdrawal_history(db: Session, doctor_id: int) -> list:
        """Получить историю выводов врача"""
        withdrawals = db.query(Withdrawal).filter(
            Withdrawal.doctor_id == doctor_id
        ).order_by(Withdrawal.created_at.desc()).all()
        
        return withdrawals
    
    @staticmethod
    def get_doctor_earnings(db: Session, doctor_id: int) -> DoctorEarnings:
        """Получить информацию о заработках врача"""
        earnings = db.query(DoctorEarnings).filter(
            DoctorEarnings.doctor_id == doctor_id
        ).first()
        
        if not earnings:
            # Создать новую запись если не существует
            earnings = DoctorEarnings(doctor_id=doctor_id)
            db.add(earnings)
            db.commit()
        
        return earnings

