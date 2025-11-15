from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.user import User
from app.api.v1.dependencies import get_current_user
from typing import List, Dict, Any
import logging
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recommendations")
async def get_personalized_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized recommendations based on user's health status and risk level"""
    try:
        # Get current active pregnancy
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).first()
        
        if not pregnancy:
            return {
                "urgent": [],
                "important": [],
                "suggested": [
                    {
                        "id": "create-pregnancy",
                        "type": "health_record",
                        "priority": "high",
                        "title": "Create Pregnancy Profile",
                        "description": "Start by creating your pregnancy profile to get personalized recommendations.",
                        "action": "Create Pregnancy Profile",
                        "icon": "UserPlusIcon",
                        "urgency": "immediate",
                        "estimatedTime": "5 min"
                    }
                ],
                "education": [
                    {
                        "id": "pregnancy-basics",
                        "type": "education",
                        "priority": "medium",
                        "title": "Pregnancy Basics",
                        "description": "Learn the fundamentals of pregnancy care and what to expect.",
                        "action": "View Education Content",
                        "icon": "BookOpenIcon",
                        "category": "basics",
                        "estimatedTime": "10 min"
                    }
                ]
            }
        
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
        
        # Get latest health record
        latest_health_record = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == pregnancy.id
        ).order_by(HealthRecord.recorded_at.desc()).first()
        
        # Get latest risk assessment
        latest_risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.pregnancy_id == pregnancy.id
        ).order_by(RiskAssessment.assessed_at.desc()).first()
        
        # Generate recommendations based on current status
        recommendations = generate_recommendations(
            current_week=current_week,
            trimester=trimester,
            latest_health_record=latest_health_record,
            latest_risk_assessment=latest_risk_assessment,
            pregnancy=pregnancy
        )
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recommendations"
        )


