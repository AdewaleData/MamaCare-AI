from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.translation import Translation
from app.models.user import User
from app.api.v1.dependencies import get_current_user
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class TranslationResponse(BaseModel):
    key: str
    value: str
    language: str
    category: Optional[str]
    
    class Config:
        from_attributes = True


class TranslationCreate(BaseModel):
    key: str
    language: str = Field(..., pattern="^(en|ha|yo|ig)$")
    value: str
    category: Optional[str] = None
    context: Optional[str] = None


class BulkTranslationRequest(BaseModel):
    translations: List[TranslationCreate]


# Default translations for common UI elements
DEFAULT_TRANSLATIONS = {
    "en": {
        "welcome_message": "Welcome to MamaCare AI",
        "health_dashboard": "Health Dashboard",
        "emergency_button": "Emergency",
        "risk_assessment": "Risk Assessment",
        "appointments": "Appointments",
        "health_records": "Health Records",
        "pregnancy_info": "Pregnancy Information",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "view": "View",
        "pregnancy_week": "Pregnancy Week",
        "trimester": "Trimester",
        "not_set": "Not set",
        "total_records_tracked": "Total records tracked",
        "risk_level": "Risk Level",
        "score": "Score",
        "recent_health_records": "Recent Health Records",
        "view_all": "View All",
        "error_loading_health_records": "Error loading health records",
        "unknown_error": "Unknown error",
        "add_health_record": "Add Health Record",
        "no_health_records_yet": "No health records yet",
        "please_add_pregnancy_info_first": "Please add pregnancy information first",
        "add_pregnancy_info": "Add Pregnancy Info",
        "assessing_risk_from_health_records": "Assessing risk from health records...",
        "add_health_records_to_generate_risk_assessment": "Add health records to generate risk assessment",
        "weight": "Weight",
        "bp": "BP",
        "sugar": "Sugar",
        "hr": "HR",
        "showing": "Showing",
        "of": "of",
        "records": "records",
        "no_assessment_available": "No Assessment Available",
        "please_add_health_records_to_generate_risk_assessment": "Please add health records to generate a risk assessment",
        "overall_risk_assessment": "Overall Risk Assessment",
        "based_on_your_latest_health_records": "Based on your latest health records",
        "about_risk_assessment": "About Risk Assessment",
        "this_assessment_is_based_on_your_health_records": "This assessment is based on your health records and uses AI/ML models to evaluate",
        "personalized_recommendations": "Personalized Recommendations",
        "ai_powered_recommendations_tailored": "AI-powered recommendations tailored to your pregnancy journey",
        "urgent_actions": "Urgent Actions",
        "important_actions": "Important Actions",
        "suggested_actions": "Suggested Actions",
        "provider_dashboard": "Provider Dashboard",
        "welcome": "Welcome",
        "monitor_your_patients_and_manage_high_risk_cases": "Monitor your patients and manage high-risk cases",
        "total_patients": "Total Patients",
        "active_pregnancies": "Active Pregnancies",
        "high_risk_cases": "High Risk Cases",
        "upcoming_appointments": "Upcoming Appointments",
        "cases": "Cases",
        "no_dashboard_data_available": "No dashboard data available",
        "government_health_dashboard": "Government Health Dashboard",
        "active": "active",
        "coverage": "coverage",
        "assessment_rate": "assessment rate",
        "of_total": "of total",
        "potential_lives_saved": "Potential Lives Saved",
        "early_detections": "Early Detections",
        "preventive_interventions": "Preventive Interventions",
        "new_users": "New Users",
        "new_pregnancies": "New Pregnancies",
        "new_assessments": "New Assessments",
        "system_status": "System Status",
        "operational": "Operational",
        "average_risk_score": "Average Risk Score",
        "no_upcoming_appointments": "No upcoming appointments",
        "low_risk": "Low Risk",
        "medium_risk": "Medium Risk",
        "high_risk": "High Risk",
        "systolic_bp": "Systolic Blood Pressure",
        "diastolic_bp": "Diastolic Blood Pressure",
        "blood_sugar": "Blood Sugar",
        "body_temp": "Body Temperature",
        "heart_rate": "Heart Rate",
        "weight": "Weight",
        "bmi": "BMI",
        "voice_assistant": "Voice Assistant",
        "play_summary": "Play Summary",
        "enable_voice": "Enable Voice",
        "disable_voice": "Disable Voice",
        "minimize": "Minimize",
        "pregnancy_week": "Pregnancy Week",
        "days_remaining": "Days remaining",
        "health_records_count": "You have",
        "latest_measurements": "Your latest measurements",
        "kilograms": "kilograms",
        "blood_pressure": "Blood Pressure",
        "risk_level": "Your risk level is",
        "risk_score": "Risk score",
        "percent": "percent",
        "voice_summary_closing": "Remember to add your health records regularly for accurate risk assessment.",
        "no_data_summary": "No health data available yet. Please add your pregnancy information and health records.",
        "generating_summary": "Generating summary...",
        "beats_per_minute": "beats per minute",
        "risk_low": "Low Risk",
        "risk_medium": "Medium Risk",
        "risk_high": "High Risk",
        "welcome_back": "Welcome back",
        "user": "User",
        "dashboard_description": "Monitor your pregnancy health and track vital signs.",
        "refresh": "Refresh",
        "dashboard_voice_intro": "Welcome to your health dashboard. Here is your health summary.",
        "pregnancy_week_voice": "You are in pregnancy week",
        "due_date_voice": "Your baby is due in",
        "days": "days",
        "health_records_count_voice": "You have",
        "latest_measurements_voice": "Your latest health measurements are:",
        "weight_voice": "Weight:",
        "kilograms_voice": "kilograms",
        "bp_voice": "Blood pressure:",
        "over": "over",
        "sugar_voice": "Blood sugar:",
        "hr_voice": "Heart rate:",
        "beats_per_minute_voice": "beats per minute",
        "risk_summary_voice": "Your current risk level is",
        "risk_score_voice": "Your risk score is",
        "percent_voice": "percent",
        "appointments_page_intro": "This is your appointments page. Here you can view and book appointments.",
        "appointments_count_voice": "You have",
        "upcoming_appointments": "upcoming appointments",
        "next_appointment_voice": "Your next appointment is on",
        "at": "at",
        "no_appointments_voice": "You do not have any upcoming appointments.",
        "health_records_page_intro": "This is your health records page. Here you can view and add your health measurements.",
        "records_count_voice": "You have",
        "health_records_voice": "health records",
        "no_records_voice": "You do not have any health records yet. Please add your health measurements.",
        "risk_page_intro": "This is your risk assessment page. Here you can see your pregnancy risk analysis.",
        "risk_details_voice": "Your risk level is",
        "with_a_score_of": "with a score of",
        "risk_recommendations_voice": "You have",
        "recommendations_to_follow": "recommendations to follow",
        "pregnancy_page_intro": "This is your pregnancy information page.",
        "pregnancy_info_voice": "You are in week",
        "of_your_pregnancy": "of your pregnancy",
        "emergency_page_intro": "This is the emergency page. In case of emergency, you can call for help here.",
        "emergency_instructions_voice": "If you are experiencing severe symptoms, press the emergency button to contact healthcare providers immediately.",
        "recommendations_page_intro": "This is your recommendations page. Here you can see personalized health recommendations.",
        "recommendations_count_voice": "You have",
        "recommendations_voice": "recommendations",
        "dashboard_actions_voice": "To book an appointment, click on the Appointments button in the menu. To add health records, click on Health Records.",
        "appointment_actions_voice": "To book a new appointment, click the Add Appointment button. Fill in the date, clinic name, and address, then click Save.",
        "health_records_actions_voice": "To add a new health record, click the Add Record button. Enter your measurements like weight, blood pressure, and temperature, then click Save.",
        "risk_actions_voice": "Your risk assessment is automatically updated when you add new health records. Follow the recommendations shown to maintain a healthy pregnancy.",
        "pregnancy_actions_voice": "You can update your pregnancy information here. Make sure to enter your due date and current week accurately.",
        "emergency_actions_voice": "If you need immediate help, click the Emergency button. Make sure your emergency contacts are set up in your profile.",
        "general_actions_voice": "Use the menu on the left to navigate to different sections of the app.",
        "playing": "Playing...",
        "stop": "Stop",
        "provider_dashboard_intro": "Welcome to the provider dashboard. Here is your patient overview.",
        "provider_total_patients": "You have",
        "total_patients": "total patients",
        "provider_active_pregnancies": "There are",
        "active_pregnancies": "active pregnancies",
        "provider_upcoming_appointments": "You have",
        "provider_high_risk": "There are",
        "high_risk_patients": "patients with high risk",
        "provider_medium_risk": "",
        "medium_risk_patients": "patients have medium risk",
        "provider_low_risk": "",
        "low_risk_patients": "patients have low risk",
        "provider_actions_voice": "To view patient details, click on any patient card. To see appointments, check the appointments section. To view patient health records, click on the patient name.",
        "government_dashboard_intro": "Welcome to the government dashboard. Here is the regional health overview.",
        "government_total_users": "There are",
        "total_users": "total users in the system",
        "government_active_pregnancies": "There are",
        "government_total_providers": "There are",
        "total_providers": "healthcare providers",
        "government_high_risk": "There are",
        "high_risk_cases": "high risk cases",
        "government_medium_risk": "",
        "medium_risk_cases": "cases have medium risk",
        "government_low_risk": "",
        "low_risk_cases": "cases have low risk",
        "government_actions_voice": "To view regional statistics, select a region from the dropdown. To see detailed analytics, check the charts section. To export data, use the export button.",
        "dashboard_voice_intro_detailed": "Hello! Welcome to your health dashboard. This is where you can see all your pregnancy health information. Let me explain everything to you step by step.",
        "pregnancy_week_voice_detailed": "You are currently in pregnancy week",
        "due_date_voice_detailed": "Your baby is expected to be born on",
        "due_date_past_voice": "Your due date has passed. Please contact your healthcare provider immediately.",
        "no_pregnancy_voice": "You have not added your pregnancy information yet. Please go to the Pregnancy page to add this information.",
        "health_records_count_voice_detailed": "You have recorded",
        "health_records_so_far": "health records so far. This is good! It means you are tracking your health regularly.",
        "latest_measurements_voice_detailed": "Here are your most recent health measurements:",
        "weight_voice_detailed": "Your weight is",
        "kilograms_important": "kilograms. This is important to track to make sure you are gaining weight properly during pregnancy.",
        "bp_voice_detailed": "Your blood pressure is",
        "over_normal": "over",
        "normal_bp_important": "Normal blood pressure is important for a healthy pregnancy.",
        "sugar_voice_detailed": "Your blood sugar level is",
        "sugar_important": "This helps us check if you might have diabetes during pregnancy.",
        "hr_voice_detailed": "Your heart rate is",
        "beats_shows": "beats per minute. This shows how fast your heart is beating.",
        "risk_high_detailed": "IMPORTANT: Your current risk level is HIGH RISK with a score of",
        "percent_see_doctor": "percent. This means you need to see a doctor soon. Please contact your healthcare provider immediately or go to the emergency page if you have severe symptoms.",
        "risk_medium_detailed": "Your current risk level is MEDIUM RISK with a score of",
        "percent_be_careful": "percent. This means you should be careful and follow all recommendations. Make sure to attend all your appointments.",
        "risk_low_detailed": "Your current risk level is LOW RISK with a score of",
        "percent_good_news": "percent. This is good news! Continue to take care of yourself and follow all health recommendations.",
        "no_risk_assessment_voice": "You do not have a risk assessment yet. Please add your health records first, then we can calculate your risk level.",
        "appointments_page_intro_detailed": "This is your appointments page. Here you can see all your doctor appointments and book new ones. Let me explain how to use this page.",
        "appointments_count_voice_detailed": "You have",
        "upcoming_doctor_appointments": "upcoming doctor appointments. It is very important to attend all of these appointments.",
        "next_appointment_voice_detailed": "Your next appointment is on",
        "in_the_morning": "in the morning or afternoon. The appointment is at",
        "please_arrive_on_time": "Please make sure to arrive on time.",
        "no_appointments_voice_detailed": "You do not have any upcoming appointments scheduled. It is important to book an appointment with your doctor. Let me tell you how to book one.",
        "health_records_page_intro_detailed": "This is your health records page. This is where you keep track of all your health measurements like your weight, blood pressure, temperature, and other important numbers.",
        "records_count_voice_detailed": "You have saved",
        "health_records_so_far": "health records so far. This is good! It means you are tracking your health regularly.",
        "latest_record_date_voice": "Your most recent health record was added on",
        "no_records_voice_detailed": "You have not added any health records yet. It is very important to add your health measurements regularly so we can check if you and your baby are healthy. Let me tell you how to add your first health record.",
        "risk_page_intro_detailed": "This is your risk assessment page. This page tells you if you are at low risk, medium risk, or high risk during your pregnancy. This is calculated using your health measurements.",
        "risk_high_detailed_page": "WARNING: Your risk level is HIGH RISK with a score of",
        "percent_very_serious": "percent. This is very serious. You must see a doctor as soon as possible. If you have severe symptoms like severe pain, heavy bleeding, or cannot feel your baby moving, go to the emergency page immediately and tap the emergency button.",
        "risk_medium_detailed_page": "Your risk level is MEDIUM RISK with a score of",
        "percent_be_careful_follow": "percent. This means you need to be careful and follow all instructions from your doctor. Make sure to attend all your appointments and add your health records regularly.",
        "risk_low_detailed_page": "Your risk level is LOW RISK with a score of",
        "percent_good_doing_well": "percent. This is good news! You and your baby are doing well. Continue to take care of yourself, eat healthy food, and follow all health recommendations.",
        "risk_recommendations_voice_detailed": "You have",
        "important_recommendations": "important recommendations to follow. These are instructions to help you have a healthy pregnancy. Please listen to them carefully and follow them.",
        "no_risk_assessment_voice_detailed": "You do not have a risk assessment yet. To get your risk level, you need to add your health records first. Go to the Health Records page and add your measurements like weight, blood pressure, and temperature. After adding records, come back here to see your risk level.",
        "pregnancy_page_intro_detailed": "This is your pregnancy information page. Here you can add or update information about your pregnancy, like when your baby is expected to be born and how many weeks pregnant you are.",
        "pregnancy_info_voice_detailed": "You are currently in week",
        "of_your_pregnancy_weeks": "of your pregnancy. This means you have been pregnant for",
        "weeks": "weeks.",
        "no_pregnancy_info_voice": "You have not added your pregnancy information yet. You need to add this information so we can help you better.",
        "emergency_page_intro_detailed": "This is the emergency page. This page is for when you need help immediately. Only use this if you are having a serious problem.",
        "emergency_symptoms_voice": "You should use the emergency button if you have any of these serious symptoms: severe pain in your stomach or belly, heavy bleeding from your private parts, severe headache that will not go away, you cannot feel your baby moving, you have trouble breathing, you feel very dizzy or faint, or you have a high fever.",
        "emergency_instructions_voice_detailed": "If you have any of these symptoms, look for a big red button on this page that says Emergency or Call for Help. Tap on it immediately. This will send a message to healthcare providers who can help you. Make sure your phone number is correct in your profile so they can call you back.",
        "emergency_contact_voice": "Also make sure you have emergency contact numbers saved. These are phone numbers of people who can help you, like your husband, family member, or neighbor. You can add these in your profile settings.",
        "recommendations_page_intro_detailed": "This is your recommendations page. This page shows you personalized health advice based on your health measurements and risk level. These recommendations are important instructions to help you have a healthy pregnancy.",
        "recommendations_count_voice_detailed": "You have",
        "important_recommendations_follow": "important recommendations to follow. These are instructions made especially for you based on your health. Please read or listen to each one carefully and try to follow them.",
        "no_recommendations_voice": "You do not have any recommendations yet. After you add your health records and get a risk assessment, recommendations will appear here.",
        "action_guidance_intro": "Now, let me tell you exactly what you can do on this page and how to do it step by step.",
        "dashboard_actions_voice_detailed": "On this page, you can see your health information. To book a doctor appointment, look for the word Appointments in the menu on the left side of your screen. Tap or click on it. To add your health measurements like weight and blood pressure, look for Health Records in the same menu and tap on it. If you need help immediately, look for the red Emergency button and tap it.",
        "appointment_actions_voice_detailed": "To book a new doctor appointment, first look for a button that says New Appointment or Add Appointment at the top of this page. Tap on that button. A form will appear. You need to fill in three things: First, choose the date and time for your appointment. Second, type the name of the clinic or hospital. Third, type the address of the clinic. After filling all these, look for a button that says Save or Book Appointment at the bottom and tap it. Your appointment will be saved.",
        "health_records_actions_voice_detailed": "To add your health measurements, look for a button that says Add Record or New Record at the top of this page. Tap on it. A form will appear with many boxes. Fill in each box with your measurements: your weight in kilograms, your blood pressure numbers if you have them, your temperature, your blood sugar if you know it, and your heart rate. After filling all the boxes you can, look for a button that says Save at the bottom and tap it. This will save your health information.",
        "risk_actions_voice_detailed": "Your risk level is calculated automatically when you add health records. This page shows if you are at low, medium, or high risk. If you see High Risk in red, this is very important. You must contact your doctor immediately. Below the risk level, you will see recommendations. These are important instructions for you to follow. Read them carefully or listen to them. If you need to add more health records, go back to the Health Records page.",
        "pregnancy_actions_voice_detailed": "On this page, you can add or update your pregnancy information. You need to enter two important things: First, the date when your baby is expected to be born. This is called your due date. Second, how many weeks pregnant you are right now. After entering these, look for a button that says Save and tap it. Make sure the information is correct because it helps calculate your risk level.",
        "emergency_actions_voice_detailed": "If you are having severe symptoms like severe pain, heavy bleeding, severe headache, or cannot feel your baby moving, you need help immediately. Look for a big red button that says Emergency or Call for Help. Tap on it immediately. This will contact healthcare providers. Also make sure your phone number and emergency contact numbers are saved in your profile so doctors can reach you.",
        "provider_actions_voice_detailed": "As a healthcare provider, you can see all your patients on this page. To see details about a specific patient, tap on their name or their card. To see all appointments, scroll down to the appointments section. To view a patient's health records, tap on the patient's name and then look for Health Records.",
        "government_actions_voice_detailed": "As a government official, you can see health statistics for your region. To see statistics for a specific region, look for a dropdown menu at the top and select a region. To see detailed charts and graphs, scroll down on this page. To download or export this data, look for an Export button.",
        "general_actions_voice_detailed": "To move to different pages in this app, look at the left side of your screen. You will see a menu with different options like Dashboard, Appointments, Health Records, and others. Tap on any of these to go to that page.",
        "action_guidance_closing": "Remember, if you are confused or need help, you can always tap the voice button again to hear these instructions again. Take your time and do not rush.",
        "voice_assistant_description": "I will read all information on this page slowly so you can understand everything.",
        "read_page": "Read Page",
        "pause": "Pause",
        "resume": "Resume",
        "page_content_intro": "Now let me read all the information visible on this page:",
    },
    "ha": {
        "welcome_message": "Barka da zuwa MamaCare AI",
        "health_dashboard": "Dashboard na Lafiya",
        "emergency_button": "Gaggawa",
        "risk_assessment": "Kimanta Hatsari",
        "appointments": "Alkawari",
        "health_records": "Bayanan Lafiya",
        "pregnancy_info": "Bayanan Ciki",
        "save": "Ajiye",
        "cancel": "Soke",
        "delete": "Share",
        "edit": "Gyara",
        "view": "Duba",
        "low_risk": "Hatsari Karami",
        "medium_risk": "Matsakaicin Hatsari",
        "high_risk": "Hatsari Mai Girma",
        "systolic_bp": "Matsin Jini na Systolic",
        "diastolic_bp": "Matsin Jini na Diastolic",
        "blood_sugar": "Sukari a Jini",
        "body_temp": "Zafin Jiki",
        "heart_rate": "Yawan Bugun Zuciya",
        "weight": "Nauyi",
        "bmi": "BMI",
        "voice_assistant": "Mataimakin Murya",
        "play_summary": "Kunna Taƙaitawa",
        "enable_voice": "Kunna Murya",
        "disable_voice": "Kashe Murya",
        "minimize": "Rage",
        "pregnancy_week": "Mako na Ciki",
        "days_remaining": "Kwanaki da suka rage",
        "health_records_count": "Kuna da",
        "latest_measurements": "Ma'aunin ku na baya-bayan nan",
        "kilograms": "kilogiram",
        "blood_pressure": "Matsin Jini",
        "risk_level": "Matsayin haɗarin ku shine",
        "risk_score": "Maki na haɗari",
        "percent": "kashi",
        "voice_summary_closing": "Ka tuna da ƙara bayanan lafiya akai-akai don ingantaccen kimanta haɗari.",
        "no_data_summary": "Babu bayanan lafiya a halin yanzu. Da fatan za a ƙara bayanan ciki da bayanan lafiya.",
        "generating_summary": "Ana samar da taƙaitawa...",
        "beats_per_minute": "bugun a minti",
        "risk_low": "Hatsari Karami",
        "risk_medium": "Matsakaicin Hatsari",
        "risk_high": "Hatsari Mai Girma",
        "welcome_back": "Barka da dawowa",
        "user": "Mai Amfani",
        "dashboard_description": "Kula da lafiyar ciki da kuma bin diddigin alamun muhimmanci.",
        "refresh": "Sabunta",
        "dashboard_voice_intro": "Barka da zuwa dashboard na lafiya. Ga taƙaitaccen bayanin lafiyar ku.",
        "pregnancy_week_voice": "Kuna cikin mako na ciki",
        "due_date_voice": "Haifuwar ku za ta kasance a cikin",
        "days": "kwanaki",
        "health_records_count_voice": "Kuna da",
        "latest_measurements_voice": "Ma'aunin ku na baya-bayan nan sune:",
        "weight_voice": "Nauyi:",
        "kilograms_voice": "kilogiram",
        "bp_voice": "Matsin jini:",
        "over": "sama da",
        "sugar_voice": "Sukari a jini:",
        "hr_voice": "Yawan bugun zuciya:",
        "beats_per_minute_voice": "bugun a minti",
        "risk_summary_voice": "Matsayin haɗarin ku na yanzu shine",
        "risk_score_voice": "Makin haɗarin ku shine",
        "percent_voice": "kashi",
        "appointments_page_intro": "Wannan shafin alkawari ne. A nan za ku iya duba da kuma yin alkawari.",
        "appointments_count_voice": "Kuna da",
        "upcoming_appointments": "alkawari masu zuwa",
        "next_appointment_voice": "Alkawarinku na gaba zai kasance a ranar",
        "at": "a",
        "no_appointments_voice": "Ba ku da wani alkawari mai zuwa.",
        "health_records_page_intro": "Wannan shafin bayanan lafiya ne. A nan za ku iya duba da kuma ƙara ma'aunin lafiyar ku.",
        "records_count_voice": "Kuna da",
        "health_records_voice": "bayanan lafiya",
        "no_records_voice": "Ba ku da wani bayanan lafiya tukuna. Da fatan za a ƙara ma'aunin lafiyar ku.",
        "risk_page_intro": "Wannan shafin kimanta haɗari ne. A nan za ku iya ganin binciken haɗarin ciki.",
        "risk_details_voice": "Matsayin haɗarin ku shine",
        "with_a_score_of": "tare da maki na",
        "risk_recommendations_voice": "Kuna da",
        "recommendations_to_follow": "shawarwari da za ku bi",
        "pregnancy_page_intro": "Wannan shafin bayanan ciki ne.",
        "pregnancy_info_voice": "Kuna cikin mako",
        "of_your_pregnancy": "na cikin ku",
        "emergency_page_intro": "Wannan shafin gaggawa ne. Idan akwai gaggawa, za ku iya kira don taimako a nan.",
        "emergency_instructions_voice": "Idan kuna fuskantar alamun cuta masu tsanani, danna maɓallin gaggawa don tuntuɓar masu kula da lafiya nan take.",
        "recommendations_page_intro": "Wannan shafin shawarwari ne. A nan za ku iya ganin shawarwari na lafiya na musamman.",
        "recommendations_count_voice": "Kuna da",
        "recommendations_voice": "shawarwari",
        "dashboard_actions_voice": "Don yin alkawari, danna maɓallin Alkawari a cikin menu. Don ƙara bayanan lafiya, danna Bayanan Lafiya.",
        "appointment_actions_voice": "Don yin sabon alkawari, danna maɓallin Ƙara Alkawari. Cika ranar, sunan asibiti, da adireshi, sannan danna Ajiye.",
        "health_records_actions_voice": "Don ƙara sabon bayanan lafiya, danna maɓallin Ƙara Bayani. Shigar da ma'aunin ku kamar nauyi, matsin jini, da zafin jiki, sannan danna Ajiye.",
        "risk_actions_voice": "Kimanta haɗarin ku yana sabuntawa kai tsaye lokacin da kuka ƙara sabbin bayanan lafiya. Bi shawarwarin da aka nuna don kiyaye ciki mai lafiya.",
        "pregnancy_actions_voice": "Za ku iya sabunta bayanan cikin ku a nan. Tabbatar cewa kun shigar da ranar haihuwa da mako na yanzu daidai.",
        "emergency_actions_voice": "Idan kuna buƙatar taimako nan take, danna maɓallin Gaggawa. Tabbatar cewa an saita lambobin gaggawa a cikin bayanin ku.",
        "general_actions_voice": "Yi amfani da menu a hagu don kewaya zuwa sassan daban-daban na app.",
        "playing": "Ana kunnawa...",
        "stop": "Tsaya",
        "dashboard_voice_intro_detailed": "Sannu! Barka da zuwa dashboard na lafiya. Wannan shi ne wurin da za ku iya ganin duk bayanan lafiyar ciki. Bari in bayyana komai a hankali.",
        "pregnancy_week_voice_detailed": "Kuna cikin mako na ciki",
        "due_date_voice_detailed": "Ana tsammanin haifuwar ku za ta kasance a ranar",
        "due_date_past_voice": "Ranar haihuwa ta wuce. Da fatan za a tuntuɓi mai kula da lafiyar ku nan take.",
        "no_pregnancy_voice": "Ba ku ƙara bayanan ciki ba tukuna. Da fatan za a je shafin Ciki don ƙara wannan bayani.",
        "health_records_count_voice_detailed": "Kun rubuta",
        "health_records_so_far": "bayanan lafiya har yanzu. Wannan yana da kyau! Yana nufin kuna bin diddigin lafiyar ku akai-akai.",
        "latest_measurements_voice_detailed": "Ga ma'aunin ku na baya-bayan nan:",
        "weight_voice_detailed": "Nauyin ku shine",
        "kilograms_important": "kilogiram. Wannan yana da mahimmanci don tabbatar cewa kuna samun nauyi yadda ya kamata yayin ciki.",
        "bp_voice_detailed": "Matsin jinin ku shine",
        "over_normal": "sama da",
        "normal_bp_important": "Matsin jini na yau da kullun yana da mahimmanci don ciki mai lafiya.",
        "sugar_voice_detailed": "Matsayin sukari a jinin ku shine",
        "sugar_important": "Wannan yana taimaka mana duba idan kuna da ciwon sukari yayin ciki.",
        "hr_voice_detailed": "Yawan bugun zuciyar ku shine",
        "beats_shows": "bugun a minti. Wannan yana nuna yadda zuciyar ku ke bugawa.",
        "risk_high_detailed": "MUHIMMI: Matsayin haɗarin ku na yanzu shine HATSARI MAI GIRMA tare da maki na",
        "percent_see_doctor": "kashi. Wannan yana nufin kuna buƙatar ganin likita nan ba da jimawa ba. Da fatan za a tuntuɓi mai kula da lafiyar ku nan take ko ku je shafin gaggawa idan kuna da alamun cuta masu tsanani.",
        "risk_medium_detailed": "Matsayin haɗarin ku na yanzu shine MATSAKAICIN HATSARI tare da maki na",
        "percent_be_careful": "kashi. Wannan yana nufin ya kamata ku yi hankali kuma ku bi duk shawarwari. Tabbatar cewa kuna halartar duk alkawarinku.",
        "risk_low_detailed": "Matsayin haɗarin ku na yanzu shine HATSARI KARAMI tare da maki na",
        "percent_good_news": "kashi. Wannan labari ne mai kyau! Ci gaba da kula da kanku kuma ku bi duk shawarwarin lafiya.",
        "no_risk_assessment_voice": "Ba ku da kimanta haɗari tukuna. Da fatan za a ƙara bayanan lafiyar ku da farko, sannan za mu iya ƙididdige matakin haɗarin ku.",
        "appointments_page_intro_detailed": "Wannan shafin alkawari ne. A nan za ku iya ganin duk alkawarinku na likita da kuma yin sabon alkawari. Bari in bayyana yadda ake amfani da wannan shafi.",
        "appointments_count_voice_detailed": "Kuna da",
        "upcoming_doctor_appointments": "alkawari na likita masu zuwa. Yana da mahimmanci sosai ku halarci duk waɗannan alkawari.",
        "next_appointment_voice_detailed": "Alkawarinku na gaba zai kasance a ranar",
        "in_the_morning": "da safe ko da yamma. Alkawari zai kasance a",
        "please_arrive_on_time": "Da fatan za a zo daidai lokaci.",
        "no_appointments_voice_detailed": "Ba ku da wani alkawari mai zuwa da aka tsara. Yana da mahimmanci ku yi alkawari tare da likitan ku. Bari in gaya muku yadda ake yin alkawari.",
        "health_records_page_intro_detailed": "Wannan shafin bayanan lafiya ne. Wannan shi ne wurin da za ku iya bin diddigin duk ma'aunin lafiyar ku kamar nauyin ku, matsin jini, zafin jiki, da sauran lambobi masu mahimmanci.",
        "records_count_voice_detailed": "Kun adana",
        "latest_record_date_voice": "Bayanan lafiyar ku na baya-bayan nan an ƙara su a ranar",
        "no_records_voice_detailed": "Ba ku ƙara wani bayanan lafiya ba tukuna. Yana da mahimmanci sosai ku ƙara ma'aunin lafiyar ku akai-akai don mu iya duba idan ku da jaririn ku suna lafiya. Bari in gaya muku yadda za ku ƙara bayanan lafiyar ku na farko.",
        "risk_page_intro_detailed": "Wannan shafin kimanta haɗari ne. Wannan shafi yana gaya muku idan kuna cikin haɗari ƙarami, matsakaici, ko mai girma yayin ciki. Ana ƙididdige wannan ta amfani da ma'aunin lafiyar ku.",
        "risk_high_detailed_page": "GARGADI: Matsayin haɗarin ku shine HATSARI MAI GIRMA tare da maki na",
        "percent_very_serious": "kashi. Wannan yana da mahimmanci sosai. Dole ne ku ganin likita nan ba da jimawa ba. Idan kuna da alamun cuta masu tsanani kamar ciwo mai tsanani, zubar jini mai yawa, ko ba za ku iya jin jaririn ku yana motsi ba, je shafin gaggawa nan take kuma danna maɓallin gaggawa.",
        "risk_medium_detailed_page": "Matsayin haɗarin ku shine MATSAKAICIN HATSARI tare da maki na",
        "percent_be_careful_follow": "kashi. Wannan yana nufin kuna buƙatar yin hankali kuma ku bi duk umarnin daga likitan ku. Tabbatar cewa kuna halartar duk alkawarinku kuma kuna ƙara bayanan lafiyar ku akai-akai.",
        "risk_low_detailed_page": "Matsayin haɗarin ku shine HATSARI KARAMI tare da maki na",
        "percent_good_doing_well": "kashi. Wannan labari ne mai kyau! Ku da jaririn ku suna da kyau. Ci gaba da kula da kanku, ku ci abinci mai gina jiki, kuma ku bi duk shawarwarin lafiya.",
        "risk_recommendations_voice_detailed": "Kuna da",
        "important_recommendations": "shawarwari masu mahimmanci da za ku bi. Waɗannan umarni ne don taimaka muku samun ciki mai lafiya. Da fatan za a saurara su a hankali kuma ku bi su.",
        "no_risk_assessment_voice_detailed": "Ba ku da kimanta haɗari tukuna. Don samun matakin haɗarin ku, kuna buƙatar ƙara bayanan lafiyar ku da farko. Je shafin Bayanan Lafiya kuma ƙara ma'aunin ku kamar nauyi, matsin jini, da zafin jiki. Bayan ƙara bayanai, ku dawo nan don ganin matakin haɗarin ku.",
        "pregnancy_page_intro_detailed": "Wannan shafin bayanan ciki ne. A nan za ku iya ƙara ko sabunta bayanan ciki, kamar ranar da ake tsammanin jaririn ku za a haife shi da kuma yawan makon ciki.",
        "pregnancy_info_voice_detailed": "Kuna cikin mako",
        "of_your_pregnancy_weeks": "na cikin ku. Wannan yana nufin kun kasance ciki na",
        "weeks": "makonni.",
        "no_pregnancy_info_voice": "Ba ku ƙara bayanan ciki ba tukuna. Kuna buƙatar ƙara wannan bayani don mu iya taimaka muku da kyau.",
        "emergency_page_intro_detailed": "Wannan shafin gaggawa ne. Wannan shafi ne don lokacin da kuke buƙatar taimako nan take. Yi amfani da wannan kawai idan kuna da matsala mai mahimmanci.",
        "emergency_symptoms_voice": "Ya kamata ku yi amfani da maɓallin gaggawa idan kuna da ɗaya daga cikin waɗannan alamun cuta masu tsanani: ciwo mai tsanani a ciki ko ciki, zubar jini mai yawa daga sassan jikinku, ciwon kai mai tsanani wanda ba zai tafi ba, ba za ku iya jin jaririn ku yana motsi ba, kuna da matsalar numfashi, kuna ji gajiya ko suma, ko kuna da zazzabi mai yawa.",
        "emergency_instructions_voice_detailed": "Idan kuna da ɗaya daga cikin waɗannan alamun cuta, nemo maɓalli mai ja mai girma a wannan shafi wanda ya ce Gaggawa ko Kira don Taimako. Danna shi nan take. Wannan zai aika saƙo zuwa masu kula da lafiya waɗanda za su iya taimaka muku. Tabbatar cewa lambar wayar ku tana daidai a cikin bayanin ku don su iya kiran ku.",
        "emergency_contact_voice": "Hakanan tabbatar cewa kuna da lambobin gaggawa da aka adana. Waɗannan lambobin waya ne na mutane waɗanda za su iya taimaka muku, kamar mijin ku, ɗan uwa, ko makwabci. Za ku iya ƙara waɗannan a cikin saitunan bayanin ku.",
        "recommendations_page_intro_detailed": "Wannan shafin shawarwari ne. Wannan shafi yana nuna muku shawarwari na lafiya na musamman bisa ma'aunin lafiyar ku da matakin haɗari. Waɗannan shawarwari umarni ne masu mahimmanci don taimaka muku samun ciki mai lafiya.",
        "recommendations_count_voice_detailed": "Kuna da",
        "important_recommendations_follow": "shawarwari masu mahimmanci da za ku bi. Waɗannan umarni ne da aka yi musamman don ku bisa lafiyar ku. Da fatan za a karanta ko saurara kowannensu a hankali kuma ku yi ƙoƙarin bin su.",
        "no_recommendations_voice": "Ba ku da wani shawarwari tukuna. Bayan ku ƙara bayanan lafiyar ku kuma ku sami kimanta haɗari, shawarwari za su bayyana a nan.",
        "action_guidance_intro": "Yanzu, bari in gaya muku daidai abin da za ku iya yi a wannan shafi da kuma yadda za ku yi shi mataki-mataki.",
        "dashboard_actions_voice_detailed": "A wannan shafi, za ku iya ganin bayanan lafiyar ku. Don yin alkawari na likita, nemo kalmar Alkawari a cikin menu a gefen hagu na allon ku. Danna ko latsa shi. Don ƙara ma'aunin lafiyar ku kamar nauyi da matsin jini, nemo Bayanan Lafiya a cikin menu ɗaya kuma danna shi. Idan kuna buƙatar taimako nan take, nemo maɓallin ja na Gaggawa kuma danna shi.",
        "appointment_actions_voice_detailed": "Don yin sabon alkawari na likita, da farko nemo maɓalli wanda ya ce Sabon Alkawari ko Ƙara Alkawari a saman wannan shafi. Danna wannan maɓalli. Fom ɗin zai bayyana. Kuna buƙatar cika abubuwa uku: Na farko, zaɓi ranar da lokacin alkawarinku. Na biyu, rubuta sunan asibiti ko dakin kwana. Na uku, rubuta adireshin asibiti. Bayan cika duk waɗannan, nemo maɓalli wanda ya ce Ajiye ko Alkawari a ƙasa kuma danna shi. Alkawarinku zai kasance.",
        "health_records_actions_voice_detailed": "Don ƙara ma'aunin lafiyar ku, nemo maɓalli wanda ya ce Ƙara Bayani ko Sabon Bayani a saman wannan shafi. Danna shi. Fom ɗin zai bayyana tare da akwatuna da yawa. Cika kowane akwati da ma'aunin ku: nauyin ku a cikin kilogiram, lambobin matsin jini idan kuna da su, zafin jikinku, sukari a jini idan kun san shi, da yawan bugun zuciya. Bayan cika duk akwatunan da za ku iya, nemo maɓalli wanda ya ce Ajiye a ƙasa kuma danna shi. Wannan zai adana bayanan lafiyar ku.",
        "risk_actions_voice_detailed": "Ana ƙididdige matakin haɗarin ku kai tsaye lokacin da kuka ƙara bayanan lafiya. Wannan shafi yana nuna idan kuna cikin haɗari ƙarami, matsakaici, ko mai girma. Idan kun ga Hatsari Mai Girma a ja, wannan yana da mahimmanci sosai. Dole ne ku tuntuɓi likitan ku nan take. Ƙarƙashin matakin haɗari, za ku ga shawarwari. Waɗannan umarni ne masu mahimmanci don ku bi. Karanta su a hankali ko saurara su. Idan kuna buƙatar ƙara ƙarin bayanan lafiya, koma shafin Bayanan Lafiya.",
        "pregnancy_actions_voice_detailed": "A wannan shafi, za ku iya ƙara ko sabunta bayanan ciki. Kuna buƙatar shigar da abubuwa biyu masu mahimmanci: Na farko, ranar da ake tsammanin jaririn ku za a haife shi. Wannan ana kiransa ranar haihuwa. Na biyu, yawan makon ciki da kuke ciki a yanzu. Bayan shigar da waɗannan, nemo maɓalli wanda ya ce Ajiye kuma danna shi. Tabbatar cewa bayanin yana daidai saboda yana taimaka ƙididdige matakin haɗarin ku.",
        "emergency_actions_voice_detailed": "Idan kuna da alamun cuta masu tsanani kamar ciwo mai tsanani, zubar jini mai yawa, ciwon kai mai tsanani, ko ba za ku iya jin jaririn ku yana motsi ba, kuna buƙatar taimako nan take. Nemo maɓalli mai ja mai girma wanda ya ce Gaggawa ko Kira don Taimako. Danna shi nan take. Wannan zai tuntuɓi masu kula da lafiya. Hakanan tabbatar cewa lambar wayar ku da lambobin lambobin gaggawa an adana su a cikin bayanin ku don likitoci su iya isa gare ku.",
        "provider_actions_voice_detailed": "A matsayin mai kula da lafiya, za ku iya ganin duk majinyatanku a wannan shafi. Don ganin cikakkun bayanai game da majinyaci na musamman, danna sunansu ko katin su. Don ganin duk alkawari, nemo sashin alkawari. Don duba bayanan lafiyar majinyaci, danna sunan majinyaci sannan nemo Bayanan Lafiya.",
        "government_actions_voice_detailed": "A matsayin jami'in gwamnati, za ku iya ganin ƙididdigar lafiya don yankin ku. Don ganin ƙididdiga don yanki na musamman, nemo menu dropdown a saman kuma zaɓi yanki. Don ganin cikakkun ginshiƙai da zane-zane, nemo ƙasa a wannan shafi. Don saukewa ko fitar da wannan data, nemo maɓallin Fitarwa.",
        "general_actions_voice_detailed": "Don motsawa zuwa shafuka daban-daban a cikin wannan app, duba gefen hagu na allon ku. Za ku ga menu tare da zaɓuɓɓuka daban-daban kamar Dashboard, Alkawari, Bayanan Lafiya, da sauransu. Danna kowane ɗayan waɗannan don zuwa wannan shafi.",
        "action_guidance_closing": "Ka tuna, idan kun ruɗe ko kuna buƙatar taimako, koyaushe za ku iya danna maɓallin murya kuma don sake jin waɗannan umarni. Yi lokaci kuma kada ku yi gaggawa.",
        "provider_dashboard_intro": "Barka da zuwa dashboard na mai kula da lafiya. Ga bayanin majinyata.",
        "provider_total_patients": "Kuna da",
        "total_patients": "majinyata gabaɗaya",
        "provider_active_pregnancies": "Akwai",
        "active_pregnancies": "ciki masu aiki",
        "provider_upcoming_appointments": "Kuna da",
        "provider_high_risk": "Akwai",
        "high_risk_patients": "majinyata masu haɗari mai girma",
        "provider_medium_risk": "",
        "medium_risk_patients": "majinyata suna da matsakaicin haɗari",
        "provider_low_risk": "",
        "low_risk_patients": "majinyata suna da haɗari ƙarami",
        "provider_actions_voice": "Don duba cikakkun bayanan majinyaci, danna katin majinyaci. Don ganin alkawari, duba sashin alkawari. Don duba bayanan lafiyar majinyaci, danna sunan majinyaci.",
        "government_dashboard_intro": "Barka da zuwa dashboard na gwamnati. Ga bayanin lafiyar yanki.",
        "government_total_users": "Akwai",
        "total_users": "masu amfani gabaɗaya a cikin tsarin",
        "government_active_pregnancies": "Akwai",
        "government_total_providers": "Akwai",
        "total_providers": "masu kula da lafiya",
        "government_high_risk": "Akwai",
        "high_risk_cases": "lamura masu haɗari mai girma",
        "government_medium_risk": "",
        "medium_risk_cases": "lamura suna da matsakaicin haɗari",
        "government_low_risk": "",
        "low_risk_cases": "lamura suna da haɗari ƙarami",
        "government_actions_voice": "Don duba ƙididdigar yanki, zaɓi yanki daga dropdown. Don ganin cikakkun bayanai, duba sashin ginshiƙai. Don fitar da bayanai, yi amfani da maɓallin fitarwa.",
    },
    "yo": {
        "welcome_message": "Kaabo si MamaCare AI",
        "health_dashboard": "Dashboard Ilera",
        "emergency_button": "Ipele",
        "risk_assessment": "Idiwon Ewu",
        "appointments": "Ifiranse",
        "health_records": "Iwe Ilera",
        "pregnancy_info": "Alaye Iyara",
        "save": "Fi pamọ",
        "cancel": "Fagilee",
        "delete": "Paarẹ",
        "edit": "Ṣatunkọ",
        "view": "Wo",
        "low_risk": "Ewu Kekere",
        "medium_risk": "Ewu Aarin",
        "high_risk": "Ewu Nla",
        "systolic_bp": "Eje Systolic",
        "diastolic_bp": "Eje Diastolic",
        "blood_sugar": "Suga ninu Eje",
        "body_temp": "Ooru Ara",
        "heart_rate": "Iye Ika Okan",
        "weight": "Iwọn",
        "bmi": "BMI",
        "voice_assistant": "Oluranṣẹ Ohun",
        "play_summary": "Ṣe Akojọpọ",
        "enable_voice": "Mu Ohun",
        "disable_voice": "Pa Ohun",
        "minimize": "Dinku",
        "pregnancy_week": "Oṣu Iyara",
        "days_remaining": "Ọjọ ti o ku",
        "health_records_count": "O ni",
        "latest_measurements": "Awọn iwọn rẹ tuntun",
        "kilograms": "kilogramu",
        "blood_pressure": "Eje",
        "risk_level": "Ipele ewu rẹ jẹ",
        "risk_score": "Apejuwe ewu",
        "percent": "ọdọrun",
        "voice_summary_closing": "Ranti lati fi awọn iwe ilera rẹ kun ni igba gbogbo fun idanwo ewu to tọ.",
        "no_data_summary": "Ko si data ilera sibẹ sibẹ. Jọwọ fi alaye iyara rẹ ati awọn iwe ilera kun.",
        "generating_summary": "Ṣiṣẹda akojọpọ...",
        "beats_per_minute": "lu ni iṣẹju kan",
        "risk_low": "Ewu Kekere",
        "risk_medium": "Ewu Aarin",
        "risk_high": "Ewu Nla",
        "welcome_back": "Kaabo pada",
        "user": "Olumulo",
        "dashboard_description": "Ṣe ayẹwo ilera iyara rẹ ati tọpinpin awọn ami pataki.",
        "refresh": "Tun",
        "dashboard_voice_intro": "Kaabo si dashboard ilera rẹ. Eyi ni akojọpọ ilera rẹ.",
        "pregnancy_week_voice": "O wa ni oṣu iyara",
        "due_date_voice": "Omo rẹ yoo wa ni",
        "days": "ọjọ",
        "health_records_count_voice": "O ni",
        "latest_measurements_voice": "Awọn iwọn rẹ tuntun ni:",
        "weight_voice": "Iwọn:",
        "kilograms_voice": "kilogramu",
        "bp_voice": "Eje:",
        "over": "ju",
        "sugar_voice": "Suga ninu eje:",
        "hr_voice": "Iye ika okan:",
        "beats_per_minute_voice": "lu ni iṣẹju kan",
        "risk_summary_voice": "Ipele ewu rẹ lọwọlọwọ jẹ",
        "risk_score_voice": "Apejuwe ewu rẹ jẹ",
        "percent_voice": "ọdọrun",
        "appointments_page_intro": "Eyi ni oju-iwe ifiranse rẹ. Nibi o le wo ati ṣe ifiranse.",
        "appointments_count_voice": "O ni",
        "upcoming_appointments": "ifiranse ti n bọ",
        "next_appointment_voice": "Ifiranse rẹ ti n bọ yoo wa ni ọjọ",
        "at": "ni",
        "no_appointments_voice": "O ko ni eyikeyi ifiranse ti n bọ.",
        "health_records_page_intro": "Eyi ni oju-iwe iwe ilera rẹ. Nibi o le wo ati fi awọn iwọn ilera rẹ kun.",
        "records_count_voice": "O ni",
        "health_records_voice": "iwe ilera",
        "no_records_voice": "O ko ni eyikeyi iwe ilera sibẹ sibẹ. Jọwọ fi awọn iwọn ilera rẹ kun.",
        "risk_page_intro": "Eyi ni oju-iwe idiwon ewu rẹ. Nibi o le wo iṣiro ewu iyara rẹ.",
        "risk_details_voice": "Ipele ewu rẹ jẹ",
        "with_a_score_of": "pẹlu apejuwe ti",
        "risk_recommendations_voice": "O ni",
        "recommendations_to_follow": "imọran lati tẹle",
        "pregnancy_page_intro": "Eyi ni oju-iwe alaye iyara rẹ.",
        "pregnancy_info_voice": "O wa ni oṣu",
        "of_your_pregnancy": "ti iyara rẹ",
        "emergency_page_intro": "Eyi ni oju-iwe ipele. Ni ipo ipele, o le pe fun iranlọwọ nibi.",
        "emergency_instructions_voice": "Ti o ba n pade awọn ami aisan ti o lagbara, tẹ bọtini ipele lati kan si awọn oluranṣẹ ilera ni kete.",
        "recommendations_page_intro": "Eyi ni oju-iwe imọran rẹ. Nibi o le wo awọn imọran ilera ti o jẹ ara ẹni.",
        "recommendations_count_voice": "O ni",
        "recommendations_voice": "imọran",
        "dashboard_actions_voice": "Lati ṣe ifiranse, tẹ bọtini Ifiranse ni menu. Lati fi iwe ilera kun, tẹ Iwe Ilera.",
        "appointment_actions_voice": "Lati ṣe ifiranse tuntun, tẹ bọtini Fi Ifiranse Kun. Fi ọjọ, orukọ ile-iwosan, ati adirẹsi kun, lẹhinna tẹ Fi pamọ.",
        "health_records_actions_voice": "Lati fi iwe ilera tuntun kun, tẹ bọtini Fi Iwe Kun. Tẹ awọn iwọn rẹ bi iwọn, eje, ati otutu, lẹhinna tẹ Fi pamọ.",
        "risk_actions_voice": "Idiwon ewu rẹ n ṣe imudojuiwọn laifọwọyi nigba ti o ba fi awọn iwe ilera tuntun kun. Tẹle awọn imọran ti a fi han lati ṣe iyara alara.",
        "pregnancy_actions_voice": "O le ṣe imudojuiwọn alaye iyara rẹ nibi. Rii daju pe o ti tẹ ọjọ ibi ati oṣu lọwọlọwọ ni deede.",
        "emergency_actions_voice": "Ti o ba nilo iranlọwọ ni kete, tẹ bọtini Ipele. Rii daju pe o ti ṣeto awọn olubasọrọ ipele ni profaili rẹ.",
        "general_actions_voice": "Lo menu ni apa osi lati rin irin ajo si awọn apakan oriṣiriṣi ti app.",
        "playing": "N ṣe...",
        "stop": "Duro",
        "provider_dashboard_intro": "Kaabo si dashboard oluranṣẹ. Eyi ni awoye awọn alaisan.",
        "provider_total_patients": "O ni",
        "total_patients": "awọn alaisan lapapọ",
        "provider_active_pregnancies": "Nibẹ ni",
        "active_pregnancies": "awọn iyara ti n ṣiṣẹ",
        "provider_upcoming_appointments": "O ni",
        "provider_high_risk": "Nibẹ ni",
        "high_risk_patients": "awọn alaisan pẹlu ewu nla",
        "provider_medium_risk": "",
        "medium_risk_patients": "awọn alaisan ni ewu aarin",
        "provider_low_risk": "",
        "low_risk_patients": "awọn alaisan ni ewu kekere",
        "provider_actions_voice": "Lati wo awọn alaye alaisan, tẹ kaadi alaisan eyikeyi. Lati wo awọn ifiranse, ṣayẹwo apakan ifiranse. Lati wo awọn iwe ilera alaisan, tẹ orukọ alaisan.",
        "government_dashboard_intro": "Kaabo si dashboard ijọba. Eyi ni awoye ilera agbegbe.",
        "government_total_users": "Nibẹ ni",
        "total_users": "awọn olumulo lapapọ ninu eto",
        "government_active_pregnancies": "Nibẹ ni",
        "government_total_providers": "Nibẹ ni",
        "total_providers": "awọn oluranṣẹ ilera",
        "government_high_risk": "Nibẹ ni",
        "high_risk_cases": "awọn ẹjọ pẹlu ewu nla",
        "government_medium_risk": "",
        "medium_risk_cases": "awọn ẹjọ ni ewu aarin",
        "government_low_risk": "",
        "low_risk_cases": "awọn ẹjọ ni ewu kekere",
        "government_actions_voice": "Lati wo awọn iṣiro agbegbe, yan agbegbe lati dropdown. Lati wo awọn iṣiro to ṣe pataki, ṣayẹwo apakan awọn siwaji. Lati jade data, lo bọtini jade.",
    },
    "ig": {
        "welcome_message": "Nnọọ na MamaCare AI",
        "health_dashboard": "Dashboard Ahụike",
        "emergency_button": "Mberede",
        "risk_assessment": "Ntụle Ihe Ize",
        "appointments": "Oge Nzukọ",
        "health_records": "Ihe Ndekọ Ahụike",
        "pregnancy_info": "Ozi Ime Imụ",
        "save": "Chekwaa",
        "cancel": "Kagbuo",
        "delete": "Hichapụ",
        "edit": "Dezie",
        "view": "Lelee",
        "low_risk": "Ihe Ize Dị Ala",
        "medium_risk": "Ihe Ize Nkezi",
        "high_risk": "Ihe Ize Dị Elu",
        "systolic_bp": "Ọbara Systolic",
        "diastolic_bp": "Ọbara Diastolic",
        "blood_sugar": "Shuga n'Ọbara",
        "body_temp": "Okpomọkụ Ahụ",
        "heart_rate": "Ọnụọgụgụ Obi",
        "weight": "Ibu",
        "bmi": "BMI",
        "voice_assistant": "Onye Enyemaka Olu",
        "play_summary": "Kpọọ Nchịkọta",
        "enable_voice": "Gbaa Olu",
        "disable_voice": "Gbanyụọ Olu",
        "minimize": "Belata",
        "pregnancy_week": "Izu Ime",
        "days_remaining": "Ụbọchị fọdụrụ",
        "health_records_count": "Ị nwere",
        "latest_measurements": "Ntụle gị kacha ọhụrụ",
        "kilograms": "kilogram",
        "blood_pressure": "Ọbara",
        "risk_level": "Ọkwa ihe ize ndụ gị bụ",
        "risk_score": "Akara ihe ize ndụ",
        "percent": "pasentị",
        "voice_summary_closing": "Cheta ịtinye ndekọ ahụike gị mgbe niile maka nyocha ihe ize ndụ ziri ezi.",
        "no_data_summary": "Enweghị data ahụike ugbu a. Biko tinye ozi ime imụ gị na ndekọ ahụike.",
        "generating_summary": "Na-emepụta nchịkọta...",
        "beats_per_minute": "kụrụ kwa nkeji",
        "risk_low": "Ihe Ize Dị Ala",
        "risk_medium": "Ihe Ize Nkezi",
        "risk_high": "Ihe Ize Dị Elu",
        "welcome_back": "Nnọọ azụ",
        "user": "Onye ọrụ",
        "dashboard_description": "Nyochaa ahụike ime imụ gị ma soro akara ndị dị mkpa.",
        "refresh": "Megharia",
        "dashboard_voice_intro": "Nnọọ na dashboard ahụike gị. Nke a bụ nchịkọta ahụike gị.",
        "pregnancy_week_voice": "Ị nọ n'izu ime",
        "due_date_voice": "Nwa gị ga-abịa n'ime",
        "days": "ụbọchị",
        "health_records_count_voice": "Ị nwere",
        "latest_measurements_voice": "Ntụle gị kacha ọhụrụ bụ:",
        "weight_voice": "Ibu:",
        "kilograms_voice": "kilogram",
        "bp_voice": "Ọbara:",
        "over": "karịa",
        "sugar_voice": "Shuga n'ọbara:",
        "hr_voice": "Ọnụọgụgụ obi:",
        "beats_per_minute_voice": "kụrụ kwa nkeji",
        "risk_summary_voice": "Ọkwa ihe ize ndụ gị ugbu a bụ",
        "risk_score_voice": "Akara ihe ize ndụ gị bụ",
        "percent_voice": "pasentị",
        "appointments_page_intro": "Nke a bụ ibe oge nzukọ gị. Ebe a ị nwere ike ịhụ ma ịhazi oge nzukọ.",
        "appointments_count_voice": "Ị nwere",
        "upcoming_appointments": "oge nzukọ na-abịa",
        "next_appointment_voice": "Oge nzukọ gị na-esote ga-abụ na",
        "at": "na",
        "no_appointments_voice": "Ị nweghị oge nzukọ ọ bụla na-abịa.",
        "health_records_page_intro": "Nke a bụ ibe ndekọ ahụike gị. Ebe a ị nwere ike ịhụ ma ịgbakwunye ntụle ahụike gị.",
        "records_count_voice": "Ị nwere",
        "health_records_voice": "ndekọ ahụike",
        "no_records_voice": "Ị nweghị ndekọ ahụike ọ bụla ma. Biko tinye ntụle ahụike gị.",
        "risk_page_intro": "Nke a bụ ibe nyocha ihe ize ndụ gị. Ebe a ị nwere ike ịhụ nyocha ihe ize ndụ ime imụ gị.",
        "risk_details_voice": "Ọkwa ihe ize ndụ gị bụ",
        "with_a_score_of": "nwere akara nke",
        "risk_recommendations_voice": "Ị nwere",
        "recommendations_to_follow": "ndụmọdụ ị ga-agbaso",
        "pregnancy_page_intro": "Nke a bụ ibe ozi ime imụ gị.",
        "pregnancy_info_voice": "Ị nọ n'izu",
        "of_your_pregnancy": "nke ime imụ gị",
        "emergency_page_intro": "Nke a bụ ibe mberede. Ọ bụrụ na enwere mberede, ị nwere ike ịkpọ maka enyemaka ebe a.",
        "emergency_instructions_voice": "Ọ bụrụ na ị na-enwe mgbaàmà siri ike, pịa bọtịnụ mberede iji kpọtụrụ ndị na-ahụ maka ahụike ozugbo.",
        "recommendations_page_intro": "Nke a bụ ibe ndụmọdụ gị. Ebe a ị nwere ike ịhụ ndụmọdụ ahụike ahaziri maka gị.",
        "recommendations_count_voice": "Ị nwere",
        "recommendations_voice": "ndụmọdụ",
        "dashboard_actions_voice": "Iji hazie oge nzukọ, pịa bọtịnụ Oge Nzukọ na menu. Iji tinye ndekọ ahụike, pịa Ndekọ Ahụike.",
        "appointment_actions_voice": "Iji hazie oge nzukọ ọhụrụ, pịa bọtịnụ Tinye Oge Nzukọ. Jupụta ụbọchị, aha ụlọ ọgwụ, na adreesị, wee pịa Chekwaa.",
        "health_records_actions_voice": "Iji tinye ndekọ ahụike ọhụrụ, pịa bọtịnụ Tinye Ndekọ. Tinye ntụle gị dị ka ibu, ọbara, na okpomọkụ, wee pịa Chekwaa.",
        "risk_actions_voice": "Nyocha ihe ize ndụ gị na-emelite na-akpaghị aka mgbe ị na-agbakwunye ndekọ ahụike ọhụrụ. Soro ndụmọdụ egosiri iji nọgide na-enwe ime imụ dị mma.",
        "pregnancy_actions_voice": "Ị nwere ike imelite ozi ime imụ gị ebe a. Gbaa mbọ hụ na ị tinyere ụbọchị a ga-amụ nwa na izu dị ugbu a n'ụzọ ziri ezi.",
        "emergency_actions_voice": "Ọ bụrụ na ịchọrọ enyemaka ozugbo, pịa bọtịnụ Mberede. Gbaa mbọ hụ na e debere kọntaktị mberede gị na profaịlụ gị.",
        "general_actions_voice": "Jiri menu n'aka ekpe iji gaa na ngalaba dị iche iche nke ngwa.",
        "playing": "Na-egwu...",
        "stop": "Kwụsị",
        "dashboard_voice_intro_detailed": "Nnọọ! Nnọọ na dashboard ahụike gị. Nke a bụ ebe ị nwere ike ịhụ ozi ahụike ime imụ gị niile. Ka m kọwaara gị ihe niile nke ọma.",
        "pregnancy_week_voice_detailed": "Ị nọ ugbu a n'izu ime",
        "due_date_voice_detailed": "A na-atụ anya na a ga-amụ nwa gị n'ụbọchị",
        "due_date_past_voice": "Ụbọchị a ga-amụ nwa gị agafeela. Biko kpọtụrụ onye na-ahụ maka ahụike gị ozugbo.",
        "no_pregnancy_voice": "Ị kabeghị ozi ime imụ gị. Biko gaa na ibe Ime Imụ iji tinye ozi a.",
        "health_records_count_voice_detailed": "Ị dekọọla",
        "health_records_so_far": "ndekọ ahụike ruo ugbu a. Nke a dị mma! Ọ pụtara na ị na-enyocha ahụike gị mgbe niile.",
        "latest_measurements_voice_detailed": "Nke a bụ nha ahụike gị kacha ọhụrụ:",
        "weight_voice_detailed": "Ibu gị bụ",
        "kilograms_important": "kilogram. Nke a dị mkpa iji soro iji hụ na ị na-ebuli ibu nke ọma n'oge ime imụ.",
        "bp_voice_detailed": "Ọbara gị bụ",
        "over_normal": "karịa",
        "normal_bp_important": "Ọbara nkịtị dị mkpa maka ime imụ dị mma.",
        "sugar_voice_detailed": "Ọkwa shuga n'ọbara gị bụ",
        "sugar_important": "Nke a na-enyere anyị aka ịchọpụta ma ị nwere ọrịa shuga n'oge ime imụ.",
        "hr_voice_detailed": "Ọnụọgụgụ obi gị bụ",
        "beats_shows": "kụrụ kwa nkeji. Nke a na-egosi ngwa ngwa obi gị na-akụ.",
        "risk_high_detailed": "DỊ MKPA: Ọkwa ihe ize ndụ gị ugbu a bụ IHE IZE NDỤ DỊ ELU na akara nke",
        "percent_see_doctor": "pasentị. Nke a pụtara na ị chọrọ ịhụ dọkịta ngwa ngwa. Biko kpọtụrụ onye na-ahụ maka ahụike gị ozugbo ma ọ bụ gaa na ibe mberede ma ọ bụrụ na ị nwere mgbaàmà siri ike.",
        "risk_medium_detailed": "Ọkwa ihe ize ndụ gị ugbu a bụ IHE IZE NDỤ NKEZI na akara nke",
        "percent_be_careful": "pasentị. Nke a pụtara na ị kwesịrị ịkpachara anya ma soro ndụmọdụ niile. Gbaa mbọ hụ na ị na-abịa na oge nzukọ gị niile.",
        "risk_low_detailed": "Ọkwa ihe ize ndụ gị ugbu a bụ IHE IZE NDỤ DỊ ALA na akara nke",
        "percent_good_news": "pasentị. Nke a bụ ozi ọma! Nọgiden na-elekọta onwe gị ma soro ndụmọdụ ahụike niile.",
        "no_risk_assessment_voice": "Ị nweghị nyocha ihe ize ndụ. Biko tinye ndekọ ahụike gị na mbụ, mgbe ahụ anyị nwere ike gbakọọ ọkwa ihe ize ndụ gị.",
        "appointments_page_intro_detailed": "Nke a bụ ibe oge nzukọ gị. Ebe a ị nwere ike ịhụ oge nzukọ dọkịta gị niile ma hazie ndị ọhụrụ. Ka m kọwaara gị otu esi eji ibe a.",
        "appointments_count_voice_detailed": "Ị nwere",
        "upcoming_doctor_appointments": "oge nzukọ dọkịta na-abịa. Ọ dị ezigbo mkpa ịbịa na oge nzukọ ndị a niile.",
        "next_appointment_voice_detailed": "Oge nzukọ gị na-esote ga-abụ n'ụbọchị",
        "in_the_morning": "n'ụtụtụ ma ọ bụ n'ehihie. Oge nzukọ ga-abụ na",
        "please_arrive_on_time": "Biko gbaa mbọ hụ na ị bịara n'oge.",
        "no_appointments_voice_detailed": "Ị nweghị oge nzukọ ọ bụla na-abịa. Ọ dị mkpa ịhazi oge nzukọ na dọkịta gị. Ka m gwa gị otu esi eme oge nzukọ.",
        "health_records_page_intro_detailed": "Nke a bụ ibe ndekọ ahụike gị. Nke a bụ ebe ị nwere ike idebe ndekọ nha ahụike gị niile dị ka ibu gị, ọbara, okpomọkụ, na ọnụọgụ ndị ọzọ dị mkpa.",
        "records_count_voice_detailed": "Ị echekwala",
        "latest_record_date_voice": "Ndekọ ahụike gị kacha ọhụrụ etinyere n'ụbọchị",
        "no_records_voice_detailed": "Ị kabeghị ndekọ ahụike ọ bụla. Ọ dị ezigbo mkpa ịtinye nha ahụike gị mgbe niile ka anyị nwee ike ịchọpụta ma gị na nwa gị dị mma. Ka m gwa gị otu esi etinye ndekọ ahụike mbụ gị.",
        "risk_page_intro_detailed": "Nke a bụ ibe nyocha ihe ize ndụ gị. Ibe a na-agwa gị ma ị nọ n'ihe ize ndụ dị ala, nkezi, ma ọ bụ dị elu n'oge ime imụ. A na-agbakọ nke a site na iji nha ahụike gị.",
        "risk_high_detailed_page": "ỊDỊRỊNGỊ: Ọkwa ihe ize ndụ gị bụ IHE IZE NDỤ DỊ ELU na akara nke",
        "percent_very_serious": "pasentị. Nke a dị oke mkpa. Ị ga-ahụrịrị dọkịta ngwa ngwa. Ọ bụrụ na ị nwere mgbaàmà siri ike dị ka mgbu siri ike, ọbara ọgbụgba, ma ọ bụ ị nweghị ike ịhụ nwa gị na-emegharị, gaa na ibe mberede ozugbo ma pịa bọtịnụ mberede.",
        "risk_medium_detailed_page": "Ọkwa ihe ize ndụ gị bụ IHE IZE NDỤ NKEZI na akara nke",
        "percent_be_careful_follow": "pasentị. Nke a pụtara na ị kwesịrị ịkpachara anya ma soro ntuziaka niile sitere na dọkịta gị. Gbaa mbọ hụ na ị na-abịa na oge nzukọ gị niile ma tinye ndekọ ahụike gị mgbe niile.",
        "risk_low_detailed_page": "Ọkwa ihe ize ndụ gị bụ IHE IZE NDỤ DỊ ALA na akara nke",
        "percent_good_doing_well": "pasentị. Nke a bụ ozi ọma! Gị na nwa gị na-eme nke ọma. Nọgiden na-elekọta onwe gị, rie nri dị mma, ma soro ndụmọdụ ahụike niile.",
        "risk_recommendations_voice_detailed": "Ị nwere",
        "important_recommendations": "ndụmọdụ dị mkpa ị ga-agbaso. Ndị a bụ ntuziaka iji nyere gị aka inwe ime imụ dị mma. Biko gee ha ntị nke ọma ma soro ha.",
        "no_risk_assessment_voice_detailed": "Ị nweghị nyocha ihe ize ndụ. Iji nweta ọkwa ihe ize ndụ gị, ị ga-ebu ụzọ tinye ndekọ ahụike gị. Gaa na ibe Ndekọ Ahụike ma tinye nha gị dị ka ibu, ọbara, na okpomọkụ. Mgbe ị tinyechara ndekọ, laghachi ebe a iji hụ ọkwa ihe ize ndụ gị.",
        "pregnancy_page_intro_detailed": "Nke a bụ ibe ozi ime imụ gị. Ebe a ị nwere ike ịgbakwunye ma ọ bụ melite ozi gbasara ime imụ gị, dị ka ụbọchị a ga-amụ nwa gị na izu ime imụ gị.",
        "pregnancy_info_voice_detailed": "Ị nọ ugbu a n'izu",
        "of_your_pregnancy_weeks": "nke ime imụ gị. Nke a pụtara na ị nọla ime imụ maka",
        "weeks": "izu.",
        "no_pregnancy_info_voice": "Ị kabeghị ozi ime imụ gị. Ị kwesịrị ịgbakwunye ozi a ka anyị nwee ike inyere gị aka nke ọma.",
        "emergency_page_intro_detailed": "Nke a bụ ibe mberede. Ibe a bụ maka mgbe ịchọrọ enyemaka ozugbo. Jiri nke a naanị ma ọ bụrụ na ị nwere nsogbu siri ike.",
        "emergency_symptoms_voice": "Ị kwesịrị iji bọtịnụ mberede ma ọ bụrụ na ị nwere otu n'ime mgbaàmà siri ike ndị a: mgbu siri ike n'afọ ma ọ bụ afọ gị, ọbara ọgbụgba site na akụkụ ahụ gị, isi ọwụwa siri ike nke agaghị apụ, ị nweghị ike ịhụ nwa gị na-emegharị, ị nwere nsogbu iku ume, ị na-enwe mgbagwoju anya ma ọ bụ ị na-ada, ma ọ bụ ị nwere ahụ ọkụ dị elu.",
        "emergency_instructions_voice_detailed": "Ọ bụrụ na ị nwere otu n'ime mgbaàmà ndị a, chọta bọtịnụ uhie dị ukwuu na ibe a nke na-ekwu Mberede ma ọ bụ Kpọọ maka Enyemaka. Pịa ya ozugbo. Nke a ga-eziga ozi na ndị na-ahụ maka ahụike ndị nwere ike inyere gị aka. Gbaa mbọ hụ na nọmba ekwentị gị ziri ezi na profaịlụ gị ka ha nwee ike ịkpọ gị azụ.",
        "emergency_contact_voice": "Jikwaa hụ na ị echekwala nọmba mberede. Ndị a bụ nọmba ekwentị nke ndị nwere ike inyere gị aka, dị ka di gị, onye ezinụlọ, ma ọ bụ onye agbata obi. Ị nwere ike ịgbakwunye ndị a na ntọala profaịlụ gị.",
        "recommendations_page_intro_detailed": "Nke a bụ ibe ndụmọdụ gị. Ibe a na-egosi gị ndụmọdụ ahụike ahaziri maka gị dabere na nha ahụike gị na ọkwa ihe ize ndụ. Ndụmọdụ ndị a bụ ntuziaka dị mkpa iji nyere gị aka inwe ime imụ dị mma.",
        "recommendations_count_voice_detailed": "Ị nwere",
        "important_recommendations_follow": "ndụmọdụ dị mkpa ị ga-agbaso. Ndị a bụ ntuziaka emere maka gị dabere na ahụike gị. Biko gụọ ma ọ bụ gee nke ọ bụla nke ọma ma gbalịa soro ha.",
        "no_recommendations_voice": "Ị nweghị ndụmọdụ ọ bụla. Mgbe ị tinyechara ndekọ ahụike gị ma nweta nyocha ihe ize ndụ, ndụmọdụ ga-apụta ebe a.",
        "action_guidance_intro": "Ugbu a, ka m gwa gị kpọmkwem ihe ị nwere ike ime na ibe a na otu esi eme ya nke ọma.",
        "dashboard_actions_voice_detailed": "Na ibe a, ị nwere ike ịhụ ozi ahụike gị. Iji hazie oge nzukọ dọkịta, chọta okwu Oge Nzukọ na menu n'akụkụ aka ekpe nke ihuenyo gị. Pịa ma ọ bụ pịa ya. Iji tinye nha ahụike gị dị ka ibu na ọbara, chọta Ndekọ Ahụike na otu menu ahụ ma pịa ya. Ọ bụrụ na ịchọrọ enyemaka ozugbo, chọta bọtịnụ uhie Mberede ma pịa ya.",
        "appointment_actions_voice_detailed": "Iji hazie oge nzukọ dọkịta ọhụrụ, buru ụzọ chọta bọtịnụ nke na-ekwu Oge Nzukọ Ọhụrụ ma ọ bụ Tinye Oge Nzukọ n'elu ibe a. Pịa bọtịnụ ahụ. Fọm ga-apụta. Ị ga-achọ iju atọ: Nke mbụ, họrọ ụbọchị na oge maka oge nzukọ gị. Nke abụọ, pịnye aha ụlọ ọgwụ ma ọ bụ ụlọ ọgwụ. Nke atọ, pịnye adreesị ụlọ ọgwụ. Mgbe ị mechara ndị a niile, chọta bọtịnụ nke na-ekwu Chekwaa ma ọ bụ Hazie Oge Nzukọ na ala ma pịa ya. Oge nzukọ gị ga-adị.",
        "health_records_actions_voice_detailed": "Iji tinye nha ahụike gị, chọta bọtịnụ nke na-ekwu Tinye Ndekọ ma ọ bụ Ndekọ Ọhụrụ n'elu ibe a. Pịa ya. Fọm ga-apụta na igbe dị iche iche. Jupụta igbe ọ bụla na nha gị: ibu gị na kilogram, nọmba ọbara gị ma ọ bụrụ na ị nwere ha, okpomọkụ gị, shuga n'ọbara gị ma ọ bụrụ na ị maara ya, na ọnụọgụgụ obi gị. Mgbe ị mechara igbe niile ị nwere ike, chọta bọtịnụ nke na-ekwu Chekwaa na ala ma pịa ya. Nke a ga-echekwa ozi ahụike gị.",
        "risk_actions_voice_detailed": "A na-agbakọ ọkwa ihe ize ndụ gị na-akpaghị aka mgbe ị na-agbakwunye ndekọ ahụike. Ibe a na-egosi ma ị nọ n'ihe ize ndụ dị ala, nkezi, ma ọ bụ dị elu. Ọ bụrụ na ị hụrụ Ihe Ize Ndụ Dị Elu na-acha uhie uhie, nke a dị ezigbo mkpa. Ị ga-akpọrịrị dọkịta gị ozugbo. N'okpuru ọkwa ihe ize ndụ, ị ga-ahụ ndụmọdụ. Ndị a bụ ntuziaka dị mkpa maka gị ịgbaso. Gụọ ha nke ọma ma ọ bụ gee ha ntị. Ọ bụrụ na ịchọrọ ịgbakwunye ndekọ ahụike ọzọ, laghachi na ibe Ndekọ Ahụike.",
        "pregnancy_actions_voice_detailed": "Na ibe a, ị nwere ike ịgbakwunye ma ọ bụ melite ozi ime imụ gị. Ị ga-achọ itinye ihe abụọ dị mkpa: Nke mbụ, ụbọchị a ga-amụ nwa gị. Nke a ka a na-akpọ ụbọchị a ga-amụ nwa gị. Nke abụọ, izu ime imụ ị nọ ugbu a. Mgbe ị tinyechara ndị a, chọta bọtịnụ nke na-ekwu Chekwaa ma pịa ya. Gbaa mbọ hụ na ozi ahụ ziri ezi n'ihi na ọ na-enyere aka gbakọọ ọkwa ihe ize ndụ gị.",
        "emergency_actions_voice_detailed": "Ọ bụrụ na ị nwere mgbaàmà siri ike dị ka mgbu siri ike, ọbara ọgbụgba, isi ọwụwa siri ike, ma ọ bụ ị nweghị ike ịhụ nwa gị na-emegharị, ịchọrọ enyemaka ozugbo. Chọta bọtịnụ uhie dị ukwuu nke na-ekwu Mberede ma ọ bụ Kpọọ maka Enyemaka. Pịa ya ozugbo. Nke a ga-akpọtụrụ ndị na-ahụ maka ahụike. Jikwaa hụ na nọmba ekwentị gị na nọmba kọntaktị mberede echekwara na profaịlụ gị ka ndị dọkịta nwee ike iru gị.",
        "provider_actions_voice_detailed": "Dị ka onye na-ahụ maka ahụike, ị nwere ike ịhụ ndị ọrịa gị niile na ibe a. Iji hụ nkọwa gbasara otu onye ọrịa, pịa aha ha ma ọ bụ kaadị ha. Iji hụ oge nzukọ niile, chọta ngalaba oge nzukọ. Iji hụ ndekọ ahụike onye ọrịa, pịa aha onye ọrịa wee chọta Ndekọ Ahụike.",
        "government_actions_voice_detailed": "Dị ka onye ọrụ gọọmentị, ị nwere ike ịhụ ọnụọgụgụ ahụike maka mpaghara gị. Iji hụ ọnụọgụgụ maka otu mpaghara, chọta menu dropdown n'elu ma họrọ mpaghara. Iji hụ eserese na eserese zuru ezu, chọta ala na ibe a. Iji budata ma ọ bụ wepụta data a, chọta bọtịnụ Mbupụta.",
        "general_actions_voice_detailed": "Iji gaa na ibe dị iche iche na ngwa a, lee n'akụkụ aka ekpe nke ihuenyo gị. Ị ga-ahụ menu nwere nhọrọ dị iche iche dị ka Dashboard, Oge Nzukọ, Ndekọ Ahụike, na ndị ọzọ. Pịa nke ọ bụla n'ime ndị a iji gaa na ibe ahụ.",
        "action_guidance_closing": "Cheta, ọ bụrụ na ị nwere mgbagwoju anya ma ọ bụ chọọ enyemaka, ị nwere ike ịpịa bọtịnụ olu ọzọ iji nụ ntuziaka ndị a ọzọ. Were oge gị ma emela ọsọ ọsọ.",
        "provider_dashboard_intro": "Nnọọ na dashboard onye nlekọta. Nke a bụ nchịkọta ndị ọrịa.",
        "provider_total_patients": "Ị nwere",
        "total_patients": "ndị ọrịa n'ozuzu",
        "provider_active_pregnancies": "E nwere",
        "active_pregnancies": "ime imụ na-arụ ọrụ",
        "provider_upcoming_appointments": "Ị nwere",
        "provider_high_risk": "E nwere",
        "high_risk_patients": "ndị ọrịa nwere ihe ize ndụ dị elu",
        "provider_medium_risk": "",
        "medium_risk_patients": "ndị ọrịa nwere ihe ize ndụ nkezi",
        "provider_low_risk": "",
        "low_risk_patients": "ndị ọrịa nwere ihe ize ndụ dị ala",
        "provider_actions_voice": "Iji hụ nkọwa ndị ọrịa, pịa kaadị ndị ọrịa ọ bụla. Iji hụ oge nzukọ, lelee ngalaba oge nzukọ. Iji hụ ndekọ ahụike ndị ọrịa, pịa aha onye ọrịa.",
        "government_dashboard_intro": "Nnọọ na dashboard gọọmentị. Nke a bụ nchịkọta ahụike mpaghara.",
        "government_total_users": "E nwere",
        "total_users": "ndị ọrụ n'ozuzu na sistemụ",
        "government_active_pregnancies": "E nwere",
        "government_total_providers": "E nwere",
        "total_providers": "ndị na-ahụ maka ahụike",
        "government_high_risk": "E nwere",
        "high_risk_cases": "okwu nwere ihe ize ndụ dị elu",
        "government_medium_risk": "",
        "medium_risk_cases": "okwu nwere ihe ize ndụ nkezi",
        "government_low_risk": "",
        "low_risk_cases": "okwu nwere ihe ize ndụ dị ala",
        "government_actions_voice": "Iji hụ ọnụọgụgụ mpaghara, họrọ mpaghara site na dropdown. Iji hụ nyocha zuru ezu, lelee ngalaba eserese. Iji wepụta data, jiri bọtịnụ mbupụ.",
    }
}


