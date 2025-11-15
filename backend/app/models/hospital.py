from sqlalchemy import Column, String, DateTime, Float, Boolean, Integer, Text
from datetime import datetime
import uuid
from app.database import Base


class Hospital(Base):
    """Hospital/healthcare facility information"""
    __tablename__ = "hospitals"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Basic information
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # general, maternity, clinic, emergency
    category = Column(String(50), nullable=True)  # public, private, teaching
    
    # Location
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    country = Column(String(100), default="Nigeria")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    postal_code = Column(String(20), nullable=True)
    
    # Contact information
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    
    # Services
    has_emergency = Column(Boolean, default=False)
    has_maternity = Column(Boolean, default=False)
    has_ambulance = Column(Boolean, default=False)
    has_24hour = Column(Boolean, default=False)
    
    # Capacity and availability
    total_beds = Column(Integer, nullable=True)
    available_beds = Column(Integer, nullable=True)
    is_available = Column(Boolean, default=True)
    
    # Additional information
    description = Column(Text, nullable=True)
    operating_hours = Column(String(200), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Hospital {self.name}>"

