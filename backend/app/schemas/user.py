from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    age: Optional[int] = None
    language_preference: str = "en"
    role: str = "patient"  # patient, provider, government
    # Location fields (for providers)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    # ID Verification fields (required for provider and government roles)
    license_number: Optional[str] = None  # Medical license number for providers
    organization_name: Optional[str] = None  # Hospital/clinic for providers, agency for government
    id_document_url: Optional[str] = None  # URL to uploaded ID document


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    language_preference: Optional[str] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    verification_status: Optional[str] = None
    license_number: Optional[str] = None
    organization_name: Optional[str] = None
    created_at: datetime
    role: str  # Include role in response
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str
