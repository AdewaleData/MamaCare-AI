from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class Pregnancy(Base):
    __tablename__ = "pregnancies"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    due_date = Column(Date, nullable=False)
    pregnancy_stage = Column(String(20), nullable=True)  # trimester1, trimester2, trimester3
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="pregnancies")
    health_records = relationship("HealthRecord", back_populates="pregnancy", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="pregnancy", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="pregnancy", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Pregnancy {self.id}>"
