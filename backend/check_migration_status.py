"""
Quick script to check if user verification fields migration has been run
Run this from the backend directory: python check_migration_status.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from sqlalchemy import text, inspect
from app.models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_migration():
    """Check if verification fields exist in users table"""
    db = SessionLocal()
    try:
        # Check using SQLAlchemy inspector
        inspector = inspect(db.bind)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        required_fields = [
            'license_number',
            'organization_name',
            'id_document_url',
            'verification_status',
            'verified_at',
            'verified_by'
        ]
        
        logger.info("Checking migration status...")
        logger.info(f"Current columns in users table: {columns}")
        
        missing_fields = []
        for field in required_fields:
            if field not in columns:
                missing_fields.append(field)
        
        if missing_fields:
            logger.warning(f"❌ Migration NOT complete. Missing fields: {missing_fields}")
            logger.info("")
            logger.info("To fix this, run:")
            logger.info("  python -m migrations.add_user_verification_fields")
            return False
        else:
            logger.info("✅ Migration complete! All verification fields exist.")
            return True
            
    except Exception as e:
        logger.error(f"Error checking migration: {e}")
        logger.info("")
        logger.info("If the users table doesn't exist yet, it will be created automatically on first run.")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    check_migration()

