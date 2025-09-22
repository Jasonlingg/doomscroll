#!/usr/bin/env python3
"""
Database migration script to add new settings columns
"""

import sqlite3
import os

def migrate_database():
    """Add new columns to the users table"""
    db_path = "doomscroll_detox.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found. Please run setup_db.py first.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        print("📊 Current columns:", columns)
        
        # Add new columns if they don't exist
        new_columns = [
            ("focus_sensitivity", "TEXT DEFAULT 'medium'"),
            ("show_overlays", "BOOLEAN DEFAULT 1"),
            ("enabled", "BOOLEAN DEFAULT 1"),
            ("monitored_websites", "TEXT DEFAULT '[]'")
        ]
        
        # Add ML fields to usage_events table
        usage_events_columns = [
            ("snippet_opt_in", "INTEGER DEFAULT 0"),
            ("snippet_text", "TEXT"),
            ("behavior_json", "TEXT"),
            ("vision_json", "TEXT")
        ]
        
        # Add sentiment split fields to daily_stats table
        daily_stats_columns = [
            ("doom_seconds", "INTEGER DEFAULT 0"),
            ("neutral_seconds", "INTEGER DEFAULT 0"),
            ("positive_seconds", "INTEGER DEFAULT 0")
        ]
        
        for column_name, column_def in new_columns:
            if column_name not in columns:
                print(f"➕ Adding column to users: {column_name}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_def}")
            else:
                print(f"✅ Column already exists in users: {column_name}")
        
        # Check and add ML fields to usage_events table
        cursor.execute("PRAGMA table_info(usage_events)")
        usage_events_existing_columns = [column[1] for column in cursor.fetchall()]
        print(f"\n📊 Current usage_events columns: {usage_events_existing_columns}")
        
        for column_name, column_def in usage_events_columns:
            if column_name not in usage_events_existing_columns:
                print(f"➕ Adding column to usage_events: {column_name}")
                cursor.execute(f"ALTER TABLE usage_events ADD COLUMN {column_name} {column_def}")
            else:
                print(f"✅ Column already exists in usage_events: {column_name}")
        
        # Check and add sentiment fields to daily_stats table
        cursor.execute("PRAGMA table_info(daily_stats)")
        daily_stats_existing_columns = [column[1] for column in cursor.fetchall()]
        print(f"\n📊 Current daily_stats columns: {daily_stats_existing_columns}")
        
        for column_name, column_def in daily_stats_columns:
            if column_name not in daily_stats_existing_columns:
                print(f"➕ Adding column to daily_stats: {column_name}")
                cursor.execute(f"ALTER TABLE daily_stats ADD COLUMN {column_name} {column_def}")
            else:
                print(f"✅ Column already exists in daily_stats: {column_name}")
        
        conn.commit()
        print("✅ Database migration completed successfully!")
        
        # Show updated table structure
        cursor.execute("PRAGMA table_info(users)")
        print("\n📋 Updated table structure:")
        for column in cursor.fetchall():
            print(f"  - {column[1]} ({column[2]})")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
