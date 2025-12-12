import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Add location fields to users table"""
    db = SessionLocal()
    try:
        logger.info("Starting migration: Adding location fields to users table...")
        
        # Check if columns already exist and add if not
        columns_to_add = {
            "address": "VARCHAR(500)",
            "city": "VARCHAR(100)",
            "state": "VARCHAR(100)",
            "country": "VARCHAR(100)",
            "latitude": "FLOAT",
            "longitude": "FLOAT"
        }
        
        for col_name, col_type in columns_to_add.items():
            try:
                db.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                logger.info(f"✅ Added {col_name} column")
            except Exception as e:
                logger.info(f"{col_name} column may already exist or another error occurred: {e}")

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

