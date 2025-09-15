// Test settings save functionality
// Run this in the browser console on any monitored site

console.log('🧪 Testing settings save...');

// Test data
const testSettings = {
  dailyLimit: 45,
  breakReminder: 20,
  enabled: true,
  focusMode: true,
  focusSensitivity: 'high',
  showOverlays: true,
  snippet_ai_enabled: false,
  monitoredWebsites: [
    { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
    { domain: 'instagram.com', name: 'Instagram', enabled: true, isDefault: true },
    { domain: 'x.com', name: 'X (Twitter)', enabled: true, isDefault: true }
  ]
};

console.log('📋 Test settings:', testSettings);

// Send to background script
chrome.runtime.sendMessage({ action: 'updateSettings', settings: testSettings }, (response) => {
  if (response && response.success) {
    console.log('✅ Settings save test successful!');
    console.log('🌐 Backend saved:', response.backendSaved ? 'Yes' : 'No');
    if (response.error) {
      console.log('⚠️ Error:', response.error);
    }
  } else {
    console.log('❌ Settings save test failed');
    console.log('Error:', response ? response.error : 'No response');
  }
});
