from sqlalchemy import Column, String, DateTime, Boolean, Integer, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    language_preference = Column(String(10), default="en")
    age = Column(Integer, nullable=True)
    role = Column(String(20), default="patient")  # patient, provider, government
    
    # ID Verification fields for providers and government
    license_number = Column(String(100), nullable=True)  # Medical license number for providers
    organization_name = Column(String(255), nullable=True)  # Hospital/clinic name for providers, agency name for government
    id_document_url = Column(String(500), nullable=True)  # URL to uploaded ID document
    verification_status = Column(String(20), default="pending")  # pending, verified, rejected
    verified_at = Column(DateTime, nullable=True)  # When verification was completed
    verified_by = Column(String(36), nullable=True)  # ID of admin who verified
    
    # Location fields (for providers)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pregnancies = relationship("Pregnancy", back_populates="user", cascade="all, delete-orphan")
    emergency_contacts = relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender", cascade="all, delete-orphan")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"
