from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from app.database import get_db, SessionLocal
from app.models.message import Message
from app.models.user import User
from app.models.pregnancy import Pregnancy
from app.schemas.message import MessageCreate, MessageResponse, ConversationResponse, ConversationListResponse
from app.api.v1.dependencies import get_current_user
from app.utils.websocket_manager import manager
from typing import List, Optional
from datetime import datetime
import logging
import json
from app.utils.security import decode_token

logger = logging.getLogger(__name__)
router = APIRouter()


def get_current_user_from_token(token: str, db: Session) -> Optional[User]:
    """Extract user from JWT token for WebSocket authentication"""
    try:
        user_id = decode_token(token)
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except Exception as e:
        logger.error(f"Token decode error: {e}")
        return None


def verify_chat_permission(current_user: User, other_user_id: str, db: Session) -> bool:
    """Verify that current_user can chat with other_user"""
    # Users can always chat with themselves (shouldn't happen, but allow it)
    if current_user.id == other_user_id:
        return True
    
    # Get other user
    other_user = db.query(User).filter(User.id == other_user_id).first()
    if not other_user:
        return False
    
    # Patients can chat with their assigned providers
    if current_user.role == "patient":
        # Check if other_user is a provider assigned to any of current_user's pregnancies
        pregnancies = db.query(Pregnancy).filter(
            Pregnancy.user_id == current_user.id,
            Pregnancy.is_active == True
        ).all()
        
        for pregnancy in pregnancies:
            if pregnancy.doctor_name == other_user.full_name and other_user.role == "provider":
                return True
        
        # Also allow if other_user is a provider (for flexibility)
        if other_user.role == "provider":
            return True
    
    # Providers can chat with their patients
    if current_user.role == "provider":
        # Check if other_user is a patient with this provider assigned
        pregnancies = db.query(Pregnancy).filter(
            Pregnancy.user_id == other_user_id,
            Pregnancy.is_active == True
        ).all()
        
        for pregnancy in pregnancies:
            if pregnancy.doctor_name == current_user.full_name:
                return True
        
        # Also allow if other_user is a patient (for flexibility)
        if other_user.role == "patient":
            return True
    
    # Government users can chat with anyone
    if current_user.role == "government":
        return True
    
    return False


@router.post("/send", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to another user"""
    try:
        # Verify chat permission
        if not verify_chat_permission(current_user, message_data.receiver_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to chat with this user"
            )
        
        # Verify receiver exists
        receiver = db.query(User).filter(User.id == message_data.receiver_id).first()
        if not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receiver not found"
            )
        
        # Create message
        message = Message(
            sender_id=current_user.id,
            receiver_id=message_data.receiver_id,
            content=message_data.content
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Send real-time notification via WebSocket
        message_response = MessageResponse(
            id=str(message.id),
            sender_id=str(message.sender_id),
            receiver_id=str(message.receiver_id),
            content=message.content,
            is_read=message.is_read,
            read_at=message.read_at,
            created_at=message.created_at,
            updated_at=message.updated_at,
            sender_name=current_user.full_name,
            receiver_name=receiver.full_name
        )
        
        # Notify receiver via WebSocket
        await manager.send_personal_json(
            str(message.receiver_id),
            {
                "type": "chat_message",
                "message": message_response.dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"Message sent from {current_user.id} to {message_data.receiver_id}")
        
        return message_response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get list of conversations for current user"""
    try:
        logger.info(f"Getting conversations for user {current_user.id} ({current_user.email})")
        
        # Get all unique user IDs that the current user has conversed with
        # Simple approach: get all distinct user IDs from messages
        sent_user_ids = db.query(Message.receiver_id).filter(
            Message.sender_id == current_user.id
        ).distinct().all()
        
        received_user_ids = db.query(Message.sender_id).filter(
            Message.receiver_id == current_user.id
        ).distinct().all()
        
        # Combine and get unique user IDs
        all_user_ids_set = set()
        for (user_id,) in sent_user_ids:
            if user_id and user_id != current_user.id:
                all_user_ids_set.add(user_id)
        for (user_id,) in received_user_ids:
            if user_id and user_id != current_user.id:
                all_user_ids_set.add(user_id)
        
        if not all_user_ids_set:
            # Return empty list if no conversations
            logger.info(f"No conversations found for user {current_user.id}")
            return ConversationListResponse(
                conversations=[],
                total=0
            )
        
        # Get user info for each conversation partner
        all_user_ids_list = list(all_user_ids_set)
        users = db.query(User).filter(User.id.in_(all_user_ids_list)).all()
        
        user_dict = {str(user.id): user for user in users}
        
        # Build response with last message and unread count
        conversations = []
        for user_id in all_user_ids_list:
            user_id_str = str(user_id)
            if user_id_str not in user_dict:
                continue
                
            user = user_dict[user_id_str]
            
            # Get last message between current user and this user
            last_message_query = db.query(Message).filter(
                or_(
                    and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
                    and_(Message.sender_id == user_id, Message.receiver_id == current_user.id)
                )
            ).order_by(desc(Message.created_at)).first()
            
            # Get unread count
            unread_count = db.query(func.count(Message.id)).filter(
                Message.sender_id == user_id,
                Message.receiver_id == current_user.id,
                Message.is_read == False
            ).scalar() or 0
            
            # Get sender and receiver names
            sender_name = None
            receiver_name = None
            if last_message_query:
                # Query sender and receiver directly
                if last_message_query.sender_id:
                    sender = db.query(User).filter(User.id == last_message_query.sender_id).first()
                    if sender:
                        sender_name = sender.full_name
                if last_message_query.receiver_id:
                    receiver = db.query(User).filter(User.id == last_message_query.receiver_id).first()
                    if receiver:
                        receiver_name = receiver.full_name
            
            last_message = None
            if last_message_query:
                last_message = MessageResponse(
                    id=str(last_message_query.id),
                    sender_id=str(last_message_query.sender_id),
                    receiver_id=str(last_message_query.receiver_id),
                    content=last_message_query.content,
                    is_read=last_message_query.is_read,
                    read_at=last_message_query.read_at,
                    created_at=last_message_query.created_at,
                    updated_at=last_message_query.updated_at,
                    sender_name=sender_name,
                    receiver_name=receiver_name
                )
            
            # Get updated_at from last message or current time
            updated_at = last_message_query.created_at if last_message_query else datetime.utcnow()
            
            conversations.append(ConversationResponse(
                other_user_id=user_id_str,
                other_user_name=user.full_name,
                other_user_role=user.role,
                last_message=last_message,
                unread_count=unread_count,
                updated_at=updated_at
            ))
        
        # Sort by most recent message time
        conversations.sort(key=lambda x: x.updated_at, reverse=True)
        
        # Apply pagination
        paginated_conversations = conversations[offset:offset + limit]
        
        logger.info(f"Found {len(conversations)} conversations for user {current_user.id}")
        
        return ConversationListResponse(
            conversations=paginated_conversations,
            total=len(conversations)
        )
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}", exc_info=True)
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Traceback: {error_traceback}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(e)}"
        )