def generate_recommendations(
    current_week: int,
    trimester: int,
    latest_health_record: HealthRecord,
    latest_risk_assessment: RiskAssessment,
    pregnancy: Pregnancy
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate personalized recommendations based on health data"""
    
    urgent = []
    important = []
    suggested = []
    education = []
    
    # PRIMARY: Risk-based recommendations - Risk level is the main determinant
    risk_level = None
    risk_score = 0.0
    if latest_risk_assessment:
        risk_level = latest_risk_assessment.risk_level
        # Risk score is stored as percentage (0-100) in database
        risk_score = float(latest_risk_assessment.risk_score) if latest_risk_assessment.risk_score else 0.0
        
        # Normalize risk level (handle case variations)
        risk_level_normalized = risk_level.capitalize() if risk_level else "Low"
        
        # HIGH RISK - Most urgent recommendations (score >= 60%)
        if risk_level_normalized == "High" or risk_score >= 60.0:
            urgent.append({
                "id": "high-risk-appointment",
                "type": "appointment",
                "priority": "high",
                "title": "Schedule Immediate Consultation",
                "description": f"Your risk assessment shows HIGH risk (score: {risk_score:.1f}%). Please schedule an appointment with your doctor within 24-48 hours.",
                "action": "Book Emergency Appointment",
                "icon": "CalendarDaysIcon",
                "urgency": "urgent",
                "estimatedTime": "30 min"
            })
            
            urgent.append({
                "id": "high-risk-monitoring",
                "type": "health_record",
                "priority": "high",
                "title": "Daily Health Monitoring",
                "description": "Monitor your vital signs daily and record them in the app. High-risk pregnancies require close monitoring.",
                "action": "Add Health Record",
                "icon": "HeartIcon",
                "urgency": "daily",
                "estimatedTime": "5 min"
            })
            
            urgent.append({
                "id": "high-risk-education",
                "type": "education",
                "priority": "high",
                "title": "High-Risk Pregnancy Management",
                "description": "Learn about managing a high-risk pregnancy and what to watch for.",
                "action": "View Education Content",
                "icon": "BookOpenIcon",
                "category": "high-risk",
                "estimatedTime": "15 min"
            })
            
        # MEDIUM RISK - Important but not urgent (score 35-59%)
        elif risk_level_normalized == "Medium" or (risk_score >= 35.0 and risk_score < 60.0):
            important.append({
                "id": "medium-risk-appointment",
                "type": "appointment",
                "priority": "medium",
                "title": "Schedule Follow-up Appointment",
                "description": f"Your risk assessment shows MEDIUM risk (score: {risk_score:.1f}%). Schedule a follow-up within 1-2 weeks.",
                "action": "Book Appointment",
                "icon": "CalendarDaysIcon",
                "urgency": "within 2 weeks",
                "estimatedTime": "30 min"
            })
            
            important.append({
                "id": "weekly-monitoring",
                "type": "health_record",
                "priority": "medium",
                "title": "Weekly Health Check",
                "description": "Record your health data weekly to track any changes. Medium-risk pregnancies benefit from regular monitoring.",
                "action": "Add Health Record",
                "icon": "HeartIcon",
                "urgency": "weekly",
                "estimatedTime": "5 min"
            })
            
            important.append({
                "id": "medium-risk-education",
                "type": "education",
                "priority": "medium",
                "title": "Managing Medium-Risk Pregnancy",
                "description": "Learn about managing a medium-risk pregnancy and preventive measures.",
                "action": "View Education Content",
                "icon": "BookOpenIcon",
                "category": "medium-risk",
                "estimatedTime": "12 min"
            })
            
        # LOW RISK - Standard recommendations (score < 35%)
        else:
            suggested.append({
                "id": "low-risk-routine",
                "type": "appointment",
                "priority": "low",
                "title": "Continue Regular Checkups",
                "description": f"Your risk assessment shows LOW risk (score: {risk_score:.1f}%). Continue with your regular prenatal appointments.",
                "action": "View Appointments",
                "icon": "CalendarDaysIcon",
                "urgency": "monthly",
                "estimatedTime": "30 min"
            })
            
            suggested.append({
                "id": "low-risk-monitoring",
                "type": "health_record",
                "priority": "low",
                "title": "Regular Health Tracking",
                "description": "Continue tracking your health metrics regularly. Low-risk pregnancies still benefit from consistent monitoring.",
                "action": "Add Health Record",
                "icon": "HeartIcon",
                "urgency": "bi-weekly",
                "estimatedTime": "5 min"
            })
    else:
        # No risk assessment yet - suggest getting one
        important.append({
            "id": "get-risk-assessment",
            "type": "risk_assessment",
            "priority": "medium",
            "title": "Complete Risk Assessment",
            "description": "Get a personalized risk assessment to receive tailored recommendations for your pregnancy.",
            "action": "Run Risk Assessment",
            "icon": "ExclamationTriangleIcon",
            "urgency": "as soon as possible",
            "estimatedTime": "10 min"
        })
    
    # SECONDARY: Health record based recommendations (only if not already covered by risk level)
    # These supplement risk-based recommendations but don't override them
    if latest_health_record and risk_level and risk_level.capitalize() != "High":
        # Blood pressure check
        if latest_health_record.systolic_bp and latest_health_record.diastolic_bp:
            if latest_health_record.systolic_bp > 140 or latest_health_record.diastolic_bp > 90:
                urgent.append({
                    "id": "high-bp-management",
                    "type": "education",
                    "priority": "high",
                    "title": "Managing High Blood Pressure",
                    "description": f"Your blood pressure is elevated ({latest_health_record.systolic_bp}/{latest_health_record.diastolic_bp} mmHg). Learn about managing high blood pressure during pregnancy.",
                    "action": "View Education Content",
                    "icon": "BookOpenIcon",
                    "category": "symptoms",
                    "estimatedTime": "8 min"
                })
        
        # Blood sugar check
        if latest_health_record.blood_sugar and latest_health_record.blood_sugar > 126:
            urgent.append({
                "id": "high-blood-sugar",
                "type": "education",
                "priority": "high",
                "title": "Managing High Blood Sugar",
                "description": f"Your blood sugar is elevated ({latest_health_record.blood_sugar} mg/dL). Learn about managing blood sugar during pregnancy.",
                "action": "View Education Content",
                "icon": "BookOpenIcon",
                "category": "nutrition",
                "estimatedTime": "10 min"
            })
        
        # BMI check
        if latest_health_record.bmi:
            if latest_health_record.bmi > 30:
                important.append({
                    "id": "obesity-management",
                    "type": "education",
                    "priority": "medium",
                    "title": "Managing Weight During Pregnancy",
                    "description": f"Your BMI is {latest_health_record.bmi:.1f}. Learn about healthy weight management during pregnancy.",
                    "action": "View Education Content",
                    "icon": "BookOpenIcon",
                    "category": "nutrition",
                    "estimatedTime": "12 min"
                })
            elif latest_health_record.bmi < 18.5:
                important.append({
                    "id": "underweight-management",
                    "type": "education",
                    "priority": "medium",
                    "title": "Healthy Weight Gain During Pregnancy",
                    "description": f"Your BMI is {latest_health_record.bmi:.1f}. Learn about healthy weight gain during pregnancy.",
                    "action": "View Education Content",
                    "icon": "BookOpenIcon",
                    "category": "nutrition",
                    "estimatedTime": "10 min"
                })
    
    # Trimester-based recommendations
    if trimester == 1:
        education.append({
            "id": "first-trimester-nutrition",
            "type": "education",
            "priority": "medium",
            "title": "First Trimester Nutrition Guide",
            "description": "Essential nutrients and foods for the first trimester.",
            "action": "View Education Content",
            "icon": "BookOpenIcon",
            "category": "nutrition",
            "estimatedTime": "6 min"
        })
        
        suggested.append({
            "id": "first-trimester-exercise",
            "type": "education",
            "priority": "low",
            "title": "Safe Exercises for First Trimester",
            "description": "Learn about safe exercises during your first trimester.",
            "action": "View Education Content",
            "icon": "BookOpenIcon",
            "category": "exercise",
            "estimatedTime": "8 min"
        })
        
    elif trimester == 2:
        education.append({
            "id": "second-trimester-exercise",
            "type": "education",
            "priority": "medium",
            "title": "Safe Exercises for Second Trimester",
            "description": "Learn about safe exercises during your second trimester.",
            "action": "View Education Content",
            "icon": "BookOpenIcon",
            "category": "exercise",
            "estimatedTime": "12 min"
        })
        
        suggested.append({
            "id": "second-trimester-nutrition",
            "type": "education",
            "priority": "low",
            "title": "Second Trimester Nutrition",
            "description": "Nutritional needs during the second trimester.",
            "action": "View Education Content",
            "icon": "BookOpenIcon",
            "category": "nutrition",
            "estimatedTime": "10 min"
        })
        
    else:  # Third trimester
        education.append({
            "id": "third-trimester-preparation",
            "type": "education",
            "priority": "medium",
            "title": "Birth Preparation Guide",
            "description": "Prepare for labor and delivery with our comprehensive guide.",
            "action": "View Education Content",
            "icon": "BookOpenIcon",
            "category": "preparation",
            "estimatedTime": "15 min"
        })
        
        suggested.append({
            "id": "third-trimester-comfort",
            "type": "education",
            "priority": "low",
            "title": "Third Trimester Comfort Tips",
            "description": "Tips for staying comfortable during the third trimester.",
            "action": "View Education Content",
            "icon": "BookOpenIcon",
            "category": "comfort",
            "estimatedTime": "8 min"
        })
    
    # Medical history based recommendations
    if latest_health_record:
        if latest_health_record.preexisting_diabetes:
            urgent.append({
                "id": "diabetes-management",
                "type": "education",
                "priority": "high",
                "title": "Diabetes Management During Pregnancy",
                "description": "Learn about managing diabetes during pregnancy to reduce complications.",
                "action": "View Education Content",
                "icon": "BookOpenIcon",
                "category": "nutrition",
                "estimatedTime": "10 min"
            })
        
        if latest_health_record.gestational_diabetes:
            important.append({
                "id": "gestational-diabetes",
                "type": "education",
                "priority": "medium",
                "title": "Gestational Diabetes Management",
                "description": "Learn about managing gestational diabetes.",
                "action": "View Education Content",
                "icon": "BookOpenIcon",
                "category": "nutrition",
                "estimatedTime": "12 min"
            })
        
        if latest_health_record.mental_health:
            important.append({
                "id": "mental-health-support",
                "type": "education",
                "priority": "medium",
                "title": "Mental Health During Pregnancy",
                "description": "Resources and strategies for managing mental health during pregnancy.",
                "action": "View Education Content",
                "icon": "BookOpenIcon",
                "category": "symptoms",
                "estimatedTime": "10 min"
            })
    
    # General recommendations
    suggested.append({
        "id": "regular-monitoring",
        "type": "health_record",
        "priority": "low",
        "title": "Regular Health Tracking",
        "description": "Keep track of your health metrics regularly for better monitoring.",
        "action": "Add Health Record",
        "icon": "HeartIcon",
        "urgency": "weekly",
        "estimatedTime": "5 min"
    })
    
    suggested.append({
        "id": "regular-risk-assessment",
        "type": "risk_assessment",
        "priority": "low",
        "title": "Monthly Risk Assessment",
        "description": "Complete a risk assessment to monitor your pregnancy health.",
        "action": "Run Risk Assessment",
        "icon": "ExclamationTriangleIcon",
        "urgency": "monthly",
        "estimatedTime": "10 min"
    })
    
    suggested.append({
        "id": "emergency-preparedness",
        "type": "emergency",
        "priority": "low",
        "title": "Emergency Contact Setup",
        "description": "Ensure your emergency contacts are up to date.",
        "action": "Update Emergency Contacts",
        "icon": "PhoneIcon",
        "urgency": "as needed",
        "estimatedTime": "5 min"
    })
    
    return {
        "urgent": urgent,
        "important": important,
        "suggested": suggested,
        "education": education
    }
