from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.prediction import PredictionRequest, PredictionResponse, RiskAssessmentResponse
from app.services.prediction_service import PredictionService
from app.ml.specialized_predictor import SpecializedPredictor
from app.models.pregnancy import Pregnancy
from app.models.user import User
from app.api.v1.dependencies import get_current_user
from app.utils.sms import SMSService
from app.utils.websocket_manager import manager
from typing import Optional
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

prediction_service = PredictionService()
specialized_predictor = SpecializedPredictor()


@router.post("/assess", response_model=PredictionResponse)
async def assess_risk(
    request: PredictionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assess maternal health risk using ML model with real-time alerts"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == request.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assess risk for your own pregnancies"
            )
        
        # Check if there's already a risk assessment (prefer recent, but return any if no new data)
        from app.models.risk_assessment import RiskAssessment
        from app.models.health_record import HealthRecord
        
        # First, try to get latest health record
        latest_record = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == request.pregnancy_id
        ).order_by(HealthRecord.recorded_at.desc()).first()
        
        # If no health data provided in request, use latest health record
        # Check if request has minimal data - if not, use latest record
        has_request_data = any([
            request.systolic_bp is not None,
            request.blood_sugar is not None,
            request.heart_rate is not None
        ])
        
        if not has_request_data and latest_record:
            # Use latest health record data
            logger.info(f"Using latest health record data for pregnancy {request.pregnancy_id}")
            request.systolic_bp = request.systolic_bp if request.systolic_bp is not None else latest_record.systolic_bp
            request.diastolic_bp = request.diastolic_bp if request.diastolic_bp is not None else latest_record.diastolic_bp
            request.blood_sugar = request.blood_sugar if request.blood_sugar is not None else (float(latest_record.blood_sugar) if latest_record.blood_sugar is not None else None)
            request.body_temp = request.body_temp if request.body_temp is not None else (float(latest_record.body_temp) if latest_record.body_temp is not None else None)
            request.heart_rate = request.heart_rate if request.heart_rate is not None else latest_record.heart_rate
            request.bmi = request.bmi if request.bmi is not None else (float(latest_record.bmi) if latest_record.bmi is not None else None)
            request.previous_complications = request.previous_complications if request.previous_complications is not None else (latest_record.previous_complications or 0)
            request.preexisting_diabetes = request.preexisting_diabetes if request.preexisting_diabetes is not None else (latest_record.preexisting_diabetes or 0)
            request.gestational_diabetes = request.gestational_diabetes if request.gestational_diabetes is not None else (latest_record.gestational_diabetes or 0)
            request.mental_health = request.mental_health if request.mental_health is not None else (latest_record.mental_health or 0)
            request.age = request.age or current_user.age or 28
        
        # Check for existing risk assessment first (before validation)
        # This allows returning cached results even if some data is missing
            latest_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.pregnancy_id == request.pregnancy_id
            ).order_by(RiskAssessment.assessed_at.desc()).first()
            
        # ALWAYS recalculate if we have new health data
        # This ensures risk assessment updates when new records are added
        should_recalculate = True
        
        if latest_assessment and latest_record:
            # Get timestamps for comparison
            record_time = latest_record.recorded_at
            assessment_time = latest_assessment.assessed_at
            
            # Normalize both to UTC datetime objects for comparison
            if record_time:
                if isinstance(record_time, str):
                    from dateutil import parser
                    record_time = parser.parse(record_time)
                if record_time.tzinfo is None:
                    record_time = record_time.replace(tzinfo=timezone.utc)
                else:
                    record_time = record_time.astimezone(timezone.utc)
            
            if assessment_time:
                if isinstance(assessment_time, str):
                    from dateutil import parser
                    assessment_time = parser.parse(assessment_time)
                if assessment_time.tzinfo is None:
                    assessment_time = assessment_time.replace(tzinfo=timezone.utc)
                else:
                    assessment_time = assessment_time.astimezone(timezone.utc)
            
            # Compare: ALWAYS recalculate if record is newer or equal (to catch any changes)
            if record_time and assessment_time:
                # Compare timestamps - if record is newer or equal, recalculate
                # We recalculate even if equal to ensure we use the latest data
                if record_time >= assessment_time:
                    # New health record exists or same timestamp - MUST recalculate
                    should_recalculate = True
                    time_diff = record_time - assessment_time if record_time > assessment_time else timedelta(0)
                    logger.info(f"✓✓✓ RECALCULATING risk assessment for pregnancy {request.pregnancy_id}")
                    logger.info(f"  Record time: {record_time.strftime('%Y-%m-%d %H:%M:%S %Z')}")
                    logger.info(f"  Assessment time: {assessment_time.strftime('%Y-%m-%d %H:%M:%S %Z')}")
                    if time_diff.total_seconds() > 0:
                        logger.info(f"  Time difference: {time_diff}")
                    else:
                        logger.info(f"  Same timestamp - forcing recalculation to use latest data")
                else:
                    # Record is older than assessment - still recalculate to be safe
                    should_recalculate = True
                    logger.info(f"Record timestamp is older than assessment - recalculating for pregnancy {request.pregnancy_id}")
            else:
                # Missing timestamps - recalculate to be safe
                should_recalculate = True
                logger.info(f"Missing timestamps - recalculating for pregnancy {request.pregnancy_id}")
        else:
            # No assessment or no record - must calculate
            should_recalculate = True
            logger.info(f"No existing assessment or health record - calculating new assessment for pregnancy {request.pregnancy_id}")
        
        # CRITICAL: ALWAYS recalculate - never return old cached assessments
        # Old assessments may have incorrect risk scores from previous buggy code
        # This ensures we always use the latest ML model with correct binary classification logic
        
        # First check if we have enough data to proceed
        has_minimal_data = all([
            request.systolic_bp is not None,
            request.diastolic_bp is not None,
            request.heart_rate is not None
        ])
        
        # If we don't have minimal data in request, but we have health records, use them
        if not has_minimal_data:
            if latest_record:
                # We have health records, use them to recalculate - DON'T return old assessment
                logger.info(f"Insufficient request data, but have health records - will use them for recalculation")
                # Continue to recalculation below - request data will be filled from latest_record
            else:
                # No health records and no request data - can't calculate
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No health records found. Please add health records first to generate a risk assessment."
                )
        
        # Validate we have minimum required fields for ML model
        # BMI can be calculated or estimated if missing, but we need BP and heart rate
        if not request.bmi:
            # Try to estimate BMI or use a default (25 is average)
            request.bmi = 25.0
            logger.warning(f"BMI not provided, using default 25.0 for pregnancy {request.pregnancy_id}")
        
        if not request.blood_sugar:
            # Blood sugar is helpful but not always required - use a default if missing
            request.blood_sugar = 90.0  # Normal fasting glucose
            logger.warning(f"Blood sugar not provided, using default 90.0 for pregnancy {request.pregnancy_id}")
        
        # Get prediction with user for alerts (uses ML model)
        try:
            prediction = prediction_service.assess_risk(db, request.pregnancy_id, request, current_user)
        except Exception as e:
            logger.error(f"Error in prediction_service.assess_risk: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate risk assessment: {str(e)}"
            )
        
        # Get specialized assessments using specialized predictors
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == request.pregnancy_id).first()
        current_week = pregnancy.current_week if pregnancy else 20
        
        # Get specialized risk assessments
        preeclampsia_assessment = specialized_predictor.predict_preeclampsia(request)
        preterm_labor_assessment = specialized_predictor.predict_preterm_labor(request, current_week)
        gestational_diabetes_assessment = specialized_predictor.predict_gestational_diabetes(request)
        
        # Format specialized assessments for frontend
        prediction.specialized_assessments = {
            "preeclampsia": {
                "risk": preeclampsia_assessment["risk_level"],
                "probability": preeclampsia_assessment["risk_score"]
            },
            "preterm_labor": {
                "risk": preterm_labor_assessment["risk_level"],
                "probability": preterm_labor_assessment["risk_score"]
            },
            "gestational_diabetes": {
                "risk": gestational_diabetes_assessment["risk_level"],
                "probability": gestational_diabetes_assessment["risk_score"]
            }
        }
        
        # Send real-time alerts for HIGH risk (background tasks)
        if prediction.risk_level == "High" and current_user:
            # Get risk assessment ID for alerts
            risk_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.pregnancy_id == request.pregnancy_id
            ).order_by(RiskAssessment.assessed_at.desc()).first()
            
            # Schedule SMS alert
            if current_user.phone:
                background_tasks.add_task(
                    SMSService.send_alert_sms,
                    [current_user.phone],
                    current_user.full_name,
                    prediction.risk_level
                )
                logger.info(f"SMS alert scheduled for {current_user.phone}")
            
            # Schedule WebSocket notification
            if risk_assessment:
                background_tasks.add_task(
                    manager.send_alert_notification,
                    str(risk_assessment.id),
                    current_user.full_name,
                    prediction.risk_level,
                    [str(current_user.id)]
                )
                logger.info(f"WebSocket alert scheduled for user {current_user.id}")
        
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assessing risk: {e}", exc_info=True)
        # Provide more detailed error message
        error_detail = f"Risk assessment failed: {str(e)}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=error_detail
        )


