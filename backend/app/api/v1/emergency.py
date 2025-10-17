from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.emergency_contact import EmergencyContact
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: str
    is_primary: bool = False


class EmergencyContactResponse(BaseModel):
    id: str
    name: str
    phone: str
    relationship: str
    is_primary: bool
    
    class Config:
        from_attributes = True


@router.post("/{user_id}", response_model=EmergencyContactResponse)
async def add_emergency_contact(
    user_id: str,
    contact_data: EmergencyContactCreate,
    db: Session = Depends(get_db)
):
    """Add emergency contact for a user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        contact = EmergencyContact(user_id=user_id, **contact_data.dict())
        db.add(contact)
        db.commit()
        db.refresh(contact)
        
        logger.info(f"Emergency contact added for user {user_id}")
        return contact
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding emergency contact: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add contact")


@router.get("/{user_id}")
async def get_emergency_contacts(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get emergency contacts for a user"""
    try:
        contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).all()
        return {"contacts": contacts, "total": len(contacts)}
        
    except Exception as e:
        logger.error(f"Error fetching emergency contacts: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch contacts")
