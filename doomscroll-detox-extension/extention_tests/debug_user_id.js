// Test script to run in browser console to check user ID generation
// Copy and paste this into the browser console when the extension is loaded

console.log('🔍 Testing User ID Generation');

// Simulate the same function from background.js
function generateUserId() {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const platform = navigator.platform;
  const fingerprint = `${userAgent}|${language}|${timezone}|${platform}`;
  
  console.log('📋 Fingerprint:', fingerprint);
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const userId = Math.abs(hash).toString();
  console.log('🆔 Generated User ID:', userId);
  return userId;
}

// Generate and display the user ID
const userId = generateUserId();
console.log('✅ Final User ID:', userId);

// Instructions for testing
console.log('\n📝 To test if this user ID has settings:');
console.log(`1. Go to: http://127.0.0.1:8000/api/v1/users/${userId}/settings`);
console.log('2. Check if it returns your saved settings');
console.log('3. If not, the extension is using a different user ID');
