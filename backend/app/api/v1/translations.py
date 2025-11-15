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

