from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    relationship_type = Column(String(100), nullable=True)  # Renamed from 'relationship' to avoid conflict
    is_primary = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships - use string reference to avoid circular import
    # The relationship will be properly configured when all models are loaded
    user = relationship("User", back_populates="emergency_contacts", lazy="select")
    
    def __repr__(self):
        return f"<EmergencyContact {self.name}>"
