// Test script to verify settings updates work correctly
// Run this in the browser console on a social media site

console.log('🧪 Testing Settings Update System...');

// Test 1: Check current settings
console.log('📊 Current settings in content script:');
console.log('- Daily limit:', currentSettings.dailyLimit);
console.log('- Break reminder:', currentSettings.breakReminder);
console.log('- Focus mode:', currentSettings.focusMode);
console.log('- Focus sensitivity:', currentSettings.focusSensitivity);
console.log('- Show overlays:', currentSettings.showOverlays);

// Test 2: Simulate settings update
console.log('🔄 Simulating settings update...');
chrome.runtime.sendMessage({
  action: 'settingsUpdated',
  settings: {
    dailyLimit: 45,
    breakReminder: 20,
    focusMode: true,
    focusSensitivity: 'high',
    showOverlays: false
  }
}, (response) => {
  console.log('✅ Settings update response:', response);
  
  // Test 3: Check if settings were updated
  setTimeout(() => {
    console.log('📊 Settings after update:');
    console.log('- Daily limit:', currentSettings.dailyLimit);
    console.log('- Break reminder:', currentSettings.breakReminder);
    console.log('- Focus mode:', currentSettings.focusMode);
    console.log('- Focus sensitivity:', currentSettings.focusSensitivity);
    console.log('- Show overlays:', currentSettings.showOverlays);
    
    // Test 4: Check UI elements
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      const limitElement = indicator.querySelector('.daily-limit');
      if (limitElement) {
        console.log('✅ Daily limit in UI:', limitElement.textContent);
      }
    }
    
    console.log('🎯 Test complete! Check the console for results.');
  }, 1000);
});

// Test 5: Test refresh settings
console.log('🔄 Testing refresh settings...');
chrome.runtime.sendMessage({
  action: 'refreshSettings'
}, (response) => {
  console.log('✅ Refresh settings response:', response);
});
