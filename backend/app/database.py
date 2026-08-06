from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import urlparse
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def _resolve_database_url() -> str:
    """Resolve the database connection string from configuration."""
    database_url = (settings.DATABASE_URL or "").strip()

    if not database_url or database_url.startswith("sqlite"):
        return "sqlite:///./mamacare-ai.db"

    # Support postgres:// URLs from Render/Heroku
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    return database_url


def _build_engine(database_url: str):
    if database_url.startswith("sqlite"):
        return create_engine(
            database_url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False},
        )

    return create_engine(
        database_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


DATABASE_URL = _resolve_database_url()

try:
    engine = _build_engine(DATABASE_URL)
    if DATABASE_URL.startswith("postgres"):
        with engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database.")
except Exception as exc:
    logger.warning(
        "PostgreSQL connection failed, falling back to sqlite local database: %s",
        exc,
    )
    DATABASE_URL = "sqlite:///./mamacare-ai.db"
    engine = _build_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise
