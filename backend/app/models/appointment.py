from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pregnancy_id = Column(String(36), ForeignKey("pregnancies.id", ondelete="CASCADE"), nullable=False)
    
    appointment_date = Column(DateTime, nullable=False)
    clinic_name = Column(String(255), nullable=True)
    clinic_address = Column(Text, nullable=True)
    appointment_type = Column(String(100), nullable=True)
    status = Column(String(20), default="scheduled")  # scheduled, completed, cancelled
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pregnancy = relationship("Pregnancy", back_populates="appointments")
    
    def __repr__(self):
        return f"<Appointment {self.appointment_date}>"
