from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    receiver_id: str = Field(..., description="ID of the message receiver")
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Sender and receiver info
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    other_user_id: str
    other_user_name: str
    other_user_role: str
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    updated_at: datetime


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int

