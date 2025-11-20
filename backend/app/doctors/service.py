from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional, List
from app.common.models import DoctorProfile, DoctorCertificate
from app.doctors.schemas import (
    DoctorProfileCreate,
    DoctorProfileUpdate,
    DoctorCertificateCreate,
    DoctorProfileResponse,
    DoctorListResponse,
)
from app.config import settings


class DoctorService:
    @staticmethod
    def build_avatar_url(profile: DoctorProfile) -> Optional[str]:
        if not profile.avatar_url:
            return None
        # If avatar_url is already a full URL (starts with http), return as is
        if profile.avatar_url.startswith(('http://', 'https://')):
            return profile.avatar_url
        # Otherwise, build the API endpoint URL
        return f"{settings.API_V1_PREFIX}/doctors/profile/avatar/{profile.id}"

    @staticmethod
    def serialize_profile(profile: DoctorProfile) -> DoctorProfileResponse:
        return DoctorProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            middle_name=profile.middle_name,
            specialty=profile.specialty,
            experience_years=profile.experience_years,
            consultation_price_points=profile.consultation_price_points or 0,
            short_description=profile.short_description,
            bio=profile.bio,
            avatar_url=DoctorService.build_avatar_url(profile),
            rating=float(profile.rating) if profile.rating is not None else None,
            reviews_count=profile.reviews_count,
            is_verified=profile.is_verified,
            verification_status=profile.verification_status,
            created_at=profile.created_at,
        )

    @staticmethod
    def serialize_list_item(profile: DoctorProfile) -> DoctorListResponse:
        return DoctorListResponse(
            id=profile.id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            specialty=profile.specialty,
            experience_years=profile.experience_years,
            consultation_price_points=profile.consultation_price_points or 0,
            short_description=profile.short_description,
            avatar_url=DoctorService.build_avatar_url(profile),
            rating=float(profile.rating) if profile.rating is not None else None,
            reviews_count=profile.reviews_count,
            is_verified=profile.is_verified,
        )

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

