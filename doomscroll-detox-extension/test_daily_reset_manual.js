// Manual daily reset test
// Run this in the browser console on a monitored site to test the reset

console.log('🧪 Testing daily reset...');

// Simulate a new day by setting lastReset to yesterday
const yesterday = Date.now() - (24 * 60 * 60 * 1000);
chrome.storage.sync.set({ 
  lastReset: yesterday, 
  dailyUsage: 45 // Set some usage to test reset
}, () => {
  console.log('✅ Set test data - lastReset to yesterday, dailyUsage to 45');
  
  // Trigger the reset check
  chrome.runtime.sendMessage({ action: 'checkDailyReset' }, (response) => {
    if (response && response.success) {
      console.log('✅ Daily reset test completed');
    } else {
      console.log('❌ Daily reset test failed');
    }
  });
});