@router.get("/", response_model=Dict[str, str])
async def get_translations(
    language: str = Query(..., pattern="^(en|ha|yo|ig)$"),
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all translations for a language"""
    try:
        query = db.query(Translation).filter(
            Translation.language == language,
            Translation.is_active == True
        )
        
        if category:
            query = query.filter(Translation.category == category)
        
        translations = query.all()
        
        # Build translation dictionary
        result = {}
        for trans in translations:
            result[trans.key] = trans.value
        
        # Merge with defaults if missing
        if language in DEFAULT_TRANSLATIONS:
            for key, value in DEFAULT_TRANSLATIONS[language].items():
                if key not in result:
                    result[key] = value
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching translations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch translations"
        )


@router.get("/key/{key}", response_model=TranslationResponse)
async def get_translation_by_key(
    key: str,
    language: str = Query(..., pattern="^(en|ha|yo|ig)$"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific translation by key and language"""
    try:
        translation = db.query(Translation).filter(
            Translation.key == key,
            Translation.language == language,
            Translation.is_active == True
        ).first()
        
        if not translation:
            # Return default if exists
            if language in DEFAULT_TRANSLATIONS and key in DEFAULT_TRANSLATIONS[language]:
                return TranslationResponse(
                    key=key,
                    value=DEFAULT_TRANSLATIONS[language][key],
                    language=language,
                    category=None
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Translation not found for key: {key} in language: {language}"
            )
        
        return translation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching translation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch translation"
        )


