from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class BookConsultationRequest(BaseModel):
    """Запрос на бронирование консультации"""
    doctor_id: int
    slot_id: int
    points_cost: int


class CancelConsultationRequest(BaseModel):
    """Запрос на отмену консультации"""
    reason: Optional[str] = None


class ConsultationResponse(BaseModel):
    """Ответ с информацией о консультации"""
    id: int
    patient_id: int
    doctor_id: int
    slot_id: int
    status: str
    room_id: str
    points_cost: int
    points_frozen: bool
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    slot_start_time: Optional[datetime] = None
    slot_end_time: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ConsultationDetailResponse(ConsultationResponse):
    """Детальная информация о консультации"""
    pass


class ConsultationMessageRequest(BaseModel):
    """Сообщение в чате консультации"""
    message: str


class ConsultationMessageResponse(BaseModel):
    """Ответ с сообщением"""
    id: int
    consultation_id: int
    sender_id: int
    message: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConsultationFileResponse(BaseModel):
    """Информация о прикреплённом файле консультации"""
    id: int
    consultation_id: int
    file_name: str
    file_type: Optional[str] = None
    uploaded_by_id: int
    uploaded_at: datetime
    download_url: str

    class Config:
        from_attributes = True
