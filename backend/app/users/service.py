from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.common.models import PatientProfile, MedicalFile
from app.users.schemas import PatientProfileCreate, PatientProfileUpdate, MedicalFileCreate


class UserService:
    @staticmethod
    def create_patient_profile(
        db: Session,
        user_id: int,
        profile_data: PatientProfileCreate
    ) -> PatientProfile:
        # Проверка существования профиля
        existing_profile = db.query(PatientProfile).filter(
            PatientProfile.user_id == user_id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile already exists"
            )
        
        profile = PatientProfile(
            user_id=user_id,
            **profile_data.dict()
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    
    @staticmethod
    def update_patient_profile(
        db: Session,
        user_id: int,
        profile_data: PatientProfileUpdate
    ) -> PatientProfile:
        profile = db.query(PatientProfile).filter(
            PatientProfile.user_id == user_id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        
        db.commit()
        db.refresh(profile)
        return profile
    
    @staticmethod
    def upload_medical_file(
        db: Session,
        user_id: int,
        file_data: MedicalFileCreate
    ) -> MedicalFile:
        profile = db.query(PatientProfile).filter(
            PatientProfile.user_id == user_id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found"
            )
        
        medical_file = MedicalFile(
            patient_id=profile.id,
            **file_data.dict()
        )
        db.add(medical_file)
        db.commit()
        db.refresh(medical_file)
        return medical_file
    
    @staticmethod
    def delete_medical_file(
        db: Session,
        user_id: int,
        file_id: int
    ):
        profile = db.query(PatientProfile).filter(
            PatientProfile.user_id == user_id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found"
            )
        
        medical_file = db.query(MedicalFile).filter(
            MedicalFile.id == file_id,
            MedicalFile.patient_id == profile.id
        ).first()
        
        if not medical_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        db.delete(medical_file)
        db.commit()

