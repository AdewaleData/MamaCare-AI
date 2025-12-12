from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path
from dotenv import load_dotenv

# Try to load from AI-development ml-model .env files if exists (for Twilio credentials only)
# Check multiple possible locations
_ai_dev_env_paths = [
    os.path.join(os.path.dirname(__file__), "../../ai-development/ml-model/.env"),
    os.path.join(os.path.dirname(__file__), "../../ai-development/ml-model/.env.local"),
    os.path.join(os.path.dirname(__file__), "../../ai-development/ml-model/mamacare_backend/.env"),
]

# Load only Twilio-related variables, not DATABASE_URL
for env_path in _ai_dev_env_paths:
    if os.path.exists(env_path):
        # Load environment variables
        env_vars = {}
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Only load Twilio variables, ignore DATABASE_URL and others
                    if key.startswith('TWILIO'):
                        env_vars[key] = value
        
        # Set only Twilio variables
        for key, value in env_vars.items():
            if key not in os.environ:  # Don't override existing values
                os.environ[key] = value
        
        print(f"[Config] Loaded Twilio credentials from: {env_path}")
        break


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./mamacare.db"
    )
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://localhost:8001",
        "https://mamacare.vercel.app",
    ]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "mamacare.vercel.app"]
    
    # ML Model paths - use absolute paths relative to backend directory
    _backend_dir = Path(__file__).parent.parent  # Go up from app/config.py to backend/
    _project_root = _backend_dir.parent  # Go up from backend/ to project root
    _default_model_dir = _project_root / "ai-development" / "ml-model" / "models"
    
    MODEL_PATH: str = os.getenv(
        "MODEL_PATH",
        # Try best_model file first (actual model), fallback to model_hackathon.pkl (metadata)
        str(_default_model_dir / "best_model_hachathon_gradient_boosting.pkl") if (_default_model_dir / "best_model_hachathon_gradient_boosting.pkl").exists() else str(_default_model_dir / "model_hackathon.pkl")
    )
    LABEL_ENCODER_PATH: str = os.getenv(
        "LABEL_ENCODER_PATH",
        str(_default_model_dir / "label_encoder_hackathon.pkl")
    )
    FEATURE_NAMES_PATH: str = os.getenv(
        "FEATURE_NAMES_PATH",
        str(_default_model_dir / "feature_names_hackathon.pkl")
    )
    SCALER_PATH: str = os.getenv(
        "SCALER_PATH",
        str(_default_model_dir / "scaler_hackathon.pkl")
    )
    
    # SMS Service (Twilio credentials from AI-development backend if available)
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "twilio")  # twilio or africas_talking
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    TWILIO_MESSAGING_SERVICE_SID: str = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")
    
    # Email Service (Gmail SMTP)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")  # Your Gmail address
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")  # Gmail App Password
    EMAIL_ENABLED: bool = os.getenv("EMAIL_ENABLED", "False").lower() == "true"
    
    # App settings
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Bank Transfer Settings
    BANK_ACCOUNT_NUMBER: str = os.getenv("BANK_ACCOUNT_NUMBER", "1234567890")
    BANK_ACCOUNT_NAME: str = os.getenv("BANK_ACCOUNT_NAME", "MamaCare AI Limited")
    BANK_NAME: str = os.getenv("BANK_NAME", "Access Bank")
    BANK_SUPPORT_EMAIL: str = os.getenv("BANK_SUPPORT_EMAIL", "support@mamacare.ai")
    BANK_SUPPORT_PHONE: str = os.getenv("BANK_SUPPORT_PHONE", "+234-XXX-XXXX-XXXX")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
