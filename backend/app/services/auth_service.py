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
            user = db.query(User).filter(User.email == credentials.email).first()
            
            if not user or not verify_password(credentials.password, user.password_hash):
                raise ValueError("Invalid email or password")
            
            if not user.is_active:
                raise ValueError("User account is inactive")
            
            # Create access token
            access_token = create_access_token(user.id)
            
            logger.info(f"User logged in: {user.email}")
            return user, access_token
            
        except Exception as e:
            logger.error(f"Error logging in user: {e}")
            raise
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
