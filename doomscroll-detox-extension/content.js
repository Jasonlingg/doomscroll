// Content script for Doomscroll Detox extension

let startTime = Date.now();
let isActive = true;
let dailyUsage = 0;
let reminderShown = false;
let focusModeActive = false;
let focusModeTimer = null;
let focusModeAlertShown = false;

// Initialize content script
function init() {
  console.log('🌐 Content script initializing on:', window.location.hostname);
  
  // Get current daily usage from storage
  chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'focusMode', 'monitoredWebsites'], (result) => {
    const dailyLimit = result.dailyLimit || 30;
    const breakReminder = result.breakReminder || 15;
    const focusMode = result.focusMode || false;
    const monitoredWebsites = result.monitoredWebsites || [];
    
    console.log('🚀 Initializing content script with settings:', { dailyLimit, breakReminder, focusMode });
    console.log('📋 Monitored websites:', monitoredWebsites);
    
    // Check if current site is monitored
    const currentSite = window.location.hostname;
    const currentUrl = window.location.href;
    console.log('🔍 Checking site:', currentSite, 'URL:', currentUrl);
    
    // More robust matching - check both hostname and full URL
    const isMonitored = monitoredWebsites.some(site => {
      if (!site.enabled) return false;
      
      const domainMatch = currentSite.includes(site.domain) || currentUrl.includes(site.domain);
      console.log(`  ${site.name} (${site.domain}): enabled=${site.enabled}, match=${domainMatch}`);
      return domainMatch;
    });
    
    console.log('🎯 Current site monitored?', isMonitored, 'Site:', currentSite);
    
    if (isMonitored) {
      console.log('✅ Site is monitored, starting tracking...');
      
      // Start tracking time
      startTimeTracking(dailyLimit, breakReminder);
      
      // Add visual indicators
      addUsageIndicator();
      
      // Start focus mode if enabled
      if (focusMode) {
        startFocusMode();
      }
      
      // Listen for page visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener(handleMessage);
    } else {
      console.log('❌ Site is not monitored, content script will not run');
      
      // Fallback: check if this is a known social media site even if settings aren't loaded
      const fallbackSites = ['youtube.com', 'x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'linkedin.com'];
      const isFallbackSite = fallbackSites.some(site => currentSite.includes(site));
      
      if (isFallbackSite) {
        console.log('🔄 Fallback: Known site detected, starting with default settings...');
        
        // Start tracking with default settings
        startTimeTracking(30, 15);
        addUsageIndicator();
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener(handleMessage);
      }
    }
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
    // Pause focus mode timer
    if (focusModeActive && focusModeTimer) {
      clearTimeout(focusModeTimer);
      console.log('⏸️ Focus mode timer paused - page hidden');
    }
  } else {
    isActive = true;
    startTime = Date.now(); // Reset timer when page becomes visible
    
    // Resume focus mode timer if it was active
    if (focusModeActive && !focusModeAlertShown) {
      startFocusModeTimer();
      console.log('▶️ Focus mode timer resumed - page visible');
    }
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
    const { dailyLimit, breakReminder, enabled, focusMode } = request.settings;
    console.log('📊 New settings - Daily limit:', dailyLimit, 'Break reminder:', breakReminder, 'Enabled:', enabled, 'Focus mode:', focusMode);
    
    // Update the usage indicator with new limit
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      const limitElement = indicator.querySelector('.daily-limit');
      if (limitElement) {
        limitElement.textContent = `/${dailyLimit}m`;
        console.log('✅ Updated usage indicator with new limit:', dailyLimit);
      }
    }
    
    // Handle focus mode changes
    if (focusMode && !focusModeActive) {
      console.log('🎯 Focus mode enabled - starting focus mode');
      startFocusMode();
    } else if (!focusMode && focusModeActive) {
      console.log('⏹️ Focus mode disabled - stopping focus mode');
      stopFocusMode();
    }
  }
  
  if (request.action === 'websitesUpdated') {
    console.log('🌐 Websites updated in content script:', request.websites);
    
    // Check if current site is still monitored
    const currentSite = window.location.hostname;
    const isStillMonitored = request.websites.some(site => 
      site.enabled && (currentSite.includes(site.domain) || window.location.href.includes(site.domain))
    );
    
    console.log('🎯 Current site still monitored after update?', isStillMonitored);
    
    if (!isStillMonitored) {
      console.log('🛑 Site no longer monitored, stopping tracking...');
      
      // Remove usage indicator
      const indicator = document.getElementById('doomscroll-indicator');
      if (indicator) {
        indicator.remove();
        console.log('✅ Usage indicator removed');
      }
      
      // Stop focus mode if active
      if (focusModeActive) {
        stopFocusMode();
        console.log('✅ Focus mode stopped');
      }
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      console.log('✅ Event listeners removed');
    }
  }
}

