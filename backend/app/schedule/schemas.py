from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ScheduleSlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime


class ScheduleSlotResponse(BaseModel):
    id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    is_available: bool
    is_reserved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ScheduleSlotBulkCreate(BaseModel):
    slots: List[ScheduleSlotCreate]


class AvailableSlotsResponse(BaseModel):
    doctor_id: int
    doctor_name: str
    slots: List[ScheduleSlotResponse]

