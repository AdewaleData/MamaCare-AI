from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.health_record import HealthRecord
from app.models.pregnancy import Pregnancy
from app.models.user import User
from app.schemas.health import HealthRecordCreate, HealthRecordResponse, HealthRecordHistory
from app.schemas.prediction import PredictionRequest
from app.api.v1.dependencies import get_current_user
from app.services.prediction_service import PredictionService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

prediction_service = PredictionService()


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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new health record and automatically assess risk"""
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
        
        # AUTOMATICALLY trigger risk assessment in background when health record is created
        # This ensures high risk is detected immediately
        if health_record.systolic_bp and health_record.diastolic_bp and health_record.heart_rate:
            logger.info(f"Auto-triggering risk assessment for new health record {health_record.id}")
            background_tasks.add_task(
                auto_assess_risk_from_health_record,
                current_user.id,
                record_data.pregnancy_id,
                health_record.id
            )
        
        return health_record
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating health record: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create health record")


async def auto_assess_risk_from_health_record(
    user_id: str,
    pregnancy_id: str,
    health_record_id: str
):
    """
    Automatically assess risk when a health record is created
    This runs in background to detect high risk immediately
    """
    from app.database import SessionLocal
    from app.models.user import User
    from app.models.health_record import HealthRecord
    from app.models.risk_assessment import RiskAssessment
    from app.models.emergency_alert import EmergencyAlert
    from app.utils.sms import SMSService
    from sqlalchemy import text
    from datetime import datetime
    
    db = SessionLocal()
    try:
        # Get health record
        health_record = db.query(HealthRecord).filter(HealthRecord.id == health_record_id).first()
        if not health_record:
            logger.error(f"Health record {health_record_id} not found for auto-assessment")
            return
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for auto-assessment")
            return
        
        # Create prediction request from health record
        prediction_request = PredictionRequest(
            pregnancy_id=pregnancy_id,
            age=user.age or 28,
            systolic_bp=health_record.systolic_bp,
            diastolic_bp=health_record.diastolic_bp,
            blood_sugar=float(health_record.blood_sugar) if health_record.blood_sugar else None,
            body_temp=float(health_record.body_temp) if health_record.body_temp else None,
            heart_rate=health_record.heart_rate,
            bmi=float(health_record.bmi) if health_record.bmi else 25.0,
            previous_complications=health_record.previous_complications or 0,
            preexisting_diabetes=health_record.preexisting_diabetes or 0,
            gestational_diabetes=health_record.gestational_diabetes or 0,
            mental_health=health_record.mental_health or 0
        )
        
        # Assess risk using prediction service
        prediction = prediction_service.assess_risk(db, pregnancy_id, prediction_request, user)
        
        logger.info(f"Auto-assessment completed: Risk Level = {prediction.risk_level}, Score = {prediction.risk_score:.1f}%")
        
        # Get the created risk assessment
        risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.pregnancy_id == pregnancy_id,
            RiskAssessment.health_record_id == health_record_id
        ).order_by(RiskAssessment.assessed_at.desc()).first()
        
        # If HIGH RISK detected, trigger automatic emergency alert immediately
        if prediction.risk_level == "High":
            logger.warning(f"🚨 HIGH RISK detected from health record {health_record_id} - Triggering automatic emergency alert")
            
            # Create emergency alert automatically
            risk_factors = prediction.risk_factors or []
            risk_factors_text = ', '.join(risk_factors[:3]) if risk_factors else 'Multiple risk factors detected'
            
            emergency_alert = EmergencyAlert(
                user_id=user_id,
                pregnancy_id=pregnancy_id,
                emergency_type="medical",
                severity="critical",  # High risk = critical emergency
                description=f"Automatic emergency alert: HIGH RISK detected (Risk Score: {prediction.risk_score:.1f}%). Risk factors: {risk_factors_text}. Immediate medical attention required.",
                status="active"
            )
            
            db.add(emergency_alert)
            db.commit()
            db.refresh(emergency_alert)
            
            logger.warning(f"🚨 AUTOMATIC EMERGENCY ALERT CREATED: {emergency_alert.id} for user {user_id}")
            
            # Immediately notify emergency contacts
            sql_query = text("""
                SELECT phone FROM emergency_contacts 
                WHERE user_id = :user_id AND is_primary = 1
                LIMIT 5
            """)
            result = db.execute(sql_query, {"user_id": user_id})
            rows = result.fetchall()
            phone_numbers = [str(row[0]) for row in rows if row[0]]
            
            # If no primary contacts, get any contacts
            if not phone_numbers:
                sql_query = text("""
                    SELECT phone FROM emergency_contacts 
                    WHERE user_id = :user_id
                    LIMIT 5
                """)
                result = db.execute(sql_query, {"user_id": user_id})
                rows = result.fetchall()
                phone_numbers = [str(row[0]) for row in rows if row[0]]
            
            # Send emergency SMS to contacts immediately
            if phone_numbers:
                risk_factors_text = ', '.join(risk_factors[:3]) if risk_factors else 'Multiple risk factors'
                message = (
                    f"🚨 EMERGENCY ALERT - HIGH RISK DETECTED\n\n"
                    f"{user.full_name} has been identified as HIGH RISK (Risk Score: {prediction.risk_score:.1f}%).\n\n"
                    f"Risk Factors: {risk_factors_text}\n\n"
                    f"⚠️ IMMEDIATE ACTION REQUIRED:\n"
                    f"Please contact {user.full_name} immediately and ensure they seek medical attention within 24-48 hours.\n\n"
                    f"Alert ID: {emergency_alert.id[:8]}\n"
                    f"Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
                )
                
                try:
                    result = await SMSService.send_sms_twilio(phone_numbers, message)
                    logger.warning(f"🚨 Emergency SMS sent to {len(phone_numbers)} contacts: {result}")
                    
                    # Mark contacts as notified
                    emergency_alert.contacts_notified = True
                    db.commit()
                except Exception as sms_error:
                    logger.error(f"Error sending emergency SMS: {sms_error}")
            else:
                logger.warning(f"⚠️ No emergency contacts found for user {user_id} - emergency alert created but no contacts notified")
            
            # Also send SMS to user if they have a phone
            if user.phone:
                user_message = (
                    f"🚨 HIGH RISK ALERT\n\n"
                    f"Your health assessment shows HIGH RISK (Score: {prediction.risk_score:.1f}%).\n\n"
                    f"Risk Factors: {', '.join(risk_factors[:3]) if risk_factors else 'Multiple risk factors'}\n\n"
                    f"⚠️ Please contact your healthcare provider immediately (within 24-48 hours).\n\n"
                    f"Visit a Primary Healthcare Centre (PHC) or General Hospital.\n"
                    f"For emergencies, call 112."
                )
                try:
                    await SMSService.send_sms_twilio([user.phone], user_message)
                    logger.info(f"High risk alert SMS sent to user {user.phone}")
                except Exception as user_sms_error:
                    logger.error(f"Error sending SMS to user: {user_sms_error}")
        
    except Exception as e:
        logger.error(f"Error in auto risk assessment: {e}", exc_info=True)
    finally:
        db.close()
