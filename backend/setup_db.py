"""
Simple database setup script
Run this to initialize your database
"""

from db import create_tables, init_db
from models import User, UsageEvent, DailyStats

def main():
    print("🚀 Setting up Doomscroll Detox Database...")
    
    # Create tables
    create_tables()
    
    # Initialize with sample data
    init_db()
    
    print("\n✅ Database setup complete!")
    print("📁 Database file: doomscroll_detox.db")
    print("📊 Tables created:")
    print("   - users")
    print("   - usage_events") 
    print("   - daily_stats")
    print("\n🎯 Next steps:")
    print("   - Install dependencies: pip install -r requirements.txt")
    print("   - Create APIs when ready")

if __name__ == "__main__":
    main()
