from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Header, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
# Import EmergencyContact lazily to avoid relationship initialization issues
# from app.models.emergency_contact import EmergencyContact
from app.models.emergency_alert import EmergencyAlert
from app.models.pregnancy import Pregnancy
from app.api.v1.dependencies import get_current_user
from app.utils.sms import SMSService
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import logging
import asyncio

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


class EmergencyAlertCreate(BaseModel):
    """Emergency alert request with GPS location"""
    pregnancy_id: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = None
    emergency_type: str = Field(default="medical", pattern="^(medical|accident|other)$")
    severity: str = Field(default="high", pattern="^(critical|high|medium|low)$")
    description: Optional[str] = None


class EmergencyAlertResponse(BaseModel):
    id: str
    user_id: str
    pregnancy_id: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    emergency_type: str
    severity: str
    status: str
    contacts_notified: bool
    healthcare_provider_notified: bool
    ambulance_called: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Old endpoints removed - using /contacts endpoints instead to avoid ORM issues


@router.post("/alert", response_model=EmergencyAlertResponse)
async def trigger_emergency_alert(
    alert_data: EmergencyAlertCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger emergency alert - one-tap emergency button"""
    try:
        # Verify pregnancy belongs to user if provided
        pregnancy = None
        if alert_data.pregnancy_id:
            pregnancy = db.query(Pregnancy).filter(
                Pregnancy.id == alert_data.pregnancy_id,
                Pregnancy.user_id == current_user.id
            ).first()
            if not pregnancy:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pregnancy not found"
                )
        
        # Create emergency alert
        alert = EmergencyAlert(
            user_id=current_user.id,
            pregnancy_id=alert_data.pregnancy_id,
            latitude=alert_data.latitude,
            longitude=alert_data.longitude,
            address=alert_data.address,
            emergency_type=alert_data.emergency_type,
            severity=alert_data.severity,
            description=alert_data.description,
            status="active"
        )
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        # Notify emergency contacts in background
        background_tasks.add_task(
            notify_emergency_contacts_task,
            current_user.id,
            alert.id,
            alert_data.severity
        )
        
        logger.info(f"Emergency alert triggered: {alert.id} for user {current_user.id}")
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error triggering emergency alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger emergency alert"
        )


async def notify_emergency_contacts_task(user_id: str, alert_id: str, severity: str):
    """Background task to notify emergency contacts"""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        # Get user and emergency contacts
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        # Use raw SQL to avoid ORM relationship issues
        from sqlalchemy import text
        
        # Get primary contacts first
        sql_query = text("""
            SELECT phone FROM emergency_contacts 
            WHERE user_id = :user_id AND is_primary = 1
            LIMIT 3
        """)
        result = db.execute(sql_query, {"user_id": user_id})
        rows = result.fetchall()
        phone_numbers = [str(row[0]) for row in rows if row[0]]
        
        # If no primary contacts, get any contacts
        if not phone_numbers:
            sql_query = text("""
                SELECT phone FROM emergency_contacts 
                WHERE user_id = :user_id
                LIMIT 3
            """)
            result = db.execute(sql_query, {"user_id": user_id})
            rows = result.fetchall()
            phone_numbers = [str(row[0]) for row in rows if row[0]]
        
        if phone_numbers:
            
            # Send SMS alerts
            if phone_numbers:
                message = f"🚨 EMERGENCY ALERT: {user.full_name} needs immediate assistance. Severity: {severity.upper()}. Alert ID: {alert_id[:8]}. Please contact them immediately."
                result = await SMSService.send_sms_twilio(phone_numbers, message)
                logger.info(f"Emergency SMS sent: {result}")
        
        # Update alert
        alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id).first()
        if alert:
            alert.contacts_notified = True
            db.commit()
            
    except Exception as e:
        logger.error(f"Error notifying emergency contacts: {e}")
    finally:
        db.close()


@router.get("/alert/{alert_id}", response_model=EmergencyAlertResponse)
async def get_emergency_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get emergency alert details"""
    try:
        alert = db.query(EmergencyAlert).filter(
            EmergencyAlert.id == alert_id,
            EmergencyAlert.user_id == current_user.id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency alert not found"
            )
        
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching emergency alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emergency alert"
        )


@router.put("/alert/{alert_id}/resolve")
async def resolve_emergency_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark emergency alert as resolved"""
    try:
        alert = db.query(EmergencyAlert).filter(
            EmergencyAlert.id == alert_id,
            EmergencyAlert.user_id == current_user.id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency alert not found"
            )
        
        alert.status = "resolved"
        alert.resolved_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Emergency alert resolved: {alert_id}")
        return {"message": "Emergency alert resolved", "alert_id": alert_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving emergency alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve emergency alert"
        )


@router.post("/alert/{alert_id}/resolve")
async def resolve_emergency_alert_post(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark emergency alert as resolved (POST method for frontend compatibility)"""
    try:
        alert = db.query(EmergencyAlert).filter(
            EmergencyAlert.id == alert_id,
            EmergencyAlert.user_id == current_user.id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency alert not found"
            )
        
        alert.status = "resolved"
        alert.resolved_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Emergency alert resolved: {alert_id}")
        return {"message": "Emergency alert resolved", "alert_id": alert_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving emergency alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve emergency alert"
        )


