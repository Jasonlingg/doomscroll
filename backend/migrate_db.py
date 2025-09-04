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
        
        for column_name, column_def in new_columns:
            if column_name not in columns:
                print(f"➕ Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_def}")
            else:
                print(f"✅ Column already exists: {column_name}")
        
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
