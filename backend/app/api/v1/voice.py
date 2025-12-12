"""
Voice Assistant API
Provides AI-powered voice summaries and navigation guidance for all pages
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.appointment import Appointment
from app.api.v1.dependencies import get_current_user
from app.services.guidelines_service import GuidelinesService
from app.services.tts_service import generate_speech_audio, is_cloud_tts_available
from typing import Dict, Any, Optional
import logging
from datetime import datetime, timedelta, date as date_type
from fastapi.responses import Response
import os
import json

logger = logging.getLogger(__name__)
router = APIRouter()

# Cache for summaries (in-memory, can be upgraded to Redis)
_summary_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes (shorter for more accurate data)


def generate_page_summary(
    page_type: str,
    pregnancy: Optional[Pregnancy],
    latest_risk: Optional[RiskAssessment],
    latest_record: Optional[HealthRecord],
    upcoming_appointments: list,
    health_records_count: int = 0,
    language: str = "en",
    calculated_week: Optional[int] = None,
    calculated_trimester: Optional[int] = None,
    calculated_days_remaining: Optional[int] = None
) -> str:
    """Generate intelligent, detailed summary based on current page with navigation guidance"""
    
    summary_parts = []
    
    # Page-specific greetings and context
    page_greetings = {
        "dashboard": {
            "en": "Welcome to your health dashboard. Here's a comprehensive summary of your health status.",
            "ha": "Barka da zuwa dashboard ɗin lafiya. Ga cikakken bayani game da yanayin lafiyar ku.",
            "yo": "Kaabo si dashboard ilera rẹ. Eyi ni akopọ ti o ni ewu nipa ipo ilera rẹ.",
            "ig": "Nnọọ na dashboard ahụike gị. Nke a bụ nchịkọta zuru ezu nke ọnọdụ ahụike gị."
        },
        "health": {
            "en": "You're viewing your health records page. Here's what you need to know.",
            "ha": "Kuna kallon shafin bayanan lafiya. Ga abin da kuke buƙata ku sani.",
            "yo": "O n wo oju-iwe awọn igbasilẹ ilera rẹ. Eyi ni ohun ti o nilo lati mọ.",
            "ig": "Ị na-elele ibe ndekọ ahụike gị. Nke a bụ ihe ị kwesịrị ịmara."
        },
        "risk": {
            "en": "You're on the risk assessment page. Let me explain your current risk status.",
            "ha": "Kuna kan shafin binciken haɗari. Bari in bayyana yanayin haɗari na yanzu.",
            "yo": "O wa lori oju-iwe iwoju ewu. Jẹ ki n ṣe alaye ipo ewu rẹ lọwọlọwọ.",
            "ig": "Ị nọ na ibe nleba egwu. Ka m kọwaa ọnọdụ egwu gị ugbu a."
        },
        "recommendations": {
            "en": "You're viewing personalized recommendations. Here are the key actions for you.",
            "ha": "Kuna kallon shawarwari na musamman. Ga muhimman ayyuka a gare ku.",
            "yo": "O n wo awọn imọran ti o ni ẹni. Eyi ni awọn iṣẹ pataki fun ọ.",
            "ig": "Ị na-elele ndụmọdụ ahaziri. Nke a bụ omume dị mkpa maka gị."
        },
        "pregnancy": {
            "en": "You're managing your pregnancy profile. Here's your current pregnancy information.",
            "ha": "Kuna sarrafa bayanin ciki. Ga bayanin ciki na yanzu.",
            "yo": "O n ṣakoso profaili oyun rẹ. Eyi ni alaye oyun rẹ lọwọlọwọ.",
            "ig": "Ị na-ejikwa profaịlụ ime gị. Nke a bụ ozi ime gị ugbu a."
        },
        "appointments": {
            "en": "You're viewing your appointments. Here's your upcoming schedule.",
            "ha": "Kuna kallon taron likita. Ga jadawalin ku mai zuwa.",
            "yo": "O n wo awọn ifiranṣẹ rẹ. Eyi ni iṣẹjade rẹ ti n bọ.",
            "ig": "Ị na-elele ọhụụ gị. Nke a bụ nhazi gị na-abịa."
        },
        "hospitals": {
            "en": "You're browsing hospitals. Here's how to find healthcare near you.",
            "ha": "Kuna binciken asibiti. Ga yadda za ku sami kiwon lafiya kusa da ku.",
            "yo": "O n wo awọn ile-iwe giga. Eyi ni bi o ṣe le ri itoju ilera sọtun rẹ.",
            "ig": "Ị na-elele ụlọ ọgwụ. Nke a bụ otu esi achọta nlekọta ahụike dị nso gị."
        }
    }
    
    greeting = page_greetings.get(page_type, page_greetings["dashboard"]).get(language, page_greetings["dashboard"]["en"])
    summary_parts.append(greeting)
    
    # Pregnancy status - detailed (use calculated values if provided, otherwise calculate)
    if pregnancy and pregnancy.due_date:
        # Use calculated values if provided (more accurate), otherwise calculate
        if calculated_week is not None and calculated_trimester is not None:
            week = calculated_week
            trimester = calculated_trimester
            days_remaining = calculated_days_remaining if calculated_days_remaining is not None else 0
        else:
            # Fallback calculation
            due_date = pregnancy.due_date
            today = date_type.today()
            lmp_date = due_date - timedelta(days=280)
            days_pregnant = (today - lmp_date).days
            week = max(1, min(40, days_pregnant // 7))
            
            if week <= 12:
                trimester = 1
            elif week <= 26:
                trimester = 2
            else:
                trimester = 3
            
            days_remaining = (due_date - today).days
        
        due_date_str = ""
        if days_remaining > 0:
            if language == "ha":
                due_date_str = f", kuma kuna da kwanaki {days_remaining} da suka rage har zuwa ranar haihuwa"
            elif language == "yo":
                due_date_str = f", ati pe o ni awọn ọjọ {days_remaining} ti o ku si ọjọ ibi"
            elif language == "ig":
                due_date_str = f", ma ị nwere ụbọchị {days_remaining} fọdụrụ ruo ụbọchị ọmụmụ"
            else:
                due_date_str = f", and you have {days_remaining} days remaining until your due date"
        elif days_remaining == 0:
            if language == "ha":
                due_date_str = ", kuma ranar haihuwa ku ita ce yau"
            elif language == "yo":
                due_date_str = ", ati pe ọjọ ibi rẹ ni oni"
            elif language == "ig":
                due_date_str = ", ma ụbọchị ọmụmụ gị bụ taa"
            else:
                due_date_str = ", and your due date is today"
        else:
            if language == "ha":
                due_date_str = f", kuma ranar haihuwa ta wuce kwanaki {abs(days_remaining)}"
            elif language == "yo":
                due_date_str = f", ati pe ọjọ ibi rẹ ti kọja awọn ọjọ {abs(days_remaining)}"
            elif language == "ig":
                due_date_str = f", ma ụbọchị ọmụmụ gị gafere ụbọchị {abs(days_remaining)}"
            else:
                due_date_str = f", and your due date was {abs(days_remaining)} days ago"
        
        if language == "ha":
            summary_parts.append(f"Kuna cikin makon {week} na ciki, a cikin yanayi na {trimester}{due_date_str}.")
        elif language == "yo":
            summary_parts.append(f"O wa ni ọsẹ {week} ti oyun, ni agbegbe {trimester}{due_date_str}.")
        elif language == "ig":
            summary_parts.append(f"Ị nọ n'izu {week} nke ime, na nkeji {trimester}{due_date_str}.")
        else:
            summary_parts.append(f"You are in week {week} of pregnancy, in trimester {trimester}{due_date_str}.")
    
    # Risk assessment - detailed with risk factors
    if latest_risk:
        risk_level = latest_risk.risk_level or "Low"
        risk_score = float(latest_risk.risk_score) if latest_risk.risk_score else 0.0
        
        # Get risk factors
        risk_factors = []
        if latest_risk.risk_factors:
            if isinstance(latest_risk.risk_factors, list):
                risk_factors = latest_risk.risk_factors[:3]
            elif isinstance(latest_risk.risk_factors, dict):
                risk_factors = list(latest_risk.risk_factors.values())[:3] if latest_risk.risk_factors else []
        
        risk_factors_text = ""
        if risk_factors:
            if language == "ha":
                risk_factors_text = f" Abubuwan haɗari da aka gano sune: {', '.join(risk_factors)}."
            elif language == "yo":
                risk_factors_text = f" Awọn ewu ti a ri ni: {', '.join(risk_factors)}."
            elif language == "ig":
                risk_factors_text = f" Ihe egwu achọpụtara bụ: {', '.join(risk_factors)}."
            else:
                risk_factors_text = f" Identified risk factors include: {', '.join(risk_factors)}."
        
        if language == "ha":
            if risk_level == "High":
                summary_parts.append(f"Binciken haɗari na nuna babban haɗari, tare da maki {risk_score:.1f}%.{risk_factors_text} Kuna buƙatar tuntuɓar likita nan da nan a cikin sa'o'i 24 zuwa 48. Don wannan, ku je shafin taron likita ko kuma ku danna maɓallin Emergency.")
            elif risk_level == "Medium":
                summary_parts.append(f"Binciken haɗari na nuna matsakaicin haɗari, tare da maki {risk_score:.1f}%.{risk_factors_text} Yana da kyau ku tuntuɓi likita cikin makonni 1 zuwa 2. Ku je shafin Appointments don yin taron likita.")
            else:
                summary_parts.append(f"Binciken haɗari na nuna ƙarancin haɗari, tare da maki {risk_score:.1f}%.{risk_factors_text} Ci gaba da kula da lafiya. Ku ci gaba da yin binciken haɗari na yau da kullum.")
        elif language == "yo":
            if risk_level == "High":
                summary_parts.append(f"Idoju ewu rẹ fi ewu to ga han, pẹlu aaye {risk_score:.1f}%.{risk_factors_text} O nilo lati kan si dokita laipẹ laarin wakati 24 si 48. Fun eyi, lọ si oju-iwe ifiranṣẹ tabi tẹ bọtini Emergency.")
            elif risk_level == "Medium":
                summary_parts.append(f"Idoju ewu rẹ fi ewu aarin han, pẹlu aaye {risk_score:.1f}%.{risk_factors_text} O dara lati kan si dokita laarin ọsẹ 1 si 2. Lọ si oju-iwe Awọn ifiranṣẹ lati ṣe ifiranṣẹ.")
            else:
                summary_parts.append(f"Idoju ewu rẹ fi ewu kere han, pẹlu aaye {risk_score:.1f}%.{risk_factors_text} Tẹsiwaju lati ṣe itoju ilera. Tẹsiwaju lati ṣe iwoju ewu ni gbogbo igba.")
        elif language == "ig":
            if risk_level == "High":
                summary_parts.append(f"Nleba egwu gị na-egosi nnukwu egwu, yana ihe {risk_score:.1f}%.{risk_factors_text} Ị kwesịrị ịkpọtụrụ dọkịta ozugbo n'ime awa 24 ruo 48. Maka nke a, gaa na ibe ọhụụ ma ọ bụ pịa bọtịnụ Emergency.")
            elif risk_level == "Medium":
                summary_parts.append(f"Nleba egwu gị na-egosi egwu n'etiti, yana ihe {risk_score:.1f}%.{risk_factors_text} Ọ dị mma ịkpọtụrụ dọkịta n'ime izu 1 ruo 2. Gaa na ibe Ọhụụ iji mee ọhụụ.")
            else:
                summary_parts.append(f"Nleba egwu gị na-egosi obere egwu, yana ihe {risk_score:.1f}%.{risk_factors_text} Gaa n'ihu na-elekọta ahụike. Gaa n'ihu na-eme nleba egwu mgbe niile.")
        else:
            if risk_level == "High":
                summary_parts.append(f"Your risk assessment shows HIGH risk, with a score of {risk_score:.1f}%.{risk_factors_text} You need to contact a healthcare provider immediately within 24 to 48 hours. For this, go to the Appointments page or click the Emergency button.")
            elif risk_level == "Medium":
                summary_parts.append(f"Your risk assessment shows MEDIUM risk, with a score of {risk_score:.1f}%.{risk_factors_text} It's recommended to contact a healthcare provider within 1 to 2 weeks. Go to the Appointments page to schedule an appointment.")
            else:
                summary_parts.append(f"Your risk assessment shows LOW risk, with a score of {risk_score:.1f}%.{risk_factors_text} Continue monitoring your health. Continue to do risk assessments regularly.")
    
    # Latest health metrics - detailed with status
    if latest_record:
        metrics_details = []
        
        # Blood pressure with status
        if latest_record.systolic_bp and latest_record.diastolic_bp:
            bp_status = "normal"
            if latest_record.systolic_bp >= 140 or latest_record.diastolic_bp >= 90:
                bp_status = "high"
            elif latest_record.systolic_bp >= 130 or latest_record.diastolic_bp >= 85:
                bp_status = "elevated"
            
            if language == "ha":
                status_text = "na daidai" if bp_status == "normal" else "yana da girma" if bp_status == "high" else "yana da ɗan girma"
                metrics_details.append(f"jinin jini {latest_record.systolic_bp} akan {latest_record.diastolic_bp} (wanda yake {status_text})")
            elif language == "yo":
                status_text = "deede" if bp_status == "normal" else "ga" if bp_status == "high" else "ga die"
                metrics_details.append(f"eje {latest_record.systolic_bp} lori {latest_record.diastolic_bp} (ti o jẹ {status_text})")
            elif language == "ig":
                status_text = "nkezi" if bp_status == "normal" else "dị elu" if bp_status == "high" else "dị elu nke nta"
                metrics_details.append(f"ọbara mgbali {latest_record.systolic_bp} karịa {latest_record.diastolic_bp} (nke bụ {status_text})")
            else:
                status_text = "normal" if bp_status == "normal" else "high" if bp_status == "high" else "elevated"
                metrics_details.append(f"blood pressure {latest_record.systolic_bp} over {latest_record.diastolic_bp} mmHg ({status_text})")
        
        # Heart rate
        if latest_record.heart_rate:
            hr_status = "normal"
            if latest_record.heart_rate > 100:
                hr_status = "elevated"
            elif latest_record.heart_rate < 60:
                hr_status = "low"
            
            if language == "ha":
                status_text = "na daidai" if hr_status == "normal" else "yana da girma" if hr_status == "elevated" else "yana da ƙasa"
                metrics_details.append(f"bugun zuciya {latest_record.heart_rate} bpm ({status_text})")
            elif language == "yo":
                status_text = "deede" if hr_status == "normal" else "ga" if hr_status == "elevated" else "kere"
                metrics_details.append(f"iyasẹ ọkàn {latest_record.heart_rate} bpm ({status_text})")
            elif language == "ig":
                status_text = "nkezi" if hr_status == "normal" else "dị elu" if hr_status == "elevated" else "dị ala"
                metrics_details.append(f"ọnụ ọgụgụ obi {latest_record.heart_rate} bpm ({status_text})")
            else:
                metrics_details.append(f"heart rate {latest_record.heart_rate} beats per minute ({hr_status})")
        
        # Blood sugar
        if latest_record.blood_sugar:
            sugar_status = "normal"
            if latest_record.blood_sugar >= 126:
                sugar_status = "high"
            elif latest_record.blood_sugar >= 100:
                sugar_status = "elevated"
            
            if language == "ha":
                status_text = "na daidai" if sugar_status == "normal" else "yana da girma" if sugar_status == "high" else "yana da ɗan girma"
                metrics_details.append(f"sukari a jini {latest_record.blood_sugar} mg/dL ({status_text})")
            elif language == "yo":
                status_text = "deede" if sugar_status == "normal" else "ga" if sugar_status == "high" else "ga die"
                metrics_details.append(f"sukari ninu ẹjẹ {latest_record.blood_sugar} mg/dL ({status_text})")
            elif language == "ig":
                status_text = "nkezi" if sugar_status == "normal" else "dị elu" if sugar_status == "high" else "dị elu nke nta"
                metrics_details.append(f"shuga n'ọbara {latest_record.blood_sugar} mg/dL ({status_text})")
            else:
                metrics_details.append(f"blood sugar {latest_record.blood_sugar} mg/dL ({sugar_status})")
        
        # Weight
        if latest_record.weight:
            if language == "ha":
                metrics_details.append(f"nauyi {latest_record.weight} kilogiram")
            elif language == "yo":
                metrics_details.append(f"iwọn {latest_record.weight} kilogiramu")
            elif language == "ig":
                metrics_details.append(f"ịdị arọ {latest_record.weight} kilogram")
            else:
                metrics_details.append(f"weight {latest_record.weight} kilograms")
        
        # BMI
        if latest_record.bmi:
            bmi_status = "normal"
            if latest_record.bmi >= 30:
                bmi_status = "obese"
            elif latest_record.bmi >= 25:
                bmi_status = "overweight"
            elif latest_record.bmi < 18.5:
                bmi_status = "underweight"
            
            if language == "ha":
                status_text = "na daidai" if bmi_status == "normal" else "yana da yawa" if bmi_status == "obese" else "yana da nauyi" if bmi_status == "overweight" else "yana da ƙasa"
                metrics_details.append(f"BMI {latest_record.bmi:.1f} ({status_text})")
            elif language == "yo":
                status_text = "deede" if bmi_status == "normal" else "tobi" if bmi_status == "obese" else "to" if bmi_status == "overweight" else "kere"
                metrics_details.append(f"BMI {latest_record.bmi:.1f} ({status_text})")
            elif language == "ig":
                status_text = "nkezi" if bmi_status == "normal" else "oke ibu" if bmi_status == "obese" else "karịa ibu" if bmi_status == "overweight" else "dị ala"
                metrics_details.append(f"BMI {latest_record.bmi:.1f} ({status_text})")
            else:
                metrics_details.append(f"BMI {latest_record.bmi:.1f} ({bmi_status})")
        
        if metrics_details:
            if language == "ha":
                summary_parts.append(f"Mafi ƙarshen bayanan lafiya: {', '.join(metrics_details)}. Don ƙara sabon bayanan lafiya, ku je shafin Health Records kuma ku danna maɓallin Add New Record.")
            elif language == "yo":
                summary_parts.append(f"Alaye ilera to kẹhin: {', '.join(metrics_details)}. Lati fi alaye ilera tuntun kun, lọ si oju-iwe Awọn Igbasilẹ Ilera ki o tẹ bọtini Fi Tuntun Kun.")
            elif language == "ig":
                summary_parts.append(f"Data ahụike kacha ọhụrụ: {', '.join(metrics_details)}. Iji tinye ndekọ ahụike ọhụrụ, gaa na ibe Ndekọ Ahụike ma pịa bọtịnụ Tinye Ndekọ Ọhụrụ.")
            else:
                summary_parts.append(f"Latest health metrics: {', '.join(metrics_details)}. To add a new health record, go to the Health Records page and click the Add New Record button.")
    
    # Health records count
    if page_type == "health" and health_records_count > 0:
        if language == "ha":
            summary_parts.append(f"Kuna da bayanan lafiya {health_records_count} a cikin tsarin. Ku iya danna kowane bayani don ganin cikakkun bayanai.")
        elif language == "yo":
            summary_parts.append(f"O ni awọn igbasilẹ ilera {health_records_count} ni eto. O le tẹ eyikeyi igbasilẹ lati wo alaye ti o ni ewu.")
        elif language == "ig":
            summary_parts.append(f"Ị nwere ndekọ ahụike {health_records_count} na sistemụ. Ị nwere ike ịpị ndekọ ọ bụla iji hụ nkọwa zuru ezu.")
        else:
            summary_parts.append(f"You have {health_records_count} health records in the system. You can click on any record to view detailed information.")
    
    # Upcoming appointments - detailed
    if upcoming_appointments:
        count = len(upcoming_appointments)
        if count == 1:
            apt = upcoming_appointments[0]
            apt_date = ""
            if apt.appointment_date:
                apt_datetime = apt.appointment_date if isinstance(apt.appointment_date, datetime) else datetime.fromisoformat(str(apt.appointment_date))
                if language == "ha":
                    apt_date = f" a ranar {apt_datetime.strftime('%B %d, %Y')}"
                elif language == "yo":
                    apt_date = f" ni ọjọ {apt_datetime.strftime('%B %d, %Y')}"
                elif language == "ig":
                    apt_date = f" na ụbọchị {apt_datetime.strftime('%B %d, %Y')}"
                else:
                    apt_date = f" on {apt_datetime.strftime('%B %d, %Y')}"
            
            if language == "ha":
                summary_parts.append(f"Kuna da taron likita 1 mai zuwa{apt_date}. Don ganin duk taron likita, ku je shafin Appointments.")
            elif language == "yo":
                summary_parts.append(f"O ni ifiranṣẹ dokita 1 ti n bọ{apt_date}. Lati wo gbogbo awọn ifiranṣẹ, lọ si oju-iwe Awọn ifiranṣẹ.")
            elif language == "ig":
                summary_parts.append(f"Ị nwere ọhụụ dọkịta 1 na-abịa{apt_date}. Iji hụ ọhụụ niile, gaa na ibe Ọhụụ.")
            else:
                summary_parts.append(f"You have 1 upcoming appointment{apt_date}. To view all appointments, go to the Appointments page.")
        else:
            if language == "ha":
                summary_parts.append(f"Kuna da taron likita {count} mai zuwa. Don ganin duk taron likita, ku je shafin Appointments.")
            elif language == "yo":
                summary_parts.append(f"O ni ifiranṣẹ dokita {count} ti n bọ. Lati wo gbogbo awọn ifiranṣẹ, lọ si oju-iwe Awọn ifiranṣẹ.")
            elif language == "ig":
                summary_parts.append(f"Ị nwere ọhụụ dọkịta {count} na-abịa. Iji hụ ọhụụ niile, gaa na ibe Ọhụụ.")
            else:
                summary_parts.append(f"You have {count} upcoming appointments. To view all appointments, go to the Appointments page.")
    else:
        if language == "ha":
            summary_parts.append("Babu taron likita mai zuwa a yanzu. Don yin taron likita, ku je shafin Appointments kuma ku danna maɓallin Book Appointment.")
        elif language == "yo":
            summary_parts.append("Ko si ifiranṣẹ dokita ti n bọ ni bayi. Lati ṣe ifiranṣẹ, lọ si oju-iwe Awọn ifiranṣẹ ki o tẹ bọtini Ṣe Ifiranṣẹ.")
        elif language == "ig":
            summary_parts.append("Enweghị ọhụụ dọkịta na-abịa ugbu a. Iji mee ọhụụ, gaa na ibe Ọhụụ ma pịa bọtịnụ Mee Ọhụụ.")
        else:
            summary_parts.append("No upcoming appointments scheduled at this time. To book an appointment, go to the Appointments page and click the Book Appointment button.")
    
    # Page-specific navigation guidance
    navigation_guidance = {
        "dashboard": {
            "en": "From the dashboard, you can navigate to Health Records to add new data, Risk Assessment to check your risk level, Recommendations for personalized advice, or Appointments to schedule visits.",
            "ha": "Daga dashboard, zaku iya zuwa Health Records don ƙara sabon bayani, Risk Assessment don duba matakin haɗari, Recommendations don shawarwari na musamman, ko kuma Appointments don yin taron likita.",
            "yo": "Lati dashboard, o le lọ si Awọn Igbasilẹ Ilera lati fi alaye tuntun kun, Iwoju Ewu lati ṣayẹwo ipo ewu rẹ, Awọn Imọran fun imọran ti o ni ẹni, tabi Awọn ifiranṣẹ lati ṣe iṣẹjade awọn ibiwole.",
            "ig": "Site na dashboard, ị nwere ike ịga na Ndekọ Ahụike iji tinye data ọhụrụ, Nleba Egwu iji lelee ọkwa egwu gị, Ndụmọdụ maka ndụmọdụ ahaziri, ma ọ bụ Ọhụụ iji hazie nleta."
        },
        "health": {
            "en": "On this page, you can view all your health records. Click Add New Record to log your latest health metrics. You can also go to Risk Assessment to see how these records affect your risk level.",
            "ha": "A kan wannan shafi, zaku iya ganin duk bayanan lafiya. Ku danna Add New Record don shigar da sabon bayanan lafiya. Hakanan zaku iya zuwa Risk Assessment don ganin yadda waɗannan bayanan suke shafar matakin haɗari.",
            "yo": "Lori oju-iwe yii, o le wo gbogbo awọn igbasilẹ ilera rẹ. Tẹ Fi Tuntun Kun lati forukọsilẹ awọn iye ilera to kẹhin rẹ. O tun le lọ si Iwoju Ewu lati wo bi awọn igbasilẹ wọnyi ṣe npa ipo ewu rẹ.",
            "ig": "Na ibe a, ị nwere ike ịhụ ndekọ ahụike gị niile. Pịa Tinye Ndekọ Ọhụrụ iji debanye ihe ndekọ ahụike gị kacha ọhụrụ. Ị nwekwara ike ịga na Nleba Egwu iji hụ otú ndekọ ndị a si emetụta ọkwa egwu gị."
        },
        "risk": {
            "en": "This page shows your risk assessment results. To get a new assessment, click Run Assessment. You can view your assessment history by going to the menu. Based on your risk level, check the Recommendations page for personalized advice.",
            "ha": "Wannan shafi yana nuna sakamakon binciken haɗari. Don samun sabon bincike, ku danna Run Assessment. Zaku iya ganin tarihin binciken ta hanyar zuwa menu. Dangane da matakin haɗari, ku duba shafin Recommendations don shawarwari na musamman.",
            "yo": "Oju-iwe yii fi awọn abajade iwoju ewu rẹ han. Lati gba iwoju tuntun, tẹ Ṣe Iwoju. O le wo itan-akọle iwoju rẹ nipa lilọ si aaye nfun. Ni ipilẹ ipo ewu rẹ, ṣayẹwo oju-iwe Awọn Imọran fun imọran ti o ni ẹni.",
            "ig": "Ibe a na-egosi nsonaazụ nleba egwu gị. Iji nweta nleba ọhụrụ, pịa Mee Nleba. Ị nwere ike ịhụ akụkọ nleba gị site na ịga na menu. Dabere na ọkwa egwu gị, lelee ibe Ndụmọdụ maka ndụmọdụ ahaziri."
        },
        "recommendations": {
            "en": "This page provides personalized recommendations based on your health status. Follow these recommendations to maintain good health. You can add health records from the Health Records page, or schedule appointments from the Appointments page.",
            "ha": "Wannan shafi yana ba da shawarwari na musamman dangane da yanayin lafiya. Ku bi waɗannan shawarwari don kula da lafiya mai kyau. Zaku iya ƙara bayanan lafiya daga shafin Health Records, ko kuma yin taron likita daga shafin Appointments.",
            "yo": "Oju-iwe yii pese awọn imọran ti o ni ẹni ni ipilẹ ipo ilera rẹ. Tẹle awọn imọran wọnyi lati ṣe itoju ilera to dara. O le fi awọn igbasilẹ ilera kun lati oju-iwe Awọn Igbasilẹ Ilera, tabi ṣe iṣẹjade awọn ifiranṣẹ lati oju-iwe Awọn ifiranṣẹ.",
            "ig": "Ibe a na-enye ndụmọdụ ahaziri dabere na ọnọdụ ahụike gị. Soro ndụmọdụ ndị a iji nọgide na-enwe ezigbo ahụike. Ị nwere ike ịgbakwunye ndekọ ahụike site na ibe Ndekọ Ahụike, ma ọ bụ hazie ọhụụ site na ibe Ọhụụ."
        }
    }
    
    if page_type in navigation_guidance:
        summary_parts.append(navigation_guidance[page_type].get(language, navigation_guidance[page_type]["en"]))
    
    # Closing with encouragement
    if language == "ha":
        summary_parts.append("Na gode don sauraron. Ku ci gaba da kula da lafiya da kuma bin shawarwarin likita. Idan kuna da tambayoyi, ku danna maɓallin Voice Assistant don taimako.")
    elif language == "yo":
        summary_parts.append("O ṣeun fun gbigbọ. Tẹsiwaju lati ṣe itoju ilera rẹ ati lati tẹle awọn imọran dokita. Ti o ba ni awọn ibeere, tẹ bọtini Voice Assistant fun iranlọwọ.")
    elif language == "ig":
        summary_parts.append("Daalụ maka ịge ntị. Gaa n'ihu na-elekọta ahụike gị ma soro ndụmọdụ dọkịta. Ọ bụrụ na ị nwere ajụjụ, pịa bọtịnụ Voice Assistant maka enyemaka.")
    else:
        summary_parts.append("Thank you for listening. Continue to monitor your health and follow your healthcare provider's recommendations. If you have questions, click the Voice Assistant button for help.")
    
    return " ".join(summary_parts)


async def generate_llm_summary(
    page_type: str,
    dashboard_data: Dict[str, Any],
    language: str = "en"
) -> Optional[str]:
    """Generate summary using LLM (OpenAI, Anthropic, etc.)"""
    try:
        # Check if LLM API key is configured
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logger.info("OpenAI API key not found, using template summary")
            return None
        
        # Import OpenAI (install with: pip install openai)
        try:
            from openai import OpenAI
        except ImportError:
            logger.warning("OpenAI library not installed. Install with: pip install openai")
            return None
        
        client = OpenAI(api_key=openai_api_key)
        
        # Prepare prompt based on language
        language_names = {
            "en": "English",
            "ha": "Hausa",
            "yo": "Yoruba",
            "ig": "Igbo"
        }
        lang_name = language_names.get(language, "English")
        
        page_descriptions = {
            "dashboard": "health dashboard showing overview of pregnancy, risk assessment, and health metrics",
            "health": "health records page showing all recorded health data",
            "risk": "risk assessment page showing current risk level and factors",
            "recommendations": "recommendations page with personalized health advice",
            "pregnancy": "pregnancy profile management page",
            "appointments": "appointments page showing scheduled visits",
            "hospitals": "hospitals finder page"
        }
        
        page_desc = page_descriptions.get(page_type, "current page")
        
        prompt = f"""You are an intelligent healthcare assistant providing detailed, accurate voice summaries and navigation guidance for a pregnancy health app.

