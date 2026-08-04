import json
import os
from pathlib import Path
from typing import List, Union

from dotenv import load_dotenv
from pydantic import ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
MODEL_ROOT = PROJECT_ROOT / "ai-development" / "ml-model" / "models"
DEFAULT_SECRET_KEY = "change-me-in-production"


def _parse_csv_env(value: str | None, fallback: List[str]) -> List[str]:
    if not value:
        return fallback

    parsed = [item.strip() for item in value.split(",") if item.strip()]
    return parsed or fallback


def _parse_list_env(value: str | List[str] | None, fallback: List[str]) -> List[str]:
    if value is None:
        return fallback

    if isinstance(value, list):
        parsed = [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return parsed or fallback

    raw_value = value.strip()
    if not raw_value:
        return fallback

    if raw_value.startswith("["):
        try:
            decoded = json.loads(raw_value)
        except json.JSONDecodeError:
            decoded = None

        if isinstance(decoded, list):
            parsed = [item.strip() for item in decoded if isinstance(item, str) and item.strip()]
            return parsed or fallback

    return _parse_csv_env(raw_value, fallback)


def _load_optional_ml_env() -> None:
    env_candidates = [
        PROJECT_ROOT / "ai-development" / "ml-model" / ".env",
        PROJECT_ROOT / "ai-development" / "ml-model" / ".env.local",
        PROJECT_ROOT / "ai-development" / "ml-model" / "mamacare_backend" / ".env",
    ]

    for env_path in env_candidates:
        if env_path.exists():
            load_dotenv(env_path, override=False)
            break


def _resolve_default_model_path() -> str:
    candidates = [
        MODEL_ROOT / "best_model_hackathon_gradient_boosting.pkl",
        MODEL_ROOT / "best_model_hachathon_gradient_boosting.pkl",
        MODEL_ROOT / "model_hackathon.pkl",
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return str(candidates[-1])


_load_optional_ml_env()


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        # Disable automatic JSON decoding for list fields so our
        # field_validator (which handles both CSV and JSON formats)
        # is the sole parsing path. Without this, pydantic-settings
        # attempts json.loads() on the raw env value BEFORE calling
        # the validator, crashing on plain CSV strings like:
        #   CORS_ORIGINS=https://foo.com,https://bar.com
        enable_decoding=False,
    )

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./mamacare-ai.db")

    SECRET_KEY: str = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info").lower()

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    ALLOWED_HOSTS: Union[str, List[str]] = [
        "localhost",
        "127.0.0.1",
        "*.onrender.com",
        "*.vercel.app",
        "*.netlify.app",
    ]

    MODEL_PATH: str = os.getenv("MODEL_PATH", _resolve_default_model_path())
    LABEL_ENCODER_PATH: str = os.getenv(
        "LABEL_ENCODER_PATH",
        str(MODEL_ROOT / "label_encoder_hackathon.pkl"),
    )
    FEATURE_NAMES_PATH: str = os.getenv(
        "FEATURE_NAMES_PATH",
        str(MODEL_ROOT / "feature_names_hackathon.pkl"),
    )
    SCALER_PATH: str = os.getenv(
        "SCALER_PATH",
        str(MODEL_ROOT / "scaler_hackathon.pkl"),
    )

    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "twilio")
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    TWILIO_MESSAGING_SERVICE_SID: str = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")

    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_ENABLED: bool = os.getenv("EMAIL_ENABLED", "False").lower() == "true"

    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

    BANK_ACCOUNT_NUMBER: str = os.getenv("BANK_ACCOUNT_NUMBER", "1497478053")
    BANK_ACCOUNT_NAME: str = os.getenv("BANK_ACCOUNT_NAME", "MamaCare AI Limited")
    BANK_NAME: str = os.getenv("BANK_NAME", "Access Bank")
    BANK_SUPPORT_EMAIL: str = os.getenv("BANK_SUPPORT_EMAIL", "support@mamacare.ai")
    BANK_SUPPORT_PHONE: str = os.getenv("BANK_SUPPORT_PHONE", "+234-XXX-XXXX-XXXX")

    @field_validator("CORS_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_list_fields(
        cls,
        value: str | List[str] | None,
        info: ValidationInfo,
    ) -> List[str]:
        field_defaults = {
            "CORS_ORIGINS": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ],
            "ALLOWED_HOSTS": [
                "localhost",
                "127.0.0.1",
                "*.onrender.com",
                "*.vercel.app",
                "*.netlify.app",
            ],
        }

        return _parse_list_env(value, field_defaults[info.field_name])

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    def validate_production(self) -> None:
        if not self.is_production:
            return

        issues: List[str] = []

        if self.SECRET_KEY == DEFAULT_SECRET_KEY:
            issues.append("SECRET_KEY must be set to a secure value in production.")

        if len(self.SECRET_KEY) < 32:
            issues.append("SECRET_KEY must be at least 32 characters long in production.")

        if "*" in self.CORS_ORIGINS:
            issues.append("CORS_ORIGINS must be explicitly configured in production.")

        if "*" in self.ALLOWED_HOSTS:
            issues.append("ALLOWED_HOSTS must be explicitly configured in production.")

        required_paths = {
            "MODEL_PATH": self.MODEL_PATH,
            "LABEL_ENCODER_PATH": self.LABEL_ENCODER_PATH,
            "FEATURE_NAMES_PATH": self.FEATURE_NAMES_PATH,
            "SCALER_PATH": self.SCALER_PATH,
        }

        missing_paths = [name for name, path in required_paths.items() if not Path(path).exists()]
        if missing_paths:
            issues.append(f"Missing required model assets: {', '.join(missing_paths)}.")

        if issues:
            raise RuntimeError("Production configuration is invalid:\n- " + "\n- ".join(issues))


settings = Settings()
