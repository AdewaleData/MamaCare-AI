from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.utils.websocket_manager import manager
from app.utils.security import decode_token
from app.models.user import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])

def get_current_user_from_token(token: str, db: Session) -> User:
    """Get current user from JWT token string (for WebSocket)"""
    try:
        user_id = decode_token(token)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        return user
    except Exception as e:
        logger.error(f"Token authentication error: {e}")
        return None

@router.websocket("/ws/alerts/{token}")
async def websocket_alerts(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for real-time emergency alerts.
    
    Connect with: ws://localhost:8001/ws/alerts/{jwt_token}
    
    Messages sent:
    - type: "emergency_alert" - new emergency alert
    - type: "alert_acknowledged" - alert was acknowledged
    - type: "alert_resolved" - alert was resolved
    - type: "risk_assessment" - new risk assessment completed
    """
    db = SessionLocal()
    user = None
    try:
        # Decode token to get user_id
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
            "message": f"Connected to MamaCare alerts as {user.full_name}"
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            
            # Handle ping/pong for keep-alive
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            elif data == "close":
                break
    
    except WebSocketDisconnect:
        if user:
            manager.disconnect(websocket, str(user.id))
            logger.info(f"User {user.id} disconnected from alerts")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass
    finally:
        db.close()

