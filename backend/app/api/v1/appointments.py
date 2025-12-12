from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.appointment import Appointment
from app.models.pregnancy import Pregnancy
from app.models.user import User
from app.api.v1.dependencies import get_current_user
from app.utils.websocket_manager import manager
from pydantic import BaseModel, field_validator, ValidationError
from datetime import datetime
from typing import Optional, Union
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class AppointmentCreate(BaseModel):
    pregnancy_id: str
    appointment_date: str  # Accept as string, parse in endpoint
    clinic_name: str
    clinic_address: str
    appointment_type: str


class AppointmentResponse(BaseModel):
    id: str
    pregnancy_id: str
    appointment_date: datetime
    clinic_name: str
    clinic_address: Optional[str] = None
    appointment_type: Optional[str] = None
    status: str
    notes: Optional[str] = None
    provider_notes: Optional[str] = None
    provider_id: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new appointment"""
    try:
        logger.info(f"=== CREATE APPOINTMENT REQUEST ===")
        logger.info(f"User: {current_user.id} ({current_user.full_name})")
        logger.info(f"Raw appointment_data: {appointment_data}")
        logger.info(f"Creating appointment - Received data: pregnancy_id={appointment_data.pregnancy_id}, appointment_date={appointment_data.appointment_date} (type: {type(appointment_data.appointment_date)}), clinic_name={appointment_data.clinic_name}")
        
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == appointment_data.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        # Verify pregnancy belongs to current user
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create appointments for your own pregnancies"
            )
        
        # Parse appointment_date from string
        appointment_date_str = appointment_data.appointment_date
        logger.info(f"Parsing appointment_date: '{appointment_date_str}'")
        
        try:
            # Handle datetime-local format (YYYY-MM-DDTHH:mm)
            if 'T' in appointment_date_str:
                appointment_date_clean = appointment_date_str.split('+')[0].split('Z')[0].rstrip('-')
                if appointment_date_clean.count(':') == 1:
                    # Format: YYYY-MM-DDTHH:mm
                    parsed_date = datetime.strptime(appointment_date_clean, '%Y-%m-%dT%H:%M')
                else:
                    # Format with seconds
                    parsed_date = datetime.fromisoformat(appointment_date_clean)
            else:
                parsed_date = datetime.strptime(appointment_date_str, '%Y-%m-%d %H:%M:%S')
            
            logger.info(f"Parsed appointment_date: {parsed_date}")
        except Exception as date_error:
            logger.error(f"Error parsing date '{appointment_date_str}': {date_error}")
            import traceback
            logger.error(f"Date parsing traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: {appointment_date_str}. Expected format: YYYY-MM-DDTHH:mm"
            )
        
        # Create appointment with parsed date
        appointment_dict = {
            'pregnancy_id': appointment_data.pregnancy_id,
            'appointment_date': parsed_date,  # Use parsed datetime
            'clinic_name': appointment_data.clinic_name,
            'clinic_address': appointment_data.clinic_address,
            'appointment_type': appointment_data.appointment_type,
            'status': 'pending'  # Set default status
        }
        logger.info(f"Creating appointment with dict: {appointment_dict}")
        
        try:
            appointment = Appointment(**appointment_dict)
            logger.info(f"Appointment object created: {appointment.id}")
        except Exception as model_error:
            logger.error(f"Error creating Appointment model: {model_error}")
            import traceback
            logger.error(f"Model creation traceback: {traceback.format_exc()}")
            raise
        
        # Assign provider if pregnancy has a doctor_name
        if pregnancy.doctor_name:
            provider = db.query(User).filter(
                User.full_name == pregnancy.doctor_name,
                User.role == "provider"
            ).first()
            if provider:
                appointment.provider_id = provider.id
                logger.info(f"Assigned provider: {provider.id} ({provider.full_name})")
        
        try:
            db.add(appointment)
            logger.info(f"Appointment added to session, committing...")
            db.commit()
            logger.info(f"Appointment committed to database successfully")
            db.refresh(appointment)
            logger.info(f"Appointment refreshed: {appointment.id}")
        except Exception as db_error:
            db.rollback()
            logger.error(f"Database error creating appointment: {db_error}")
            import traceback
            logger.error(f"Database error traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(db_error)}"
            )
        
        # Notify provider if assigned
        if appointment.provider_id:
            await manager.send_personal_json(
                str(appointment.provider_id),
                {
                    "type": "appointment_request",
                    "appointment_id": str(appointment.id),
                    "patient_name": current_user.full_name,
                    "appointment_date": appointment.appointment_date.isoformat(),
                    "clinic_name": appointment.clinic_name,
                    "appointment_type": appointment.appointment_type,
                    "message": f"New appointment request from {current_user.full_name}"
                }
            )
        
        logger.info(f"Appointment created: {appointment.id}")
        return appointment
        
    except ValidationError as ve:
        logger.error(f"Validation error creating appointment: {ve}")
        logger.error(f"Validation errors: {ve.errors()}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {ve.errors()}"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"=== ERROR CREATING APPOINTMENT ===")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Full traceback:\n{error_traceback}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create appointment: {str(e)}"
        )


@router.get("/{pregnancy_id}")
async def get_appointments(
    pregnancy_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get appointments for a pregnancy"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view appointments for your own pregnancies"
            )
        
        appointments = db.query(Appointment).filter(
            Appointment.pregnancy_id == pregnancy_id
        ).order_by(Appointment.appointment_date).all()
        
        return {"appointments": appointments, "total": len(appointments)}
        
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch appointments")


@router.get("/provider/pending")
async def get_pending_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending appointments for the current provider"""
    try:
        if current_user.role != "provider":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only providers can access this endpoint"
            )
        
        # Get appointments assigned to this provider
        appointments = db.query(Appointment).join(
            Pregnancy, Appointment.pregnancy_id == Pregnancy.id
        ).join(
            User, Pregnancy.user_id == User.id
        ).filter(
            Appointment.provider_id == current_user.id,
            Appointment.status == "pending"
        ).order_by(Appointment.appointment_date).all()
        
        # Format response with patient info
        result = []
        for appointment in appointments:
            pregnancy = db.query(Pregnancy).filter(Pregnancy.id == appointment.pregnancy_id).first()
            patient = db.query(User).filter(User.id == pregnancy.user_id).first() if pregnancy else None
            
            result.append({
                "id": str(appointment.id),
                "pregnancy_id": str(appointment.pregnancy_id),
                "appointment_date": appointment.appointment_date,
                "clinic_name": appointment.clinic_name,
                "clinic_address": appointment.clinic_address,
                "appointment_type": appointment.appointment_type,
                "status": appointment.status,
                "notes": appointment.notes,
                "created_at": appointment.created_at,
                "patient_name": patient.full_name if patient else "Unknown",
                "patient_id": str(patient.id) if patient else None,
            })
        
        return {"appointments": result, "total": len(result)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending appointments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch appointments")


@router.get("/provider/all")
async def get_all_provider_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None
):
    """Get all appointments for the current provider"""
    try:
        if current_user.role != "provider":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only providers can access this endpoint"
            )
        
        query = db.query(Appointment).join(
            Pregnancy, Appointment.pregnancy_id == Pregnancy.id
        ).join(
            User, Pregnancy.user_id == User.id
        ).filter(
            Appointment.provider_id == current_user.id
        )
        
        if status_filter:
            query = query.filter(Appointment.status == status_filter)
        
        appointments = query.order_by(Appointment.appointment_date).all()
        
        # Format response with patient info
        result = []
        for appointment in appointments:
            pregnancy = db.query(Pregnancy).filter(Pregnancy.id == appointment.pregnancy_id).first()
            patient = db.query(User).filter(User.id == pregnancy.user_id).first() if pregnancy else None
            
            result.append({
                "id": str(appointment.id),
                "pregnancy_id": str(appointment.pregnancy_id),
                "appointment_date": appointment.appointment_date,
                "clinic_name": appointment.clinic_name,
                "clinic_address": appointment.clinic_address,
                "appointment_type": appointment.appointment_type,
                "status": appointment.status,
                "notes": appointment.notes,
                "provider_notes": appointment.provider_notes,
                "created_at": appointment.created_at,
                "updated_at": appointment.updated_at,
                "patient_name": patient.full_name if patient else "Unknown",
                "patient_id": str(patient.id) if patient else None,
            })
        
        return {"appointments": result, "total": len(result)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching provider appointments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch appointments")


@router.get("/provider/{appointment_id}")
async def get_appointment_details(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed appointment information for provider"""
    try:
        if current_user.role != "provider":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only providers can access this endpoint"
            )
        
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        
        if appointment.provider_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view appointments assigned to you"
            )
        
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == appointment.pregnancy_id).first()
        patient = db.query(User).filter(User.id == pregnancy.user_id).first() if pregnancy else None
        
        return {
            "id": str(appointment.id),
            "pregnancy_id": str(appointment.pregnancy_id),
            "appointment_date": appointment.appointment_date,
            "clinic_name": appointment.clinic_name,
            "clinic_address": appointment.clinic_address,
            "appointment_type": appointment.appointment_type,
            "status": appointment.status,
            "notes": appointment.notes,
            "provider_notes": appointment.provider_notes,
            "created_at": appointment.created_at,
            "updated_at": appointment.updated_at,
            "patient": {
                "id": str(patient.id) if patient else None,
                "name": patient.full_name if patient else "Unknown",
                "email": patient.email if patient else None,
            } if patient else None,
            "pregnancy": {
                "id": str(pregnancy.id) if pregnancy else None,
                "due_date": pregnancy.due_date.isoformat() if pregnancy and pregnancy.due_date else None,
                "current_week": pregnancy.current_week if pregnancy else None,
            } if pregnancy else None,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching appointment details: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch appointment")


class AppointmentStatusUpdate(BaseModel):
    status: str  # accepted or declined
    provider_notes: Optional[str] = None


@router.post("/provider/{appointment_id}/accept", response_model=AppointmentResponse)
async def accept_appointment(
    appointment_id: str,
    status_data: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Provider accepts an appointment"""
    try:
        if current_user.role != "provider":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only providers can accept appointments"
            )
        
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        
        if appointment.provider_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only accept appointments assigned to you"
            )
        
        if appointment.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Appointment is already {appointment.status}"
            )
        
        appointment.status = "accepted"
        appointment.provider_notes = status_data.provider_notes
        db.commit()
        db.refresh(appointment)
        
        # Notify patient
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == appointment.pregnancy_id).first()
        if pregnancy:
            await manager.send_personal_json(
                str(pregnancy.user_id),
                {
                    "type": "appointment_accepted",
                    "appointment_id": str(appointment.id),
                    "provider_name": current_user.full_name,
                    "appointment_date": appointment.appointment_date.isoformat(),
                    "clinic_name": appointment.clinic_name,
                    "message": f"Your appointment on {appointment.appointment_date.strftime('%B %d, %Y at %I:%M %p')} has been accepted by {current_user.full_name}"
                }
            )
        
        logger.info(f"Appointment {appointment_id} accepted by provider {current_user.id}")
        return appointment
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error accepting appointment: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to accept appointment")


@router.post("/provider/{appointment_id}/decline", response_model=AppointmentResponse)
async def decline_appointment(
    appointment_id: str,
    status_data: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Provider declines an appointment"""
    try:
        if current_user.role != "provider":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only providers can decline appointments"
            )
        
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        
        if appointment.provider_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only decline appointments assigned to you"
            )
        
        if appointment.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Appointment is already {appointment.status}"
            )
        
        appointment.status = "declined"
        appointment.provider_notes = status_data.provider_notes
        db.commit()
        db.refresh(appointment)
        
        # Notify patient
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == appointment.pregnancy_id).first()
        if pregnancy:
            await manager.send_personal_json(
                str(pregnancy.user_id),
                {
                    "type": "appointment_declined",
                    "appointment_id": str(appointment.id),
                    "provider_name": current_user.full_name,
                    "appointment_date": appointment.appointment_date.isoformat(),
                    "clinic_name": appointment.clinic_name,
                    "message": f"Your appointment on {appointment.appointment_date.strftime('%B %d, %Y at %I:%M %p')} has been declined by {current_user.full_name}"
                }
            )
        
        logger.info(f"Appointment {appointment_id} declined by provider {current_user.id}")
        return appointment
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error declining appointment: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to decline appointment")
