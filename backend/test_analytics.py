#!/usr/bin/env python3
"""
Test script for analytics endpoints
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

def test_analytics_endpoints():
    """Test all analytics endpoints"""
    print("🧪 Testing Analytics Endpoints")
    print("=" * 50)
    
    # Test overview endpoint
    print("\n📊 Testing Overview Analytics:")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/analytics/overview?days=7")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Overview loaded successfully")
            print(f"   Active users: {data['overall_stats']['active_users']}")
            print(f"   Total events: {data['overall_stats']['total_events']}")
            print(f"   Avg duration: {data['overall_stats']['avg_duration_minutes']}m")
            print(f"   Total time: {data['overall_stats']['total_duration_minutes']}m")
        else:
            print(f"❌ Overview failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Overview error: {e}")
    
    # Test users endpoint
    print("\n👥 Testing User Analytics:")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/analytics/users?days=7&limit=5")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Users analytics loaded successfully")
            print(f"   Top users found: {len(data['top_users'])}")
            if data['top_users']:
                top_user = data['top_users'][0]
                print(f"   Top user: {top_user['user_id']} ({top_user['total_events']} events)")
        else:
            print(f"❌ Users failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Users error: {e}")
    
    # Test domains endpoint
    print("\n🌐 Testing Domain Analytics:")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/analytics/domains?days=7")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Domain analytics loaded successfully")
            print(f"   Domains found: {len(data['domain_stats'])}")
            if data['domain_stats']:
                top_domain = data['domain_stats'][0]
                print(f"   Top domain: {top_domain['domain']} ({top_domain['total_events']} events)")
        else:
            print(f"❌ Domains failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Domains error: {e}")
    
    # Test health endpoint
    print("\n🏥 Testing Health Check:")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print(f"✅ Health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")

def show_sample_data():
    """Show sample data from analytics endpoints"""
    print("\n📋 Sample Analytics Data")
    print("=" * 50)
    
    try:
        # Get overview data
        response = requests.get(f"{BASE_URL}/api/v1/analytics/overview?days=7")
        if response.status_code == 200:
            data = response.json()
            
            print("\n📊 Overview Stats:")
            print(f"   Period: {data['period_days']} days")
            print(f"   Active users: {data['overall_stats']['active_users']}")
            print(f"   Total events: {data['overall_stats']['total_events']}")
            print(f"   Avg duration: {data['overall_stats']['avg_duration_minutes']}m")
            print(f"   Total time: {data['overall_stats']['total_duration_minutes']}m")
            
            print("\n📈 Events by Type:")
            for event_type, count in data['events_by_type'].items():
                print(f"   {event_type}: {count}")
            
            print("\n🌐 Top Domains:")
            for domain in data['top_domains'][:5]:
                print(f"   {domain['domain']}: {domain['visits']} visits, {domain['avg_duration']}m avg")
            
            print("\n📅 Daily Trends:")
            for day in data['daily_trends'][:3]:
                print(f"   {day['date']}: {day['active_users']} users, {day['total_events']} events")
                
    except Exception as e:
        print(f"❌ Error getting sample data: {e}")

if __name__ == "__main__":
    print("🚀 Doomscroll Detox Analytics Test")
    print("=" * 50)
    print(f"Testing endpoints at: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_analytics_endpoints()
    show_sample_data()
    
    print("\n" + "=" * 50)
    print("✅ Analytics test completed!")
    print("\nTo view the dashboard:")
    print("1. Start the backend: uvicorn app:app --reload")
    print("2. Open: backend/analytics_dashboard.html in your browser")
