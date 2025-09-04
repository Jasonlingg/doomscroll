#!/usr/bin/env python3
"""
Manual daily reset test - simulates what the extension should do
"""

import sqlite3
import os
from datetime import datetime

def manual_reset_test():
    """Manually test the daily reset functionality"""
    db_path = "doomscroll_detox.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("🧪 Manual Daily Reset Test")
    print("=" * 50)
    
    # Check current Chrome storage (simulated)
    print("📊 Current Chrome storage state:")
    print("  - lastReset: 2025-09-03 23:41:01 (yesterday)")
    print("  - dailyUsage: ~15 minutes (accumulated)")
    
    # Simulate the extension's reset logic
    now = datetime.now()
    last_reset = datetime(2025, 9, 3, 23, 41, 1)  # Yesterday
    
    # Get the date of the last reset (start of day)
    last_reset_day = last_reset.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get the current date (start of day)
    current_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    print(f"\n🔄 Reset Logic Test:")
    print(f"  - Last reset date: {last_reset_day.strftime('%Y-%m-%d')}")
    print(f"  - Current date: {current_day.strftime('%Y-%m-%d')}")
    print(f"  - Different dates? {last_reset_day != current_day}")
    
    if last_reset_day != current_day:
        print("✅ RESET NEEDED - Different days detected!")
        
        # Simulate the reset
        print("\n🔄 Simulating reset...")
        print("  - Setting lastReset to current time")
        print("  - Setting dailyUsage to 0")
        print("  - Notifying content scripts")
        
        # Check what would happen to the floating indicator
        print("\n📱 Floating Indicator would show:")
        print("  - Time spent: 0m")
        print("  - Progress bar: 0%")
        print("  - Color: Green (safe)")
        
    else:
        print("❌ No reset needed - same day")
    
    conn.close()
    
    print(f"\n💡 The issue:")
    print(f"   - Extension background script must be running for reset to work")
    print(f"   - Reset checks happen every 15 minutes")
    print(f"   - More frequent checks around midnight (11:45 PM - 12:15 AM)")
    print(f"   - Manual reset available via popup")

if __name__ == "__main__":
    manual_reset_test()
