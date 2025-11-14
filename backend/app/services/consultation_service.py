from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import logging

from app.common.models import (
    Consultation, ConsultationStatus, ScheduleSlot, 
    Wallet, WalletTransaction, TransactionType,
    DoctorEarnings, ConsultationMessage, EMRRecord,
    Notification, WithdrawalStatus, Withdrawal,
    PatientProfile, DoctorProfile, User
)

logger = logging.getLogger(__name__)

COMMISSION_PERCENTAGE = 0.20  # 20% комиссия платформы


class ConsultationService:
    """Сервис для управления консультациями"""
    
    @staticmethod
    def book_consultation(
        db: Session, 
        patient_id: int, 
        doctor_id: int, 
        slot_id: int, 
        points_cost: int
    ) -> Consultation:
        """
        Забронировать консультацию:
        1. Проверить доступность слота
        2. Заморозить поинты пациента
        3. Создать консультацию
        4. Отправить уведомления
        """
        
        # Проверка слота
        slot = db.query(ScheduleSlot).filter(ScheduleSlot.id == slot_id).first()
        if not slot or not slot.is_available or slot.is_reserved:
            raise ValueError("Слот недоступен")
        
        # Получить профили
        patient_profile = db.query(PatientProfile).filter(
            PatientProfile.id == patient_id
        ).first()
        doctor_profile = db.query(DoctorProfile).filter(
            DoctorProfile.id == doctor_id
        ).first()
        
        if not patient_profile or not doctor_profile:
            raise ValueError("Пациент или врач не найдены")
        
        # Получить кошельки пациента
        patient_wallet = db.query(Wallet).filter(
            Wallet.user_id == patient_profile.user_id
        ).first()
        
        if not patient_wallet:
            raise ValueError("Кошелёк пациента не найден")
        
        if patient_wallet.balance < points_cost:
            raise ValueError("Недостаточно поинтов")
        
        # Заморозить поинты
        patient_wallet.balance -= points_cost
        patient_wallet.frozen_balance += points_cost
        
        # Создать запись транзакции
        transaction = WalletTransaction(
            wallet_id=patient_wallet.id,
            transaction_type=TransactionType.FREEZE,
            amount=points_cost,
            balance_before=patient_wallet.balance + points_cost,
            balance_after=patient_wallet.balance,
            description=f"Бронирование консультации с врачом {doctor_profile.first_name}"
        )
        db.add(transaction)
        
        # Отметить слот как зарезервированный
        slot.is_available = False
        slot.is_reserved = True
        
        # Создать консультацию
        room_id = str(uuid.uuid4())
        consultation = Consultation(
            patient_id=patient_id,
            doctor_id=doctor_id,
            slot_id=slot_id,
            status=ConsultationStatus.CREATED,
            room_id=room_id,
            points_cost=points_cost,
            points_frozen=True
        )
        db.add(consultation)
        db.flush()
        
        # Создать уведомления
        patient_notification = Notification(
            user_id=patient_profile.user_id,
            title="Консультация забронирована",
            message=f"Ваша консультация с {doctor_profile.first_name} {doctor_profile.last_name} запланирована на {slot.start_time}",
            notification_type="push"
        )
        
        doctor_notification = Notification(
            user_id=doctor_profile.user_id,
            title="Новая запись на консультацию",
            message=f"Пациент записался на консультацию на {slot.start_time}",
            notification_type="push"
        )
        
        db.add(patient_notification)
        db.add(doctor_notification)
        
        db.commit()
        logger.info(f"Консультация забронирована: {consultation.id}")
        
        return consultation
    
    @staticmethod
    def start_consultation(db: Session, consultation_id: int) -> Consultation:
        """Начать консультацию"""
        consultation = db.query(Consultation).filter(
            Consultation.id == consultation_id
        ).first()
        
        if not consultation:
            raise ValueError("Консультация не найдена")
        
        if consultation.status != ConsultationStatus.CREATED:
            raise ValueError("Только созданные консультации можно начать")
        
        consultation.status = ConsultationStatus.ACTIVE
        consultation.started_at = datetime.utcnow()
        
        db.commit()
        logger.info(f"Консультация начата: {consultation_id}")
        
        return consultation
    
    @staticmethod
    def complete_consultation(db: Session, consultation_id: int) -> Consultation:
        """
        Завершить консультацию:
        1. Изменить статус
        2. Списать поинты с пациента
        3. Зачислить доход врачу (с вычетом комиссии)
        """
        consultation = db.query(Consultation).filter(
            Consultation.id == consultation_id
        ).first()
        
        if not consultation:
            raise ValueError("Консультация не найдена")
        
        if consultation.status != ConsultationStatus.ACTIVE:
            raise ValueError("Только активные консультации можно завершить")
        
        consultation.status = ConsultationStatus.COMPLETED
        consultation.ended_at = datetime.utcnow()
        
        # Получить кошельки
        patient_wallet = db.query(Wallet).filter(
            Wallet.user_id == db.query(PatientProfile).filter(
                PatientProfile.id == consultation.patient_id
            ).first().user_id
        ).first()
        
        doctor_wallet = db.query(Wallet).filter(
            Wallet.user_id == db.query(DoctorProfile).filter(
                DoctorProfile.id == consultation.doctor_id
            ).first().user_id
        ).first()
        
        # Финальное списание поинтов пациента
        patient_wallet.frozen_balance -= consultation.points_cost
        
        # Создать транзакцию дебита
        transaction = WalletTransaction(
            wallet_id=patient_wallet.id,
            transaction_type=TransactionType.DEBIT,
            amount=consultation.points_cost,
            balance_before=patient_wallet.balance + consultation.points_cost,
            balance_after=patient_wallet.balance,
            description="Списание за консультацию",
            related_consultation_id=consultation_id
        )
        db.add(transaction)
        
        # Рассчитать доход врача
        platform_commission = Decimal(consultation.points_cost) * Decimal(COMMISSION_PERCENTAGE)
        doctor_income = Decimal(consultation.points_cost) - platform_commission
        
        # Зачислить доход врачу
        if doctor_wallet:
            doctor_wallet.balance += doctor_income
            
            doctor_transaction = WalletTransaction(
                wallet_id=doctor_wallet.id,
                transaction_type=TransactionType.PURCHASE,
                amount=doctor_income,
                balance_before=doctor_wallet.balance - doctor_income,
                balance_after=doctor_wallet.balance,
                description=f"Доход от консультации (комиссия платформы: {platform_commission})",
                related_consultation_id=consultation_id
            )
            db.add(doctor_transaction)
        
        # Обновить earnings врача
        doctor_earnings = db.query(DoctorEarnings).filter(
            DoctorEarnings.doctor_id == consultation.doctor_id
        ).first()
        
        if doctor_earnings:
            doctor_earnings.total_earned += doctor_income
            doctor_earnings.available_balance += doctor_income
        
        db.commit()
        logger.info(f"Консультация завершена: {consultation_id}, доход врача: {doctor_income}")
        
        return consultation
    
    @staticmethod
    def cancel_consultation(db: Session, consultation_id: int, reason: str = None) -> Consultation:
        """
        Отменить консультацию:
        1. Изменить статус
        2. Вернуть замороженные поинты пациенту
        """
        consultation = db.query(Consultation).filter(
            Consultation.id == consultation_id
        ).first()
        
        if not consultation:
            raise ValueError("Консультация не найдена")
        
        if consultation.status not in [ConsultationStatus.CREATED, ConsultationStatus.ACTIVE]:
            raise ValueError("Можно отменить только созданные или активные консультации")
        
        # Вернуть поинты если они заморожены
        if consultation.points_frozen:
            patient_wallet = db.query(Wallet).filter(
                Wallet.user_id == db.query(PatientProfile).filter(
                    PatientProfile.id == consultation.patient_id
                ).first().user_id
            ).first()
            
            patient_wallet.frozen_balance -= consultation.points_cost
            patient_wallet.balance += consultation.points_cost
            
            transaction = WalletTransaction(
                wallet_id=patient_wallet.id,
                transaction_type=TransactionType.UNFREEZE,
                amount=consultation.points_cost,
                balance_before=patient_wallet.balance - consultation.points_cost,
                balance_after=patient_wallet.balance,
                description=f"Возврат поинтов за отменённую консультацию. Причина: {reason}",
                related_consultation_id=consultation_id
            )
            db.add(transaction)
        
        # Освободить слот
        slot = db.query(ScheduleSlot).filter(ScheduleSlot.id == consultation.slot_id).first()
        if slot:
            slot.is_reserved = False
            slot.is_available = True
        
        consultation.status = ConsultationStatus.CANCELLED
        db.commit()
        logger.info(f"Консультация отменена: {consultation_id}")
        
        return consultation
    
    @staticmethod
    def get_consultation_history(db: Session, user_id: int, role: str, limit: int = 20) -> list:
        """Получить историю консультаций пользователя"""
        query = db.query(Consultation).options(joinedload(Consultation.slot))
        if role == "patient":
            patient = db.query(PatientProfile).filter(
                PatientProfile.user_id == user_id
            ).first()
            if not patient:
                return []
            consultations = (
                query.filter(Consultation.patient_id == patient.id)
                .order_by(Consultation.created_at.desc())
                .limit(limit)
                .all()
            )
        else:  # doctor
            doctor = db.query(DoctorProfile).filter(
                DoctorProfile.user_id == user_id
            ).first()
            if not doctor:
                return []
            consultations = (
                query.filter(Consultation.doctor_id == doctor.id)
                .order_by(Consultation.created_at.desc())
                .limit(limit)
                .all()
            )
        
        return consultations

