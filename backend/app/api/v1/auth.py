from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate
from app.services.auth_service import AuthService
from app.models.user import User
from app.api.v1.dependencies import get_current_user
from app.utils.email import EmailService
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = AuthService.register_user(db, user_data)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login")
async def login(
    credentials: UserLogin,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Login user and return access token. Optionally sends token via email."""
    try:
        user, access_token = AuthService.login_user(db, credentials)
        # Use model_validate for Pydantic v2 compatibility
        try:
            user_response = UserResponse.model_validate(user)
        except Exception as model_error:
            logger.error(f"Error validating user response: {model_error}", exc_info=True)
            # Fallback: create response manually
            user_response = UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                phone=user.phone,
                age=user.age,
                language_preference=user.language_preference,
                role=getattr(user, 'role', 'patient'),
                is_active=user.is_active,
                created_at=user.created_at
            )
        
        # Send token via email if email is enabled
        if settings.EMAIL_ENABLED and user.email:
            background_tasks.add_task(
                EmailService.send_token_email,
                user.email,
                access_token,
                user.full_name
            )
            logger.info(f"Token email scheduled for {user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
    except ValueError as e:
        logger.warning(f"Login validation error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        # Always show error details for now to help debug
        error_detail = f"Login failed: {str(e)}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=error_detail
        )


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse.model_validate(current_user)


@router.put("/users/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
    try:
        # Update user fields
        if user_data.full_name is not None:
            current_user.full_name = user_data.full_name
        if user_data.phone is not None:
            current_user.phone = user_data.phone
        if user_data.language_preference is not None:
            current_user.language_preference = user_data.language_preference
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"User updated: {current_user.email}")
        return UserResponse.model_validate(current_user)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")


@router.post("/users/me/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    try:
        from app.utils.security import verify_password, hash_password
        
        # Verify current password
        if not verify_password(current_password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        
        # Update password
        current_user.password_hash = hash_password(new_password)
        db.commit()
        
        logger.info(f"Password changed for user: {current_user.email}")
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to change password")
