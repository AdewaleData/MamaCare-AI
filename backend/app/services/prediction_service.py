from sqlalchemy.orm import Session
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.pregnancy import Pregnancy
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.ml.predictor import RiskPredictor
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class PredictionService:
    """Service for handling risk predictions and assessments"""
    
    def __init__(self):
        self.predictor = RiskPredictor()
    
    def assess_risk(
        self,
        db: Session,
        pregnancy_id: str,
        request: PredictionRequest
    ) -> PredictionResponse:
        """Assess risk for a pregnancy and save assessment"""
        try:
            # Get prediction from ML model
            prediction = self.predictor.predict(request)
            
            # Create health record
            health_record = HealthRecord(
                pregnancy_id=pregnancy_id,
                systolic_bp=request.systolic_bp,
                diastolic_bp=request.diastolic_bp,
                blood_sugar=request.blood_sugar,
                body_temp=request.body_temp,
                heart_rate=request.heart_rate,
                bmi=request.bmi,
                previous_complications=request.previous_complications,
                preexisting_diabetes=request.preexisting_diabetes,
                gestational_diabetes=request.gestational_diabetes,
                mental_health=request.mental_health,
            )
            db.add(health_record)
            db.flush()
            
            # Create risk assessment
            risk_assessment = RiskAssessment(
                pregnancy_id=pregnancy_id,
                health_record_id=health_record.id,
                risk_level=prediction.risk_level,
                risk_score=float(prediction.risk_score),
                risk_factors={"factors": prediction.risk_factors},
                recommendations="\n".join(prediction.recommendations),
            )
            db.add(risk_assessment)
            db.commit()
            
            logger.info(f"Risk assessment created for pregnancy {pregnancy_id}: {prediction.risk_level}")
            
            return prediction
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error assessing risk: {e}")
            raise
    
    def get_latest_assessment(
        self,
        db: Session,
        pregnancy_id: str
    ) -> RiskAssessment:
        """Get the latest risk assessment for a pregnancy"""
        return db.query(RiskAssessment).filter(
            RiskAssessment.pregnancy_id == pregnancy_id
        ).order_by(RiskAssessment.assessed_at.desc()).first()
    
    def get_assessment_history(
        self,
        db: Session,
        pregnancy_id: str,
        limit: int = 10
    ) -> list[RiskAssessment]:
        """Get assessment history for a pregnancy"""
        return db.query(RiskAssessment).filter(
            RiskAssessment.pregnancy_id == pregnancy_id
        ).order_by(RiskAssessment.assessed_at.desc()).limit(limit).all()
