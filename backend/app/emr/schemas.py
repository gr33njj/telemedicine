from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class EMRRecordCreate(BaseModel):
    consultation_id: int
    diagnosis: Optional[str] = None
    symptoms: Optional[str] = None
    treatment: Optional[str] = None
    recommendations: Optional[str] = None
    notes: Optional[str] = None


class EMRRecordUpdate(BaseModel):
    diagnosis: Optional[str] = None
    symptoms: Optional[str] = None
    treatment: Optional[str] = None
    recommendations: Optional[str] = None
    notes: Optional[str] = None


class EMRRecordResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    consultation_id: Optional[int]
    diagnosis: Optional[str]
    symptoms: Optional[str]
    treatment: Optional[str]
    recommendations: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

