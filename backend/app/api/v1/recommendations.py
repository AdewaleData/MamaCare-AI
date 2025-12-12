from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.user import User
from app.api.v1.dependencies import get_current_user
from app.services.guidelines_service import get_guidelines_service
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


def _build_contextual_description(
    risk_factors: List[str],
    health_record: HealthRecord,
    risk_score: float,
    risk_level: str
) -> str:
    """Build a contextual description explaining what's happening and what to do"""
    descriptions = []
    
    # Start with the situation
    if risk_factors:
        primary_factors = risk_factors[:3]  # Focus on top 3 factors
        factor_text = ", ".join(primary_factors)
        descriptions.append(f"Your assessment detected: {factor_text}.")
    
    # Add specific health metrics if available
    health_details = []
    if health_record:
        if health_record.systolic_bp and health_record.diastolic_bp:
            health_details.append(f"Blood Pressure: {health_record.systolic_bp}/{health_record.diastolic_bp} mmHg")
        if health_record.blood_sugar:
            health_details.append(f"Blood Sugar: {health_record.blood_sugar} mg/dL")
        if health_record.bmi:
            health_details.append(f"BMI: {health_record.bmi}")
        if health_record.heart_rate:
            health_details.append(f"Heart Rate: {health_record.heart_rate} bpm")
    
    if health_details:
        descriptions.append(f"Current readings: {', '.join(health_details)}.")
    
    # Explain why it matters
    if risk_level == "High":
        descriptions.append("This indicates a HIGH RISK pregnancy that requires immediate medical attention.")
    elif risk_level == "Medium":
        descriptions.append("This indicates a MODERATE RISK that needs close monitoring.")
    else:
        descriptions.append("Your pregnancy is currently LOW RISK, but regular monitoring is still important.")
    
    return " ".join(descriptions)


