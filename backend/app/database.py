from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import urlparse
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def _resolve_database_url() -> str:
    """Use SQLite as a safe fallback when no usable database is configured."""
    database_url = (settings.DATABASE_URL or "").strip()

    if not database_url or database_url.startswith("sqlite"):
        return "sqlite:///./mamacare-ai.db"

    parsed = urlparse(database_url)
    host = (parsed.hostname or "").lower()

    if host in {"localhost", "127.0.0.1", "::1"}:
        logger.warning(
            "DATABASE_URL points to localhost, but no local database is available. "
            "Falling back to SQLite for startup."
        )
        return "sqlite:///./mamacare-ai.db"

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
