"""
Simple FastAPI backend for Doomscroll Detox
Basic API to log extension events
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import sqlite3
import hashlib
import json
from collections import defaultdict
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

# FastAPI app
app = FastAPI(
    title="Doomscroll Detox API",
    description="Simple API for logging extension events with analytics",
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
    focus_sensitivity: str = "medium"  # low, medium, high
    show_overlays: bool = True
    enabled: bool = True
    monitored_websites: List[str] = []  # List of domain names

class AnalyticsRequest(BaseModel):
    user_id: Optional[str] = None
    days: int = 7
    event_type: Optional[str] = None

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
        conn = get_db()
        cursor = conn.cursor()
        
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
        
        conn.commit()
        conn.close()
        
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
        conn = get_db()
        cursor = conn.cursor()
        
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
        
        conn.close()
        
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

@app.get("/api/v1/users/{user_id}/settings")
async def get_user_settings(user_id: str):
    """Get user settings"""
    try:
        hashed_user_id = hash_user_id(user_id)
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT daily_limit, break_reminder, focus_mode_enabled, 
                   focus_sensitivity, show_overlays, enabled, monitored_websites
            FROM users 
            WHERE id = ?
        """, (hashed_user_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            # Parse monitored_websites JSON string back to list
            if result[6]:
                monitored_websites = json.loads(result[6])
            else:
                # Return default websites if null
                monitored_websites = [
                    {"domain": "facebook.com", "name": "Facebook", "enabled": True, "isDefault": True},
                    {"domain": "x.com", "name": "X (Twitter)", "enabled": True, "isDefault": True},
                    {"domain": "instagram.com", "name": "Instagram", "enabled": True, "isDefault": True},
                    {"domain": "tiktok.com", "name": "TikTok", "enabled": True, "isDefault": True},
                    {"domain": "reddit.com", "name": "Reddit", "enabled": True, "isDefault": True},
                    {"domain": "youtube.com", "name": "YouTube", "enabled": True, "isDefault": True},
                    {"domain": "linkedin.com", "name": "LinkedIn", "enabled": False, "isDefault": True},
                    {"domain": "snapchat.com", "name": "Snapchat", "enabled": False, "isDefault": True}
                ]
            
            return {
                "success": True,
                "settings": {
                    "daily_limit": result[0],
                    "break_reminder": result[1],
                    "focus_mode_enabled": result[2],
                    "focus_sensitivity": result[3],
                    "show_overlays": result[4],
                    "enabled": result[5],
                    "monitored_websites": monitored_websites
                }
            }
        else:
            # Return default settings if user doesn't exist
            default_websites = [
                {"domain": "facebook.com", "name": "Facebook", "enabled": True, "isDefault": True},
                {"domain": "twitter.com", "name": "Twitter/X", "enabled": True, "isDefault": True},
                {"domain": "x.com", "name": "X (Twitter)", "enabled": True, "isDefault": True},
                {"domain": "instagram.com", "name": "Instagram", "enabled": True, "isDefault": True},
                {"domain": "tiktok.com", "name": "TikTok", "enabled": True, "isDefault": True},
                {"domain": "reddit.com", "name": "Reddit", "enabled": True, "isDefault": True},
                {"domain": "youtube.com", "name": "YouTube", "enabled": True, "isDefault": True},
                {"domain": "linkedin.com", "name": "LinkedIn", "enabled": False, "isDefault": True},
                {"domain": "snapchat.com", "name": "Snapchat", "enabled": False, "isDefault": True}
            ]
            return {
                "success": True,
                "settings": {
                    "daily_limit": 30,
                    "break_reminder": 15,
                    "focus_mode_enabled": False,
                    "focus_sensitivity": "medium",
                    "show_overlays": True,
                    "enabled": True,
                    "monitored_websites": default_websites
                }
            }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to get settings"
        }

