from pydantic_settings import BaseSettings
from typing import List
import os


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
        "http://localhost:8000",
        "https://mamacare.vercel.app",
    ]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "mamacare.vercel.app"]
    
    # ML Model paths
    MODEL_PATH: str = os.getenv(
        "MODEL_PATH",
        "ml-model/models/model_hackathon.pkl"
    )
    LABEL_ENCODER_PATH: str = os.getenv(
        "LABEL_ENCODER_PATH",
        "ml-model/models/label_encoder_hackathon.pkl"
    )
    FEATURE_NAMES_PATH: str = os.getenv(
        "FEATURE_NAMES_PATH",
        "ml-model/models/feature_names_hackathon.pkl"
    )
    
    # SMS Service
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "twilio")  # twilio or africas_talking
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    # App settings
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
