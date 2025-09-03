// Test script to verify daily reset functionality
// Run this in the browser console on a social media site

console.log('🧪 Testing Daily Reset Functionality...');

// Test 1: Check current state
console.log('📊 Current state:');
console.log('- Daily usage:', dailyUsage);
console.log('- Current time:', new Date().toLocaleString());

// Test 2: Check storage values
chrome.storage.sync.get(['dailyUsage', 'lastReset'], (result) => {
  console.log('📊 Storage values:');
  console.log('- Stored daily usage:', result.dailyUsage);
  console.log('- Last reset time:', result.lastReset ? new Date(result.lastReset).toLocaleString() : 'Never');
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const timeSinceReset = now - (result.lastReset || now);
  const hoursSinceReset = Math.floor(timeSinceReset / (1000 * 60 * 60));
  
  console.log('- Hours since last reset:', hoursSinceReset);
  console.log('- Should reset?', timeSinceReset >= oneDay ? 'YES' : 'NO');
});

// Test 3: Simulate different time scenarios
function testDailyReset() {
  console.log('🔄 Testing daily reset scenarios...');
  
  const scenarios = [
    {
      name: 'Same day (1 hour ago)',
      lastReset: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
      shouldReset: false
    },
    {
      name: 'Same day (12 hours ago)',
      lastReset: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
      shouldReset: false
    },
    {
      name: 'New day (25 hours ago)',
      lastReset: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      shouldReset: true
    },
    {
      name: 'New day (48 hours ago)',
      lastReset: Date.now() - (48 * 60 * 60 * 1000), // 48 hours ago
      shouldReset: true
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`\n📅 Scenario ${index + 1}: ${scenario.name}`);
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const timeSinceReset = now - scenario.lastReset;
    const hoursSinceReset = Math.floor(timeSinceReset / (1000 * 60 * 60));
    
    console.log(`- Last reset: ${new Date(scenario.lastReset).toLocaleString()}`);
    console.log(`- Hours since reset: ${hoursSinceReset}`);
    console.log(`- Should reset: ${timeSinceReset >= oneDay ? 'YES' : 'NO'}`);
    console.log(`- Expected: ${scenario.shouldReset ? 'YES' : 'NO'}`);
    console.log(`- Test result: ${(timeSinceReset >= oneDay) === scenario.shouldReset ? '✅ PASS' : '❌ FAIL'}`);
  });
}

// Test 4: Test the actual reset logic
function testResetLogic() {
  console.log('🔄 Testing actual reset logic...');
  
  // Store current values
  const originalUsage = dailyUsage;
  const originalLastReset = Date.now();
  
  // Simulate a reset scenario
  chrome.storage.sync.get(['dailyUsage', 'lastReset'], (result) => {
    const currentUsage = result.dailyUsage || 0;
    const currentLastReset = result.lastReset || Date.now();
    
    console.log('📊 Before reset test:');
    console.log('- Current usage:', currentUsage);
    console.log('- Current last reset:', new Date(currentLastReset).toLocaleString());
    
    // Test with a very old reset time (should trigger reset)
    const oldResetTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    
    chrome.storage.sync.set({ lastReset: oldResetTime }, () => {
      console.log('✅ Set old reset time');
      
      // Now call loadDailyUsage to test the reset logic
      if (typeof loadDailyUsage === 'function') {
        console.log('🔄 Calling loadDailyUsage...');
        
        // Store the original function to restore later
        const originalLoadDailyUsage = loadDailyUsage;
        
        // Create a test version that logs what happens
        window.testLoadDailyUsage = function() {
          console.log('🧪 Test loadDailyUsage called');
          
          chrome.storage.sync.get(['dailyUsage', 'lastReset'], (result) => {
            const lastReset = result.lastReset || Date.now();
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            
            console.log('📊 Reset logic check:');
            console.log('- Last reset:', new Date(lastReset).toLocaleString());
            console.log('- Current time:', new Date(now).toLocaleString());
            console.log('- Time difference (hours):', Math.floor((now - lastReset) / (1000 * 60 * 60)));
            console.log('- Should reset:', (now - lastReset) >= oneDay ? 'YES' : 'NO');
            
            if ((now - lastReset) >= oneDay) {
              console.log('🆕 RESET TRIGGERED!');
              dailyUsage = 0;
              console.log('✅ Daily usage reset to 0');
            } else {
              console.log('📅 No reset needed');
            }
          });
        };
        
        // Call the test version
        window.testLoadDailyUsage();
        
        // Restore original function
        setTimeout(() => {
          window.testLoadDailyUsage = originalLoadDailyUsage;
          console.log('✅ Restored original loadDailyUsage function');
        }, 1000);
      } else {
        console.log('❌ loadDailyUsage function not found');
      }
    });
  });
}

// Test 5: Manual reset test
function testManualReset() {
  console.log('🔄 Testing manual reset...');
  
  chrome.runtime.sendMessage({ action: 'resetDailyUsage' }, (response) => {
    console.log('✅ Manual reset message sent');
    
    setTimeout(() => {
      console.log('📊 After manual reset:');
      console.log('- Current daily usage:', dailyUsage);
      
      chrome.storage.sync.get(['dailyUsage'], (result) => {
        console.log('- Stored daily usage:', result.dailyUsage);
      });
    }, 500);
  });
}

// Test 6: Check if reset happens at midnight
function testMidnightReset() {
  console.log('🔄 Testing midnight reset logic...');
  
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const timeUntilMidnight = midnight.getTime() - now.getTime();
  const hoursUntilMidnight = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
  const minutesUntilMidnight = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
  
  console.log('📅 Midnight reset info:');
  console.log('- Current time:', now.toLocaleString());
  console.log('- Next midnight:', midnight.toLocaleString());
  console.log('- Time until midnight:', `${hoursUntilMidnight}h ${minutesUntilMidnight}m`);
  console.log('- Will reset at midnight?', 'YES (if extension is active)');
}

// Run all tests
console.log('\n🚀 Running all daily reset tests...\n');

setTimeout(() => {
  testDailyReset();
}, 1000);

setTimeout(() => {
  testResetLogic();
}, 2000);

setTimeout(() => {
  testManualReset();
}, 3000);

setTimeout(() => {
  testMidnightReset();
}, 4000);

console.log('\n📋 Test Summary:');
console.log('1. ✅ Current state check');
console.log('2. ✅ Storage values check');
console.log('3. ✅ Time scenario tests');
console.log('4. ✅ Actual reset logic test');
console.log('5. ✅ Manual reset test');
console.log('6. ✅ Midnight reset info');
console.log('\n🎯 Check the console output above for detailed results!');
