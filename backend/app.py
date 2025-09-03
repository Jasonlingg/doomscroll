"""
Simple FastAPI backend for Doomscroll Detox
Basic API to log extension events
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import sqlite3
import hashlib
import json

# FastAPI app
app = FastAPI(
    title="Doomscroll Detox API",
    description="Simple API for logging extension events",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class EventData(BaseModel):
    user_id: str
    event_type: str  # page_view, scroll, focus_alert, etc.
    domain: str
    url: Optional[str] = None
    duration: Optional[int] = None  # seconds
    extension_version: Optional[str] = None
    browser: Optional[str] = None

class EventBatch(BaseModel):
    events: List[EventData]

class UserSettings(BaseModel):
    user_id: str
    daily_limit: int = 30
    break_reminder: int = 15
    focus_mode_enabled: bool = False

# Database helper
def get_db():
    return sqlite3.connect("doomscroll_detox.db")

def hash_user_id(user_id: str) -> str:
    return hashlib.sha256(user_id.encode()).hexdigest()

# API endpoints
@app.get("/")
async def root():
    return {"message": "Doomscroll Detox API is running!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/v1/events")
async def log_events(event_batch: EventBatch):
    """Log events from extension"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        processed_count = 0
        
        for event in event_batch.events:
            # Hash user ID for privacy
            hashed_user_id = hash_user_id(event.user_id)
            
            # Insert event
            cursor.execute("""
                INSERT INTO usage_events 
                (user_id, event_type, timestamp, domain, url, duration, extension_version, browser)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                hashed_user_id,
                event.event_type,
                datetime.now().isoformat(),
                event.domain,
                event.url,
                event.duration,
                event.extension_version,
                event.browser
            ))
            
            # Update user last_active
            cursor.execute("""
                INSERT OR REPLACE INTO users 
                (id, last_active, daily_limit, break_reminder, focus_mode_enabled, analytics_enabled)
                VALUES (?, ?, 30, 15, 0, 1)
            """, (hashed_user_id, datetime.now().isoformat()))
            
            processed_count += 1
        
        db.commit()
        db.close()
        
        return {
            "success": True,
            "processed_count": processed_count,
            "message": f"Successfully logged {processed_count} events"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to log events"
        }

@app.get("/api/v1/users/{user_id}/stats")
async def get_user_stats(user_id: str, days: int = 7):
    """Get user statistics"""
    try:
        hashed_user_id = hash_user_id(user_id)
        db = get_db()
        cursor = db.cursor()
        
        # Get total events
        cursor.execute("""
            SELECT COUNT(*) FROM usage_events 
            WHERE user_id = ? AND timestamp >= datetime('now', '-{} days')
        """.format(days), (hashed_user_id,))
        total_events = cursor.fetchone()[0]
        
        # Get total time
        cursor.execute("""
            SELECT COALESCE(SUM(duration), 0) FROM usage_events 
            WHERE user_id = ? AND timestamp >= datetime('now', '-{} days')
        """.format(days), (hashed_user_id,))
        total_time = cursor.fetchone()[0]
        
        # Get focus alerts
        cursor.execute("""
            SELECT COUNT(*) FROM usage_events 
            WHERE user_id = ? AND event_type = 'focus_alert' 
            AND timestamp >= datetime('now', '-{} days')
        """.format(days), (hashed_user_id,))
        focus_alerts = cursor.fetchone()[0]
        
        db.close()
        
        return {
            "user_id": user_id[:8] + "...",
            "period_days": days,
            "total_events": total_events,
            "total_time_seconds": total_time,
            "total_time_minutes": round(total_time / 60, 1),
            "focus_alerts": focus_alerts,
            "daily_average_minutes": round((total_time / 60) / days, 1) if days > 0 else 0
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "message": "Failed to get user stats"
        }

@app.post("/api/v1/users/{user_id}/settings")
async def update_user_settings(user_id: str, settings: UserSettings):
    """Update user settings"""
    try:
        hashed_user_id = hash_user_id(user_id)
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO users 
            (id, last_active, daily_limit, break_reminder, focus_mode_enabled, analytics_enabled)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (
            hashed_user_id,
            datetime.now().isoformat(),
            settings.daily_limit,
            settings.break_reminder,
            settings.focus_mode_enabled
        ))
        
        db.commit()
        db.close()
        
        return {
            "success": True,
            "message": "Settings updated successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to update settings"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
