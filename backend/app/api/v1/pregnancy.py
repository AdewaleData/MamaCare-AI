from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.pregnancy import Pregnancy
from app.models.user import User
from app.schemas.pregnancy import PregnancyCreate, PregnancyUpdate, PregnancyResponse
from app.api.v1.dependencies import get_current_user
import logging
from datetime import datetime, date, timedelta
from typing import List, Optional

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/pregnancy", response_model=PregnancyResponse)
async def create_pregnancy(
    pregnancy_data: PregnancyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new pregnancy record"""
    try:
        # Check if user already has an active pregnancy
        existing_pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).first()
        
        if existing_pregnancy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active pregnancy"
            )
        
        # Calculate current week and trimester
        # Due date is typically 280 days (40 weeks) from LMP (Last Menstrual Period)
        due_date = datetime.strptime(pregnancy_data.due_date, "%Y-%m-%d").date()
        today = date.today()
        # Calculate LMP (280 days before due date)
        lmp_date = due_date - timedelta(days=280)
        # Calculate days from LMP to today
        days_pregnant = (today - lmp_date).days
        current_week = max(1, min(40, days_pregnant // 7))
        
        if current_week <= 12:
            trimester = 1
        elif current_week <= 26:
            trimester = 2
        else:
            trimester = 3
        
        # Create pregnancy record
        pregnancy = Pregnancy(
            user_id=current_user.id,
            due_date=due_date,
            pregnancy_stage=f"trimester{trimester}",
            is_active=True,
            current_week=current_week,
            trimester=trimester,
            doctor_name=pregnancy_data.doctor_name,
            hospital_name=pregnancy_data.hospital_name,
            blood_type=pregnancy_data.blood_type,
            notes=pregnancy_data.notes
        )
        
        db.add(pregnancy)
        db.commit()
        db.refresh(pregnancy)
        
        logger.info(f"Pregnancy created for user {current_user.id}: {pregnancy.id}")
        
        return PregnancyResponse(
            id=pregnancy.id,
            user_id=pregnancy.user_id,
            due_date=pregnancy.due_date.isoformat(),
            pregnancy_stage=pregnancy.pregnancy_stage,
            current_week=current_week,
            trimester=trimester,
            is_active=pregnancy.is_active,
            doctor_name=pregnancy.doctor_name,
            hospital_name=pregnancy.hospital_name,
            blood_type=pregnancy.blood_type,
            notes=pregnancy.notes,
            created_at=pregnancy.created_at,
            updated_at=pregnancy.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating pregnancy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create pregnancy"
        )


@router.get("/pregnancy/current", response_model=Optional[PregnancyResponse])
async def get_current_pregnancy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current active pregnancy for user"""
    try:
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).first()
        
        if not pregnancy:
            return None
        
        # Calculate current week and trimester
        due_date = pregnancy.due_date
        today = date.today()
        # Calculate LMP (280 days before due date)
        lmp_date = due_date - timedelta(days=280)
        # Calculate days from LMP to today
        days_pregnant = (today - lmp_date).days
        current_week = max(1, min(40, days_pregnant // 7))
        
        if current_week <= 12:
            trimester = 1
        elif current_week <= 26:
            trimester = 2
        else:
            trimester = 3
        
        return PregnancyResponse(
            id=pregnancy.id,
            user_id=pregnancy.user_id,
            due_date=pregnancy.due_date.isoformat(),
            pregnancy_stage=pregnancy.pregnancy_stage,
            current_week=current_week,
            trimester=trimester,
            is_active=pregnancy.is_active,
            doctor_name=pregnancy.doctor_name,
            hospital_name=pregnancy.hospital_name,
            blood_type=pregnancy.blood_type,
            notes=pregnancy.notes,
            created_at=pregnancy.created_at,
            updated_at=pregnancy.updated_at
        )
        
    except Exception as e:
        logger.error(f"Error fetching current pregnancy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pregnancy"
        )


@router.put("/pregnancy/{pregnancy_id}", response_model=PregnancyResponse)
async def update_pregnancy(
    pregnancy_id: str,
    pregnancy_data: PregnancyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update pregnancy record"""
    try:
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.id == pregnancy_id,
            Pregnancy.user_id == current_user.id
        ).first()
        
        if not pregnancy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pregnancy not found"
            )
        
        # Update fields
        if pregnancy_data.due_date:
            pregnancy.due_date = datetime.strptime(pregnancy_data.due_date, "%Y-%m-%d").date()
        
        if pregnancy_data.doctor_name is not None:
            pregnancy.doctor_name = pregnancy_data.doctor_name
        
        if pregnancy_data.hospital_name is not None:
            pregnancy.hospital_name = pregnancy_data.hospital_name
        
        if pregnancy_data.blood_type is not None:
            pregnancy.blood_type = pregnancy_data.blood_type
        
        if pregnancy_data.notes is not None:
            pregnancy.notes = pregnancy_data.notes
        
        # Recalculate trimester if due date changed
        if pregnancy_data.due_date:
            due_date = pregnancy.due_date
            today = date.today()
            # Calculate LMP (280 days before due date)
            lmp_date = due_date - timedelta(days=280)
            # Calculate days from LMP to today
            days_pregnant = (today - lmp_date).days
            current_week = max(1, min(40, days_pregnant // 7))
            
            if current_week <= 12:
                trimester = 1
            elif current_week <= 26:
                trimester = 2
            else:
                trimester = 3
            
            pregnancy.pregnancy_stage = f"trimester{trimester}"
            pregnancy.current_week = current_week
            pregnancy.trimester = trimester
        
        pregnancy.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(pregnancy)
        
        logger.info(f"Pregnancy updated: {pregnancy.id}")
        
        # Calculate current week and trimester for response
        due_date = pregnancy.due_date
        today = date.today()
        days_pregnant = (today - due_date).days + 280
        current_week = max(1, min(40, days_pregnant // 7))
        
        if current_week <= 12:
            trimester = 1
        elif current_week <= 26:
            trimester = 2
        else:
            trimester = 3
        
        return PregnancyResponse(
            id=pregnancy.id,
            user_id=pregnancy.user_id,
            due_date=pregnancy.due_date.isoformat(),
            pregnancy_stage=pregnancy.pregnancy_stage,
            current_week=current_week,
            trimester=trimester,
            is_active=pregnancy.is_active,
            doctor_name=pregnancy.doctor_name,
            hospital_name=pregnancy.hospital_name,
            blood_type=pregnancy.blood_type,
            notes=pregnancy.notes,
            created_at=pregnancy.created_at,
            updated_at=pregnancy.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating pregnancy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update pregnancy"
        )


@router.get("/pregnancy/history", response_model=List[PregnancyResponse])
async def get_pregnancy_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pregnancy history for user"""
    try:
        pregnancies = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id
        ).order_by(Pregnancy.created_at.desc()).all()
        
        result = []
        for pregnancy in pregnancies:
            # Calculate current week and trimester
            due_date = pregnancy.due_date
            today = date.today()
            # Calculate LMP (280 days before due date)
            lmp_date = due_date - timedelta(days=280)
            # Calculate days from LMP to today
            days_pregnant = (today - lmp_date).days
            current_week = max(1, min(40, days_pregnant // 7))
            
            if current_week <= 12:
                trimester = 1
            elif current_week <= 26:
                trimester = 2
            else:
                trimester = 3
            
            result.append(PregnancyResponse(
                id=pregnancy.id,
                user_id=pregnancy.user_id,
                due_date=pregnancy.due_date.isoformat(),
                pregnancy_stage=pregnancy.pregnancy_stage,
                current_week=current_week,
                trimester=trimester,
                is_active=pregnancy.is_active,
                created_at=pregnancy.created_at,
                updated_at=pregnancy.updated_at
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching pregnancy history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pregnancy history"
        )


@router.delete("/pregnancy/{pregnancy_id}")
async def deactivate_pregnancy(
    pregnancy_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate pregnancy record"""
    try:
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.id == pregnancy_id,
            Pregnancy.user_id == current_user.id
        ).first()
        
        if not pregnancy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pregnancy not found"
            )
        
        pregnancy.is_active = False
        pregnancy.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Pregnancy deactivated: {pregnancy.id}")
        
        return {"message": "Pregnancy deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deactivating pregnancy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate pregnancy"
        )
