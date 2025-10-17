from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.prediction import PredictionRequest, PredictionResponse, RiskAssessmentResponse
from app.services.prediction_service import PredictionService
from app.models.pregnancy import Pregnancy
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

prediction_service = PredictionService()


@router.post("/assess", response_model=PredictionResponse)
async def assess_risk(
    pregnancy_id: str,
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """Assess maternal health risk using ML model"""
    try:
        # Verify pregnancy exists
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        # Get prediction
        prediction = prediction_service.assess_risk(db, pregnancy_id, request)
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assessing risk: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Risk assessment failed")


@router.get("/latest/{pregnancy_id}", response_model=RiskAssessmentResponse)
async def get_latest_assessment(
    pregnancy_id: str,
    db: Session = Depends(get_db)
):
    """Get latest risk assessment for a pregnancy"""
    try:
        assessment = prediction_service.get_latest_assessment(db, pregnancy_id)
        if not assessment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No assessment found")
        
        return assessment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching assessment: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch assessment")


@router.get("/history/{pregnancy_id}")
async def get_assessment_history(
    pregnancy_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get assessment history for a pregnancy"""
    try:
        assessments = prediction_service.get_assessment_history(db, pregnancy_id, limit)
        return {"assessments": assessments, "total": len(assessments)}
        
    except Exception as e:
        logger.error(f"Error fetching assessment history: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch history")
