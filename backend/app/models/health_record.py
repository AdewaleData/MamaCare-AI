from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Integer, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class HealthRecord(Base):
    __tablename__ = "health_records"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pregnancy_id = Column(String(36), ForeignKey("pregnancies.id", ondelete="CASCADE"), nullable=False)
    
    # Vital signs
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    blood_sugar = Column(Numeric(5, 2), nullable=True)
    body_temp = Column(Numeric(4, 2), nullable=True)
    heart_rate = Column(Integer, nullable=True)
    weight = Column(Numeric(5, 2), nullable=True)
    bmi = Column(Numeric(5, 2), nullable=True)
    
    # Medical history
    previous_complications = Column(Integer, default=0)  # 0 or 1
    preexisting_diabetes = Column(Integer, default=0)
    gestational_diabetes = Column(Integer, default=0)
    mental_health = Column(Integer, default=0)
    
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pregnancy = relationship("Pregnancy", back_populates="health_records")
    risk_assessment = relationship("RiskAssessment", back_populates="health_record", uselist=False)
    
    def __repr__(self):
        return f"<HealthRecord {self.id}>"
