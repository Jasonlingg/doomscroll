// Test script to verify backend integration
// Run this in the browser console on a social media site

console.log('🧪 Testing Doomscroll Detox Backend Integration...');

// Test 1: Check if background script is accessible
chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
  console.log('✅ Background script response:', response);
});

// Test 2: Send a test event
chrome.runtime.sendMessage({
  action: 'logEvent',
  eventType: 'test_event',
  domain: window.location.hostname,
  url: window.location.href,
  duration: 5
}, (response) => {
  console.log('✅ Test event response:', response);
});

// Test 3: Simulate different event types
const testEvents = [
  { eventType: 'page_view', duration: 0 },
  { eventType: 'break_reminder', duration: 15 },
  { eventType: 'focus_mode_alert', duration: 30 },
  { eventType: 'daily_limit_reached', duration: 60 }
];

testEvents.forEach((event, index) => {
  setTimeout(() => {
    chrome.runtime.sendMessage({
      action: 'logEvent',
      eventType: event.eventType,
      domain: window.location.hostname,
      url: window.location.href,
      duration: event.duration
    }, (response) => {
      console.log(`✅ Test event ${index + 1} (${event.eventType}):`, response);
    });
  }, index * 1000); // Send each event 1 second apart
});

console.log('🎯 Check the backend logs and database to see if events are being logged!');
