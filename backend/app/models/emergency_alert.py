from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class EmergencyAlert(Base):
    """Emergency alert/incident tracking"""
    __tablename__ = "emergency_alerts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pregnancy_id = Column(String(36), ForeignKey("pregnancies.id", ondelete="SET NULL"), nullable=True)
    
    # Location data
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String(500), nullable=True)
    
    # Emergency details
    emergency_type = Column(String(50), nullable=False)  # medical, accident, other
    severity = Column(String(20), nullable=False)  # critical, high, medium, low
    description = Column(Text, nullable=True)
    
    # Status tracking
    status = Column(String(20), default="active")  # active, responded, resolved, cancelled
    responded_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Response tracking
    contacts_notified = Column(Boolean, default=False)
    healthcare_provider_notified = Column(Boolean, default=False)
    ambulance_called = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="emergency_alerts")
    pregnancy = relationship("Pregnancy", backref="emergency_alerts")
    
    def __repr__(self):
        return f"<EmergencyAlert {self.id} - {self.status}>"

