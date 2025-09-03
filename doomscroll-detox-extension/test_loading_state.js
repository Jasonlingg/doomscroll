// Test script to verify loading state
// Run this in the browser console on a social media site

console.log('🧪 Testing Loading State...');

// Test 1: Check if indicator exists and has loading class
const indicator = document.getElementById('doomscroll-indicator');
if (indicator) {
  console.log('📊 Indicator found:', indicator);
  console.log('📊 Has loading class:', indicator.classList.contains('loading'));
  console.log('📊 Current content:', indicator.innerHTML);
} else {
  console.log('❌ No indicator found');
}

// Test 2: Test force update function
console.log('🔄 Testing force update...');
if (typeof forceUpdateIndicator === 'function') {
  forceUpdateIndicator();
  console.log('✅ Force update called');
  
  setTimeout(() => {
    const updatedIndicator = document.getElementById('doomscroll-indicator');
    if (updatedIndicator) {
      console.log('📊 After force update:');
      console.log('- Has loading class:', updatedIndicator.classList.contains('loading'));
      console.log('- Content:', updatedIndicator.innerHTML);
    }
  }, 500);
} else {
  console.log('❌ forceUpdateIndicator function not found');
}

// Test 3: Test remove loading state function
console.log('🔄 Testing remove loading state...');
if (typeof removeLoadingState === 'function') {
  removeLoadingState();
  console.log('✅ Remove loading state called');
} else {
  console.log('❌ removeLoadingState function not found');
}

// Test 4: Simulate a fresh page load
console.log('🔄 Simulating fresh page load...');
// Remove existing indicator
const existingIndicator = document.getElementById('doomscroll-indicator');
if (existingIndicator) {
  existingIndicator.remove();
  console.log('✅ Removed existing indicator');
}

// Add new indicator (should show loading state)
if (typeof addUsageIndicator === 'function') {
  addUsageIndicator();
  console.log('✅ Added new indicator with loading state');
  
  setTimeout(() => {
    const newIndicator = document.getElementById('doomscroll-indicator');
    if (newIndicator) {
      console.log('📊 New indicator state:');
      console.log('- Has loading class:', newIndicator.classList.contains('loading'));
      console.log('- Content:', newIndicator.innerHTML);
    }
  }, 100);
}
