// Test script to verify the daily limit fix
// Run this in the browser console on a social media site

console.log('🧪 Testing Daily Limit Fix...');

// Test 1: Check current state
console.log('📊 Current settings:', currentSettings);
console.log('📊 Current daily usage:', dailyUsage);

// Test 2: Simulate changing daily limit to 200
console.log('🔄 Simulating daily limit change to 200...');
chrome.runtime.sendMessage({
  action: 'settingsUpdated',
  settings: {
    dailyLimit: 200,
    breakReminder: 50
  }
}, (response) => {
  console.log('✅ Settings update response:', response);
  
  // Test 3: Check if settings were updated
  setTimeout(() => {
    console.log('📊 Settings after update:');
    console.log('- Daily limit:', currentSettings.dailyLimit);
    console.log('- Break reminder:', currentSettings.breakReminder);
    
    // Test 4: Check indicator
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      const limitElement = indicator.querySelector('.daily-limit');
      console.log('📊 Indicator limit:', limitElement ? limitElement.textContent : 'Not found');
      console.log('📊 Expected: /200m');
    }
    
    // Test 5: Force update and check again
    console.log('🔄 Force updating indicator...');
    if (typeof forceUpdateIndicator === 'function') {
      forceUpdateIndicator();
      
      setTimeout(() => {
        const updatedIndicator = document.getElementById('doomscroll-indicator');
        if (updatedIndicator) {
          const updatedLimitElement = updatedIndicator.querySelector('.daily-limit');
          console.log('📊 Indicator after force update:', updatedLimitElement ? updatedLimitElement.textContent : 'Not found');
        }
      }, 500);
    }
  }, 1000);
});

// Test 6: Check if time tracking is using correct limit
console.log('🔄 Checking time tracking...');
console.log('📊 Time tracking should use currentSettings.dailyLimit:', currentSettings.dailyLimit);