@app.post("/api/v1/users/{user_id}/settings")
async def update_user_settings(user_id: str, settings: UserSettings):
    """Update user settings"""
    try:
        hashed_user_id = hash_user_id(user_id)
        conn = get_db()
        cursor = conn.cursor()
        
        # Convert monitored_websites list to JSON string
        monitored_websites_json = json.dumps(settings.monitored_websites)
        
        cursor.execute("""
            INSERT OR REPLACE INTO users 
            (id, last_active, daily_limit, break_reminder, focus_mode_enabled, 
             focus_sensitivity, show_overlays, enabled, monitored_websites, analytics_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            hashed_user_id,
            datetime.now().isoformat(),
            settings.daily_limit,
            settings.break_reminder,
            settings.focus_mode_enabled,
            settings.focus_sensitivity,
            settings.show_overlays,
            settings.enabled,
            monitored_websites_json
        ))
        
        conn.commit()
        conn.close()
        
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

# New Analytics Endpoints

@app.get("/api/v1/analytics/overview")
async def get_analytics_overview(days: int = 7):
    """Get overall analytics for all users"""
    conn = get_db()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Overall stats
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT user_id) as active_users,
            COUNT(*) as total_events,
            AVG(duration) as avg_duration,
            SUM(duration) as total_duration_minutes
        FROM usage_events 
        WHERE timestamp >= ?
    """, (cutoff_date,))
    
    overall_stats = cursor.fetchone()
    
    # User settings summary
    cursor.execute("""
        SELECT 
            COUNT(*) as total_users,
            AVG(daily_limit) as avg_daily_limit,
            AVG(break_reminder) as avg_break_reminder,
            COUNT(CASE WHEN focus_mode_enabled = 1 THEN 1 END) as focus_mode_users,
            COUNT(CASE WHEN analytics_enabled = 1 THEN 1 END) as analytics_users
        FROM users
    """)
    
    user_settings = cursor.fetchone()
    
    # Events by type
    cursor.execute("""
        SELECT event_type, COUNT(*) as count
        FROM usage_events 
        WHERE timestamp >= ?
        GROUP BY event_type
        ORDER BY count DESC
    """, (cutoff_date,))
    
    events_by_type = dict(cursor.fetchall())
    
    # Top domains
    cursor.execute("""
        SELECT domain, COUNT(*) as visits, AVG(duration) as avg_duration
        FROM usage_events 
        WHERE timestamp >= ? AND event_type = 'usage_sync'
        GROUP BY domain
        ORDER BY visits DESC
        LIMIT 10
    """, (cutoff_date,))
    
    top_domains = [{"domain": row[0], "visits": row[1], "avg_duration": round(row[2] or 0, 1)} for row in cursor.fetchall()]
    
    # Daily usage trends
    cursor.execute("""
        SELECT 
            DATE(timestamp) as date,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(*) as total_events,
            AVG(duration) as avg_duration
        FROM usage_events 
        WHERE timestamp >= ?
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    """, (cutoff_date,))
    
    daily_trends = [{"date": row[0], "active_users": row[1], "total_events": row[2], "avg_duration": round(row[3] or 0, 1)} for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "period_days": days,
        "overall_stats": {
            "active_users": overall_stats[0],
            "total_events": overall_stats[1],
            "avg_duration_minutes": round(overall_stats[2] or 0, 1),
            "total_duration_minutes": overall_stats[3] or 0,
            "total_duration_hours": round((overall_stats[3] or 0) / 60, 1)
        },
        "user_settings_summary": {
            "total_users": user_settings[0],
            "avg_daily_limit_minutes": round(user_settings[1] or 0, 1),
            "avg_break_reminder_minutes": round(user_settings[2] or 0, 1),
            "focus_mode_enabled_users": user_settings[3],
            "analytics_enabled_users": user_settings[4]
        },
        "events_by_type": events_by_type,
        "top_domains": top_domains,
        "daily_trends": daily_trends
    }

