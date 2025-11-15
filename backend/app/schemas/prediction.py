from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PredictionRequest(BaseModel):
    """Request schema for risk prediction"""
    pregnancy_id: str = Field(..., description="Pregnancy ID")
    age: Optional[int] = Field(None, ge=15, le=50)
    systolic_bp: Optional[int] = Field(None, ge=0, le=300)
    diastolic_bp: Optional[int] = Field(None, ge=0, le=200)
    blood_sugar: Optional[float] = Field(None, ge=0, le=500)
    body_temp: Optional[float] = Field(None, ge=35, le=42)
    bmi: Optional[float] = Field(None, gt=0)
    previous_complications: Optional[int] = Field(None, ge=0, le=1)
    preexisting_diabetes: Optional[int] = Field(None, ge=0, le=1)
    gestational_diabetes: Optional[int] = Field(None, ge=0, le=1)
    mental_health: Optional[int] = Field(None, ge=0, le=1)
    heart_rate: Optional[int] = Field(None, ge=40, le=200)


class PredictionResponse(BaseModel):
    """Response schema for risk prediction"""
    risk_level: str  # low, medium, high
    overall_risk: str  # Alias for risk_level for frontend compatibility
    risk_score: float
    confidence: float
    risk_factors: List[str]
    recommendations: List[str]
    predicted_at: datetime
    specialized_assessments: Optional[dict] = None  # Specialized risk assessments
    
    @classmethod
    def from_risk_assessment(cls, assessment, risk_score_percentage: float = None):
        """Create PredictionResponse from RiskAssessment"""
        risk_factors_list = []
        if assessment.risk_factors and isinstance(assessment.risk_factors, dict):
            risk_factors_list = assessment.risk_factors.get("factors", [])
        elif isinstance(assessment.risk_factors, list):
            risk_factors_list = assessment.risk_factors
        
        recommendations_list = []
        if assessment.recommendations:
            recommendations_list = [r.strip() for r in assessment.recommendations.split("\n") if r.strip()]
        
        # risk_score in database is stored as percentage (0-100), not probability (0-1)
        # Check if it's already a percentage (> 1) or probability (<= 1)
        db_risk_score = float(assessment.risk_score)
        if risk_score_percentage is not None:
            risk_score = risk_score_percentage
        elif db_risk_score > 1.0:
            # Already a percentage, use as-is
            risk_score = db_risk_score
        else:
            # It's a probability, convert to percentage
            risk_score = db_risk_score * 100
        
        # Capitalize risk level
        risk_level = assessment.risk_level.capitalize() if assessment.risk_level else "Low"
        
        return cls(
            risk_level=risk_level,
            overall_risk=risk_level,
            risk_score=risk_score,
            confidence=0.85,
            risk_factors=risk_factors_list,
            recommendations=recommendations_list,
            predicted_at=assessment.assessed_at,
            specialized_assessments=None  # Specialized assessments not available from stored assessment
        )


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
