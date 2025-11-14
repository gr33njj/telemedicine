from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.common.models import EMRRecord, PatientProfile, DoctorProfile, Consultation
from app.emr.schemas import EMRRecordCreate, EMRRecordUpdate


class EMRService:
    @staticmethod
    def create_record(
        db: Session,
        user_id: int,
        record_data: EMRRecordCreate
    ) -> EMRRecord:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Проверка консультации
        consultation = db.query(Consultation).filter(
            Consultation.id == record_data.consultation_id
        ).first()
        
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation not found"
            )
        
        if consultation.doctor_id != doctor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        record = EMRRecord(
            patient_id=consultation.patient_id,
            doctor_id=doctor.id,
            consultation_id=record_data.consultation_id,
            **record_data.dict(exclude={"consultation_id"})
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        
        return record
    
    @staticmethod
    def get_patient_records(
        db: Session,
        patient_id: int,
        user_id: int
    ) -> List[EMRRecord]:
        from app.common.models import User, PatientProfile, DoctorProfile
        
        user = db.query(User).filter(User.id == user_id).first()
        
        # Проверка доступа
        if user.role.value == "patient":
            patient = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
            if patient.id != patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        elif user.role.value == "doctor":
            doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
            # Врач может видеть записи своих пациентов
            pass
        
        return db.query(EMRRecord).filter(EMRRecord.patient_id == patient_id).all()
    
    @staticmethod
    def get_user_records(
        db: Session,
        user_id: int
    ) -> List[EMRRecord]:
        from app.common.models import User, PatientProfile
        
        user = db.query(User).filter(User.id == user_id).first()
        
        if user.role.value == "patient":
            patient = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
            if not patient:
                return []
            return db.query(EMRRecord).filter(EMRRecord.patient_id == patient.id).all()
        
        return []
    
    @staticmethod
    def get_record(
        db: Session,
        record_id: int,
        user_id: int
    ) -> EMRRecord:
        record = db.query(EMRRecord).filter(EMRRecord.id == record_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        # Проверка доступа
        from app.common.models import User, PatientProfile, DoctorProfile
        
        user = db.query(User).filter(User.id == user_id).first()
        
        if user.role.value == "patient":
            patient = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
            if record.patient_id != patient.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        elif user.role.value == "doctor":
            doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
            if record.doctor_id != doctor.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        return record
    
    @staticmethod
    def update_record(
        db: Session,
        record_id: int,
        user_id: int,
        record_data: EMRRecordUpdate
    ) -> EMRRecord:
        record = EMRService.get_record(db, record_id, user_id)
        
        update_data = record_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(record, field, value)
        
        db.commit()
        db.refresh(record)
        
        return record