def _get_actionable_recommendation(
    risk_factors: List[str],
    health_record: HealthRecord,
    risk_level: str,
    risk_score: float
) -> Dict[str, Any]:
    """Get a specific, actionable recommendation based on the primary risk factor"""
    
    # Identify primary risk factor
    primary_factor = risk_factors[0] if risk_factors else None
    
    # Blood pressure related
    if primary_factor and ("Blood Pressure" in primary_factor or "Hypertension" in primary_factor):
        bp_value = ""
        if health_record and health_record.systolic_bp and health_record.diastolic_bp:
            bp_value = f" ({health_record.systolic_bp}/{health_record.diastolic_bp} mmHg)"
        
        if risk_level == "High":
            return {
                "title": "High Blood Pressure Detected - Immediate Action Required",
                "description": f"Your blood pressure{bp_value} is elevated, which may indicate preeclampsia - a serious pregnancy complication. This requires immediate medical evaluation to prevent complications for you and your baby.",
                "action": "Visit Emergency Department or Contact Healthcare Provider Immediately",
                "urgency": "urgent"
            }
        else:
            return {
                "title": "Elevated Blood Pressure - Monitor Closely",
                "description": f"Your blood pressure{bp_value} is above normal. While not critical, this needs monitoring as it could develop into preeclampsia. Reduce sodium intake and rest when possible.",
                "action": "Schedule Consultation Within 48 Hours",
                "urgency": "within 48 hours"
            }
    
    # Blood sugar related
    if primary_factor and ("Blood Sugar" in primary_factor or "Diabetes" in primary_factor):
        sugar_value = ""
        if health_record and health_record.blood_sugar:
            sugar_value = f" ({health_record.blood_sugar} mg/dL)"
        
        if risk_level == "High":
            return {
                "title": "High Blood Sugar Detected - Diabetes Management Needed",
                "description": f"Your blood sugar{sugar_value} is elevated, indicating diabetes or gestational diabetes. Uncontrolled diabetes during pregnancy can cause birth defects, premature birth, and complications. Immediate medical management is essential.",
                "action": "See Endocrinologist or Diabetes Specialist Immediately",
                "urgency": "urgent"
            }
        else:
            return {
                "title": "Elevated Blood Sugar - Dietary Management Required",
                "description": f"Your blood sugar{sugar_value} is above normal. This may indicate prediabetes or early gestational diabetes. Follow a diabetic diet plan and monitor glucose levels regularly.",
                "action": "Schedule Diabetes Screening and Nutrition Consultation",
                "urgency": "within 1 week"
            }
    
    # BMI related
    if primary_factor and ("BMI" in primary_factor or "Obesity" in primary_factor or "Overweight" in primary_factor or "Underweight" in primary_factor):
        bmi_value = ""
        if health_record and health_record.bmi:
            bmi_value = f" (BMI: {health_record.bmi})"
        
        if "Obesity" in primary_factor or "Underweight" in primary_factor:
            return {
                "title": f"{primary_factor} - Nutritional Support Needed",
                "description": f"Your BMI{bmi_value} is outside the healthy range for pregnancy. This can increase risks of complications. Work with a nutritionist to develop a safe, balanced meal plan for you and your baby.",
                "action": "Consult Nutritionist for Pregnancy-Safe Diet Plan",
                "urgency": "within 1 week"
            }
        else:
            return {
                "title": "Weight Management During Pregnancy",
                "description": f"Your BMI{bmi_value} is slightly elevated. Maintain a balanced diet and light exercise as approved by your healthcare provider to manage weight gain during pregnancy.",
                "action": "Get Nutrition Guidance from Healthcare Provider",
                "urgency": "within 2 weeks"
            }
    
    # Previous complications
    if primary_factor and "Previous" in primary_factor and "Complications" in primary_factor:
        return {
            "title": "Previous Pregnancy Complications - Enhanced Monitoring Required",
            "description": "You have a history of pregnancy complications, which increases your risk. Your healthcare team needs to monitor you more closely and may recommend additional tests or interventions.",
            "action": "Schedule High-Risk Pregnancy Consultation",
            "urgency": "within 1 week"
        }
    
    # Mental health
    if primary_factor and "Mental Health" in primary_factor:
        return {
            "title": "Mental Health Support - Professional Care Recommended",
            "description": "Pregnancy can be emotionally challenging, and mental health concerns need attention. Untreated mental health issues can affect both you and your baby. Professional support is available and important.",
            "action": "Contact Mental Health Counselor or Support Group",
            "urgency": "within 1 week"
        }
    
    # Generic high risk - include risk factors in description
    if risk_level == "High":
        risk_factors_text = ""
        if risk_factors:
            if len(risk_factors) == 1:
                risk_factors_text = f" The primary concern is: {risk_factors[0]}."
            elif len(risk_factors) <= 3:
                risk_factors_text = f" Key risk factors detected: {', '.join(risk_factors)}."
            else:
                risk_factors_text = f" Multiple risk factors detected: {', '.join(risk_factors[:3])}, and others."
        
        health_metrics_text = ""
        if health_record:
            metrics = []
            if health_record.systolic_bp and health_record.diastolic_bp:
                metrics.append(f"BP: {health_record.systolic_bp}/{health_record.diastolic_bp} mmHg")
            if health_record.blood_sugar:
                metrics.append(f"Blood Sugar: {health_record.blood_sugar} mg/dL")
            if health_record.bmi:
                metrics.append(f"BMI: {health_record.bmi}")
            if metrics:
                health_metrics_text = f" Your current readings: {', '.join(metrics)}."
        
        return {
            "title": "High Risk Pregnancy - Immediate Medical Attention Required",
            "description": f"Your risk assessment shows a HIGH RISK score of {risk_score:.1f}%.{risk_factors_text}{health_metrics_text} This requires immediate medical evaluation and close monitoring to ensure the safety of you and your baby. Visit a healthcare facility within 24-48 hours.",
            "action": "Visit Healthcare Provider or Emergency Department Immediately",
            "urgency": "urgent"
        }
    
    # Generic medium risk
    if risk_level == "Medium":
        return {
            "title": "Moderate Risk - Close Monitoring Recommended",
            "description": f"Your risk assessment shows a MODERATE RISK score of {risk_score:.1f}%. While not immediately critical, regular monitoring and follow-up appointments are important to catch any changes early.",
            "action": "Schedule Follow-up Appointment Within 1-2 Weeks",
            "urgency": "within 2 weeks"
        }
    
    # Default
    return {
        "title": "Continue Regular Prenatal Care",
        "description": f"Your risk assessment shows a LOW RISK score of {risk_score:.1f}%. Continue with regular antenatal visits and maintain a healthy lifestyle.",
        "action": "Continue Regular Checkups",
        "urgency": "monthly"
    }


