from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class OfflineSync(Base):
    """Offline data synchronization tracking"""
    __tablename__ = "offline_syncs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Sync metadata
    device_id = Column(String(255), nullable=False)
    sync_type = Column(String(50), nullable=False)  # upload, download, conflict_resolution
    entity_type = Column(String(50), nullable=False)  # health_record, appointment, etc.
    entity_id = Column(String(36), nullable=True)
    
    # Sync status
    status = Column(String(20), default="pending")  # pending, syncing, completed, failed, conflict
    conflict_resolution = Column(String(50), nullable=True)  # server_wins, client_wins, merged
    
    # Data
    client_data = Column(Text, nullable=True)  # JSON string of client data
    server_data = Column(Text, nullable=True)  # JSON string of server data
    merged_data = Column(Text, nullable=True)  # JSON string of merged data
    
    # Timestamps
    client_timestamp = Column(DateTime, nullable=True)
    server_timestamp = Column(DateTime, default=datetime.utcnow)
    synced_at = Column(DateTime, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="offline_syncs")
    
    def __repr__(self):
        return f"<OfflineSync {self.id} - {self.status}>"

