#!/usr/bin/env python
"""Seed database with default translations"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import init_db, SessionLocal
from app.models.translation import Translation
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default translations
TRANSLATIONS = {
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
        "health_tip_1": "Stay hydrated by drinking at least 8-10 glasses of water daily",
        "health_tip_2": "Eat a balanced diet rich in fruits, vegetables, and whole grains",
        "health_tip_3": "Get regular prenatal checkups as recommended by your healthcare provider",
        "health_tip_4": "Avoid smoking, alcohol, and excessive caffeine during pregnancy",
        "health_tip_5": "Get adequate rest and sleep (7-9 hours per night)",
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
        "health_tip_1": "Sha ruwa sosai - aƙalla gilashin ruwa 8-10 a kullum",
        "health_tip_2": "Ci abinci mai gina jiki - 'ya'yan itace, kayan lambu, da hatsi",
        "health_tip_3": "Yi binciken ciki na yau da kullum kamar yadda likita ya ba da shawara",
        "health_tip_4": "Kaurace wa shan taba, giya, da yawan shan kofi yayin ciki",
        "health_tip_5": "Yi hutawa da barci mai kyau (sa'o'i 7-9 a daren)",
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
        "health_tip_1": "Mu omi to to - o kere ju iko omi 8-10 lojoojumọ",
        "health_tip_2": "Je ounje to dara - eso, efo, ati irugbin",
        "health_tip_3": "Se ayewo iyara ni gbogbo igba bi dokita ba sọ",
        "health_tip_4": "Yago fun siga, oti, ati kofi pupọ nigba iyara",
        "health_tip_5": "Sinmi ati sun to (wakati 7-9 ni alẹ)",
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
        "health_tip_1": "ṅụọ mmiri zuru oke - opekata mpe iko mmiri 8-10 kwa ụbọchị",
        "health_tip_2": "Rie nri ziri ezi - mkpụrụ osisi, akwụkwọ nri, na ọka",
        "health_tip_3": "Mee nyocha ime imụ mgbe niile dịka dọkịta tụrụ aro",
        "health_tip_4": "Zere ịṅụ sịga, mmanya, na kọfị nke ukwuu n'oge ime imụ",
        "health_tip_5": "Zuru ike na ụra zuru oke (awa 7-9 n'abalị)",
    }
}


def seed_translations():
    """Seed translations into database"""
    db = SessionLocal()
    try:
        init_db()
        
        count = 0
        for language, translations in TRANSLATIONS.items():
            for key, value in translations.items():
                # Check if translation already exists
                existing = db.query(Translation).filter(
                    Translation.key == key,
                    Translation.language == language
                ).first()
                
                if not existing:
                    category = "health_tips" if key.startswith("health_tip") else "ui"
                    translation = Translation(
                        key=key,
                        language=language,
                        value=value,
                        category=category
                    )
                    db.add(translation)
                    count += 1
        
        db.commit()
        logger.info(f"✅ Seeded {count} translations successfully")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding translations: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_translations()

