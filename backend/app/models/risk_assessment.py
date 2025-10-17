from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pregnancy_id = Column(String(36), ForeignKey("pregnancies.id", ondelete="CASCADE"), nullable=False)
    health_record_id = Column(String(36), ForeignKey("health_records.id", ondelete="CASCADE"), nullable=True)
    
    risk_level = Column(String(20), nullable=False)  # low, medium, high
    risk_score = Column(Numeric(5, 4), nullable=False)
    risk_factors = Column(JSON, nullable=True)  # Array of detected risk factors
    recommendations = Column(Text, nullable=True)
    
    assessed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pregnancy = relationship("Pregnancy", back_populates="risk_assessments")
    health_record = relationship("HealthRecord", back_populates="risk_assessment")
    
    def __repr__(self):
        return f"<RiskAssessment {self.risk_level}>"
