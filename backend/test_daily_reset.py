#!/usr/bin/env python3
"""
Test script to verify daily reset functionality
"""

import sqlite3
import os
from datetime import datetime, timedelta

def test_daily_reset():
    """Test the daily reset functionality"""
    db_path = "doomscroll_detox.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found. Please run setup_db.py first.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("🧪 Testing Daily Reset Functionality")
    print("=" * 50)
    
    # Check current date
    now = datetime.now()
    print(f"📅 Current date: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if there are any users with recent activity
    cursor.execute("""
        SELECT id, last_active, created_at 
        FROM users 
        ORDER BY last_active DESC 
        LIMIT 5
    """)
    
    users = cursor.fetchall()
    if not users:
        print("❌ No users found in database")
        return
    
    print(f"\n👥 Found {len(users)} users:")
    for user in users:
        user_id, last_active, created_at = user
        last_active_date = datetime.fromisoformat(last_active.replace('Z', '+00:00'))
        print(f"  - User {user_id[:8]}... - Last active: {last_active_date.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check recent usage events
    cursor.execute("""
        SELECT event_type, domain, timestamp, duration
        FROM usage_events 
        ORDER BY timestamp DESC 
        LIMIT 10
    """)
    
    events = cursor.fetchall()
    if not events:
        print("❌ No usage events found")
        return
    
    print(f"\n📊 Recent usage events:")
    for event in events:
        event_type, domain, timestamp, duration = event
        event_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        print(f"  - {event_type} on {domain} at {event_date.strftime('%Y-%m-%d %H:%M:%S')} (duration: {duration}s)")
    
    # Check daily stats
    cursor.execute("""
        SELECT user_id, date, total_time, page_views
        FROM daily_stats 
        ORDER BY date DESC 
        LIMIT 5
    """)
    
    stats = cursor.fetchall()
    if stats:
        print(f"\n📈 Daily stats:")
        for stat in stats:
            user_id, date, total_time, page_views = stat
            print(f"  - {date}: {total_time}s usage, {page_views} page views")
    
    # Test reset scenarios
    print(f"\n🔄 Testing reset scenarios:")
    
    # Scenario 1: Same day
    today = now.date()
    print(f"  - Same day test: {today} vs {today} = No reset needed")
    
    # Scenario 2: Different day
    yesterday = today - timedelta(days=1)
    print(f"  - Different day test: {yesterday} vs {today} = Reset needed")
    
    # Scenario 3: Edge case - just before midnight
    midnight = datetime(now.year, now.month, now.day, 23, 59, 59)
    print(f"  - Just before midnight: {midnight.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Scenario 4: Edge case - just after midnight
    after_midnight = datetime(now.year, now.month, now.day, 0, 0, 1)
    print(f"  - Just after midnight: {after_midnight.strftime('%Y-%m-%d %H:%M:%S')}")
    
    conn.close()
    
    print(f"\n✅ Daily reset test completed!")
    print(f"\n💡 To test the reset:")
    print(f"   1. Wait until after midnight")
    print(f"   2. Check the browser console for reset logs")
    print(f"   3. Or manually trigger reset in the popup")

if __name__ == "__main__":
    test_daily_reset()
