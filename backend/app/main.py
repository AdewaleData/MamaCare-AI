from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.api.v1 import auth, health, predictions, appointments, emergency

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting MamaCare AI Backend")
    init_db()
    yield
    logger.info("Shutting down MamaCare AI Backend")


app = FastAPI(
    title="MamaCare AI API",
    description="Maternal Health Risk Assessment API",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(health.router, prefix="/api/v1/health", tags=["Health Records"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Risk Predictions"])
app.include_router(appointments.router, prefix="/api/v1/appointments", tags=["Appointments"])
app.include_router(emergency.router, prefix="/api/v1/emergency", tags=["Emergency"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "MamaCare AI"}


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
