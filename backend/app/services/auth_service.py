from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.utils.security import hash_password, verify_password, create_access_token
import logging

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def register_user(db: Session, user_data: UserCreate) -> User:
        """Register a new user"""
        try:
            # Check if user exists
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                raise ValueError("User with this email already exists")
            
            # Create new user
            user = User(
                email=user_data.email,
                full_name=user_data.full_name,
                phone=user_data.phone,
                age=user_data.age,
                language_preference=user_data.language_preference,
                role=getattr(user_data, 'role', 'patient'),  # Default to patient if not specified
                password_hash=hash_password(user_data.password),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            logger.info(f"User registered: {user.email}")
            return user
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error registering user: {e}")
            raise
    
    @staticmethod
    def login_user(db: Session, credentials: UserLogin) -> tuple[User, str]:
        """Authenticate user and return access token"""
        try:
            logger.info(f"Attempting login for email: {credentials.email}")
            user = db.query(User).filter(User.email == credentials.email).first()
            
            if not user:
                logger.warning(f"User not found: {credentials.email}")
                raise ValueError("Invalid email or password")
            
            logger.info(f"User found: {user.email}, checking password...")
            
            if not verify_password(credentials.password, user.password_hash):
                logger.warning(f"Password verification failed for: {credentials.email}")
                raise ValueError("Invalid email or password")
            
            if not user.is_active:
                logger.warning(f"Inactive user attempted login: {credentials.email}")
                raise ValueError("User account is inactive")
            
            # Create access token
            logger.info(f"Creating access token for user: {user.id}")
            access_token = create_access_token(user.id)
            
            logger.info(f"User logged in successfully: {user.email}")
            return user, access_token
            
        except ValueError:
            # Re-raise ValueError as-is (these are expected validation errors)
            raise
        except Exception as e:
            logger.error(f"Error logging in user: {e}", exc_info=True)
            raise
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
