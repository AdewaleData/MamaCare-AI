from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PredictionRequest(BaseModel):
    """Request schema for risk prediction"""
    age: int = Field(..., ge=15, le=50)
    systolic_bp: int = Field(..., ge=0, le=300)
    diastolic_bp: int = Field(..., ge=0, le=200)
    blood_sugar: float = Field(..., ge=0, le=500)
    body_temp: float = Field(..., ge=35, le=42)
    bmi: float = Field(..., gt=0)
    previous_complications: int = Field(0, ge=0, le=1)
    preexisting_diabetes: int = Field(0, ge=0, le=1)
    gestational_diabetes: int = Field(0, ge=0, le=1)
    mental_health: int = Field(0, ge=0, le=1)
    heart_rate: int = Field(..., ge=40, le=200)


class PredictionResponse(BaseModel):
    """Response schema for risk prediction"""
    risk_level: str  # low, medium, high
    risk_score: float
    confidence: float
    risk_factors: List[str]
    recommendations: List[str]
    predicted_at: datetime


class RiskAssessmentResponse(BaseModel):
    """Full risk assessment response"""
    id: str
    pregnancy_id: str
    risk_level: str
    risk_score: float
    risk_factors: Optional[dict] = None
    recommendations: Optional[str] = None
    assessed_at: datetime
    
    class Config:
        from_attributes = True
