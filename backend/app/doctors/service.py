from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional, List
from app.common.models import DoctorProfile, DoctorCertificate
from app.doctors.schemas import DoctorProfileCreate, DoctorProfileUpdate, DoctorCertificateCreate


class DoctorService:
    @staticmethod
    def create_doctor_profile(
        db: Session,
        user_id: int,
        profile_data: DoctorProfileCreate
    ) -> DoctorProfile:
        existing_profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == user_id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile already exists"
            )
        
        profile = DoctorProfile(
            user_id=user_id,
            **profile_data.dict()
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    
    @staticmethod
    def update_doctor_profile(
        db: Session,
        user_id: int,
        profile_data: DoctorProfileUpdate
    ) -> DoctorProfile:
        profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == user_id
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
    def upload_certificate(
        db: Session,
        user_id: int,
        certificate_data: DoctorCertificateCreate
    ) -> DoctorCertificate:
        profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == user_id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        certificate = DoctorCertificate(
            doctor_id=profile.id,
            **certificate_data.dict()
        )
        db.add(certificate)
        db.commit()
        db.refresh(certificate)
        return certificate
    
    @staticmethod
    def get_doctors_list(
        db: Session,
        specialty: Optional[str] = None
    ) -> List[DoctorProfile]:
        query = db.query(DoctorProfile).filter(DoctorProfile.is_verified == True)
        
        if specialty:
            query = query.filter(DoctorProfile.specialty.ilike(f"%{specialty}%"))
        
        return query.all()

