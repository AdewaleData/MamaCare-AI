from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.config import settings
import logging
import hashlib

logger = logging.getLogger(__name__)

# Password hashing - use bcrypt with proper configuration
try:
    pwd_context = CryptContext(
        schemes=["bcrypt"], 
        deprecated="auto",
        bcrypt__rounds=12,
        bcrypt__min_rounds=10,
        bcrypt__max_rounds=15
    )
    logger.info("Bcrypt context initialized successfully")
except Exception as e:
    logger.warning(f"Bcrypt not available, using fallback: {e}")
    pwd_context = None


def hash_password(password: str) -> str:
    """Hash a password"""
    if pwd_context is not None:
        try:
            # Ensure password is not too long for bcrypt (72 bytes max)
            if len(password.encode('utf-8')) > 72:
                password = password[:72]
            hashed = pwd_context.hash(password)
            logger.info("Password hashed successfully with bcrypt")
            return hashed
        except Exception as e:
            logger.error(f"Bcrypt hashing failed: {e}")
            # Don't fall back, raise the error
            raise ValueError(f"Password hashing failed: {e}")
    
    # Fallback to SHA-256 with salt (only if bcrypt is completely unavailable)
    salt = settings.SECRET_KEY[:16]  # Use part of secret key as salt
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    logger.warning("Using SHA-256 fallback for password hashing")
    return hashed


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    if pwd_context is not None:
        try:
            # Ensure password is not too long for bcrypt (72 bytes max)
            if len(plain_password.encode('utf-8')) > 72:
                plain_password = plain_password[:72]
            
            result = pwd_context.verify(plain_password, hashed_password)
            logger.info(f"Password verification result: {result}")
            return result
        except Exception as e:
            logger.error(f"Bcrypt verification failed: {e}")
            # Don't fall back, return False
            return False
    
    # Fallback verification (only if bcrypt is completely unavailable)
    salt = settings.SECRET_KEY[:16]
    expected_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
    result = expected_hash == hashed_password
    logger.warning(f"Using SHA-256 fallback for password verification: {result}")
    return result


def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
    """Create JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    to_encode = {"sub": user_id, "exp": expire}
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> str:
    """Decode JWT token and return user_id"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise ValueError("Invalid token")
        return user_id
    except JWTError as e:
        logger.error(f"Token decode error: {e}")
        raise ValueError("Invalid token")
