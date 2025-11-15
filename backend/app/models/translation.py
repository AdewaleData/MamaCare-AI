from sqlalchemy import Column, String, DateTime, Text, Boolean
from datetime import datetime
import uuid
from app.database import Base


class Translation(Base):
    """Translation content for multilingual support"""
    __tablename__ = "translations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Translation key and language
    key = Column(String(255), nullable=False, index=True)  # e.g., "welcome_message"
    language = Column(String(10), nullable=False, index=True)  # en, ha, yo, ig
    category = Column(String(50), nullable=True)  # ui, health_tips, recommendations, etc.
    
    # Content
    value = Column(Text, nullable=False)  # Translated text
    
    # Metadata
    context = Column(Text, nullable=True)  # Usage context
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Translation {self.key} - {self.language}>"

