// Test script to verify floating indicator to settings panel transformation
// Run this in the browser console on a social media site

console.log('🧪 Testing Floating Settings Transformation...');

// Test 1: Check if indicator exists
const indicator = document.getElementById('doomscroll-indicator');
if (!indicator) {
  console.log('❌ No indicator found - make sure the extension is loaded');
  return;
}

console.log('✅ Indicator found:', indicator);

// Test 2: Check if settings button exists
const settingsBtn = indicator.querySelector('.settings-btn');
if (!settingsBtn) {
  console.log('❌ No settings button found');
  return;
}

console.log('✅ Settings button found:', settingsBtn);

// Test 3: Test transformation to settings panel
console.log('🔄 Testing transformation to settings panel...');
if (typeof transformToSettingsPanel === 'function') {
  transformToSettingsPanel();
  console.log('✅ transformToSettingsPanel called');
  
  // Wait for transformation to complete (increased timing for slower animation)
  setTimeout(() => {
    const transformedIndicator = document.getElementById('doomscroll-indicator');
    if (transformedIndicator && transformedIndicator.classList.contains('settings-panel')) {
      console.log('✅ Successfully transformed to settings panel');
      
      // Test 4: Check if settings form elements exist
      const dailyLimitInput = transformedIndicator.querySelector('#floating-daily-limit');
      const breakReminderInput = transformedIndicator.querySelector('#floating-break-reminder');
      const enabledToggle = transformedIndicator.querySelector('#floating-enabled-toggle');
      const focusModeToggle = transformedIndicator.querySelector('#floating-focus-mode-toggle');
      const saveBtn = transformedIndicator.querySelector('#floating-save-settings');
      const closeBtn = transformedIndicator.querySelector('.close-settings-btn');
      
      console.log('📋 Settings form elements:');
      console.log('- Daily limit input:', dailyLimitInput ? 'Found' : 'Missing');
      console.log('- Break reminder input:', breakReminderInput ? 'Found' : 'Missing');
      console.log('- Enabled toggle:', enabledToggle ? 'Found' : 'Missing');
      console.log('- Focus mode toggle:', focusModeToggle ? 'Found' : 'Missing');
      console.log('- Save button:', saveBtn ? 'Found' : 'Missing');
      console.log('- Close button:', closeBtn ? 'Found' : 'Missing');
      
      // Test 5: Test transformation back to indicator
      console.log('🔄 Testing transformation back to indicator...');
      if (typeof transformBackToIndicator === 'function') {
        setTimeout(() => {
          transformBackToIndicator();
          console.log('✅ transformBackToIndicator called');
          
          // Wait for transformation to complete (increased timing for slower animation)
          setTimeout(() => {
            const restoredIndicator = document.getElementById('doomscroll-indicator');
            if (restoredIndicator && !restoredIndicator.classList.contains('settings-panel')) {
              console.log('✅ Successfully transformed back to indicator');
              
              // Test 6: Check if settings button is restored
              const restoredSettingsBtn = restoredIndicator.querySelector('.settings-btn');
              if (restoredSettingsBtn) {
                console.log('✅ Settings button restored');
                console.log('🎉 All transformation tests passed!');
              } else {
                console.log('❌ Settings button not restored');
              }
            } else {
              console.log('❌ Failed to transform back to indicator');
            }
          }, 500);
        }, 2000); // Wait 2 seconds to see the settings panel
      } else {
        console.log('❌ transformBackToIndicator function not found');
      }
    } else {
      console.log('❌ Failed to transform to settings panel');
    }
  }, 500);
} else {
  console.log('❌ transformToSettingsPanel function not found');
}

// Test 7: Test settings form functionality
console.log('🔄 Testing settings form functionality...');
setTimeout(() => {
  const settingsPanel = document.getElementById('doomscroll-indicator');
  if (settingsPanel && settingsPanel.classList.contains('settings-panel')) {
    const dailyLimitInput = settingsPanel.querySelector('#floating-daily-limit');
    const saveBtn = settingsPanel.querySelector('#floating-save-settings');
    
    if (dailyLimitInput && saveBtn) {
      // Test form validation
      dailyLimitInput.value = '999'; // Invalid value
      saveBtn.click();
      console.log('✅ Tested form validation with invalid value');
      
      // Test with valid value
      setTimeout(() => {
        dailyLimitInput.value = '60'; // Valid value
        console.log('✅ Set valid daily limit value');
      }, 1000);
    }
  }
}, 3000);

console.log('🧪 Test script completed - check console for results');