def generate_recommendations(
    current_week: int,
    trimester: int,
    latest_health_record: HealthRecord,
    latest_risk_assessment: RiskAssessment,
    pregnancy: Pregnancy
) -> Dict[str, List[Dict[str, Any]]]:
    """Generate personalized recommendations based on health data"""
    
    guidelines_service = get_guidelines_service()
    urgent = []
    important = []
    suggested = []
    education = []
    
    # Get risk thresholds from guidelines
    risk_thresholds = guidelines_service.get_risk_thresholds().get("pregnancy", {})
    high_threshold = risk_thresholds.get("high_min", 0.70) * 100  # Convert to percentage (70%)
    medium_threshold = risk_thresholds.get("medium_min", 0.40) * 100  # Convert to percentage (40%)
    
    # PRIMARY: Risk-based recommendations - Risk level is the main determinant
    risk_level = None
    risk_score = 0.0
    risk_factors = []
    
    if latest_risk_assessment:
        risk_level = latest_risk_assessment.risk_level
        # Risk score is stored as percentage (0-100) in database
        risk_score = float(latest_risk_assessment.risk_score) if latest_risk_assessment.risk_score else 0.0
        
        # Extract risk_factors - handle both dict and list formats
        risk_factors = []
        if latest_risk_assessment.risk_factors:
            if isinstance(latest_risk_assessment.risk_factors, dict):
                # If stored as {"factors": [...]}
                risk_factors = latest_risk_assessment.risk_factors.get("factors", [])
            elif isinstance(latest_risk_assessment.risk_factors, list):
                # If stored as list directly
                risk_factors = latest_risk_assessment.risk_factors
            else:
                # Fallback: try to convert to list
                risk_factors = []
        
        # Normalize risk level (handle case variations)
        risk_level_normalized = risk_level.capitalize() if risk_level else "Low"
        
        logger.info(f"Risk assessment - Level: {risk_level_normalized}, Score: {risk_score}%, Factors: {risk_factors}")
        
        logger.info(f"Risk assessment - Level: {risk_level_normalized}, Score: {risk_score}%, Thresholds - High: >={high_threshold}%, Medium: >={medium_threshold}%, Factors: {risk_factors}")
        
        # HIGH RISK - Most urgent recommendations (score >= 70% based on guidelines)
        if risk_level_normalized == "High" or risk_score >= high_threshold:
            # Get contextual recommendation
            contextual_rec = _get_actionable_recommendation(risk_factors, latest_health_record, risk_level_normalized, risk_score)
            
            urgent.append({
                "id": "high-risk-appointment",
                "type": "appointment",
                "priority": "high",
                "title": contextual_rec["title"],
                "description": contextual_rec["description"],
                "action": contextual_rec["action"],
                "icon": "CalendarDaysIcon",
                "urgency": contextual_rec["urgency"],
                "estimatedTime": "30 min"
            })
            
            # Add monitoring recommendation with context
            monitoring_desc = f"Your HIGH RISK status (score: {risk_score:.1f}%) requires daily monitoring of vital signs. Track your blood pressure, blood sugar, and other metrics daily to detect any changes early."
            if risk_factors:
                monitoring_desc += f" Focus on monitoring: {', '.join(risk_factors[:2])}."
            
            urgent.append({
                "id": "high-risk-monitoring",
                "type": "health_record",
                "priority": "high",
                "title": "Daily Health Monitoring - Critical for High Risk Pregnancy",
                "description": monitoring_desc,
                "action": "Add Health Record",
                "icon": "HeartIcon",
                "urgency": "daily",
                "estimatedTime": "5 min"
            })
            
            # Add Nigerian Healthcare Guidance if high risk
            urgent.append({
                "id": "nigerian-guidelines-high-risk",
                "type": "education",
                "priority": "high",
                "title": "Nigerian Healthcare Guidelines - High Risk Protocol",
                "description": f"According to Nigerian clinical guidelines, your HIGH RISK status requires: (1) Immediate consultation with a qualified obstetrician, (2) Hospital-based care if symptoms worsen, (3) Regular monitoring at a tertiary healthcare facility. Follow the recommended protocols for high-risk pregnancies in Nigeria.",
                "action": "View Nigerian Healthcare Guidelines",
                "icon": "BookOpenIcon",
                "urgency": "immediate",
                "estimatedTime": "10 min"
            })
            
        # MEDIUM RISK - Important but not urgent (score 40-69% based on guidelines)
        elif risk_level_normalized == "Medium" or (risk_score >= medium_threshold and risk_score < high_threshold):
            # Get contextual recommendation
            contextual_rec = _get_actionable_recommendation(risk_factors, latest_health_record, risk_level_normalized, risk_score)
            
            important.append({
                "id": "medium-risk-appointment",
                "type": "appointment",
                "priority": "medium",
                "title": contextual_rec["title"],
                "description": contextual_rec["description"],
                "action": contextual_rec["action"],
                "icon": "CalendarDaysIcon",
                "urgency": contextual_rec["urgency"],
                "estimatedTime": "30 min"
            })
            
            # Add monitoring recommendation with context
            monitoring_desc = f"Your MODERATE RISK status (score: {risk_score:.1f}%) requires weekly monitoring to track changes."
            if risk_factors:
                monitoring_desc += f" Pay special attention to: {', '.join(risk_factors[:2])}."
            monitoring_desc += " Record your health data weekly to ensure early detection of any worsening conditions."
            
            important.append({
                "id": "weekly-monitoring",
                "type": "health_record",
                "priority": "medium",
                "title": "Weekly Health Monitoring - Track Changes",
                "description": monitoring_desc,
                "action": "Add Health Record",
                "icon": "HeartIcon",
                "urgency": "weekly",
                "estimatedTime": "5 min"
            })
            
            # Add Nigerian Healthcare Guidance for medium risk
            important.append({
                "id": "nigerian-guidelines-medium-risk",
                "type": "education",
                "priority": "medium",
                "title": "Nigerian Healthcare Guidelines - Moderate Risk Care",
                "description": f"According to Nigerian clinical guidelines, your MODERATE RISK status requires: (1) Regular follow-up appointments every 2-4 weeks, (2) Monitoring at a secondary or tertiary healthcare facility, (3) Adherence to recommended lifestyle modifications. Your risk factors: {', '.join(risk_factors[:3]) if risk_factors else 'None specified'}.",
                "action": "View Nigerian Healthcare Guidelines",
                "icon": "BookOpenIcon",
                "urgency": "within 2 weeks",
                "estimatedTime": "10 min"
            })
            
        # LOW RISK - Standard recommendations (score < 40% based on guidelines)
        else:
            contextual_rec = _get_actionable_recommendation(risk_factors, latest_health_record, risk_level_normalized, risk_score)
            
            suggested.append({
                "id": "low-risk-routine",
                "type": "appointment",
                "priority": "low",
                "title": contextual_rec["title"],
                "description": contextual_rec["description"],
                "action": contextual_rec["action"],
                "icon": "CalendarDaysIcon",
                "urgency": contextual_rec["urgency"],
                "estimatedTime": "30 min"
            })
            
            # Add monitoring recommendation with context
            monitoring_desc = f"Your LOW RISK status (score: {risk_score:.1f}%) is good news, but regular monitoring is still important."
            if risk_factors:
                monitoring_desc += f" Continue tracking: {', '.join(risk_factors[:2])}."
            monitoring_desc += " Bi-weekly health records help maintain your low-risk status and catch any changes early."
            
            suggested.append({
                "id": "low-risk-monitoring",
                "type": "health_record",
                "priority": "low",
                "title": "Regular Health Tracking - Maintain Low Risk Status",
                "description": monitoring_desc,
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
            "title": "Complete Risk Assessment - Understand Your Pregnancy Status",
            "description": "You haven't completed a risk assessment yet. A risk assessment analyzes your health data (blood pressure, blood sugar, BMI, medical history) to determine your pregnancy risk level and provide personalized recommendations. This helps identify any potential complications early and guides your care plan.",
            "action": "Run Risk Assessment Now",
            "icon": "ExclamationTriangleIcon",
            "urgency": "as soon as possible",
            "estimatedTime": "10 min"
        })
    
    # SECONDARY: Health record based recommendations (only if not already covered by risk level)
    # These supplement risk-based recommendations but don't override them
    if latest_health_record and risk_level and risk_level.capitalize() != "High":
        # Blood pressure check
        if latest_health_record.systolic_bp and latest_health_record.diastolic_bp:
            systolic = latest_health_record.systolic_bp
            diastolic = latest_health_record.diastolic_bp
            
            if systolic > 140 or diastolic > 90:
                # Determine severity
                if systolic >= 160 or diastolic >= 110:
                    severity = "severe"
                    explanation = "This is severe hypertension and may indicate preeclampsia, which can be life-threatening if untreated."
                    action_text = "Seek Emergency Medical Care Immediately"
                    urgency = "urgent"
                else:
                    severity = "moderate"
                    explanation = "This elevated blood pressure needs monitoring as it could develop into preeclampsia or gestational hypertension."
                    action_text = "Schedule Consultation Within 48 Hours"
                    urgency = "within 48 hours"
                
                important.append({
                    "id": "high-bp-management",
                    "type": "health_record",
                    "priority": "high",
                    "title": f"Elevated Blood Pressure Detected - {severity.capitalize()} Hypertension",
                    "description": f"Your blood pressure reading is {systolic}/{diastolic} mmHg, which is above the normal range (normal: <120/80 mmHg). {explanation} Regular monitoring and medical management are essential to protect you and your baby.",
                    "action": action_text,
                    "icon": "HeartIcon",
                    "urgency": urgency,
                    "estimatedTime": "5 min"
                })
            elif systolic >= 130 or diastolic >= 85:
                important.append({
                    "id": "elevated-bp-watch",
                    "type": "health_record",
                    "priority": "medium",
                    "title": "Slightly Elevated Blood Pressure - Monitor Closely",
                    "description": f"Your blood pressure is {systolic}/{diastolic} mmHg, which is slightly above optimal (optimal: <120/80 mmHg). While not critical, this needs watching. Reduce sodium intake, stay hydrated, and rest. If it continues to rise, contact your healthcare provider.",
                    "action": "Monitor Daily and Reduce Sodium Intake",
                    "icon": "HeartIcon",
                    "urgency": "weekly",
                    "estimatedTime": "5 min"
                })
        
        # Blood sugar check
        if latest_health_record.blood_sugar:
            blood_sugar = float(latest_health_record.blood_sugar)
            
            if blood_sugar > 126:
                if blood_sugar >= 200:
                    severity = "very high"
                    explanation = "This is dangerously high and indicates uncontrolled diabetes, which can cause serious complications including birth defects, premature birth, and stillbirth."
                    action_text = "Seek Emergency Medical Care - Uncontrolled Diabetes"
                    urgency = "urgent"
                elif blood_sugar >= 140:
                    severity = "high"
                    explanation = "This indicates diabetes or gestational diabetes. Uncontrolled diabetes during pregnancy increases risks of birth defects, large baby (macrosomia), and delivery complications."
                    action_text = "See Endocrinologist or Diabetes Specialist Immediately"
                    urgency = "urgent"
                else:
                    severity = "elevated"
                    explanation = "This elevated blood sugar may indicate prediabetes or early gestational diabetes. Early intervention with diet and monitoring can prevent complications."
                    action_text = "Schedule Diabetes Screening and Nutrition Consultation"
                    urgency = "within 1 week"
                
                important.append({
                    "id": "high-blood-sugar",
                    "type": "health_record",
                    "priority": "high",
                    "title": f"Elevated Blood Sugar Detected - {severity.capitalize()} Level",
                    "description": f"Your blood sugar reading is {blood_sugar} mg/dL (normal fasting: 70-100 mg/dL). {explanation} Immediate medical management with diet, monitoring, and possibly medication is needed to protect you and your baby.",
                    "action": action_text,
                    "icon": "HeartIcon",
                    "urgency": urgency,
                    "estimatedTime": "5 min"
                })
            elif blood_sugar >= 100:
                important.append({
                    "id": "elevated-sugar-watch",
                    "type": "health_record",
                    "priority": "medium",
                    "title": "Slightly Elevated Blood Sugar - Early Warning",
                    "description": f"Your blood sugar is {blood_sugar} mg/dL, which is slightly above normal (normal: 70-100 mg/dL). This may indicate prediabetes. Follow a low-sugar diet, eat smaller frequent meals, and monitor regularly. If it continues to rise, see your healthcare provider.",
                    "action": "Follow Low-Sugar Diet and Monitor Weekly",
                    "icon": "HeartIcon",
                    "urgency": "weekly",
                    "estimatedTime": "5 min"
                })
    
    # Combine all recommendations and prioritize
    # Limit to exactly 5 most relevant recommendations based on actual health status
    # Priority order: urgent > important > suggested
    MAX_RECOMMENDATIONS = 5
    prioritized = []
    
    # First, add urgent recommendations (up to 3)
    prioritized.extend(urgent[:3])
    
    # Then add important recommendations if we have space
    remaining_slots = MAX_RECOMMENDATIONS - len(prioritized)
    if remaining_slots > 0:
        prioritized.extend(important[:remaining_slots])
    
    # Finally, add suggested if we still have space
    remaining_slots = MAX_RECOMMENDATIONS - len(prioritized)
    if remaining_slots > 0:
        prioritized.extend(suggested[:remaining_slots])
    
    # CRITICAL: Ensure we have exactly 5 (or less if not enough recommendations)
    # This is the final limit - no more than 5 total
    final_recommendations = prioritized[:MAX_RECOMMENDATIONS]
    
    # Double-check: if somehow we have more than 5, truncate
    if len(final_recommendations) > MAX_RECOMMENDATIONS:
        logger.error(f"ERROR: More than {MAX_RECOMMENDATIONS} recommendations! Truncating from {len(final_recommendations)} to {MAX_RECOMMENDATIONS}")
        final_recommendations = final_recommendations[:MAX_RECOMMENDATIONS]
    
    # Log to verify limit
    total_before_limit = len(urgent) + len(important) + len(suggested)
    logger.info(f"Recommendations before limit - Urgent: {len(urgent)}, Important: {len(important)}, Suggested: {len(suggested)}, Total: {total_before_limit}")
    logger.info(f"Final recommendations after limit: {len(final_recommendations)} (max: {MAX_RECOMMENDATIONS})")
    
    # Split into urgent and important based on priority
    urgent_final = [r for r in final_recommendations if r.get("priority") == "high"]
    important_final = [r for r in final_recommendations if r.get("priority") in ["medium", "low"]]
    
    # Verify total count
    total_final = len(urgent_final) + len(important_final)
    if total_final > MAX_RECOMMENDATIONS:
        logger.warning(f"Total recommendations ({total_final}) exceeds limit ({MAX_RECOMMENDATIONS}). Truncating...")
        # If somehow we have more, truncate to exactly 5
        all_final = urgent_final + important_final
        urgent_final = [r for r in all_final[:MAX_RECOMMENDATIONS] if r.get("priority") == "high"]
        important_final = [r for r in all_final[:MAX_RECOMMENDATIONS] if r.get("priority") in ["medium", "low"]]
    
    logger.info(f"Returning - Urgent: {len(urgent_final)}, Important: {len(important_final)}, Total: {len(urgent_final) + len(important_final)}")
    
    return {
        "urgent": urgent_final,
        "important": important_final,
        "suggested": [],
        "education": []  # Remove education recommendations
    }