@router.get("/latest", response_model=RiskAssessmentResponse)
async def get_latest_assessment_for_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get latest risk assessment for current user's active pregnancy"""
    try:
        # Get active pregnancy for current user
        active_pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).first()
        
        if not active_pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active pregnancy found")
        
        assessment = prediction_service.get_latest_assessment(db, active_pregnancy.id)
        if not assessment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No assessment found")
        
        return assessment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching assessment: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch assessment")


@router.get("/latest/{pregnancy_id}", response_model=RiskAssessmentResponse)
async def get_latest_assessment(
    pregnancy_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get latest risk assessment for a pregnancy"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view assessments for your own pregnancies"
            )
        
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assessment history for a pregnancy"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view assessment history for your own pregnancies"
            )
        
        assessments = prediction_service.get_assessment_history(db, pregnancy_id, limit)
        
        # Convert assessments to proper format with recommendations as array
        formatted_assessments = []
        for assessment in assessments:
            # Convert recommendations from string to array
            recommendations_list = []
            if assessment.recommendations:
                if isinstance(assessment.recommendations, str):
                    recommendations_list = [r.strip() for r in assessment.recommendations.split("\n") if r.strip()]
                elif isinstance(assessment.recommendations, list):
                    recommendations_list = assessment.recommendations
            
            # Convert risk_factors to array if needed
            risk_factors_list = []
            if assessment.risk_factors:
                if isinstance(assessment.risk_factors, dict):
                    risk_factors_list = assessment.risk_factors.get("factors", [])
                elif isinstance(assessment.risk_factors, list):
                    risk_factors_list = assessment.risk_factors
            
            formatted_assessments.append({
                "id": str(assessment.id),
                "pregnancy_id": str(assessment.pregnancy_id),
                "health_record_id": str(assessment.health_record_id) if assessment.health_record_id else None,
                "risk_level": assessment.risk_level,
                "overall_risk": assessment.risk_level,  # Alias for frontend compatibility
                "risk_score": float(assessment.risk_score),
                "risk_factors": risk_factors_list,
                "recommendations": recommendations_list,
                "assessed_at": assessment.assessed_at.isoformat() if assessment.assessed_at else None,
            })
        
        return {"assessments": formatted_assessments, "total": len(formatted_assessments)}
        
    except Exception as e:
        logger.error(f"Error fetching assessment history: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch history")


