from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PregnancyBase(BaseModel):
    due_date: str = Field(..., description="Due date in YYYY-MM-DD format")
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    blood_type: Optional[str] = None
    notes: Optional[str] = None


class PregnancyCreate(PregnancyBase):
    """Schema for creating a new pregnancy"""
    pass


class PregnancyUpdate(BaseModel):
    """Schema for updating pregnancy information"""
    due_date: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    blood_type: Optional[str] = None
    notes: Optional[str] = None


class PregnancyResponse(PregnancyBase):
    """Schema for pregnancy response"""
    id: str
    user_id: str
    pregnancy_stage: Optional[str] = None
    current_week: Optional[int] = None
    trimester: Optional[int] = None
    is_active: bool
    provider_confirmed: Optional[bool] = False
    provider_confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