@router.get("/alert/user/{user_id}/history")
async def get_emergency_alert_history(
    user_id: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get emergency alert history for a user"""
    try:
        if user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own emergency alerts"
            )
        
        alerts = db.query(EmergencyAlert).filter(
            EmergencyAlert.user_id == user_id
        ).order_by(EmergencyAlert.created_at.desc()).limit(limit).all()
        
        return {"alerts": alerts, "total": len(alerts)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching emergency alert history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emergency alert history"
        )


@router.get("/history")
async def get_emergency_alert_history_for_current_user(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get emergency alert history for current user (frontend compatibility)"""
    try:
        alerts = db.query(EmergencyAlert).filter(
            EmergencyAlert.user_id == current_user.id
        ).order_by(EmergencyAlert.created_at.desc()).limit(limit).all()
        
        return alerts
    except Exception as e:
        logger.error(f"Error fetching emergency alert history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emergency alert history"
        )


# Additional endpoints for frontend compatibility
@router.get("/contacts")
async def get_emergency_contacts_for_current_user(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get emergency contacts for current user (frontend compatibility)
    Uses raw SQL and token decoding to avoid ORM relationship issues
    """
    try:
        # Get user_id directly from token to avoid User ORM query
        from app.utils.security import decode_token
        from sqlalchemy import text
        
        # Extract token from Authorization header - try multiple ways
        token = None
        authorization = request.headers.get("Authorization") or request.headers.get("authorization")
        
        if authorization:
            if authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "").strip()
            else:
                token = authorization.strip()
        
        if not token:
            logger.warning(f"No token provided. Headers: {dict(request.headers)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Decode token to get user_id (no ORM involved)
        try:
            user_id = decode_token(token)
            user_id = str(user_id)
            logger.info(f"Fetching emergency contacts for user {user_id} using raw SQL")
        except Exception as token_error:
            logger.error(f"Token decode error: {token_error}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Use ONLY raw SQL - never touch the ORM model
        try:
            # Direct SQL query - no ORM involved
            sql_query = text("""
                SELECT id, name, phone, relationship_type, is_primary, created_at 
                FROM emergency_contacts 
                WHERE user_id = :user_id
                ORDER BY is_primary DESC, created_at DESC
            """)
            
            result = db.execute(sql_query, {"user_id": user_id})
            rows = result.fetchall()
            
            # Convert rows to dictionaries
            contacts_list = []
            for row in rows:
                try:
                    contacts_list.append({
                        'id': str(row[0]) if row[0] else '',
                        'name': str(row[1]) if row[1] else '',
                        'phone': str(row[2]) if row[2] else '',
                        'relationship': str(row[3]) if row[3] else '',
                        'is_primary': bool(row[4]) if row[4] is not None else False
                    })
                except Exception as row_error:
                    logger.error(f"Error processing row: {row_error}")
                    continue
            
            logger.info(f"Successfully fetched {len(contacts_list)} contacts for user {user_id}")
            return contacts_list
            
        except Exception as sql_error:
            logger.error(f"SQL query error: {sql_error}")
            import traceback
            traceback.print_exc()
            # Return empty list on any SQL error
            return []
        
    except HTTPException:
        raise
    except Exception as e:
        # Catch ALL other exceptions and return empty list instead of 500
        logger.error(f"Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        # Return empty list to prevent 500 error
        return []


@router.post("/contacts", response_model=EmergencyContactResponse)
async def create_emergency_contact_for_current_user(
    contact_data: EmergencyContactCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create emergency contact for current user (frontend compatibility)
    Uses raw SQL and token decoding to avoid ORM relationship issues
    """
    try:
        # Get user_id directly from token to avoid User ORM query
        from app.utils.security import decode_token
        
        # Extract token from Authorization header - try multiple ways
        token = None
        authorization = request.headers.get("Authorization") or request.headers.get("authorization")
        
        if authorization:
            if authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "").strip()
            else:
                token = authorization.strip()
        
        if not token:
            logger.warning(f"No token provided. Headers: {dict(request.headers)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Decode token to get user_id (no ORM involved)
        try:
            user_id = decode_token(token)
            user_id = str(user_id)
            logger.info(f"Creating emergency contact for user {user_id}")
        except Exception as token_error:
            logger.error(f"Token decode error: {token_error}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Prepare contact data
        contact_data_dict = contact_data.model_dump()
        if 'relationship' in contact_data_dict:
            contact_data_dict['relationship_type'] = contact_data_dict.pop('relationship')
        
        # Ensure required fields
        if not contact_data_dict.get('name'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name is required"
            )
        if not contact_data_dict.get('phone'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone is required"
            )
        
        # Create contact using raw SQL to avoid ORM relationship issues
        from sqlalchemy import text
        import uuid
        
        contact_id = str(uuid.uuid4())
        contact_name = contact_data_dict.get('name', '')
        contact_phone = contact_data_dict.get('phone', '')
        contact_relationship = contact_data_dict.get('relationship_type', '')
        contact_is_primary = contact_data_dict.get('is_primary', False)
        
        # Insert using raw SQL
        insert_sql = text("""
            INSERT INTO emergency_contacts (id, user_id, name, phone, relationship_type, is_primary, created_at)
            VALUES (:id, :user_id, :name, :phone, :relationship_type, :is_primary, :created_at)
        """)
        
        db.execute(insert_sql, {
            'id': contact_id,
            'user_id': user_id,
            'name': contact_name,
            'phone': contact_phone,
            'relationship_type': contact_relationship,
            'is_primary': contact_is_primary,
            'created_at': datetime.utcnow()
        })
        db.commit()
        
        logger.info(f"Emergency contact added: {contact_id} for user {user_id}")
        
        # Build response
        response_dict = {
            'id': contact_id,
            'name': contact_name,
            'phone': contact_phone,
            'relationship': contact_relationship,
            'is_primary': contact_is_primary
        }
        return EmergencyContactResponse(**response_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding emergency contact: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to add contact: {str(e)}"
        )


@router.put("/contacts/{contact_id}", response_model=EmergencyContactResponse)
async def update_emergency_contact(
    contact_id: str,
    contact_data: EmergencyContactCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update emergency contact (frontend compatibility)
    Uses raw SQL and token decoding to avoid ORM relationship issues
    """
    try:
        # Get user_id directly from token to avoid User ORM query
        from app.utils.security import decode_token
        
        # Extract token from Authorization header - try multiple ways
        token = None
        authorization = request.headers.get("Authorization") or request.headers.get("authorization")
        
        if authorization:
            if authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "").strip()
            else:
                token = authorization.strip()
        
        if not token:
            logger.warning(f"No token provided. Headers: {dict(request.headers)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Decode token to get user_id (no ORM involved)
        try:
            user_id = decode_token(token)
            user_id = str(user_id)
            logger.info(f"Updating emergency contact {contact_id} for user {user_id}")
        except Exception as token_error:
            logger.error(f"Token decode error: {token_error}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Check if contact exists using raw SQL
        from sqlalchemy import text
        check_sql = text("SELECT id FROM emergency_contacts WHERE id = :contact_id AND user_id = :user_id")
        result = db.execute(check_sql, {"contact_id": contact_id, "user_id": user_id})
        if not result.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        
        # Update using raw SQL
        update_sql = text("""
            UPDATE emergency_contacts 
            SET name = :name, phone = :phone, relationship_type = :relationship_type, is_primary = :is_primary
            WHERE id = :contact_id AND user_id = :user_id
        """)
        
        db.execute(update_sql, {
            'contact_id': contact_id,
            'user_id': user_id,
            'name': contact_data.name,
            'phone': contact_data.phone,
            'relationship_type': contact_data.relationship,
            'is_primary': contact_data.is_primary
        })
        db.commit()
        
        # Fetch updated contact
        select_sql = text("SELECT id, name, phone, relationship_type, is_primary FROM emergency_contacts WHERE id = :contact_id")
        result = db.execute(select_sql, {"contact_id": contact_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found after update")
        
        response_dict = {
            'id': str(row[0]),
            'name': str(row[1]) if row[1] else '',
            'phone': str(row[2]) if row[2] else '',
            'relationship': str(row[3]) if row[3] else '',
            'is_primary': bool(row[4]) if row[4] is not None else False
        }
        return EmergencyContactResponse(**response_dict)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating emergency contact: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update contact: {str(e)}")


@router.delete("/contacts/{contact_id}")
async def delete_emergency_contact(
    contact_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete emergency contact (frontend compatibility)
    Uses raw SQL and token decoding to avoid ORM relationship issues
    """
    try:
        # Get user_id directly from token to avoid User ORM query
        from app.utils.security import decode_token
        
        # Extract token from Authorization header - try multiple ways
        token = None
        authorization = request.headers.get("Authorization") or request.headers.get("authorization")
        
        if authorization:
            if authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "").strip()
            else:
                token = authorization.strip()
        
        if not token:
            logger.warning(f"No token provided. Headers: {dict(request.headers)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Decode token to get user_id (no ORM involved)
        try:
            user_id = decode_token(token)
            user_id = str(user_id)
            logger.info(f"Deleting emergency contact {contact_id} for user {user_id}")
        except Exception as token_error:
            logger.error(f"Token decode error: {token_error}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Check if contact exists and belongs to user using raw SQL
        from sqlalchemy import text
        check_sql = text("SELECT id FROM emergency_contacts WHERE id = :contact_id AND user_id = :user_id")
        result = db.execute(check_sql, {"contact_id": contact_id, "user_id": user_id})
        if not result.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        
        # Delete using raw SQL
        delete_sql = text("DELETE FROM emergency_contacts WHERE id = :contact_id AND user_id = :user_id")
        db.execute(delete_sql, {"contact_id": contact_id, "user_id": user_id})
        db.commit()
        
        logger.info(f"Emergency contact deleted: {contact_id} for user {user_id}")
        return {"message": "Contact deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting emergency contact: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete contact: {str(e)}")