// Focus mode functions
function startFocusMode() {
  console.log('🎯 Starting focus mode...');
  focusModeActive = true;
  focusModeAlertShown = false;
  startFocusModeTimer();
}

function stopFocusMode() {
  console.log('⏹️ Stopping focus mode...');
  focusModeActive = false;
  if (focusModeTimer) {
    clearTimeout(focusModeTimer);
    focusModeTimer = null;
  }
  focusModeAlertShown = false;
}

function startFocusModeTimer() {
  if (focusModeTimer) {
    clearTimeout(focusModeTimer);
  }
  
  console.log('⏰ Starting 30-second focus mode timer...');
  focusModeTimer = setTimeout(() => {
    if (focusModeActive && !focusModeAlertShown) {
      showFocusModeAlert();
    }
  }, 30000); // 30 seconds
}

function showFocusModeAlert() {
  console.log('🚨 Showing focus mode alert!');
  focusModeAlertShown = true;
  
  const alert = document.createElement('div');
  alert.id = 'focus-mode-alert';
  alert.innerHTML = `
    <div class="focus-alert-content">
      <h3>🚨 Focus Mode Alert!</h3>
      <p>You've been on this social media site for 30 seconds.</p>
      <p><strong>Are you being productive?</strong></p>
      <div class="focus-alert-buttons">
        <button id="yes-productive" class="btn-focus-yes">Yes, I'm being productive</button>
        <button id="no-productive" class="btn-focus-no">No, I'm being unproductive</button>
      </div>
    </div>
  `;
  
  // Style the alert
  alert.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10003;
    background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
    color: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  document.body.appendChild(alert);
  
  // Add button functionality
  document.getElementById('yes-productive').addEventListener('click', () => {
    console.log('✅ User confirmed they are being productive');
    alert.remove();
    // Reset timer for another 30 seconds
    focusModeAlertShown = false;
    startFocusModeTimer();
  });
  
  document.getElementById('no-productive').addEventListener('click', () => {
    console.log('❌ User admitted they are being unproductive');
    alert.remove();
    // Show motivational message and suggest alternatives
    showProductivitySuggestion();
  });
}

function showProductivitySuggestion() {
  const suggestion = document.createElement('div');
  suggestion.id = 'productivity-suggestion';
  suggestion.innerHTML = `
    <div class="suggestion-content">
      <h3>💪 Great Self-Awareness!</h3>
      <p>Recognizing unproductive behavior is the first step to change.</p>
      <div class="suggestion-ideas">
        <h4>Try these instead:</h4>
        <ul>
          <li>📚 Read a book or article</li>
          <li>🎯 Work on a personal project</li>
          <li>🏃‍♂️ Take a short walk</li>
          <li>🧘‍♀️ Practice mindfulness</li>
          <li>📝 Journal your thoughts</li>
        </ul>
      </div>
      <button id="close-suggestion" class="btn-close">Got it!</button>
    </div>
  `;
  
  // Style the suggestion
  suggestion.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10004;
    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
    color: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 450px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  document.body.appendChild(suggestion);
  
  // Add close functionality
  document.getElementById('close-suggestion').addEventListener('click', () => {
    suggestion.remove();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
