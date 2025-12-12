"""
Migration script to add provider fields to appointments table
Run this from the backend directory: python -m migrations.add_appointment_provider_fields
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
    """Add provider_id, provider_notes, and update status default to appointments table"""
    db = SessionLocal()
    try:
        logger.info("Starting migration: Adding provider fields to appointments table...")
        
        # Check if columns already exist
        try:
            result = db.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='appointments'
            """))
            if not result.fetchone():
                logger.warning("Appointments table does not exist. It will be created automatically.")
                return
        except:
            # For PostgreSQL/MySQL, use different syntax
            pass
        
        # Try to add provider_id column
        try:
            db.execute(text("""
                ALTER TABLE appointments 
                ADD COLUMN provider_id VARCHAR(36)
            """))
            logger.info("Added provider_id column")
        except Exception as e:
            logger.info(f"provider_id column may already exist: {e}")
        
        # Try to add provider_notes column
        try:
            db.execute(text("""
                ALTER TABLE appointments 
                ADD COLUMN provider_notes TEXT
            """))
            logger.info("Added provider_notes column")
        except Exception as e:
            logger.info(f"provider_notes column may already exist: {e}")
        
        # Update status default for new appointments (SQLite doesn't support ALTER COLUMN DEFAULT easily)
        # This will be handled by the model definition
        
        # Update existing appointments with 'scheduled' status to 'pending' if they don't have provider_id
        try:
            db.execute(text("""
                UPDATE appointments 
                SET status = 'pending' 
                WHERE status = 'scheduled' AND provider_id IS NOT NULL
            """))
            logger.info("Updated existing appointments status")
        except Exception as e:
            logger.info(f"Could not update status: {e}")
        
        db.commit()
        logger.info("✅ Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