@router.post("/", response_model=TranslationResponse)
async def create_translation(
    translation_data: TranslationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new translation (admin/provider only)"""
    try:
        # Only providers and government can add translations
        if current_user.role not in ["provider", "government"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only healthcare providers and government can add translations"
            )
        
        # Check if translation already exists
        existing = db.query(Translation).filter(
            Translation.key == translation_data.key,
            Translation.language == translation_data.language
        ).first()
        
        if existing:
            # Update existing
            existing.value = translation_data.value
            existing.category = translation_data.category
            existing.context = translation_data.context
            db.commit()
            db.refresh(existing)
            return existing
        
        # Create new
        translation = Translation(**translation_data.model_dump())
        db.add(translation)
        db.commit()
        db.refresh(translation)
        
        logger.info(f"Translation created: {translation.key} - {translation.language}")
        return translation
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating translation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create translation"
        )


@router.post("/bulk", response_model=List[TranslationResponse])
async def create_bulk_translations(
    bulk_data: BulkTranslationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create multiple translations at once"""
    try:
        if current_user.role not in ["provider", "government"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only healthcare providers and government can add translations"
            )
        
        results = []
        for trans_data in bulk_data.translations:
            existing = db.query(Translation).filter(
                Translation.key == trans_data.key,
                Translation.language == trans_data.language
            ).first()
            
            if existing:
                existing.value = trans_data.value
                existing.category = trans_data.category
                existing.context = trans_data.context
                results.append(existing)
            else:
                translation = Translation(**trans_data.model_dump())
                db.add(translation)
                results.append(translation)
        
        db.commit()
        for trans in results:
            db.refresh(trans)
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating bulk translations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create bulk translations"
        )


@router.get("/localized/content")
async def get_localized_content(
    language: str = Query(..., pattern="^(en|ha|yo|ig)$"),
    content_type: str = Query(..., pattern="^(health_tips|recommendations|education)$"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get localized content (health tips, recommendations, etc.)"""
    try:
        translations = db.query(Translation).filter(
            Translation.language == language,
            Translation.category == content_type,
            Translation.is_active == True
        ).all()
        
        result = {}
        for trans in translations:
            result[trans.key] = trans.value
        
        return {
            "language": language,
            "content_type": content_type,
            "content": result
        }
        
    except Exception as e:
        logger.error(f"Error fetching localized content: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch localized content"
        )

