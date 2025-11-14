from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DoctorProfileCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    specialty: str
    experience_years: int
    consultation_price_points: int
    short_description: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class DoctorProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    specialty: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_price_points: Optional[int] = None
    short_description: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None


class DoctorProfileResponse(BaseModel):
    id: int
    user_id: int
    first_name: Optional[str]
    last_name: Optional[str]
    middle_name: Optional[str]
    specialty: Optional[str]
    experience_years: Optional[int]
    consultation_price_points: int
    short_description: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    rating: Optional[float]
    reviews_count: Optional[int]
    is_verified: bool
    verification_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class DoctorCertificateCreate(BaseModel):
    file_url: str
    file_name: str
    certificate_type: str
    issued_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None


class DoctorCertificateResponse(BaseModel):
    id: int
    doctor_id: int
    file_url: str
    file_name: str
    certificate_type: Optional[str]
    issued_date: Optional[datetime]
    expiry_date: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DoctorListResponse(BaseModel):
    id: int
    first_name: Optional[str]
    last_name: Optional[str]
    specialty: Optional[str]
    experience_years: Optional[int]
    consultation_price_points: int
    short_description: Optional[str]
    avatar_url: Optional[str]
    rating: Optional[float]
    reviews_count: Optional[int]
    is_verified: bool
    
    class Config:
        from_attributes = True

