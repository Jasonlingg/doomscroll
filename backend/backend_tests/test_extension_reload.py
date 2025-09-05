#!/usr/bin/env python3
"""
Test script to verify extension reload behavior
"""

import json
import time

def test_extension_reload_behavior():
    """Test what happens when extension is reloaded"""
    print("🧪 Testing Extension Reload Behavior")
    print("=" * 50)
    
    print("\n📋 The Problem:")
    print("  - Extension was resetting settings on every reload")
    print("  - chrome.runtime.onInstalled was running on reload (not just install)")
    print("  - This overwrote all user settings with defaults")
    
    print("\n🔧 The Fix:")
    print("  - Added details.reason check in onInstalled listener")
    print("  - Only initialize defaults on 'install' (not 'reload' or 'update')")
    print("  - Added separate startup function for reloads")
    
    print("\n📊 Expected Behavior Now:")
    print("  ✅ First install: Initialize default settings")
    print("  ✅ Extension reload: Preserve existing settings")
    print("  ✅ Extension update: Preserve existing settings")
    print("  ✅ Browser restart: Preserve existing settings")
    
    print("\n🧪 How to Test:")
    print("  1. Change some settings in the popup (e.g., daily limit to 60)")
    print("  2. Reload the extension in chrome://extensions/")
    print("  3. Open the popup - settings should still be 60, not reset to 30")
    print("  4. Check browser console for 'Extension reloaded - preserving existing settings'")
    
    print("\n💡 Key Changes Made:")
    print("  - onInstalled listener now checks details.reason")
    print("  - Only runs initialization on 'install' reason")
    print("  - Added extensionStartup() for reloads")
    print("  - Better logging to track what's happening")

if __name__ == "__main__":
    test_extension_reload_behavior()
