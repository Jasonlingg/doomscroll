"""
Database connection and setup
Simple SQLite database for local development
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import os

# Database configuration
DATABASE_URL = "sqlite:///./doomscroll_detox.db"

# Engine configuration for SQLite
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=True  # Show SQL queries in console
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    from models import Base
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

def drop_tables():
    """Drop all database tables (use with caution!)"""
    from models import Base
    Base.metadata.drop_all(bind=engine)
    print("🗑️ Database tables dropped!")

def init_db():
    """Initialize database with sample data"""
    from models import User, hash_user_id
    
    db = SessionLocal()
    
    # Create a sample user
    sample_user_id = hash_user_id("sample_user_123")
    user = User(
        id=sample_user_id,
        daily_limit=30,
        break_reminder=15,
        focus_mode_enabled=True
    )
    
    db.add(user)
    db.commit()
    db.close()
    
    print("✅ Sample data created!")
    print(f"Sample user ID: {sample_user_id[:8]}...")
