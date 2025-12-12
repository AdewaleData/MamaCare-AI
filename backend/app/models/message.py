from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Sender and receiver
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Message content
    content = Column(Text, nullable=False)
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - use string references to avoid circular imports
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages", lazy="select")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages", lazy="select")
    
    def __repr__(self):
        return f"<Message {self.id} from {self.sender_id} to {self.receiver_id}>"

