from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.appointment import Appointment
from app.models.pregnancy import Pregnancy
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class AppointmentCreate(BaseModel):
    pregnancy_id: str
    appointment_date: datetime
    clinic_name: str
    clinic_address: str
    appointment_type: str


class AppointmentResponse(BaseModel):
    id: str
    pregnancy_id: str
    appointment_date: datetime
    clinic_name: str
    status: str
    
    class Config:
        from_attributes = True


@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db)
):
    """Create a new appointment"""
    try:
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == appointment_data.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        appointment = Appointment(**appointment_data.dict())
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        
        logger.info(f"Appointment created: {appointment.id}")
        return appointment
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create appointment")


@router.get("/{pregnancy_id}")
async def get_appointments(
    pregnancy_id: str,
    db: Session = Depends(get_db)
):
    """Get appointments for a pregnancy"""
    try:
        appointments = db.query(Appointment).filter(
            Appointment.pregnancy_id == pregnancy_id
        ).order_by(Appointment.appointment_date).all()
        
        return {"appointments": appointments, "total": len(appointments)}
        
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch appointments")
