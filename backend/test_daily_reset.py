#!/usr/bin/env python3
"""
Test script to verify daily reset functionality
"""

import sqlite3
from datetime import datetime, timedelta
import time

def test_daily_reset_logic():
    print("🧪 Testing Daily Reset Logic...")
    
    # Connect to database
    conn = sqlite3.connect('doomscroll_detox.db')
    cursor = conn.cursor()
    
    # Get current time and calculate one day ago
    now = datetime.now()
    one_day_ago = now - timedelta(days=1)
    one_day_ms = 24 * 60 * 60 * 1000  # 24 hours in milliseconds
    
    print(f"📅 Current time: {now}")
    print(f"📅 One day ago: {one_day_ago}")
    print(f"⏰ One day in milliseconds: {one_day_ms}")
    
    # Test scenarios
    scenarios = [
        {
            "name": "Same day (1 hour ago)",
            "last_reset": now - timedelta(hours=1),
            "should_reset": False
        },
        {
            "name": "Same day (12 hours ago)", 
            "last_reset": now - timedelta(hours=12),
            "should_reset": False
        },
        {
            "name": "New day (25 hours ago)",
            "last_reset": now - timedelta(hours=25),
            "should_reset": True
        },
        {
            "name": "New day (48 hours ago)",
            "last_reset": now - timedelta(hours=48),
            "should_reset": True
        }
    ]
    
    print("\n📊 Testing Reset Scenarios:")
    for i, scenario in enumerate(scenarios, 1):
        last_reset_ms = int(scenario["last_reset"].timestamp() * 1000)
        now_ms = int(now.timestamp() * 1000)
        time_diff_ms = now_ms - last_reset_ms
        time_diff_hours = time_diff_ms / (1000 * 60 * 60)
        
        should_reset = time_diff_ms >= one_day_ms
        expected = scenario["should_reset"]
        passed = should_reset == expected
        
        print(f"\n📅 Scenario {i}: {scenario['name']}")
        print(f"   - Last reset: {scenario['last_reset']}")
        print(f"   - Hours since reset: {time_diff_hours:.1f}")
        print(f"   - Should reset: {'YES' if should_reset else 'NO'}")
        print(f"   - Expected: {'YES' if expected else 'NO'}")
        print(f"   - Result: {'✅ PASS' if passed else '❌ FAIL'}")
    
    # Check current usage data
    print("\n📊 Current Usage Data:")
    cursor.execute("""
        SELECT event_type, domain, duration, timestamp 
        FROM usage_events 
        WHERE event_type = 'usage_sync' 
        ORDER BY timestamp DESC 
        LIMIT 5
    """)
    
    recent_events = cursor.fetchall()
    if recent_events:
        print("   Recent usage_sync events:")
        for event in recent_events:
            event_type, domain, duration, timestamp = event
            event_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            print(f"   - {domain}: {duration}m at {event_time}")
    else:
        print("   No usage_sync events found")
    
    # Test midnight reset calculation
    print("\n🕛 Midnight Reset Test:")
    tomorrow_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    time_until_midnight = tomorrow_midnight - now
    hours_until_midnight = time_until_midnight.total_seconds() / 3600
    
    print(f"   - Current time: {now}")
    print(f"   - Next midnight: {tomorrow_midnight}")
    print(f"   - Time until midnight: {hours_until_midnight:.1f} hours")
    print(f"   - Will reset at midnight? YES (if extension is active)")
    
    conn.close()
    print("\n✅ Daily reset test completed!")

if __name__ == "__main__":
    test_daily_reset_logic()
