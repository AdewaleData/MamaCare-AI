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
        """Register a new user with ID verification for providers and government"""
        try:
            # Check if user exists (query only email to avoid column errors)
            existing_user = db.query(User.id).filter(User.email == user_data.email).first()
            if existing_user:
                raise ValueError("User with this email already exists")
            
            # Validate ID verification fields for provider and government roles
            role = getattr(user_data, 'role', 'patient')
            if role == 'provider':
                if not user_data.license_number:
                    raise ValueError("Medical license number is required for healthcare providers")
                if not user_data.organization_name:
                    raise ValueError("Hospital/clinic name is required for healthcare providers")
                verification_status = "pending"
            elif role == 'government':
                if not user_data.organization_name:
                    raise ValueError("Ministry/Agency name is required for government registration")
                # For government, full_name might be contact person name
                if not user_data.full_name:
                    raise ValueError("Contact person name is required for government registration")
                verification_status = "pending"
            else:
                # Patient role
                if not user_data.full_name:
                    raise ValueError("Full name is required")
                verification_status = "verified"  # Patients are auto-verified
            
            # Create new user
            user = User(
                email=user_data.email,
                full_name=user_data.full_name,
                phone=user_data.phone,
                age=user_data.age,
                language_preference=user_data.language_preference,
                role=role,
                password_hash=hash_password(user_data.password),
            )
            
            # Add verification fields if they exist in the model (after migration)
            # Use setattr to avoid errors if columns don't exist yet
            try:
                if hasattr(user, 'license_number'):
                    user.license_number = getattr(user_data, 'license_number', None)
                if hasattr(user, 'organization_name'):
                    user.organization_name = getattr(user_data, 'organization_name', None)
                if hasattr(user, 'id_document_url'):
                    user.id_document_url = getattr(user_data, 'id_document_url', None)
                if hasattr(user, 'verification_status'):
                    user.verification_status = verification_status
                # Add location fields for providers
                if hasattr(user, 'address'):
                    user.address = getattr(user_data, 'address', None)
                if hasattr(user, 'city'):
                    user.city = getattr(user_data, 'city', None)
                if hasattr(user, 'state'):
                    user.state = getattr(user_data, 'state', None)
                if hasattr(user, 'country'):
                    user.country = getattr(user_data, 'country', None)
                if hasattr(user, 'latitude'):
                    user.latitude = getattr(user_data, 'latitude', None)
                if hasattr(user, 'longitude'):
                    user.longitude = getattr(user_data, 'longitude', None)
            except Exception as attr_error:
                logger.warning(f"Verification/location fields may not be available (migration may not be run): {attr_error}")
                logger.warning("User will be created without verification/location fields. Run migration to enable full features.")
            db.add(user)
            db.commit()
            db.refresh(user)
            
            logger.info(f"User registered: {user.email}, Role: {role}, Verification: {verification_status}")
            return user
            
        except ValueError:
            # Re-raise ValueError as-is (these are expected validation errors)
            raise
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
