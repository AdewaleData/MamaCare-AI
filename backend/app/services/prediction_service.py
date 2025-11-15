from sqlalchemy.orm import Session
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.pregnancy import Pregnancy
from app.models.user import User
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.ml.predictor import RiskPredictor
from app.utils.sms import SMSService
from app.utils.websocket_manager import manager
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
        request: PredictionRequest,
        user: User = None
    ) -> PredictionResponse:
        """Assess risk for a pregnancy and save assessment"""
        try:
            # Get prediction from ML model
            prediction = self.predictor.predict(request)
            
            # Get pregnancy and user info for alerts
            pregnancy = db.query(Pregnancy).filter(Pregnancy.id == pregnancy_id).first()
            if not pregnancy and user:
                # Try to get active pregnancy for user
                pregnancy = db.query(Pregnancy).filter(
                    Pregnancy.user_id == user.id,
                    Pregnancy.is_active == True
                ).first()
            
            if not user and pregnancy:
                user = db.query(User).filter(User.id == pregnancy.user_id).first()
            
            # Don't create a new health record - use the latest one if it exists
            # The health record should already exist from the health records endpoint
            # We'll just link the assessment to the latest health record
            latest_health_record = db.query(HealthRecord).filter(
                HealthRecord.pregnancy_id == pregnancy_id
            ).order_by(HealthRecord.recorded_at.desc()).first()
            
            health_record_id = None
            if latest_health_record:
                health_record_id = latest_health_record.id
                logger.info(f"Using existing health record {health_record_id} for assessment")
            else:
                # Only create if no health record exists (shouldn't happen, but safety)
                logger.warning(f"No health record found, creating new one for pregnancy {pregnancy_id}")
            health_record = HealthRecord(
                pregnancy_id=pregnancy_id,
                systolic_bp=request.systolic_bp,
                diastolic_bp=request.diastolic_bp,
                blood_sugar=request.blood_sugar,
                body_temp=request.body_temp,
                heart_rate=request.heart_rate,
                bmi=request.bmi,
                previous_complications=request.previous_complications or 0,
                preexisting_diabetes=request.preexisting_diabetes or 0,
                gestational_diabetes=request.gestational_diabetes or 0,
                mental_health=request.mental_health or 0,
            )
            db.add(health_record)
            db.flush()
            health_record_id = health_record.id
            
            # Create risk assessment
            # Store risk_score as percentage (0-100) in database
            # prediction.risk_score is already a percentage from predictor
            risk_assessment = RiskAssessment(
                pregnancy_id=pregnancy_id,
                health_record_id=health_record_id,
                risk_level=prediction.risk_level,
                risk_score=float(prediction.risk_score),  # Already percentage (0-100)
                risk_factors={"factors": prediction.risk_factors},
                recommendations="\n".join(prediction.recommendations),
            )
            db.add(risk_assessment)
            db.commit()
            
            logger.info(f"Risk assessment created for pregnancy {pregnancy_id}: {prediction.risk_level}")
            
            # Note: Real-time alerts (SMS & WebSocket) should be sent via BackgroundTasks
            # in the API endpoint, not here in the service layer
            # This keeps the service layer clean and allows proper async handling
            
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
