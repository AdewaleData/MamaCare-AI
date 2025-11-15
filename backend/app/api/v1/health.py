from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.health_record import HealthRecord
from app.models.pregnancy import Pregnancy
from app.models.user import User
from app.schemas.health import HealthRecordCreate, HealthRecordResponse, HealthRecordHistory
from app.api.v1.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# Note: Order matters - more specific routes must come before parameterized routes
@router.get("/records", response_model=HealthRecordHistory)
async def get_all_health_records(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all health records for current user's active pregnancy"""
    try:
        # Get active pregnancy for current user
        active_pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).first()
        
        if not active_pregnancy:
            logger.info(f"No active pregnancy found for user {current_user.id} (email: {current_user.email})")
            return HealthRecordHistory(records=[], total=0)
        
        records = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == active_pregnancy.id
        ).order_by(HealthRecord.recorded_at.desc()).limit(limit).all()
        
        logger.info(f"Found {len(records)} health records for pregnancy {active_pregnancy.id} (user: {current_user.email})")
        
        # Log first record details for debugging
        if records:
            first_record = records[0]
            logger.info(f"Sample record - ID: {first_record.id}, Date: {first_record.recorded_at}, Weight: {first_record.weight}, BP: {first_record.systolic_bp}/{first_record.diastolic_bp}")
        
        return HealthRecordHistory(records=records, total=len(records))
        
    except Exception as e:
        logger.error(f"Error fetching health records: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch health records")


@router.get("/records/{record_id}", response_model=HealthRecordResponse)
async def get_health_record_by_id(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific health record by ID"""
    try:
        health_record = db.query(HealthRecord).filter(HealthRecord.id == record_id).first()
        if not health_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health record not found")
        
        # Verify the record belongs to the current user's pregnancy
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == health_record.pregnancy_id).first()
        if not pregnancy or pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own health records"
            )
        
        return health_record
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching health record: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch health record")


@router.get("/records/pregnancy/{pregnancy_id}", response_model=HealthRecordHistory)
async def get_health_records_by_pregnancy(
    pregnancy_id: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get health records for a specific pregnancy"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view health records for your own pregnancies"
            )
        
        records = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == pregnancy_id
        ).order_by(HealthRecord.recorded_at.desc()).limit(limit).all()
        
        return HealthRecordHistory(records=records, total=len(records))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching health records: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch health records")


@router.post("/records", response_model=HealthRecordResponse)
async def create_health_record(
    record_data: HealthRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new health record"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == record_data.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create health records for your own pregnancies"
            )
        
        # Create health record with recorded_at timestamp
        from datetime import datetime, timezone
        record_dict = record_data.model_dump()
        
        # Remove None values to avoid issues
        record_dict = {k: v for k, v in record_dict.items() if v is not None}
        
        # Set recorded_at if not provided - use timezone-aware UTC
        if 'recorded_at' not in record_dict or not record_dict.get('recorded_at'):
            record_dict['recorded_at'] = datetime.now(timezone.utc)
        
        # Ensure required fields are set
        if 'pregnancy_id' not in record_dict:
            record_dict['pregnancy_id'] = record_data.pregnancy_id
        
        logger.info(f"Creating health record with data: {record_dict}")
        
        health_record = HealthRecord(**record_dict)
        db.add(health_record)
        db.commit()
        db.refresh(health_record)
        
        logger.info(f"Health record created successfully: {health_record.id} for pregnancy {pregnancy.id}")
        return health_record
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating health record: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create health record")
