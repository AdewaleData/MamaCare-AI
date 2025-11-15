from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.security import decode_token
from typing import Optional
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token - shared across all routers"""
    try:
        # Try to get token from HTTPBearer first
        token = None
        if credentials:
            token = credentials.credentials
        elif authorization:
            # Handle "Bearer <token>" format
            if authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "")
            else:
                token = authorization
        
        if not token:
            logger.error("No token provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Received token: {token[:20]}...")
        logger.info(f"Token length: {len(token)}")
        
        user_id = decode_token(token)
        logger.info(f"Decoded user_id: {user_id}")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User not found for ID: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        logger.info(f"User found: {user.email}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_from_token(token: str) -> User:
    """Get current user from JWT token string (for WebSocket)"""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        user_id = decode_token(token)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        return user
    except Exception as e:
        logger.error(f"Token authentication error: {e}")
        return None
    finally:
        db.close()