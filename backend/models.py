"""
Database models for Doomscroll Detox
Simple SQLAlchemy models for tracking user usage
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import hashlib

Base = declarative_base()

class User(Base):
    """User model for storing user profiles and settings"""
    __tablename__ = "users"
    
    id = Column(String(64), primary_key=True)  # Hashed user ID
    created_at = Column(DateTime, default=func.now())
    last_active = Column(DateTime, default=func.now())
    
    # Settings
    daily_limit = Column(Integer, default=30)  # minutes
    break_reminder = Column(Integer, default=15)  # minutes
    focus_mode_enabled = Column(Boolean, default=False)
    focus_sensitivity = Column(String(20), default="medium")  # low, medium, high
    show_overlays = Column(Boolean, default=True)
    enabled = Column(Boolean, default=True)
    monitored_websites = Column(Text, default="[]")  # JSON string of domain names
    analytics_enabled = Column(Boolean, default=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_user_last_active', 'last_active'),
    )

class UsageEvent(Base):
    """Usage events from the extension"""
    __tablename__ = "usage_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)
    
    # Event data
    event_type = Column(String(50), nullable=False)  # page_view, scroll, focus_alert, etc.
    timestamp = Column(DateTime, nullable=False, index=True)
    domain = Column(String(255), nullable=False, index=True)
    url = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds
    
    # Metadata
    extension_version = Column(String(20), nullable=True)
    browser = Column(String(50), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_usage_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_usage_domain', 'domain'),
        Index('idx_usage_event_type', 'event_type'),
    )

class DailyStats(Base):
    """Daily aggregated statistics"""
    __tablename__ = "daily_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)
    date = Column(DateTime, nullable=False)  # Date only
    
    # Statistics
    total_time = Column(Integer, default=0)  # seconds
    page_views = Column(Integer, default=0)
    focus_alerts = Column(Integer, default=0)
    break_reminders = Column(Integer, default=0)
    
    # Indexes
    __table_args__ = (
        Index('idx_daily_stats_user_date', 'user_id', 'date'),
    )

# Utility functions
def hash_user_id(user_identifier: str) -> str:
    """Create a hashed user ID for privacy"""
    return hashlib.sha256(user_identifier.encode()).hexdigest()
