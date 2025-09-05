#!/usr/bin/env python3
"""
Test script for backend settings API
"""

import requests
import json

API_URL = "http://127.0.0.1:8000"

def test_settings_api():
    """Test the settings API endpoints"""
    user_id = "test_user_123"
    
    print("🧪 Testing Backend Settings API")
    print("=" * 50)
    
    # Test 1: Get settings (should return defaults)
    print("\n1️⃣ Testing GET settings...")
    try:
        response = requests.get(f"{API_URL}/api/v1/users/{user_id}/settings")
        print(f"✅ GET settings: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"📋 Settings: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ GET failed: {response.text}")
    except Exception as e:
        print(f"❌ GET error: {e}")
    
    # Test 2: Update settings
    print("\n2️⃣ Testing POST settings...")
    test_settings = {
        "user_id": user_id,
        "daily_limit": 45,
        "break_reminder": 20,
        "focus_mode_enabled": True,
        "focus_sensitivity": "high",
        "show_overlays": True,
        "enabled": True,
        "monitored_websites": ["facebook.com", "youtube.com", "reddit.com"]
    }
    
    try:
        response = requests.post(f"{API_URL}/api/v1/users/{user_id}/settings", json=test_settings)
        print(f"✅ POST settings: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"📋 Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ POST failed: {response.text}")
    except Exception as e:
        print(f"❌ POST error: {e}")
    
    # Test 3: Get settings again (should return updated values)
    print("\n3️⃣ Testing GET settings again...")
    try:
        response = requests.get(f"{API_URL}/api/v1/users/{user_id}/settings")
        print(f"✅ GET settings: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"📋 Updated settings: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ GET failed: {response.text}")
    except Exception as e:
        print(f"❌ GET error: {e}")
    
    print("\n✅ Settings API test completed!")

if __name__ == "__main__":
    test_settings_api()
