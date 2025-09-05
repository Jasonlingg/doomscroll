#!/usr/bin/env python3
"""
Test script for the Doomscroll Detox API
"""

import requests
import json
from datetime import datetime

# API base URL
API_URL = "http://localhost:8000"

def test_api():
    print("🧪 Testing Doomscroll Detox API...")
    
    # Test 1: Health check
    try:
        response = requests.get(f"{API_URL}/health")
        print(f"✅ Health check: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Test 2: Log events
    test_events = {
        "events": [
            {
                "user_id": "test_user_123",
                "event_type": "page_view",
                "domain": "youtube.com",
                "url": "https://youtube.com/watch?v=test",
                "duration": 120,
                "extension_version": "1.0.0",
                "browser": "Chrome"
            },
            {
                "user_id": "test_user_123",
                "event_type": "focus_alert",
                "domain": "youtube.com",
                "url": "https://youtube.com/watch?v=test",
                "duration": None,
                "extension_version": "1.0.0",
                "browser": "Chrome"
            }
        ]
    }
    
    try:
        response = requests.post(f"{API_URL}/api/v1/events", json=test_events)
        print(f"✅ Log events: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Log events failed: {e}")
    
    # Test 3: Get user stats
    try:
        response = requests.get(f"{API_URL}/api/v1/users/test_user_123/stats?days=7")
        print(f"✅ Get stats: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Get stats failed: {e}")
    
    # Test 4: Update settings
    test_settings = {
        "user_id": "test_user_123",
        "daily_limit": 45,
        "break_reminder": 20,
        "focus_mode_enabled": True
    }
    
    try:
        response = requests.post(f"{API_URL}/api/v1/users/test_user_123/settings", json=test_settings)
        print(f"✅ Update settings: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Update settings failed: {e}")
    
    print("\n🎉 API test complete!")

if __name__ == "__main__":
    test_api()