@router.post("/assess/preeclampsia")
async def assess_preeclampsia_risk(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assess preeclampsia risk using specialized algorithm"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == request.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assess risk for your own pregnancies"
            )
        
        prediction = specialized_predictor.predict_preeclampsia(request)
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assessing preeclampsia risk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Preeclampsia risk assessment failed"
        )


@router.post("/assess/preterm-labor")
async def assess_preterm_labor_risk(
    request: PredictionRequest,
    current_week: Optional[int] = Query(None, ge=1, le=42),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assess preterm labor risk using specialized algorithm"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == request.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assess risk for your own pregnancies"
            )
        
        # Use current week from pregnancy if not provided
        if current_week is None:
            current_week = pregnancy.current_week or 20
        
        prediction = specialized_predictor.predict_preterm_labor(request, current_week)
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assessing preterm labor risk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Preterm labor risk assessment failed"
        )


@router.post("/assess/gestational-diabetes")
async def assess_gestational_diabetes_risk(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assess gestational diabetes risk using specialized algorithm"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == request.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assess risk for your own pregnancies"
            )
        
        prediction = specialized_predictor.predict_gestational_diabetes(request)
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assessing gestational diabetes risk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gestational diabetes risk assessment failed"
        )


@router.post("/assess/comprehensive")
async def comprehensive_assessment(
    request: PredictionRequest,
    current_week: Optional[int] = Query(None, ge=1, le=42),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive risk assessment for all conditions"""
    try:
        # Verify pregnancy exists and belongs to current user
        pregnancy = db.query(Pregnancy).filter(Pregnancy.id == request.pregnancy_id).first()
        if not pregnancy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregnancy not found")
        
        if pregnancy.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assess risk for your own pregnancies"
            )
        
        # Use current week from pregnancy if not provided
        if current_week is None:
            current_week = pregnancy.current_week or 20
        
        assessment = specialized_predictor.get_comprehensive_assessment(request, current_week)
        return assessment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in comprehensive assessment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Comprehensive assessment failed"
        )
