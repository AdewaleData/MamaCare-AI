from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.database import get_db
from app.models.user import User
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.appointment import Appointment
from app.api.v1.dependencies import get_current_user
from typing import Dict, Any, List
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()


def normalize_risk_level(risk_level: str) -> str:
    """Normalize risk level to ensure consistent capitalization (High, Medium, Low)"""
    if not risk_level:
        return "Low"
    risk_level_lower = risk_level.lower().strip()
    if risk_level_lower == "high":
        return "High"
    elif risk_level_lower == "medium":
        return "Medium"
    elif risk_level_lower == "low":
        return "Low"
    else:
        # Default to Low for unknown values
        logger.warning(f"Unknown risk level: {risk_level}, defaulting to Low")
        return "Low"


def require_role(allowed_roles: List[str]):
    """Dependency to check if user has required role"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


@router.get("/provider")
async def get_provider_dashboard(
    current_user: User = Depends(require_role(["provider", "government"])),
    db: Session = Depends(get_db)
):
    """Get healthcare provider dashboard with patient overview and high-risk cases"""
    try:
        # For government role, show all patients. For provider role, filter by doctor_name
        # High-risk patients (need immediate attention)
        high_risk_query = db.query(
            RiskAssessment,
            Pregnancy,
            User
        ).join(
            Pregnancy, RiskAssessment.pregnancy_id == Pregnancy.id
        ).join(
            User, Pregnancy.user_id == User.id
        ).filter(
            func.upper(RiskAssessment.risk_level) == "HIGH"
        )
        if current_user.role == "provider":
            # Filter by provider's name matching pregnancy's doctor_name
            # Also show pregnancies without doctor assigned (for demo purposes)
            high_risk_query = high_risk_query.filter(
                or_(
                    Pregnancy.doctor_name == current_user.full_name,
                    Pregnancy.doctor_name.is_(None)
                )
            )
        
        high_risk_assessments = high_risk_query.order_by(
            RiskAssessment.assessed_at.desc()
        ).limit(20).all()
        
        high_risk_patients = []
        for assessment, pregnancy, user in high_risk_assessments:
            high_risk_patients.append({
                "patient_id": str(user.id),
                "patient_name": user.full_name,
                "patient_phone": user.phone,
                "pregnancy_id": str(pregnancy.id),
                "current_week": pregnancy.current_week,
                "risk_level": normalize_risk_level(assessment.risk_level),
                # risk_score is stored as percentage (0-100) in database
                # Keep as percentage for consistency - frontend will handle display
                "risk_score": float(assessment.risk_score),
                "risk_factors": assessment.risk_factors if isinstance(assessment.risk_factors, dict) else {},
                "assessed_at": assessment.assessed_at.isoformat(),
                "recommendations": assessment.recommendations.split("\n") if assessment.recommendations else []
            })
        
        # Medium-risk patients (need follow-up)
        medium_risk_query = db.query(func.count(RiskAssessment.id)).join(
            Pregnancy, RiskAssessment.pregnancy_id == Pregnancy.id
        ).filter(
            func.upper(RiskAssessment.risk_level) == "MEDIUM"
        )
        if current_user.role == "provider":
            medium_risk_query = medium_risk_query.filter(
                or_(
                    Pregnancy.doctor_name == current_user.full_name,
                    Pregnancy.doctor_name.is_(None)
                )
            )
        medium_risk_count = medium_risk_query.scalar()
        
        # Upcoming appointments - filter by provider's name matching pregnancy's doctor_name
        # This ensures providers only see appointments for their own patients
        upcoming_appointments_query = db.query(
            Appointment,
            Pregnancy,
            User
        ).join(
            Pregnancy, Appointment.pregnancy_id == Pregnancy.id
        ).join(
            User, Pregnancy.user_id == User.id
        ).filter(
            Appointment.appointment_date >= datetime.utcnow(),
            Appointment.status != "cancelled"  # Exclude cancelled appointments
        )
        if current_user.role == "provider":
            # For provider role: show appointments where doctor_name matches provider's name
            # Use case-insensitive matching to ensure appointments appear correctly
            # This ensures all appointments for assigned patients appear in provider dashboard
            provider_name = current_user.full_name.strip() if current_user.full_name else ""
            logger.info(f"Provider dashboard - Provider name: '{provider_name}', Role: {current_user.role}")
            
            # First, let's check total appointments without filtering for debugging
            total_appointments_before_filter = db.query(func.count(Appointment.id)).join(
                Pregnancy, Appointment.pregnancy_id == Pregnancy.id
            ).filter(
                Appointment.appointment_date >= datetime.utcnow(),
                Appointment.status != "cancelled"
            ).scalar()
            logger.info(f"Provider dashboard - Total upcoming appointments (before provider filter): {total_appointments_before_filter}")
            
            if provider_name:
                # More robust matching: exact match (case-insensitive) or unassigned
                # Also check if provider_name is contained in doctor_name (case-insensitive)
                provider_name_upper = provider_name.upper()
                upcoming_appointments_query = upcoming_appointments_query.filter(
                    or_(
                        # Exact match (case-insensitive) - handles None doctor_name
                        func.coalesce(func.upper(Pregnancy.doctor_name), '') == provider_name_upper,
                        # Contains match (case-insensitive) - only if doctor_name is not None
                        and_(
                            Pregnancy.doctor_name.isnot(None),
                            func.upper(Pregnancy.doctor_name).like(f'%{provider_name_upper}%')
                        ),
                        # Show unassigned pregnancies (for demo purposes) - this is important!
                        Pregnancy.doctor_name.is_(None),
                        # Also show if doctor_name is empty string
                        Pregnancy.doctor_name == ''
                    )
                )
            else:
                # If provider has no name, show all unassigned
                upcoming_appointments_query = upcoming_appointments_query.filter(
                    or_(
                        Pregnancy.doctor_name.is_(None),
                        Pregnancy.doctor_name == ''
                    )
                )
        # For government role: show all appointments (no additional filter)
        
        # Log query before execution for debugging
        logger.info(f"Provider dashboard - Querying upcoming appointments for provider: {current_user.full_name}")
        
        upcoming_appointments = upcoming_appointments_query.order_by(
            Appointment.appointment_date.asc()
        ).limit(10).all()
        
        logger.info(f"Provider dashboard - Found {len(upcoming_appointments)} upcoming appointments")
        
        appointments_list = []
        for appointment, pregnancy, user in upcoming_appointments:
            # Get latest risk assessment for this pregnancy to show risk level
            latest_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.pregnancy_id == pregnancy.id
            ).order_by(RiskAssessment.assessed_at.desc()).first()
            
            # Log appointment details for debugging
            logger.info(f"Provider dashboard - Appointment found: Patient={user.full_name}, "
                       f"Doctor={pregnancy.doctor_name}, Date={appointment.appointment_date}, "
                       f"Type={appointment.appointment_type}")
            
            appointments_list.append({
                "appointment_id": str(appointment.id),
                "patient_name": user.full_name,
                "patient_phone": user.phone,
                "appointment_date": appointment.appointment_date.isoformat(),
                "appointment_type": appointment.appointment_type,
                "clinic_name": appointment.clinic_name,
                "pregnancy_week": pregnancy.current_week,
                "risk_level": normalize_risk_level(latest_assessment.risk_level) if latest_assessment else "Not Assessed",
                "risk_score": float(latest_assessment.risk_score) if latest_assessment else None
            })
        
        logger.info(f"Provider dashboard - Returning {len(appointments_list)} appointments in response")
        
        # Recent health records (last 7 days) - filter by provider if not government
        recent_records_query = db.query(func.count(HealthRecord.id)).join(
            Pregnancy, HealthRecord.pregnancy_id == Pregnancy.id
        ).filter(
            HealthRecord.recorded_at >= datetime.utcnow() - timedelta(days=7)
        )
        if current_user.role == "provider":
            recent_records_query = recent_records_query.filter(
                or_(
                    Pregnancy.doctor_name == current_user.full_name,
                    Pregnancy.doctor_name.is_(None)
                )
            )
        recent_records = recent_records_query.scalar()
        
        # Statistics - filter by provider if not government
        total_patients_query = db.query(func.count(func.distinct(Pregnancy.user_id)))
        active_pregnancies_query = db.query(func.count(Pregnancy.id)).filter(
            Pregnancy.is_active == True
        )
        if current_user.role == "provider":
            total_patients_query = total_patients_query.filter(
                or_(
                    Pregnancy.doctor_name == current_user.full_name,
                    Pregnancy.doctor_name.is_(None)
                )
            )
            active_pregnancies_query = active_pregnancies_query.filter(
                or_(
                    Pregnancy.doctor_name == current_user.full_name,
                    Pregnancy.doctor_name.is_(None)
                )
            )
        
        total_patients = total_patients_query.scalar()
        active_pregnancies = active_pregnancies_query.scalar()
        
        # Risk distribution - filter by provider if not government
        risk_distribution_query = db.query(
            RiskAssessment.risk_level,
            func.count(RiskAssessment.id).label('count')
        ).join(
            Pregnancy, RiskAssessment.pregnancy_id == Pregnancy.id
        ).group_by(RiskAssessment.risk_level)
        if current_user.role == "provider":
            risk_distribution_query = risk_distribution_query.filter(
                or_(
                    Pregnancy.doctor_name == current_user.full_name,
                    Pregnancy.doctor_name.is_(None)
                )
            )
        risk_distribution = risk_distribution_query.all()
        
        risk_stats = {"High": 0, "Medium": 0, "Low": 0}
        for risk_level, count in risk_distribution:
            normalized_level = normalize_risk_level(risk_level)
            risk_stats[normalized_level] = risk_stats.get(normalized_level, 0) + count
        
        # Generate weekly activity data (last 7 days) - filter by provider if not government
        weekly_activity = []
        for i in range(7):
            day_start = datetime.utcnow() - timedelta(days=6-i)
            day_end = day_start + timedelta(days=1)
            
            # Weekly activity - filter by provider if not government
            records_query = db.query(func.count(HealthRecord.id)).join(
                Pregnancy, HealthRecord.pregnancy_id == Pregnancy.id
            ).filter(
                and_(
                    HealthRecord.recorded_at >= day_start,
                    HealthRecord.recorded_at < day_end
                )
            )
            if current_user.role == "provider":
                records_query = records_query.filter(
                    or_(
                        Pregnancy.doctor_name == current_user.full_name,
                        Pregnancy.doctor_name.is_(None)
                    )
                )
            records_count = records_query.scalar() or 0
            
            assessments_query = db.query(func.count(RiskAssessment.id)).join(
                Pregnancy, RiskAssessment.pregnancy_id == Pregnancy.id
            ).filter(
                and_(
                    RiskAssessment.assessed_at >= day_start,
                    RiskAssessment.assessed_at < day_end
                )
            )
            if current_user.role == "provider":
                assessments_query = assessments_query.filter(
                    or_(
                        Pregnancy.doctor_name == current_user.full_name,
                        Pregnancy.doctor_name.is_(None)
                    )
                )
            assessments_count = assessments_query.scalar() or 0
            
            weekly_activity.append({
                "name": day_start.strftime("%a"),
                "date": day_start.strftime("%Y-%m-%d"),
                "records": records_count,
                "assessments": assessments_count
            })
        
        logger.info(f"Provider dashboard weekly activity: {weekly_activity}")
        
        return {
            "dashboard_type": "provider",
            "provider_name": current_user.full_name,
            "overview": {
                "total_patients": total_patients,
                "active_pregnancies": active_pregnancies,
                "high_risk_cases": len(high_risk_patients),
                "medium_risk_cases": medium_risk_count,
                "recent_health_records": recent_records,
                "upcoming_appointments": len(appointments_list)
            },
            "high_risk_patients": high_risk_patients,
            "upcoming_appointments": appointments_list,
            "risk_distribution": risk_stats,
            "alerts": {
                "urgent_cases": len(high_risk_patients),
                "pending_followups": medium_risk_count,
                "recent_activity": recent_records
            },
            "weekly_activity": weekly_activity
        }
        
    except Exception as e:
        logger.error(f"Error getting provider dashboard: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get provider dashboard"
        )


@router.get("/provider/patient/{patient_id}")
async def get_patient_details(
    patient_id: str,
    current_user: User = Depends(require_role(["provider", "government"])),
    db: Session = Depends(get_db)
):
    """Get detailed patient information for healthcare provider"""
    try:
        # Get patient
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # Get active pregnancy
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == patient_id,
            Pregnancy.is_active == True
        ).first()
        
        if not pregnancy:
            return {
                "patient": {
                    "id": str(patient.id),
                    "name": patient.full_name,
                    "email": patient.email,
                    "phone": patient.phone,
                    "age": patient.age
                },
                "pregnancy": None,
                "health_records": [],
                "risk_assessments": []
            }
        
        # Get health records
        health_records = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == pregnancy.id
        ).order_by(HealthRecord.recorded_at.desc()).limit(10).all()
        
        # Get risk assessments
        risk_assessments = db.query(RiskAssessment).filter(
            RiskAssessment.pregnancy_id == pregnancy.id
        ).order_by(RiskAssessment.assessed_at.desc()).limit(10).all()
        
        # Get appointments
        appointments = db.query(Appointment).filter(
            Appointment.pregnancy_id == pregnancy.id
        ).order_by(Appointment.appointment_date.asc()).all()
        
        return {
            "patient": {
                "id": str(patient.id),
                "name": patient.full_name,
                "email": patient.email,
                "phone": patient.phone,
                "age": patient.age,
                "language_preference": patient.language_preference
            },
            "pregnancy": {
                "id": str(pregnancy.id),
                "due_date": pregnancy.due_date.isoformat(),
                "current_week": pregnancy.current_week,
                "trimester": pregnancy.trimester,
                "doctor_name": pregnancy.doctor_name,
                "hospital_name": pregnancy.hospital_name,
                "blood_type": pregnancy.blood_type
            },
            "health_records": [
                {
                    "id": str(hr.id),
                    "systolic_bp": hr.systolic_bp,
                    "diastolic_bp": hr.diastolic_bp,
                    "blood_sugar": hr.blood_sugar,
                    "body_temp": hr.body_temp,
                    "heart_rate": hr.heart_rate,
                    "bmi": hr.bmi,
                    "recorded_at": hr.recorded_at.isoformat()
                }
                for hr in health_records
            ],
            "risk_assessments": [
                {
                    "id": str(ra.id),
                    "risk_level": normalize_risk_level(ra.risk_level),
                    # risk_score is stored as percentage (0-100) in database
                    # Keep as percentage for consistency
                    "risk_score": float(ra.risk_score),
                    "risk_factors": ra.risk_factors if isinstance(ra.risk_factors, dict) else {},
                    "recommendations": ra.recommendations.split("\n") if ra.recommendations else [],
                    "assessed_at": ra.assessed_at.isoformat()
                }
                for ra in risk_assessments
            ],
            "appointments": [
                {
                    "id": str(apt.id),
                    "appointment_date": apt.appointment_date.isoformat(),
                    "appointment_type": apt.appointment_type,
                    "clinic_name": apt.clinic_name,
                    "status": apt.status
                }
                for apt in appointments
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get patient details"
        )


@router.get("/government")
async def get_government_dashboard(
    current_user: User = Depends(require_role(["government"])),
    db: Session = Depends(get_db)
):
    """Get government/public health dashboard with population-level statistics"""
    try:
        # Overall statistics
        total_users = db.query(func.count(User.id)).scalar()
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
        total_pregnancies = db.query(func.count(Pregnancy.id)).scalar()
        active_pregnancies = db.query(func.count(Pregnancy.id)).filter(Pregnancy.is_active == True).scalar()
        
        # Risk distribution
        risk_distribution = db.query(
            RiskAssessment.risk_level,
            func.count(RiskAssessment.id).label('count')
        ).group_by(RiskAssessment.risk_level).all()
        
        risk_stats = {"High": 0, "Medium": 0, "Low": 0}
        total_assessments = 0
        for risk_level, count in risk_distribution:
            normalized_level = normalize_risk_level(risk_level)
            risk_stats[normalized_level] = risk_stats.get(normalized_level, 0) + count
            total_assessments += count
        
        # Geographic distribution (using language preference as proxy for region)
        # In production, this can be enhanced with actual GPS/location data if available
        language_distribution = db.query(
            User.language_preference,
            func.count(User.id).label('count')
        ).group_by(User.language_preference).all()
        
        geo_stats = {}
        for lang, count in language_distribution:
            geo_stats[lang] = count
        
        # Time-based trends (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        new_users_30d = db.query(func.count(User.id)).filter(
            User.created_at >= thirty_days_ago
        ).scalar()
        
        new_pregnancies_30d = db.query(func.count(Pregnancy.id)).filter(
            Pregnancy.created_at >= thirty_days_ago
        ).scalar()
        
        assessments_30d = db.query(func.count(RiskAssessment.id)).filter(
            RiskAssessment.assessed_at >= thirty_days_ago
        ).scalar()
        
        high_risk_30d = db.query(func.count(RiskAssessment.id)).filter(
                and_(
                    RiskAssessment.assessed_at >= thirty_days_ago,
                    func.upper(RiskAssessment.risk_level) == "HIGH"
                )
        ).scalar()
        
        # Health records activity
        health_records_total = db.query(func.count(HealthRecord.id)).scalar()
        health_records_30d = db.query(func.count(HealthRecord.id)).filter(
            HealthRecord.recorded_at >= thirty_days_ago
        ).scalar()
        
        # Appointments
        total_appointments = db.query(func.count(Appointment.id)).scalar()
        upcoming_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.appointment_date >= datetime.utcnow()
        ).scalar()
        
        # Generate time-series data for trends (last 30 days, grouped by date)
        from sqlalchemy import cast, Date
        trend_data = []
        for i in range(30):
            day_start = datetime.utcnow() - timedelta(days=30-i)
            day_end = day_start + timedelta(days=1)
            
            users_count = db.query(func.count(User.id)).filter(
                and_(
                    User.created_at >= day_start,
                    User.created_at < day_end
                )
            ).scalar() or 0
            
            pregnancies_count = db.query(func.count(Pregnancy.id)).filter(
                and_(
                    Pregnancy.created_at >= day_start,
                    Pregnancy.created_at < day_end
                )
            ).scalar() or 0
            
            assessments_count = db.query(func.count(RiskAssessment.id)).filter(
                and_(
                    RiskAssessment.assessed_at >= day_start,
                    RiskAssessment.assessed_at < day_end
                )
            ).scalar() or 0
            
            high_risk_count = db.query(func.count(RiskAssessment.id)).filter(
                and_(
                    RiskAssessment.assessed_at >= day_start,
                    RiskAssessment.assessed_at < day_end,
                    func.upper(RiskAssessment.risk_level) == "HIGH"
                )
            ).scalar() or 0
            
            health_records_count = db.query(func.count(HealthRecord.id)).filter(
                and_(
                    HealthRecord.recorded_at >= day_start,
                    HealthRecord.recorded_at < day_end
                )
            ).scalar() or 0
            
            trend_data.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "date_display": day_start.strftime("%b %d"),
                "users": users_count,
                "pregnancies": pregnancies_count,
                "assessments": assessments_count,
                "high_risk": high_risk_count,
                "health_records": health_records_count
            })
        
        # Generate weekly activity data (last 7 days)
        weekly_activity = []
        for i in range(7):
            day_start = datetime.utcnow() - timedelta(days=6-i)
            day_end = day_start + timedelta(days=1)
            
            records_count = db.query(func.count(HealthRecord.id)).filter(
                and_(
                    HealthRecord.recorded_at >= day_start,
                    HealthRecord.recorded_at < day_end
                )
            ).scalar() or 0
            
            assessments_count = db.query(func.count(RiskAssessment.id)).filter(
                and_(
                    RiskAssessment.assessed_at >= day_start,
                    RiskAssessment.assessed_at < day_end
                )
            ).scalar() or 0
            
            weekly_activity.append({
                "name": day_start.strftime("%a"),
                "date": day_start.strftime("%Y-%m-%d"),
                "records": records_count,
                "assessments": assessments_count
            })
        
        logger.info(f"Government dashboard weekly activity: {weekly_activity}")
        logger.info(f"Government dashboard trend_data count: {len(trend_data)}")
        
        # Impact metrics - calculated from actual data
        # Research shows early detection can prevent 15-20% of maternal deaths
        # Using conservative 15% estimate based on high-risk cases detected
        potential_lives_saved_30d = round(high_risk_30d * 0.15, 0) if high_risk_30d > 0 else 0
        early_detections = high_risk_30d
        preventive_interventions = risk_stats["Medium"] + risk_stats["High"]
        
        # Average risk score - calculated from actual data
        # risk_score is stored as percentage (0-100), keep as percentage for consistency
        avg_risk_score = db.query(func.avg(RiskAssessment.risk_score)).scalar() or 0.0
        
        # Coverage metrics - calculated from actual data
        coverage_rate = round((active_pregnancies / total_users * 100) if total_users > 0 else 0, 2)
        assessment_rate = round((total_assessments / active_pregnancies * 100) if active_pregnancies > 0 else 0, 2)
        
        return {
            "dashboard_type": "government",
            "overview": {
                "total_users": total_users,
                "active_users": active_users,
                "total_pregnancies": total_pregnancies,
                "active_pregnancies": active_pregnancies,
                "coverage_rate_percentage": coverage_rate,
                "assessment_rate_percentage": assessment_rate
            },
            "risk_statistics": {
                "total_assessments": total_assessments,
                "distribution": risk_stats,
                "high_risk_count": risk_stats["High"],
                "medium_risk_count": risk_stats["Medium"],
                "low_risk_count": risk_stats["Low"],
                "high_risk_percentage": round((risk_stats["High"] / total_assessments * 100) if total_assessments > 0 else 0, 2),
                "medium_risk_percentage": round((risk_stats["Medium"] / total_assessments * 100) if total_assessments > 0 else 0, 2),
                "low_risk_percentage": round((risk_stats["Low"] / total_assessments * 100) if total_assessments > 0 else 0, 2),
                "average_risk_score": round(float(avg_risk_score), 2)
            },
            "trends_30_days": {
                "new_users": new_users_30d,
                "new_pregnancies": new_pregnancies_30d,
                "new_assessments": assessments_30d,
                "high_risk_cases": high_risk_30d,
                "health_records": health_records_30d
            },
            "activity": {
                "total_health_records": health_records_total,
                "health_records_last_30_days": health_records_30d,
                "total_appointments": total_appointments,
                "upcoming_appointments": upcoming_appointments
            },
            "geographic_distribution": geo_stats,
            "impact_metrics": {
                "potential_lives_saved_30d": int(potential_lives_saved_30d),
                "early_detections_30d": early_detections,
                "preventive_interventions": preventive_interventions,
                "estimated_annual_impact": int(potential_lives_saved_30d * 12)  # Projected annual based on 30-day data
            },
            "performance": {
                "total_assessments_processed": total_assessments,
                "system_status": "operational"
            },
            "trend_data": trend_data,
            "weekly_activity": weekly_activity
        }
        
    except Exception as e:
        logger.error(f"Error getting government dashboard: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get government dashboard"
        )


@router.get("/government/regional")
async def get_regional_statistics(
    region: str = None,
    current_user: User = Depends(require_role(["government"])),
    db: Session = Depends(get_db)
):
    """Get regional statistics (using language preference as proxy for region)"""
    try:
        if region:
            # Filter by language preference (proxy for region)
            users = db.query(User).filter(User.language_preference == region).all()
            user_ids = [user.id for user in users]
            
            pregnancies = db.query(Pregnancy).filter(Pregnancy.user_id.in_(user_ids)).all()
            pregnancy_ids = [p.id for p in pregnancies]
            
            total_assessments = db.query(func.count(RiskAssessment.id)).filter(
                RiskAssessment.pregnancy_id.in_(pregnancy_ids)
            ).scalar()
            
            high_risk = db.query(func.count(RiskAssessment.id)).filter(
                and_(
                    RiskAssessment.pregnancy_id.in_(pregnancy_ids),
                    func.upper(RiskAssessment.risk_level) == "HIGH"
                )
            ).scalar()
        else:
            # All regions
            total_assessments = db.query(func.count(RiskAssessment.id)).scalar()
            high_risk = db.query(func.count(RiskAssessment.id)).filter(
                func.upper(RiskAssessment.risk_level) == "HIGH"
            ).scalar()
        
        return {
            "region": region or "all",
            "total_assessments": total_assessments,
            "high_risk_cases": high_risk,
            "high_risk_percentage": round((high_risk / total_assessments * 100) if total_assessments > 0 else 0, 2)
        }
        
    except Exception as e:
        logger.error(f"Error getting regional statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get regional statistics"
        )

