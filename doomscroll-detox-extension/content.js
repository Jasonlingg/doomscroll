// Content script for Doomscroll Detox extension

let startTime = Date.now();
let isActive = true;
let dailyUsage = 0;
let reminderShown = false;

// Initialize content script
function init() {
  // Get current daily usage from storage
  chrome.storage.sync.get(['dailyLimit', 'breakReminder'], (result) => {
    const dailyLimit = result.dailyLimit || 30;
    const breakReminder = result.breakReminder || 15;
    
    // Start tracking time
    startTimeTracking(dailyLimit, breakReminder);
    
    // Add visual indicators
    addUsageIndicator();
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
  });
}

// Track time spent on page
function startTimeTracking(dailyLimit, breakReminder) {
  setInterval(() => {
    if (isActive) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes
      dailyUsage = timeSpent;
      
      // Update usage indicator
      updateUsageIndicator(timeSpent, dailyLimit);
      
      // Show break reminder
      if (timeSpent >= breakReminder && !reminderShown) {
        showBreakReminder();
        reminderShown = true;
      }
      
      // Check daily limit
      if (timeSpent >= dailyLimit) {
        showDailyLimitReached();
      }
    }
  }, 1000); // Check every second
}

// Handle page visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    isActive = false;
  } else {
    isActive = true;
    startTime = Date.now(); // Reset timer when page becomes visible
  }
}

// Add usage indicator to the page
function addUsageIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'doomscroll-indicator';
  indicator.innerHTML = `
    <div class="doomscroll-badge">
      <span class="time-spent">0m</span>
      <span class="daily-limit">/30m</span>
    </div>
  `;
  
  // Style the indicator
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  `;
  
  document.body.appendChild(indicator);
}

// Update usage indicator
function updateUsageIndicator(timeSpent, dailyLimit) {
  const indicator = document.getElementById('doomscroll-indicator');
  if (indicator) {
    const timeElement = indicator.querySelector('.time-spent');
    const limitElement = indicator.querySelector('.daily-limit');
    
    if (timeElement) timeElement.textContent = `${timeSpent}m`;
    if (limitElement) limitElement.textContent = `/${dailyLimit}m`;
    
    // Change color based on usage
    if (timeSpent >= dailyLimit * 0.8) {
      indicator.style.background = 'rgba(255, 165, 0, 0.9)'; // Orange
    }
    if (timeSpent >= dailyLimit) {
      indicator.style.background = 'rgba(255, 0, 0, 0.9)'; // Red
    }
  }
}

// Show break reminder
function showBreakReminder() {
  const reminder = document.createElement('div');
  reminder.id = 'doomscroll-reminder';
  reminder.innerHTML = `
    <div class="reminder-content">
      <h3>🕐 Time for a break!</h3>
      <p>You've been scrolling for a while. Consider taking a short break.</p>
      <button id="dismiss-reminder">Dismiss</button>
    </div>
  `;
  
  reminder.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 300px;
  `;
  
  document.body.appendChild(reminder);
  
  // Add dismiss functionality
  document.getElementById('dismiss-reminder').addEventListener('click', () => {
    reminder.remove();
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (reminder.parentNode) {
      reminder.remove();
    }
  }, 10000);
}

// Show daily limit reached message
function showDailyLimitReached() {
  const limitMessage = document.createElement('div');
  limitMessage.id = 'doomscroll-limit';
  limitMessage.innerHTML = `
    <div class="limit-content">
      <h3>🚫 Daily Limit Reached</h3>
      <p>You've reached your daily social media limit. Time to step away!</p>
      <button id="override-limit">Override (not recommended)</button>
    </div>
  `;
  
  limitMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10002;
    background: #ff6b6b;
    color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 300px;
  `;
  
  document.body.appendChild(limitMessage);
  
  // Add override functionality
  document.getElementById('override-limit').addEventListener('click', () => {
    limitMessage.remove();
  });
}

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  console.log('📨 Content script received message:', request.action);
  
  if (request.action === 'resetDailyUsage') {
    console.log('🔄 Resetting daily usage...');
    dailyUsage = 0;
    startTime = Date.now();
    reminderShown = false;
    
    // Reset usage indicator
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      indicator.style.background = 'rgba(0, 0, 0, 0.8)';
      updateUsageIndicator(0, 30);
    }
  }
  
  if (request.action === 'settingsUpdated') {
    console.log('⚙️ Settings updated in content script:', request.settings);
    // Update the daily limit and break reminder
    const { dailyLimit, breakReminder, enabled } = request.settings;
    console.log('📊 New settings - Daily limit:', dailyLimit, 'Break reminder:', breakReminder, 'Enabled:', enabled);
    
    // Update the usage indicator with new limit
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      const limitElement = indicator.querySelector('.daily-limit');
      if (limitElement) {
        limitElement.textContent = `/${dailyLimit}m`;
        console.log('✅ Updated usage indicator with new limit:', dailyLimit);
      }
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
