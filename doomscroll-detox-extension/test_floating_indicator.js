// Test script to verify floating indicator updates
// Run this in the browser console on a social media site

console.log('🧪 Testing Floating Indicator Updates...');

// Test 1: Check current indicator
const indicator = document.getElementById('doomscroll-indicator');
if (indicator) {
  const limitElement = indicator.querySelector('.daily-limit');
  const timeElement = indicator.querySelector('.time-spent');
  console.log('📊 Current indicator state:');
  console.log('- Limit element:', limitElement ? limitElement.textContent : 'Not found');
  console.log('- Time element:', timeElement ? timeElement.textContent : 'Not found');
  console.log('- Current settings daily limit:', currentSettings.dailyLimit);
} else {
  console.log('❌ No indicator found');
}

// Test 2: Force update the indicator
console.log('🔄 Testing force update...');
if (typeof forceUpdateIndicator === 'function') {
  forceUpdateIndicator();
  console.log('✅ Force update called');
} else {
  console.log('❌ forceUpdateIndicator function not found');
}

// Test 3: Simulate settings change
console.log('🔄 Simulating settings change...');
chrome.runtime.sendMessage({
  action: 'settingsUpdated',
  settings: {
    dailyLimit: 60,
    breakReminder: 25
  }
}, (response) => {
  console.log('✅ Settings update response:', response);
  
  // Test 4: Check if indicator updated
  setTimeout(() => {
    const updatedIndicator = document.getElementById('doomscroll-indicator');
    if (updatedIndicator) {
      const updatedLimitElement = updatedIndicator.querySelector('.daily-limit');
      console.log('📊 Updated indicator limit:', updatedLimitElement ? updatedLimitElement.textContent : 'Not found');
      console.log('📊 Expected limit: /60m');
    }
  }, 1000);
});

// Test 5: Manual DOM update test
console.log('🔄 Testing manual DOM update...');
const testIndicator = document.getElementById('doomscroll-indicator');
if (testIndicator) {
  const testLimitElement = testIndicator.querySelector('.daily-limit');
  if (testLimitElement) {
    testLimitElement.textContent = '/99m';
    console.log('✅ Manually updated limit to /99m');
  }
}
