from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class PatientProfileCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    date_of_birth: datetime
    gender: str
    phone: Optional[str] = None


class PatientProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class PatientProfileResponse(BaseModel):
    id: int
    user_id: int
    first_name: Optional[str]
    last_name: Optional[str]
    middle_name: Optional[str]
    date_of_birth: Optional[datetime]
    gender: Optional[str]
    phone: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class MedicalFileCreate(BaseModel):
    file_url: str
    file_name: str
    file_type: str
    description: Optional[str] = None


class MedicalFileResponse(BaseModel):
    id: int
    patient_id: int
    file_url: str
    file_name: str
    file_type: Optional[str]
    description: Optional[str]
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

