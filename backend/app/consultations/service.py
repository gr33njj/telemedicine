from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from datetime import datetime
import uuid
from app.common.models import (
    Consultation, ConsultationStatus, ScheduleSlot, PatientProfile,
    DoctorProfile, ConsultationMessage, ConsultationFile
)
from app.consultations.schemas import (
    ConsultationCreate, ConsultationMessageCreate, ConsultationFileCreate
)
from app.wallet.service import WalletService


class ConsultationService:
    @staticmethod
    def create_consultation(
        db: Session,
        user_id: int,
        consultation_data: ConsultationCreate
    ) -> Consultation:
        # Проверка слота
        slot = db.query(ScheduleSlot).filter(ScheduleSlot.id == consultation_data.slot_id).first()
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found"
            )
        
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slot already reserved"
            )
        
        # Получение профилей
        patient = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found"
            )
        
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == slot.doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Проверка баланса и заморозка поинтов
        points_cost = doctor.consultation_price_points
        WalletService.freeze_points(
            db,
            user_id,
            points_cost,
            description=f"Consultation reservation for slot {slot.id}"
        )
        
        # Создание консультации
        room_id = str(uuid.uuid4())
        consultation = Consultation(
            patient_id=patient.id,
            doctor_id=doctor.id,
            slot_id=slot.id,
            status=ConsultationStatus.CREATED,
            room_id=room_id,
            points_cost=points_cost,
            points_frozen=True
        )
        
        slot.is_reserved = True
        db.add(consultation)
        db.commit()
        db.refresh(consultation)
        
        return consultation
    
    @staticmethod
    def get_user_consultations(
        db: Session,
        user_id: int
    ) -> List[Consultation]:
        from app.common.models import User
        user = db.query(User).filter(User.id == user_id).first()
        
        if user.role.value == "patient":
            patient = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
            if not patient:
                return []
            return db.query(Consultation).filter(Consultation.patient_id == patient.id).all()
        elif user.role.value == "doctor":
            doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
            if not doctor:
                return []
            return db.query(Consultation).filter(Consultation.doctor_id == doctor.id).all()
        
        return []
    
    @staticmethod
    def get_consultation(
        db: Session,
        consultation_id: int,
        user_id: int
    ) -> Consultation:
        consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation not found"
            )
        
        # Проверка доступа
        from app.common.models import User, PatientProfile, DoctorProfile
        user = db.query(User).filter(User.id == user_id).first()
        
        if user.role.value == "patient":
            patient = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
            if consultation.patient_id != patient.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        elif user.role.value == "doctor":
            doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
            if consultation.doctor_id != doctor.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        return consultation
    
    @staticmethod
    def start_consultation(
        db: Session,
        consultation_id: int,
        user_id: int
    ) -> Consultation:
        consultation = ConsultationService.get_consultation(db, consultation_id, user_id)
        
        if consultation.status != ConsultationStatus.CREATED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Consultation cannot be started"
            )
        
        consultation.status = ConsultationStatus.ACTIVE
        consultation.started_at = datetime.utcnow()
        db.commit()
        db.refresh(consultation)
        
        return consultation
    
    @staticmethod
    def complete_consultation(
        db: Session,
        consultation_id: int,
        user_id: int
    ) -> Consultation:
        consultation = ConsultationService.get_consultation(db, consultation_id, user_id)
        
        if consultation.status != ConsultationStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Consultation is not active"
            )
        
        consultation.status = ConsultationStatus.COMPLETED
        consultation.ended_at = datetime.utcnow()
        
        # Списание замороженных поинтов
        if consultation.points_frozen:
            from app.common.models import User
            user = db.query(User).filter(User.id == user_id).first()
            WalletService.debit_points(
                db,
                user_id,
                consultation.points_cost,
                consultation_id,
                f"Consultation #{consultation_id} completed"
            )
            consultation.points_frozen = False
        
        db.commit()
        db.refresh(consultation)
        
        return consultation
    
    @staticmethod
    def cancel_consultation(
        db: Session,
        consultation_id: int,
        user_id: int
    ) -> Consultation:
        consultation = ConsultationService.get_consultation(db, consultation_id, user_id)
        
        if consultation.status == ConsultationStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel completed consultation"
            )
        
        consultation.status = ConsultationStatus.CANCELLED
        
        # Разморозка поинтов
        if consultation.points_frozen:
            WalletService.unfreeze_points(
                db,
                user_id,
                consultation.points_cost,
                consultation_id,
                f"Consultation #{consultation_id} cancelled"
            )
            consultation.points_frozen = False
        
        # Освобождение слота
        slot = db.query(ScheduleSlot).filter(ScheduleSlot.id == consultation.slot_id).first()
        if slot:
            slot.is_reserved = False
        
        db.commit()
        db.refresh(consultation)
        
        return consultation
    
    @staticmethod
    def send_message(
        db: Session,
        user_id: int,
        message_data: ConsultationMessageCreate
    ) -> ConsultationMessage:
        consultation = ConsultationService.get_consultation(db, message_data.consultation_id, user_id)
        
        message = ConsultationMessage(
            consultation_id=message_data.consultation_id,
            sender_id=user_id,
            message=message_data.message
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        return message
    
    @staticmethod
    def get_messages(
        db: Session,
        consultation_id: int,
        user_id: int
    ) -> List[ConsultationMessage]:
        ConsultationService.get_consultation(db, consultation_id, user_id)
        
        return db.query(ConsultationMessage).filter(
            ConsultationMessage.consultation_id == consultation_id
        ).order_by(ConsultationMessage.created_at).all()
    
    @staticmethod
    def upload_file(
        db: Session,
        user_id: int,
        file_data: ConsultationFileCreate
    ) -> ConsultationFile:
        ConsultationService.get_consultation(db, file_data.consultation_id, user_id)
        
        file = ConsultationFile(
            consultation_id=file_data.consultation_id,
            uploaded_by_id=user_id,
            **{k: v for k, v in file_data.dict().items() if k != "consultation_id"}
        )
        db.add(file)
        db.commit()
        db.refresh(file)
        
        return file
    
    @staticmethod
    def get_files(
        db: Session,
        consultation_id: int,
        user_id: int
    ) -> List[ConsultationFile]:
        ConsultationService.get_consultation(db, consultation_id, user_id)
        
        return db.query(ConsultationFile).filter(
            ConsultationFile.consultation_id == consultation_id
        ).all()

