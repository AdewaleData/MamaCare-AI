from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.appointment import Appointment
from app.api.v1.dependencies import get_current_user
from typing import Dict, Any
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard statistics"""
    try:
        # User statistics
        total_users = db.query(func.count(User.id)).scalar()
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
        
        # Pregnancy statistics
        total_pregnancies = db.query(func.count(Pregnancy.id)).scalar()
        active_pregnancies = db.query(func.count(Pregnancy.id)).filter(Pregnancy.is_active == True).scalar()
        
        # Health records statistics
        total_health_records = db.query(func.count(HealthRecord.id)).scalar()
        records_last_7_days = db.query(func.count(HealthRecord.id)).filter(
            HealthRecord.recorded_at >= datetime.utcnow() - timedelta(days=7)
        ).scalar()
        
        # Risk assessment statistics
        total_assessments = db.query(func.count(RiskAssessment.id)).scalar()
        
        # Risk level distribution
        risk_distribution = db.query(
            RiskAssessment.risk_level,
            func.count(RiskAssessment.id).label('count')
        ).group_by(RiskAssessment.risk_level).all()
        
        risk_stats = {
            "High": 0,
            "Medium": 0,
            "Low": 0
        }
        for risk_level, count in risk_distribution:
            risk_stats[risk_level] = count
        
        # Average risk scores
        avg_risk_score = db.query(func.avg(RiskAssessment.risk_score)).scalar() or 0.0
        
        # Appointments statistics
        total_appointments = db.query(func.count(Appointment.id)).scalar()
        upcoming_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.appointment_date >= datetime.utcnow()
        ).scalar()
        
        # Recent activity (last 30 days)
        recent_assessments = db.query(func.count(RiskAssessment.id)).filter(
            RiskAssessment.assessed_at >= datetime.utcnow() - timedelta(days=30)
        ).scalar()
        
        # Calculate potential lives saved based on actual high-risk cases
        # Research shows early detection can prevent 15-20% of maternal deaths
        # Using conservative 15% estimate based on high-risk cases detected
        high_risk_cases = risk_stats["High"]
        potential_lives_saved = round(high_risk_cases * 0.15, 0) if high_risk_cases > 0 else 0
        
        return {
            "overview": {
                "total_users": total_users,
                "active_users": active_users,
                "total_pregnancies": total_pregnancies,
                "active_pregnancies": active_pregnancies,
                "total_health_records": total_health_records,
                "total_assessments": total_assessments,
                "total_appointments": total_appointments
            },
            "risk_statistics": {
                "distribution": risk_stats,
                "average_risk_score": round(float(avg_risk_score), 3),
                "high_risk_percentage": round((risk_stats["High"] / total_assessments * 100) if total_assessments > 0 else 0, 2),
                "medium_risk_percentage": round((risk_stats["Medium"] / total_assessments * 100) if total_assessments > 0 else 0, 2),
                "low_risk_percentage": round((risk_stats["Low"] / total_assessments * 100) if total_assessments > 0 else 0, 2)
            },
            "activity": {
                "health_records_last_7_days": records_last_7_days,
                "assessments_last_30_days": recent_assessments,
                "upcoming_appointments": upcoming_appointments
            },
            "performance": {
                "total_assessments_processed": total_assessments,
                "system_status": "operational"
            },
            "impact_metrics": {
                "potential_lives_saved": int(potential_lives_saved),
                "high_risk_cases_detected": high_risk_cases,
                "early_detections": risk_stats["High"],
                "preventive_interventions": risk_stats["Medium"] + risk_stats["High"]
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get dashboard statistics"
        )


@router.get("/user-stats")
async def get_user_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics for current user"""
    try:
        # User's pregnancies
        user_pregnancies = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id
        ).all()
        
        active_pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).first()
        
        # Health records
        total_records = 0
        if active_pregnancy:
            total_records = db.query(func.count(HealthRecord.id)).filter(
                HealthRecord.pregnancy_id == active_pregnancy.id
            ).scalar()
        
        # Risk assessments
        total_assessments = 0
        latest_assessment = None
        if active_pregnancy:
            total_assessments = db.query(func.count(RiskAssessment.id)).filter(
                RiskAssessment.pregnancy_id == active_pregnancy.id
            ).scalar()
            
            latest_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.pregnancy_id == active_pregnancy.id
            ).order_by(RiskAssessment.assessed_at.desc()).first()
        
        # Appointments
        upcoming_appointments = 0
        if active_pregnancy:
            upcoming_appointments = db.query(func.count(Appointment.id)).filter(
                Appointment.pregnancy_id == active_pregnancy.id,
                Appointment.appointment_date >= datetime.utcnow()
            ).scalar()
        
        return {
            "user_id": str(current_user.id),
            "total_pregnancies": len(user_pregnancies),
            "active_pregnancy": active_pregnancy.id if active_pregnancy else None,
            "health_records": {
                "total": total_records,
                "last_recorded": latest_assessment.assessed_at.isoformat() if latest_assessment else None
            },
            "risk_assessments": {
                "total": total_assessments,
                "latest_risk_level": latest_assessment.risk_level if latest_assessment else None,
                "latest_risk_score": float(latest_assessment.risk_score) if latest_assessment else None
            },
            "appointments": {
                "upcoming": upcoming_appointments
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting user statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user statistics"
        )

