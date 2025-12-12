"""
Migration script to add ID verification fields to users table
Run this from the backend directory: python -m migrations.add_user_verification_fields
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Add ID verification fields to users table"""
    db = SessionLocal()
    try:
        logger.info("Starting migration: Adding ID verification fields to users table...")
        
        # Check if table exists
        try:
            result = db.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='users'
            """))
            if not result.fetchone():
                logger.warning("Users table does not exist. It will be created automatically.")
                return
        except:
            # For PostgreSQL/MySQL, use different syntax
            pass
        
        # Add license_number column
        try:
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN license_number VARCHAR(100)
            """))
            logger.info("✅ Added license_number column")
        except Exception as e:
            logger.info(f"license_number column may already exist: {e}")
        
        # Add organization_name column
        try:
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN organization_name VARCHAR(255)
            """))
            logger.info("✅ Added organization_name column")
        except Exception as e:
            logger.info(f"organization_name column may already exist: {e}")
        
        # Add id_document_url column
        try:
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN id_document_url VARCHAR(500)
            """))
            logger.info("✅ Added id_document_url column")
        except Exception as e:
            logger.info(f"id_document_url column may already exist: {e}")
        
        # Add verification_status column
        try:
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN verification_status VARCHAR(20) DEFAULT 'verified'
            """))
            logger.info("✅ Added verification_status column")
        except Exception as e:
            logger.info(f"verification_status column may already exist: {e}")
        
        # Add verified_at column
        try:
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN verified_at DATETIME
            """))
            logger.info("✅ Added verified_at column")
        except Exception as e:
            logger.info(f"verified_at column may already exist: {e}")
        
        # Add verified_by column
        try:
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN verified_by VARCHAR(36)
            """))
            logger.info("✅ Added verified_by column")
        except Exception as e:
            logger.info(f"verified_by column may already exist: {e}")
        
        # Update existing users to have verified status
        try:
            db.execute(text("""
                UPDATE users 
                SET verification_status = 'verified' 
                WHERE verification_status IS NULL
            """))
            logger.info("✅ Updated existing users verification status")
        except Exception as e:
            logger.info(f"Could not update verification status: {e}")
        
        db.commit()
        logger.info("✅✅✅ Migration completed successfully! ✅✅✅")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