@app.get("/api/v1/analytics/users")
async def get_user_analytics(days: int = 7, limit: int = 10):
    """Get analytics for top users with full user information"""
    conn = get_db()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Get top users with full user information
    cursor.execute("""
        SELECT 
            u.id as user_id,
            u.created_at,
            u.last_active,
            u.daily_limit,
            u.break_reminder,
            u.focus_mode_enabled,
            u.analytics_enabled,
            COUNT(e.id) as total_events,
            COUNT(DISTINCT e.domain) as unique_domains,
            AVG(e.duration) as avg_duration,
            MAX(e.duration) as max_duration,
            SUM(e.duration) as total_duration_minutes,
            COUNT(CASE WHEN e.event_type = 'focus_alert' THEN 1 END) as focus_alerts,
            COUNT(CASE WHEN e.event_type = 'break_reminder' THEN 1 END) as break_reminders,
            COUNT(CASE WHEN e.event_type = 'daily_limit_reached' THEN 1 END) as limit_reached,
            COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) as page_views
        FROM users u
        LEFT JOIN usage_events e ON u.id = e.user_id AND e.timestamp >= ?
        GROUP BY u.id, u.created_at, u.last_active, u.daily_limit, u.break_reminder, 
                 u.focus_mode_enabled, u.analytics_enabled
        ORDER BY total_events DESC
        LIMIT ?
    """, (cutoff_date, limit))
    
    top_users = []
    for row in cursor.fetchall():
        # Calculate days since creation and last activity
        created_at = datetime.fromisoformat(row[1].replace('Z', '+00:00')) if row[1] else None
        last_active = datetime.fromisoformat(row[2].replace('Z', '+00:00')) if row[2] else None
        days_since_creation = (datetime.now() - created_at).days if created_at else 0
        days_since_active = (datetime.now() - last_active).days if last_active else 0
        
        top_users.append({
            "user_id": row[0][:8] + "...",  # Truncate for privacy
            "user_info": {
                "created_at": row[1],
                "last_active": row[2],
                "days_since_creation": days_since_creation,
                "days_since_active": days_since_active,
                "is_active": days_since_active <= 1  # Active if used in last 24 hours
            },
            "settings": {
                "daily_limit_minutes": row[3],
                "break_reminder_minutes": row[4],
                "focus_mode_enabled": bool(row[5]),
                "analytics_enabled": bool(row[6])
            },
            "usage_stats": {
                "total_events": row[7],
                "unique_domains": row[8],
                "avg_duration_minutes": round(row[9] or 0, 1),
                "max_duration_minutes": row[10] or 0,
                "total_duration_minutes": row[11] or 0,
                "total_duration_hours": round((row[11] or 0) / 60, 1),
                "focus_alerts": row[12],
                "break_reminders": row[13],
                "limit_reached_count": row[14],
                "page_views": row[15]
            },
            "compliance": {
                "daily_limit_usage_percent": round(((row[11] or 0) / 60) / row[3] * 100, 1) if row[3] > 0 else 0,
                "break_reminder_frequency": round(row[13] / max(row[7], 1), 2) if row[7] > 0 else 0,
                "focus_alert_frequency": round(row[12] / max(row[7], 1), 2) if row[7] > 0 else 0
            }
        })
    
    conn.close()
    
    return {
        "period_days": days,
        "total_users": len(top_users),
        "top_users": top_users
    }

@app.get("/api/v1/analytics/domains")
async def get_domain_analytics(days: int = 7):
    """Get detailed domain analytics"""
    conn = get_db()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Domain usage stats
    cursor.execute("""
        SELECT 
            domain,
            COUNT(*) as total_events,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(duration) as avg_duration,
            MAX(duration) as max_duration,
            SUM(duration) as total_duration_minutes,
            COUNT(CASE WHEN event_type = 'daily_limit_reached' THEN 1 END) as limit_reached_count,
            COUNT(CASE WHEN event_type = 'break_reminder' THEN 1 END) as break_reminder_count
        FROM usage_events 
        WHERE timestamp >= ?
        GROUP BY domain
        ORDER BY total_duration_minutes DESC
    """, (cutoff_date,))
    
    domain_stats = []
    for row in cursor.fetchall():
        domain_stats.append({
            "domain": row[0],
            "total_events": row[1],
            "unique_users": row[2],
            "avg_duration_minutes": round(row[3] or 0, 1),
            "max_duration_minutes": row[4] or 0,
            "total_duration_minutes": row[5] or 0,
            "limit_reached_count": row[6],
            "break_reminder_count": row[7]
        })
    
    conn.close()
    
    return {
        "period_days": days,
        "domain_stats": domain_stats
    }

@app.get("/analytics")
async def analytics_dashboard():
    """Serve the analytics dashboard"""
    dashboard_path = os.path.join(os.path.dirname(__file__), "analytics_dashboard.html")
    if os.path.exists(dashboard_path):
        return FileResponse(dashboard_path, media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail="Analytics dashboard not found")

@app.get("/api/v1/analytics/health")
async def analytics_health():
    """Health check for analytics endpoints"""
    return {
        "status": "healthy",
        "analytics_endpoints": [
            "/api/v1/analytics/overview",
            "/api/v1/analytics/users", 
            "/api/v1/analytics/domains"
        ],
        "dashboard_url": "/analytics"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
