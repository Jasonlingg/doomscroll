#!/usr/bin/env python3
"""
Better database viewer for Doomscroll Detox
"""

import sqlite3
from datetime import datetime, timedelta
import pandas as pd
from tabulate import tabulate

def view_database_summary():
    """Show a comprehensive summary of the database"""
    conn = sqlite3.connect('doomscroll_detox.db')
    
    print("🧘‍♀️ DOOMSCROLL DETOX DATABASE SUMMARY")
    print("=" * 50)
    
    # Users summary
    print("\n👥 USERS:")
    users_df = pd.read_sql_query("""
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN focus_mode_enabled = 1 THEN 1 END) as focus_mode_users,
            COUNT(CASE WHEN analytics_enabled = 1 THEN 1 END) as analytics_users,
            AVG(daily_limit) as avg_daily_limit,
            AVG(break_reminder) as avg_break_reminder
        FROM users
    """, conn)
    print(tabulate(users_df, headers='keys', tablefmt='grid'))
    
    # Events summary
    print("\n📊 EVENTS SUMMARY:")
    events_df = pd.read_sql_query("""
        SELECT 
            event_type,
            COUNT(*) as count,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(duration) as avg_duration,
            MAX(duration) as max_duration,
            MIN(timestamp) as first_event,
            MAX(timestamp) as last_event
        FROM usage_events 
        GROUP BY event_type
        ORDER BY count DESC
    """, conn)
    print(tabulate(events_df, headers='keys', tablefmt='grid'))
    
    # Recent activity
    print("\n🕐 RECENT ACTIVITY (Last 10 events):")
    recent_df = pd.read_sql_query("""
        SELECT 
            event_type,
            domain,
            duration,
            timestamp,
            user_id
        FROM usage_events 
        ORDER BY timestamp DESC 
        LIMIT 10
    """, conn)
    print(tabulate(recent_df, headers='keys', tablefmt='grid'))
    
    conn.close()

def view_user_activity(user_id=None):
    """Show detailed user activity"""
    conn = sqlite3.connect('doomscroll_detox.db')
    
    if user_id:
        where_clause = f"WHERE user_id = '{user_id}'"
        title = f"👤 USER ACTIVITY: {user_id[:8]}..."
    else:
        where_clause = ""
        title = "👥 ALL USERS ACTIVITY"
    
    print(f"\n{title}")
    print("=" * 50)
    
    # User activity summary
    activity_df = pd.read_sql_query(f"""
        SELECT 
            user_id,
            event_type,
            domain,
            COUNT(*) as event_count,
            AVG(duration) as avg_duration,
            MAX(duration) as max_duration,
            MIN(timestamp) as first_event,
            MAX(timestamp) as last_event
        FROM usage_events 
        {where_clause}
        GROUP BY user_id, event_type, domain
        ORDER BY event_count DESC
        LIMIT 20
    """, conn)
    print(tabulate(activity_df, headers='keys', tablefmt='grid'))
    
    conn.close()

def view_daily_usage():
    """Show daily usage patterns"""
    conn = sqlite3.connect('doomscroll_detox.db')
    
    print("\n📅 DAILY USAGE PATTERNS:")
    print("=" * 50)
    
    # Daily usage by date
    daily_df = pd.read_sql_query("""
        SELECT 
            DATE(timestamp) as date,
            COUNT(*) as total_events,
            COUNT(DISTINCT user_id) as active_users,
            AVG(duration) as avg_duration,
            SUM(duration) as total_duration_minutes
        FROM usage_events 
        WHERE event_type = 'usage_sync'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        LIMIT 7
    """, conn)
    print(tabulate(daily_df, headers='keys', tablefmt='grid'))
    
    conn.close()

def view_site_usage():
    """Show usage by website"""
    conn = sqlite3.connect('doomscroll_detox.db')
    
    print("\n🌐 WEBSITE USAGE:")
    print("=" * 50)
    
    site_df = pd.read_sql_query("""
        SELECT 
            domain,
            COUNT(*) as total_events,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(duration) as avg_duration_minutes,
            MAX(duration) as max_duration_minutes,
            SUM(duration) as total_duration_minutes
        FROM usage_events 
        WHERE event_type = 'usage_sync'
        GROUP BY domain
        ORDER BY total_duration_minutes DESC
    """, conn)
    print(tabulate(site_df, headers='keys', tablefmt='grid'))
    
    conn.close()

def interactive_viewer():
    """Interactive database viewer"""
    while True:
        print("\n" + "="*50)
        print("🧘‍♀️ DOOMSCROLL DETOX DATABASE VIEWER")
        print("="*50)
        print("1. 📊 Database Summary")
        print("2. 👤 User Activity")
        print("3. 📅 Daily Usage Patterns")
        print("4. 🌐 Website Usage")
        print("5. 🔍 Search by User ID")
        print("6. ❌ Exit")
        
        choice = input("\nSelect an option (1-6): ").strip()
        
        if choice == '1':
            view_database_summary()
        elif choice == '2':
            view_user_activity()
        elif choice == '3':
            view_daily_usage()
        elif choice == '4':
            view_site_usage()
        elif choice == '5':
            user_id = input("Enter user ID (or first 8 chars): ").strip()
            if user_id:
                view_user_activity(user_id)
        elif choice == '6':
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    try:
        interactive_viewer()
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")
