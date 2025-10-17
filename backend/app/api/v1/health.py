from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.health_record import HealthRecord
from app.models.pregnancy import Pregnancy
from app.schemas.health import HealthRecordCreate, HealthRecordResponse, HealthRecordHistory
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/records", response_model=HealthRecordResponse)
async def create_health_record(
    record_data: HealthRecordCreate,
    db: Session = Depends(get_db)
):
    """Create a new health record"""
    try:
        # Verify pregnancy exists
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == record_data.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        # Create health record
        health_record = HealthRecord(**record_data.dict())
        db.add(health_record)
        db.commit()
        db.refresh(health_record)
        
        logger.info(f"Health record created: {health_record.id}")
        return health_record
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating health record: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create health record")


@router.get("/records/{pregnancy_id}", response_model=HealthRecordHistory)
async def get_health_records(
    pregnancy_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get health records for a pregnancy"""
    try:
        records = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == pregnancy_id
        ).order_by(HealthRecord.recorded_at.desc()).limit(limit).all()
        
        return HealthRecordHistory(records=records, total=len(records))
        
    except Exception as e:
        logger.error(f"Error fetching health records: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch health records")
