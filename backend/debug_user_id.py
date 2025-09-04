#!/usr/bin/env python3
"""
Test script to check what user ID the extension is using
"""

import requests
import json

API_URL = "http://127.0.0.1:8000"

def test_user_id_consistency():
    """Test if the extension is using consistent user IDs"""
    
    print("🔍 Testing User ID Consistency")
    print("=" * 50)
    
    # Test with the same user ID that should be used by the extension
    # The extension generates user ID based on browser fingerprint
    # Let's test with a few different user IDs to see what's stored
    
    test_user_ids = [
        "test_user_123",  # From our test
        "123456789",      # Example hash
        "987654321",      # Another example
    ]
    
    for user_id in test_user_ids:
        print(f"\n👤 Testing user ID: {user_id}")
        try:
            response = requests.get(f"{API_URL}/api/v1/users/{user_id}/settings")
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    settings = data.get('settings', {})
                    print(f"✅ Found settings: daily_limit={settings.get('daily_limit')}, break_reminder={settings.get('break_reminder')}")
                else:
                    print(f"❌ No settings found for this user ID")
            else:
                print(f"❌ Error: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n💡 To debug the extension user ID issue:")
    print("1. Check the browser console for the user ID being generated")
    print("2. Make sure the extension is using the same user ID consistently")
    print("3. Verify the backend is receiving the correct user ID")

if __name__ == "__main__":
    test_user_id_consistency()