The user is currently on the {page_desc} ({page_type} page).

Generate a comprehensive, natural, conversational summary in {lang_name} that includes:

1. Current pregnancy status (week, trimester, days until due date if available)
2. Risk assessment details (level, exact score percentage, all risk factors)
3. Latest health metrics with their values and status (normal/elevated/high):
   - Blood pressure (systolic/diastolic) with status
   - Heart rate with status
   - Blood sugar with status
   - Weight and BMI if available
4. Upcoming appointments with dates
5. Navigation guidance: Explain how to use the app, what buttons to click, and where to go for specific actions

Be detailed, accurate, and use EXACT values from the data. Do not make up or estimate values.
Provide clear navigation instructions (e.g., "Go to Health Records page and click Add New Record button").
Use natural, conversational language suitable for voice narration. Be reassuring but factual.

Dashboard Data:
{json.dumps(dashboard_data, indent=2, default=str)}

Generate a detailed summary with navigation guidance in {lang_name}:"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": f"You are a helpful, intelligent healthcare assistant speaking {lang_name}. You provide detailed summaries and clear navigation guidance."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,  # Increased for more detailed summaries
            temperature=0.5  # Lower temperature for more accurate, factual summaries
        )
        
        summary = response.choices[0].message.content.strip()
        logger.info(f"Generated LLM summary (length: {len(summary)})")
        return summary
        
    except Exception as e:
        logger.error(f"Error generating LLM summary: {e}")
        return None


