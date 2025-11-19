from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional, List
from datetime import datetime
from app.common.models import ScheduleSlot, DoctorProfile, Consultation
from app.schedule.schemas import ScheduleSlotCreate, ScheduleSlotBulkCreate


class ScheduleService:
    @staticmethod
    def create_slot(
        db: Session,
        user_id: int,
        slot_data: ScheduleSlotCreate
    ) -> ScheduleSlot:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        if slot_data.start_time >= slot_data.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start time must be before end time"
            )
        
        slot = ScheduleSlot(
            doctor_id=doctor.id,
            **slot_data.dict()
        )
        db.add(slot)
        db.commit()
        db.refresh(slot)
        return slot
    
    @staticmethod
    def create_slots_bulk(
        db: Session,
        user_id: int,
        slots_data: ScheduleSlotBulkCreate
    ) -> List[ScheduleSlot]:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        slots = []
        for slot_data in slots_data.slots:
            if slot_data.start_time >= slot_data.end_time:
                continue
            
            slot = ScheduleSlot(
                doctor_id=doctor.id,
                **slot_data.dict()
            )
            db.add(slot)
            slots.append(slot)
        
        db.commit()
        for slot in slots:
            db.refresh(slot)
        
        return slots
    
    @staticmethod
    def get_doctor_slots(
        db: Session,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[ScheduleSlot]:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        if not doctor:
            return []
        
        query = db.query(ScheduleSlot).filter(ScheduleSlot.doctor_id == doctor.id)
        
        if start_date:
            query = query.filter(ScheduleSlot.start_time >= start_date)
        if end_date:
            query = query.filter(ScheduleSlot.end_time <= end_date)
        
        return query.order_by(ScheduleSlot.start_time).all()
    
    @staticmethod
    def get_available_slots(
        db: Session,
        doctor_id: Optional[int] = None,
        specialty: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[dict]:
        query = db.query(ScheduleSlot).join(DoctorProfile).filter(
            ScheduleSlot.is_available == True,
            ScheduleSlot.is_reserved == False,
            DoctorProfile.is_verified == True
        )
        
        if doctor_id:
            query = query.filter(ScheduleSlot.doctor_id == doctor_id)
        if specialty:
            query = query.filter(DoctorProfile.specialty.ilike(f"%{specialty}%"))
        if start_date:
            query = query.filter(ScheduleSlot.start_time >= start_date)
        if end_date:
            query = query.filter(ScheduleSlot.end_time <= end_date)
        
        slots = query.order_by(ScheduleSlot.start_time).all()
        
        # Группировка по врачам
        result = {}
        for slot in slots:
            if slot.doctor_id not in result:
                doctor = db.query(DoctorProfile).filter(DoctorProfile.id == slot.doctor_id).first()
                result[slot.doctor_id] = {
                    "doctor_id": slot.doctor_id,
                    "doctor_name": f"{doctor.first_name} {doctor.last_name}" if doctor else "",
                    "slots": []
                }
            result[slot.doctor_id]["slots"].append(slot)
        
        return list(result.values())
    
    @staticmethod
    def delete_slot(
        db: Session,
        user_id: int,
        slot_id: int
    ):
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        slot = db.query(ScheduleSlot).filter(
            ScheduleSlot.id == slot_id,
            ScheduleSlot.doctor_id == doctor.id
        ).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found"
            )
        
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete reserved slot"
            )

        existing_consultation = db.query(Consultation).filter(Consultation.slot_id == slot.id).first()
        if existing_consultation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slot linked to consultation"
            )
        
        db.delete(slot)
        db.commit()