@router.get("/online-users")
async def get_online_users(
    current_user: User = Depends(get_current_user)
):
    """Get list of currently online users (users with active WebSocket connections)"""
    try:
        online_user_ids = list(manager.active_connections.keys())
        return {"online_user_ids": online_user_ids}
    except Exception as e:
        logger.error(f"Error getting online users: {e}", exc_info=True)
        return {"online_user_ids": []}


@router.get("/conversation/{other_user_id}", response_model=List[MessageResponse])
async def get_conversation(
    other_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get messages in a conversation with another user"""
    try:
        # Verify chat permission
        if not verify_chat_permission(current_user, other_user_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this conversation"
            )
        
        # Get messages between current_user and other_user
        messages = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == current_user.id)
            )
        ).order_by(Message.created_at.asc()).offset(offset).limit(limit).all()
        
        # Mark messages as read
        unread_messages = [m for m in messages if m.receiver_id == current_user.id and not m.is_read]
        if unread_messages:
            for msg in unread_messages:
                msg.is_read = True
                msg.read_at = datetime.utcnow()
            db.commit()
        
        # Build response
        result = []
        for message in messages:
            result.append(MessageResponse(
                id=str(message.id),
                sender_id=str(message.sender_id),
                receiver_id=str(message.receiver_id),
                content=message.content,
                is_read=message.is_read,
                read_at=message.read_at,
                created_at=message.created_at,
                updated_at=message.updated_at,
                sender_name=message.sender.full_name if message.sender else None,
                receiver_name=message.receiver.full_name if message.receiver else None
            ))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversation"
        )


@router.post("/mark-read/{message_id}")
async def mark_message_read(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Only receiver can mark as read
        if message.receiver_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only mark your own received messages as read"
            )
        
        message.is_read = True
        message.read_at = datetime.utcnow()
        db.commit()
        
        return {"status": "success", "message": "Message marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error marking message as read: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark message as read"
        )


@router.get("/available-users")
async def get_available_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users available to chat with"""
    try:
        available_users = []
        
        if current_user.role == "patient":
            # Patients can chat with their assigned providers
            pregnancies = db.query(Pregnancy).filter(
                Pregnancy.user_id == current_user.id,
                Pregnancy.is_active == True
            ).all()
            
            provider_names = set()
            for pregnancy in pregnancies:
                if pregnancy.doctor_name:
                    provider_names.add(pregnancy.doctor_name)
            
            # Get providers by name
            if provider_names:
                providers = db.query(User).filter(
                    User.role == "provider",
                    User.full_name.in_(provider_names)
                ).all()
                
                for provider in providers:
                    available_users.append({
                        "id": str(provider.id),
                        "name": provider.full_name,
                        "role": provider.role,
                        "email": provider.email
                    })
            
            # Also show all providers if no specific assignment (for flexibility)
            if not available_users:
                all_providers = db.query(User).filter(User.role == "provider").limit(10).all()
                for provider in all_providers:
                    available_users.append({
                        "id": str(provider.id),
                        "name": provider.full_name,
                        "role": provider.role,
                        "email": provider.email
                    })
        
        elif current_user.role == "provider":
            # Providers can chat with their patients
            logger.info(f"Provider {current_user.full_name} ({current_user.id}) requesting available users")
            
            pregnancies = db.query(Pregnancy).filter(
                Pregnancy.doctor_name == current_user.full_name,
                Pregnancy.is_active == True
            ).all()
            
            logger.info(f"Found {len(pregnancies)} pregnancies with doctor_name='{current_user.full_name}'")
            
            patient_ids = [pregnancy.user_id for pregnancy in pregnancies]
            logger.info(f"Patient IDs: {patient_ids}")
            
            if patient_ids:
                patients = db.query(User).filter(
                    User.id.in_(patient_ids),
                    User.role == "patient"
                ).all()
                
                logger.info(f"Found {len(patients)} patients")
                
                for patient in patients:
                    available_users.append({
                        "id": str(patient.id),
                        "name": patient.full_name,
                        "role": patient.role,
                        "email": patient.email
                    })
            else:
                logger.warning(f"No patient IDs found for provider {current_user.full_name}")
                # Fallback: show all patients if no specific assignment (for testing)
                all_patients = db.query(User).filter(User.role == "patient").limit(20).all()
                logger.info(f"Fallback: Showing {len(all_patients)} patients")
                for patient in all_patients:
                    available_users.append({
                        "id": str(patient.id),
                        "name": patient.full_name,
                        "role": patient.role,
                        "email": patient.email
                    })
        
        elif current_user.role == "government":
            # Government users can chat with anyone
            all_users = db.query(User).filter(
                User.id != current_user.id
            ).limit(50).all()
            
            for user in all_users:
                available_users.append({
                    "id": str(user.id),
                    "name": user.full_name,
                    "role": user.role,
                    "email": user.email
                })
        
        logger.info(f"Returning {len(available_users)} available users for {current_user.role} user {current_user.email}")
        return {"users": available_users, "total": len(available_users)}
        
    except Exception as e:
        logger.error(f"Error getting available users: {e}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available users: {str(e)}"
        )


@router.websocket("/ws/chat/{token}")
async def websocket_chat(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time chat messages"""
    db = SessionLocal()
    user = None
    try:
        # Authenticate user
        user = get_current_user_from_token(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        user_id = str(user.id)
        
        # Connect user
        await manager.connect(websocket, user_id)
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "user_id": user_id,
            "message": f"Connected to MamaCare chat as {user.full_name}"
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                
                # Handle ping/pong for keep-alive
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
                elif data == "close":
                    break
                else:
                    # Try to parse as JSON for signaling messages
                    try:
                        message = json.loads(data)
                        message_type = message.get("type")
                        
                        # Handle call signaling messages
                        if message_type in ["offer", "answer", "ice-candidate", "hangup"]:
                            target_user_id = message.get("target_user_id")
                            
                            if not target_user_id:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": "target_user_id is required for call signaling"
                                })
                                continue
                            
                            # Forward signaling message to target user
                            await manager.send_personal_json(target_user_id, {
                                "type": f"call_{message_type}",
                                "from_user_id": user_id,
                                "from_user_name": user.full_name,
                                **{k: v for k, v in message.items() if k not in ["type", "target_user_id"]}
                            })
                            
                            logger.info(f"Call signaling message {message_type} from {user_id} to {target_user_id}")
                        elif message_type == "call_request":
                            # Handle incoming call request - forward notification
                            target_user_id = message.get("target_user_id")
                            call_type = message.get("call_type", "audio")  # audio or video
                            
                            if target_user_id:
                                await manager.send_personal_json(target_user_id, {
                                    "type": "incoming_call",
                                    "from_user_id": user_id,
                                    "from_user_name": user.full_name,
                                    "call_type": call_type
                                })
                        elif message_type == "call_accepted":
                            # Handle call acceptance - notify the caller
                            target_user_id = message.get("target_user_id")
                            if target_user_id:
                                await manager.send_personal_json(target_user_id, {
                                    "type": "call_accepted",
                                    "from_user_id": user_id,
                                    "from_user_name": user.full_name
                                })
                        elif message_type == "call_rejected":
                            # Handle call rejection - notify the caller
                            target_user_id = message.get("target_user_id")
                            if target_user_id:
                                await manager.send_personal_json(target_user_id, {
                                    "type": "call_rejected",
                                    "from_user_id": user_id,
                                    "from_user_name": user.full_name
                                })
                    except json.JSONDecodeError:
                        # Not JSON, ignore
                        pass
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}", exc_info=True)
                break
    
    except WebSocketDisconnect:
        if user:
            manager.disconnect(websocket, str(user.id))
            logger.info(f"User {user.id} disconnected from chat")
    except Exception as e:
        logger.error(f"WebSocket chat error: {e}", exc_info=True)
        try:
            await websocket.close()
        except:
            pass
    finally:
        db.close()