@router.get("/summarize")
async def get_page_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page_type: str = "dashboard",  # New parameter for page type
    use_llm: bool = False,
    language: str = "en"
):
    """
    Get AI-powered voice summary with navigation guidance for any page
    
    - page_type: Type of page (dashboard, health, risk, recommendations, pregnancy, appointments, hospitals)
    - use_llm: Set to true to use LLM (requires OPENAI_API_KEY), otherwise uses template
    - language: Language code (en, ha, yo, ig)
    """
    try:
        # Log incoming request parameters
        logger.info(f"Voice summary request - User: {current_user.id}, Page type: {page_type}, Language: {language}, Use LLM: {use_llm}")
        
        # Validate language
        valid_languages = ["en", "ha", "yo", "ig"]
        if language not in valid_languages:
            language = current_user.language_preference or "en"
        
        # Validate page type
        valid_pages = ["dashboard", "health", "risk", "recommendations", "pregnancy", "appointments", "hospitals"]
        if page_type not in valid_pages:
            logger.warning(f"Invalid page_type '{page_type}', defaulting to 'dashboard'")
            page_type = "dashboard"
        
        # Check cache first (include page_type in cache key)
        cache_key = f"{current_user.id}-{page_type}-{language}-{use_llm}"
        cached = _summary_cache.get(cache_key)
        if cached:
            cache_age = (datetime.utcnow() - cached["timestamp"]).total_seconds()
            if cache_age < CACHE_TTL_SECONDS:
                logger.info(f"Returning cached summary (age: {cache_age:.0f}s)")
                return {
                    "summary": cached["summary"],
                    "language": language,
                    "page_type": page_type,
                    "cached": True,
                    "timestamp": cached["timestamp"].isoformat()
                }
        
        # Get pregnancy data
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).first()
        
        # Calculate current week and trimester dynamically (always accurate)
        current_week = None
        trimester = None
        days_remaining = None
        if pregnancy and pregnancy.due_date:
            due_date = pregnancy.due_date
            today = date_type.today()
            # Calculate LMP (280 days before due date)
            lmp_date = due_date - timedelta(days=280)
            # Calculate days from LMP to today
            days_pregnant = (today - lmp_date).days
            current_week = max(1, min(40, days_pregnant // 7))
            
            # Calculate trimester based on week (accurate calculation)
            if current_week <= 12:
                trimester = 1
            elif current_week <= 26:
                trimester = 2
            else:
                trimester = 3
            
            # Calculate days remaining until due date
            days_remaining = (due_date - today).days
            
            # Log for debugging
            logger.info(f"Pregnancy calculation - Due date: {due_date}, Today: {today}, LMP: {lmp_date}, Days pregnant: {days_pregnant}, Week: {current_week}, Trimester: {trimester}, Days remaining: {days_remaining}")
        
        # Get latest risk assessment
        latest_risk = None
        if pregnancy:
            latest_risk = db.query(RiskAssessment).filter(
                RiskAssessment.pregnancy_id == pregnancy.id
            ).order_by(RiskAssessment.assessed_at.desc()).first()
        
        # Get latest health record
        latest_record = None
        health_records_count = 0
        if pregnancy:
            latest_record = db.query(HealthRecord).filter(
                HealthRecord.pregnancy_id == pregnancy.id
            ).order_by(HealthRecord.recorded_at.desc()).first()
            
            # Get total health records count
            health_records_count = db.query(HealthRecord).filter(
                HealthRecord.pregnancy_id == pregnancy.id
            ).count()
        
        # Get upcoming appointments
        upcoming_appointments = []
        if pregnancy:
            today = date_type.today()
            upcoming_appointments = db.query(Appointment).filter(
                Appointment.pregnancy_id == pregnancy.id,
                Appointment.appointment_date >= today,
                Appointment.status != "cancelled"
            ).order_by(Appointment.appointment_date.asc()).limit(5).all()
        
        # Prepare dashboard data for summary
        dashboard_data = {
            "page_type": page_type,
            "pregnancy": {
                "week": current_week,
                "trimester": trimester,
                "due_date": pregnancy.due_date.isoformat() if pregnancy and pregnancy.due_date else None,
                "days_remaining": days_remaining
            },
            "risk_assessment": {
                "level": latest_risk.risk_level if latest_risk else None,
                "score": float(latest_risk.risk_score) if latest_risk and latest_risk.risk_score else None,
                "factors": latest_risk.risk_factors if latest_risk and isinstance(latest_risk.risk_factors, (dict, list)) else []
            },
            "latest_health_metrics": {
                "systolic_bp": latest_record.systolic_bp if latest_record else None,
                "diastolic_bp": latest_record.diastolic_bp if latest_record else None,
                "heart_rate": latest_record.heart_rate if latest_record else None,
                "blood_sugar": latest_record.blood_sugar if latest_record else None,
                "weight": latest_record.weight if latest_record else None,
                "bmi": latest_record.bmi if latest_record else None,
                "recorded_at": latest_record.recorded_at.isoformat() if latest_record else None
            },
            "health_records_count": health_records_count,
            "upcoming_appointments": [
                {
                    "date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                    "type": apt.appointment_type,
                    "clinic": apt.clinic_name
                }
                for apt in upcoming_appointments
            ]
        }
        
        # Generate summary
        summary = None
        if use_llm:
            summary = await generate_llm_summary(page_type, dashboard_data, language)
        
        # Fallback to template if LLM fails or not requested
        if not summary:
            summary = generate_page_summary(
                page_type,
                pregnancy,
                latest_risk,
                latest_record,
                upcoming_appointments,
                health_records_count,
                language,
                current_week,  # Pass calculated week
                trimester,     # Pass calculated trimester
                days_remaining  # Pass calculated days remaining
            )
        
        # Cache the summary
        _summary_cache[cache_key] = {
            "summary": summary,
            "timestamp": datetime.utcnow()
        }
        
        # Clean old cache entries (keep last 100)
        if len(_summary_cache) > 100:
            sorted_cache = sorted(_summary_cache.items(), key=lambda x: x[1]["timestamp"])
            for key, _ in sorted_cache[:-100]:
                del _summary_cache[key]
        
        return {
            "summary": summary,
            "language": language,
            "page_type": page_type,
            "cached": False,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "llm" if use_llm and summary else "template",
            "cloud_tts_available": is_cloud_tts_available()
        }
        
    except Exception as e:
        logger.error(f"Error generating page summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate page summary"
        )


@router.post("/speak")
async def generate_speech(
    text: str,
    language: str = "en",
    current_user: User = Depends(get_current_user)
):
    """
    Generate speech audio using cloud TTS for native Nigerian language voices
    
    - text: Text to convert to speech
    - language: Language code (en, ha, yo, ig)
    """
    try:
        # Validate language
        valid_languages = ["en", "ha", "yo", "ig"]
        if language not in valid_languages:
            language = current_user.language_preference or "en"
        
        # Generate audio using cloud TTS
        result = generate_speech_audio(text, language)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloud TTS service is not available. Please configure GOOGLE_TTS_API_KEY."
            )
        
        audio_bytes, content_type = result
        
        return Response(
            content=audio_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=speech_{language}.mp3",
                "Content-Length": str(len(audio_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating speech: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate speech audio"
        )


@router.get("/tts-status")
async def get_tts_status(
    current_user: User = Depends(get_current_user)
):
    """
    Check if cloud TTS is available
    """
    return {
        "available": is_cloud_tts_available(),
        "supported_languages": ["en", "ha", "yo", "ig"] if is_cloud_tts_available() else []
    }
