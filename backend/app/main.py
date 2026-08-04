from app.api.v1 import auth, health, predictions, appointments, emergency, pregnancy, recommendations, websocket, statistics, dashboards, hospitals, offline, translations, subscriptions, voice, chat, providers
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging
import threading
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.ml.model_loader import get_model_loader

# Import all models FIRST, before API routers
# This ensures relationships are resolved before any API code runs
# IMPORTANT: Import in correct order to resolve relationships
# Note: This comment is for documentation only and does not affect runtime behavior.
# 1. Base models first
from app.models import user as user_model  # Must be imported first
# 2. Models that reference User
from app.models import (
    pregnancy as pregnancy_model,
    health_record,
    risk_assessment,
    appointment,
    emergency_alert,
    hospital,
    subscription,
    offline_sync,
    translation,
    emergency_contact,
    message  # Import message model
)
# Force relationship configuration by accessing the models
# This ensures all relationships are properly resolved before API routers load
_ = user_model.User
_ = pregnancy_model.Pregnancy
_ = emergency_contact.EmergencyContact
_ = message.Message  # Force Message model to resolve relationships

# Now import API routers (after models are loaded)

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)

# Track ML model loading state (updated by background thread)
_models_ready = False
_models_loading = False


def _load_models_background():
    """Load ML models in a background thread so the server starts accepting
    requests immediately. Login/signup/translations all work before models
    are ready — only risk assessment requires them."""
    global _models_ready, _models_loading
    _models_loading = True
    try:
        logger.info("Background: loading ML models...")
        model_loader = get_model_loader()
        if model_loader.is_ready():
            _models_ready = True
            logger.info("✓✓✓ Background: ML Models ready for predictions! ✓✓✓")
        else:
            logger.error("✗✗✗ Background: ML Models failed to load! ✗✗✗")
    except Exception as e:
        logger.error(f"Background: Error loading ML models: {e}", exc_info=True)
    finally:
        _models_loading = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("=" * 60)
    logger.info("Starting MamaCare AI Backend")
    logger.info("=" * 60)
    settings.validate_production()

    # Initialize database (fast — creates tables if not exist)
    init_db()

    # Load ML models in a background thread.
    # KEY FIX: Previously models loaded synchronously here, blocking the server
    # from accepting ANY connections until done (30-60s on cold start).
    # This caused ALL requests — including login/signup — to timeout.
    # Now the server accepts requests immediately; only /predictions waits for models.
    t = threading.Thread(target=_load_models_background, daemon=True, name="ml-model-loader")
    t.start()
    logger.info("ML model loading started in background — server accepting requests NOW")
    logger.info("=" * 60)

    yield

    logger.info("Shutting down MamaCare AI Backend")


app = FastAPI(
    title="MamaCare AI API",
    description="Maternal Health Risk Assessment API",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware
# app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.netlify\.app|https://.*\.onrender\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(health.router, prefix="/api/v1/health",
                   tags=["Health Records"])
app.include_router(predictions.router,
                   prefix="/api/v1/predictions", tags=["Risk Predictions"])
app.include_router(appointments.router,
                   prefix="/api/v1/appointments", tags=["Appointments"])
app.include_router(
    emergency.router, prefix="/api/v1/emergency", tags=["Emergency"])
app.include_router(pregnancy.router, prefix="/api/v1", tags=["Pregnancy"])
app.include_router(providers.router, prefix="/api/v1", tags=["Providers"])
app.include_router(recommendations.router, prefix="/api/v1",
                   tags=["Recommendations"])
app.include_router(statistics.router,
                   prefix="/api/v1/statistics", tags=["Statistics"])
app.include_router(dashboards.router,
                   prefix="/api/v1/dashboards", tags=["Dashboards"])
app.include_router(
    hospitals.router, prefix="/api/v1/hospitals", tags=["Hospitals"])
app.include_router(offline.router, prefix="/api/v1/offline",
                   tags=["Offline Sync"])
app.include_router(translations.router,
                   prefix="/api/v1/translations", tags=["Translations"])
app.include_router(subscriptions.router,
                   prefix="/api/v1/subscriptions", tags=["Subscriptions"])
app.include_router(voice.router, prefix="/api/v1/voice",
                   tags=["Voice Assistant"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(websocket.router, tags=["WebSocket"])


@app.get("/health")
async def health_check():
    """Health check — always responds immediately, even while models are loading"""
    return {
        "status": "healthy",
        "service": "MamaCare AI",
        "environment": settings.ENVIRONMENT,
        "model_ready": _models_ready,
        "model_loading": _models_loading,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to MamaCare AI API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
