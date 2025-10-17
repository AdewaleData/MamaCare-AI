from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class HealthRecordBase(BaseModel):
    systolic_bp: Optional[int] = Field(None, ge=0, le=300)
    diastolic_bp: Optional[int] = Field(None, ge=0, le=200)
    blood_sugar: Optional[float] = Field(None, ge=0, le=500)
    body_temp: Optional[float] = Field(None, ge=35, le=42)
    heart_rate: Optional[int] = Field(None, ge=40, le=200)
    weight: Optional[float] = Field(None, gt=0)
    bmi: Optional[float] = Field(None, gt=0)
    previous_complications: int = 0
    preexisting_diabetes: int = 0
    gestational_diabetes: int = 0
    mental_health: int = 0
    notes: Optional[str] = None


class HealthRecordCreate(HealthRecordBase):
    pregnancy_id: str


class HealthRecordResponse(HealthRecordBase):
    id: str
    pregnancy_id: str
    recorded_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class HealthRecordHistory(BaseModel):
    records: list[HealthRecordResponse]
    total: int
