// Content script for Doomscroll Detox extension

let startTime = Date.now();
let isActive = true;
let dailyUsage = 0;
let reminderShown = false;
let focusModeActive = false;
let focusModeTimer = null;
let focusModeAlertShown = false;

// Focus mode state management
let focusModeState = {
  lastAlertTime: 0,
  alertCooldown: 30000, // 30 seconds between alerts per domain
  isIdle: false,
  idleTimeout: null
};

// Settings state
let currentSettings = {
  dailyLimit: 30,
  breakReminder: 15,
  enabled: true,
  focusMode: false,
  focusSensitivity: 'medium',
  showOverlays: true
};

// Session tracking state
let sessionStartTime = Date.now();
let lastMinuteCompleted = 0;
let settingsJustUpdated = false; // Flag to prevent override during settings update
let loadingStateRemoved = false; // Flag to track if loading state has been removed

// Function to refresh settings from backend
function refreshSettings() {
  console.log('🔄 Refreshing settings from backend...');
  
  // Request settings from background script (which will get from backend)
  chrome.runtime.sendMessage({ action: 'loadSettings' }, (response) => {
    if (response && response.success) {
      console.log('📥 Retrieved settings from backend:', response.settings);
      
      // Update current settings
      if (response.settings.dailyLimit !== undefined) currentSettings.dailyLimit = response.settings.dailyLimit;
      if (response.settings.breakReminder !== undefined) currentSettings.breakReminder = response.settings.breakReminder;
      if (response.settings.focusMode !== undefined) currentSettings.focusMode = response.settings.focusMode;
      if (response.settings.focusSensitivity !== undefined) {
        currentSettings.focusSensitivity = response.settings.focusSensitivity;
        updateFocusModeSensitivity(response.settings.focusSensitivity);
      }
      if (response.settings.showOverlays !== undefined) currentSettings.showOverlays = response.settings.showOverlays;
      if (response.settings.enabled !== undefined) currentSettings.enabled = response.settings.enabled;
      
      console.log('✅ Settings refreshed from backend:', currentSettings);
      
      // Update UI elements
      const indicator = document.getElementById('doomscroll-indicator');
      if (indicator) {
        const limitElement = indicator.querySelector('.daily-limit');
        if (limitElement) {
          limitElement.textContent = `/${currentSettings.dailyLimit}m`;
        }
        updateUsageIndicator(dailyUsage, currentSettings.dailyLimit);
      }
      
      // Force update the indicator
      forceUpdateIndicator();
      
      // Handle focus mode changes
      if (currentSettings.focusMode && !focusModeActive) {
        console.log('🎯 Focus mode enabled during refresh - starting focus mode');
        startFocusMode();
      } else if (!currentSettings.focusMode && focusModeActive) {
        console.log('⏹️ Focus mode disabled during refresh - stopping focus mode');
        stopFocusMode();
      }
    } else {
      console.error('❌ Failed to load settings from backend, using local fallback');
      // Fallback to local storage
      chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'enabled'], (result) => {
        if (result.dailyLimit !== undefined) currentSettings.dailyLimit = result.dailyLimit;
        if (result.breakReminder !== undefined) currentSettings.breakReminder = result.breakReminder;
        if (result.focusMode !== undefined) currentSettings.focusMode = result.focusMode;
        if (result.focusSensitivity !== undefined) {
          currentSettings.focusSensitivity = result.focusSensitivity;
          updateFocusModeSensitivity(result.focusSensitivity);
        }
        if (result.showOverlays !== undefined) currentSettings.showOverlays = result.showOverlays;
        if (result.enabled !== undefined) currentSettings.enabled = result.enabled;
        
        console.log('✅ Settings refreshed from local storage:', currentSettings);
      });
    }
  });
}

// Listen for storage changes to automatically refresh settings
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('🔄 Storage changed, refreshing settings...');
    console.log('📝 Changes:', changes);
    
    // Check if any relevant settings changed
    const relevantChanges = ['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'enabled'];
    const hasRelevantChanges = relevantChanges.some(key => changes[key]);
    
    if (hasRelevantChanges) {
      console.log('⚙️ Relevant settings changed, refreshing...');
      refreshSettings();
    }
  }
});

// Initialize content script
function init() {
  console.log('🌐 Content script initializing on:', window.location.hostname);
  
  // Add error handling for chrome.storage
  if (!chrome.storage) {
    console.error('❌ Chrome storage API not available');
    // Continue with localStorage fallback
    startTimeTracking(30, 15); // Use default values
    addUsageIndicator();
    return;
  }
  
  // Load settings from backend first
  chrome.runtime.sendMessage({ action: 'loadSettings' }, (response) => {
    if (response && response.success) {
      console.log('📥 Retrieved settings from backend during init:', response.settings);
      
      const dailyLimit = response.settings.dailyLimit || 30;
      const breakReminder = response.settings.breakReminder || 15;
      const focusMode = response.settings.focusMode || false;
      const focusSensitivity = response.settings.focusSensitivity || 'medium';
      const showOverlays = response.settings.showOverlays !== false; // Default to true
      const monitoredWebsites = response.settings.monitoredWebsites || [];
      
      // Update current settings
      currentSettings = { dailyLimit, breakReminder, enabled: true, focusMode, focusSensitivity, showOverlays };
      
      // Update focus mode cooldown based on sensitivity
      updateFocusModeSensitivity(focusSensitivity);
      
      console.log('🚀 Initializing content script with backend settings:', currentSettings);
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
        
        // Add a small delay before showing real data to ensure loading state is visible
        setTimeout(() => {
          forceUpdateIndicator();
          console.log('✅ Loading state removed, showing real data');
        }, 1000); // 1 second delay
        
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
      }
    } else {
      console.error('❌ Failed to load settings from backend, using local fallback');
      // Fallback to local storage
      chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'monitoredWebsites'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Storage access error during init:', chrome.runtime.lastError);
          // Use default settings and localStorage fallback
          currentSettings = { dailyLimit: 30, breakReminder: 15, enabled: true, focusMode: false, focusSensitivity: 'medium', showOverlays: true };
          startTimeTracking(30, 15);
          addUsageIndicator();
          return;
        }
        
        const dailyLimit = result.dailyLimit || 30;
        const breakReminder = result.breakReminder || 15;
        const focusMode = result.focusMode || false;
        const focusSensitivity = result.focusSensitivity || 'medium';
        const showOverlays = result.showOverlays !== false; // Default to true
        const monitoredWebsites = result.monitoredWebsites || [];
        
        // Update current settings
        currentSettings = { dailyLimit, breakReminder, enabled: true, focusMode, focusSensitivity, showOverlays };
        
        // Update focus mode cooldown based on sensitivity
        updateFocusModeSensitivity(focusSensitivity);
        
        console.log('🚀 Initializing content script with local settings:', currentSettings);
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
          
          // Add a small delay before showing real data to ensure loading state is visible
          setTimeout(() => {
            forceUpdateIndicator();
            console.log('✅ Loading state removed, showing real data');
          }, 1000); // 1 second delay
          
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
        }
      });
    }
  });
}

// Track time spent on page with proper persistence
function startTimeTracking(dailyLimit, breakReminder) {
  console.log('⏱️ Starting time tracking...');
  
  // Log page view event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'page_view',
    domain: window.location.hostname,
    url: window.location.href,
    duration: 0
  });
  
  // Load existing daily usage from storage
  loadDailyUsage();
  
  // Reset session timer for new tracking session
  sessionStartTime = Date.now();
  lastMinuteCompleted = 0;
  
  // Update every second
  setInterval(() => {
    if (isActive) {
      // Calculate time spent on this session only
      const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000 / 60); // minutes
      
      // Only increment usage every full minute, and only if we haven't counted this minute yet
      if (sessionTime > lastMinuteCompleted) {
        dailyUsage += 1; // Add 1 full minute
        lastMinuteCompleted = sessionTime;
        console.log('⏱️ Minute completed! Daily usage:', dailyUsage, 'minutes');
        
        // Save to storage when we increment
        saveDailyUsage();
      }
      
      // Update usage indicator with total daily usage
      updateUsageIndicator(dailyUsage, currentSettings.dailyLimit);
      
      // Clear the settings update flag after updating
      if (settingsJustUpdated) {
        settingsJustUpdated = false;
        console.log('✅ Settings update flag cleared');
      }
      
      // Show break reminder
      if (dailyUsage >= currentSettings.breakReminder && !reminderShown) {
        showBreakReminder();
        reminderShown = true;
      }
      
      // Check daily limit
      // if (dailyUsage >= currentSettings.dailyLimit) {
      //   showDailyLimitReached();
      // }
    }
  }, 1000); // Check every second
}

// Load daily usage from storage with error handling
function loadDailyUsage() {
  // Check if chrome.storage is available
  if (!chrome.storage || !chrome.storage.sync) {
    console.error('❌ Chrome storage API not available');
    dailyUsage = 0;
    return;
  }
  
  chrome.storage.sync.get(['dailyUsage', 'lastReset'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Storage access error:', chrome.runtime.lastError);
      // Fallback to local storage
      try {
        const localUsage = localStorage.getItem('doomscroll_daily_usage');
        const localReset = localStorage.getItem('doomscroll_last_reset');
        
        if (localUsage && localReset) {
          dailyUsage = Math.floor(parseInt(localUsage) || 0);
          console.log('📊 Loaded daily usage from localStorage:', dailyUsage, 'minutes');
        } else {
          dailyUsage = 0;
          console.log('📊 No local storage found, starting fresh');
        }
      } catch (e) {
        console.error('❌ Local storage also failed:', e);
        dailyUsage = 0;
      }
      return;
    }
    
    const lastReset = result.lastReset || Date.now();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Check if it's a new day
    if (now - lastReset >= oneDay) {
      console.log('🆕 New day detected, resetting usage');
      dailyUsage = 0;
      // Reset the last reset time
      saveDailyUsage();
    } else {
      console.log('📅 Same day, loading existing usage');
      dailyUsage = Math.floor(result.dailyUsage || 0); // Ensure whole number
      // Don't adjust startTime - we'll track session time separately
    }
    
    console.log('📊 Loaded daily usage:', dailyUsage, 'minutes');
  });
}

// Function to sync usage data with backend
async function syncUsageWithBackend() {
  try {
    console.log('📤 Syncing usage data with backend...');
    
    const response = await fetch('http://127.0.0.1:8000/api/v1/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [{
          user_id: 'user_123', // This should be the actual user ID
          event_type: 'usage_sync',
          domain: window.location.hostname,
          url: window.location.href,
          duration: dailyUsage,
          extension_version: '1.0.0',
          browser: 'Chrome',
          metadata: {
            daily_limit: currentSettings.dailyLimit,
            break_reminder: currentSettings.breakReminder,
            timestamp: Date.now()
          }
        }]
      })
    });
    
    if (response.ok) {
      console.log('✅ Usage data synced with backend');
    } else {
      console.log('⚠️ Failed to sync with backend, continuing with local storage');
    }
  } catch (error) {
    console.log('⚠️ Backend sync failed, using local storage only:', error);
  }
}

// Save daily usage to storage with error handling
function saveDailyUsage() {
  // Ensure we save whole numbers
  const wholeMinutes = Math.floor(dailyUsage);
  
  // Try chrome.storage first
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ dailyUsage: wholeMinutes }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to save to chrome.storage:', chrome.runtime.lastError);
        // Fallback to localStorage
        saveToLocalStorage(wholeMinutes);
      } else {
        console.log('💾 Saved daily usage to chrome.storage:', wholeMinutes, 'minutes');
        // Also sync with backend (non-blocking)
        syncUsageWithBackend();
      }
    });
  } else {
    // Fallback to localStorage
    saveToLocalStorage(wholeMinutes);
    // Also sync with backend (non-blocking)
    syncUsageWithBackend();
  }
}

// Fallback storage function
function saveToLocalStorage(wholeMinutes) {
  try {
    localStorage.setItem('doomscroll_daily_usage', wholeMinutes.toString());
    localStorage.setItem('doomscroll_last_reset', Date.now().toString());
    console.log('💾 Saved daily usage to localStorage:', wholeMinutes, 'minutes');
  } catch (e) {
    console.error('❌ Failed to save to localStorage:', e);
    // Last resort - just keep in memory
    console.log('⚠️ Keeping usage in memory only:', wholeMinutes, 'minutes');
  }
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
    
    // Reset session timer when coming back to tab (but don't affect daily usage)
    if (typeof sessionStartTime !== 'undefined') {
      sessionStartTime = Date.now();
      lastMinuteCompleted = 0;
      console.log('🔄 Reset session timer for new tab session');
    }
    
    // Resume focus mode timer if it was active
    if (focusModeActive && !focusModeAlertShown) {
      startFocusModeTimer();
      console.log('▶️ Focus mode timer resumed - page visible');
    }
  }
}

// Function to remove loading state and show real data
function removeLoadingState() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (indicator && !loadingStateRemoved) {
    indicator.classList.remove('loading');
    loadingStateRemoved = true;
    console.log('✅ Removed loading state from indicator');
  }
}

// Function to force update the usage indicator
function forceUpdateIndicator() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (indicator) {
    // Remove loading state
    removeLoadingState();
    
    // Update the limit display
    const limitElement = indicator.querySelector('.daily-limit');
    if (limitElement) {
      limitElement.textContent = `/${currentSettings.dailyLimit}m`;
      console.log('✅ Updated indicator limit to:', currentSettings.dailyLimit);
    }
    
    // Update the time display
    const timeElement = indicator.querySelector('.time-spent');
    if (timeElement) {
      timeElement.textContent = `${Math.floor(dailyUsage)}m`;
      console.log('✅ Updated indicator time to:', Math.floor(dailyUsage));
    }
    
    // Force update background color immediately
    const wholeMinutes = Math.floor(dailyUsage);
    let newBackground = '#4facfe'; // Default blue
    if (wholeMinutes >= currentSettings.dailyLimit) {
      newBackground = '#ff6b6b'; // Red for limit reached
    } else if (wholeMinutes >= currentSettings.dailyLimit * 0.8) {
      newBackground = '#ffd93d'; // Yellow for warning
    } else if (wholeMinutes > 0) {
      newBackground = '#4ecdc4'; // Teal when active
    }
    indicator.style.background = newBackground;
    
    console.log('✅ Force updated indicator with limit:', currentSettings.dailyLimit, 'and time:', wholeMinutes);
  } else {
    console.log('⚠️ No indicator found to update');
  }
}

// Add usage indicator to the page
function addUsageIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'doomscroll-indicator';
  indicator.innerHTML = `
    <div class="doomscroll-badge">
      <span class="time-spent">...</span>
      <span class="daily-limit">/...</span>
    </div>
  `;
  
  // Add loading class for styling
  indicator.classList.add('loading');
  
  // Reset loading state flag for new indicator
  loadingStateRemoved = false;
  
  document.body.appendChild(indicator);
}

// Update usage indicator with performance optimizations
function updateUsageIndicator(timeSpent, dailyLimit) {
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  // Remove loading state if present and not already removed
  if (!loadingStateRemoved) {
    removeLoadingState();
  }
  
  // Ensure timeSpent is a whole number
  const wholeMinutes = Math.floor(timeSpent);
  
  // Batch DOM updates to avoid excessive reflows
  const updates = [];
  
  const timeElement = indicator.querySelector('.time-spent');
  const limitElement = indicator.querySelector('.daily-limit');
  
  if (timeElement && timeElement.textContent !== `${wholeMinutes}m`) {
    updates.push(() => timeElement.textContent = `${wholeMinutes}m`);
  }
  
  if (limitElement && limitElement.textContent !== `/${dailyLimit}m`) {
    updates.push(() => limitElement.textContent = `/${dailyLimit}m`);
  }
  
  // Determine new background color
  let newBackground = '#4facfe'; // Default blue
  
  if (wholeMinutes >= dailyLimit) {
    newBackground = '#ff6b6b'; // Red for limit reached
  } else if (wholeMinutes >= dailyLimit * 0.8) {
    newBackground = '#ffd93d'; // Yellow for warning
  } else if (wholeMinutes > 0) {
    newBackground = '#4ecdc4'; // Teal when active
  }
  
  // Only update background if it changed
  if (indicator.style.background !== newBackground) {
    updates.push(() => {
      indicator.style.background = newBackground;
    });
  }
  
  // Batch all updates in one frame
  if (updates.length > 0) {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }
}

// Show break reminder
function showBreakReminder() {
  // Log break reminder event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'break_reminder',
    domain: window.location.hostname,
    url: window.location.href,
    duration: dailyUsage
  });
  
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
  // Log daily limit reached event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'daily_limit_reached',
    domain: window.location.hostname,
    url: window.location.href,
    duration: dailyUsage
  });
  
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
  
  if (request.action === 'getUsage') {
    console.log('📊 Usage requested, current usage:', dailyUsage);
    // Ensure we have the latest usage from storage
    chrome.storage.sync.get(['dailyUsage'], (result) => {
      const storedUsage = result.dailyUsage || 0;
      if (Math.abs(storedUsage - dailyUsage) > 0.1) { // If difference is more than 6 seconds
        console.log('🔄 Syncing usage with storage:', storedUsage, 'vs', dailyUsage);
        dailyUsage = storedUsage;
      }
      sendResponse({ usage: Math.floor(dailyUsage) });
    });
    return true; // Keep message channel open for async response
  }
  
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
    
    // Save reset usage to storage
    saveDailyUsage();
  }
  
  if (request.action === 'settingsUpdated') {
    console.log('⚙️ Settings updated in content script:', request.settings);
    
    // Set flag to prevent time tracking from overriding
    settingsJustUpdated = true;
    
    // Update current settings with new values
    if (request.settings.dailyLimit !== undefined) {
      currentSettings.dailyLimit = request.settings.dailyLimit;
      console.log('📊 Updated daily limit:', currentSettings.dailyLimit);
    }
    
    if (request.settings.breakReminder !== undefined) {
      currentSettings.breakReminder = request.settings.breakReminder;
      console.log('⏰ Updated break reminder:', currentSettings.breakReminder);
    }
    
    if (request.settings.focusMode !== undefined) {
      currentSettings.focusMode = request.settings.focusMode;
      console.log('🎯 Updated focus mode:', currentSettings.focusMode);
    }
    
    if (request.settings.focusSensitivity !== undefined) {
      currentSettings.focusSensitivity = request.settings.focusSensitivity;
      updateFocusModeSensitivity(request.settings.focusSensitivity);
      console.log('⚡ Updated focus sensitivity:', currentSettings.focusSensitivity);
    }
    
    if (request.settings.showOverlays !== undefined) {
      currentSettings.showOverlays = request.settings.showOverlays;
      console.log('👁️ Updated show overlays:', currentSettings.showOverlays);
    }
    
    // Update the usage indicator with new limit
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      const limitElement = indicator.querySelector('.daily-limit');
      if (limitElement) {
        limitElement.textContent = `/${currentSettings.dailyLimit}m`;
        console.log('✅ Updated usage indicator with new limit:', currentSettings.dailyLimit);
      }
      
      // Update the current usage display
      updateUsageIndicator(dailyUsage, currentSettings.dailyLimit);
    }
    
    // Force update the indicator to ensure it's properly updated
    forceUpdateIndicator();
    
    // Handle focus mode changes
    if (currentSettings.focusMode && !focusModeActive) {
      console.log('🎯 Focus mode enabled - starting focus mode');
      startFocusMode();
    } else if (!currentSettings.focusMode && focusModeActive) {
      console.log('⏹️ Focus mode disabled - stopping focus mode');
      stopFocusMode();
    }
    
    // Reset reminder flags if break reminder changed
    if (request.settings.breakReminder !== undefined) {
      reminderShown = false;
      console.log('🔄 Reset reminder flag for new break reminder setting');
    }
    
    sendResponse({ success: true });
    return true;
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
  
  if (request.action === 'backgroundLog') {
    console.log(`[Background] ${request.message}`);
    // Optionally show as toast notification
    if (request.type === 'error' || request.type === 'warning') {
      showToastMessage(request.message, request.type);
    }
  }
  
  if (request.action === 'refreshSettings') {
    console.log('🔄 Refreshing settings from storage...');
    refreshSettings();
    sendResponse({ success: true });
    return true;
  }
}

// Focus mode functions with improved stability
function startFocusMode() {
  console.log('🎯 Starting focus mode...');
  
  // Log focus mode start event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'focus_mode_started',
    domain: window.location.hostname,
    url: window.location.href,
    duration: dailyUsage
  });
  
  focusModeActive = true;
  focusModeAlertShown = false;
  focusModeState.lastAlertTime = 0;
  
  // Clear any existing timers
  if (focusModeTimer) {
    clearTimeout(focusModeTimer);
    focusModeTimer = null;
  }
  
  startFocusModeTimer();
  startIdleDetection();
}

function stopFocusMode() {
  console.log('⏹️ Stopping focus mode...');
  focusModeActive = false;
  
  if (focusModeTimer) {
    clearTimeout(focusModeTimer);
    focusModeTimer = null;
  }
  
  if (focusModeState.idleTimeout) {
    clearTimeout(focusModeState.idleTimeout);
    focusModeState.idleTimeout = null;
  }
  
  focusModeAlertShown = false;
  focusModeState.isIdle = false;
}

function startFocusModeTimer() {
  if (focusModeTimer) {
    clearTimeout(focusModeTimer);
  }
  
  // Get timer duration from current settings
  let timerDuration = 30000; // Default 30 seconds
  switch (currentSettings.focusSensitivity) {
    case 'low':
      timerDuration = 60000; // 60 seconds
      break;
    case 'medium':
      timerDuration = 30000; // 30 seconds
      break;
    case 'high':
      timerDuration = 15000; // 15 seconds
      break;
  }
  
  console.log(`⏰ Starting focus mode timer for ${timerDuration/1000}s...`);
  focusModeTimer = setTimeout(() => {
    if (focusModeActive && !focusModeAlertShown && !focusModeState.isIdle) {
      showFocusModeAlert();
    }
  }, timerDuration);
}

function startIdleDetection() {
  // Reset idle state
  focusModeState.isIdle = false;
  
  // Clear existing timeout
  if (focusModeState.idleTimeout) {
    clearTimeout(focusModeState.idleTimeout);
  }
  
  // Set new idle timeout (5 minutes)
  focusModeState.idleTimeout = setTimeout(() => {
    focusModeState.isIdle = true;
    console.log('😴 User marked as idle, pausing focus mode');
  }, 300000); // 5 minutes
}

function showFocusModeAlert() {
  const currentTime = Date.now();
  const currentDomain = window.location.hostname;
  
  // Check if we should show alert (debouncing per domain)
  if (currentTime - focusModeState.lastAlertTime < focusModeState.alertCooldown) {
    console.log('⏳ Alert cooldown active, skipping...');
    return;
  }
  
  // Log focus mode alert event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'focus_mode_alert',
    domain: window.location.hostname,
    url: window.location.href,
    duration: dailyUsage
  });
  
  // Check if overlays are disabled
  if (!currentSettings.showOverlays) {
    console.log('🚫 Overlays disabled, showing toast instead');
    showToastMessage('Focus Mode: Time to check if you\'re being productive!', 'warning');
    return;
  }
  
  console.log('🚨 Showing focus mode alert!');
  focusModeAlertShown = true;
  focusModeState.lastAlertTime = currentTime;
  
  // Detect content type for better messaging
  const contentType = detectContentType();
  const alertMessage = getContentTypeMessage(contentType);
  
  const alert = document.createElement('div');
  alert.id = 'focus-mode-alert';
  alert.innerHTML = `
    <div class="focus-alert-content">
      <h3>🚨 Focus Mode Alert!</h3>
      <p>${alertMessage}</p>
      <p><strong>Are you being productive?</strong></p>
      <div class="focus-alert-buttons">
        <button id="yes-productive" class="btn-focus-yes">Yes, I'm being productive</button>
        <button id="no-productive" class="btn-focus-no">No, I'm being unproductive</button>
        <button id="snooze-alert" class="btn-focus-snooze">Snooze 5 min</button>
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
  
  document.getElementById('snooze-alert').addEventListener('click', () => {
    console.log('⏰ User snoozed alert for 5 minutes');
    alert.remove();
    // Snooze for 5 minutes
    setTimeout(() => {
      focusModeAlertShown = false;
      startFocusModeTimer();
    }, 300000); // 5 minutes
  });
}

// Detect content type for better focus mode messaging
function detectContentType() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  if (hostname.includes('youtube.com') && url.includes('/shorts/')) {
    return 'youtube-shorts';
  } else if (hostname.includes('tiktok.com')) {
    return 'tiktok';
  } else if (hostname.includes('instagram.com') && url.includes('/reels/')) {
    return 'instagram-reels';
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'twitter-feed';
  } else if (hostname.includes('reddit.com')) {
    return 'reddit-feed';
  } else if (hostname.includes('facebook.com')) {
    return 'facebook-feed';
  }
  
  return 'general';
}

// Get appropriate message based on content type
function getContentTypeMessage(contentType) {
  const messages = {
    'youtube-shorts': 'You\'ve been watching YouTube Shorts for 30 seconds.',
    'tiktok': 'You\'ve been scrolling TikTok for 30 seconds.',
    'instagram-reels': 'You\'ve been watching Instagram Reels for 30 seconds.',
    'twitter-feed': 'You\'ve been scrolling Twitter/X for 30 seconds.',
    'reddit-feed': 'You\'ve been browsing Reddit for 30 seconds.',
    'facebook-feed': 'You\'ve been scrolling Facebook for 30 seconds.',
    'general': 'You\'ve been on this social media site for 30 seconds.'
  };
  
  return messages[contentType] || messages.general;
}

// Update focus mode sensitivity
function updateFocusModeSensitivity(sensitivity) {
  switch (sensitivity) {
    case 'low':
      focusModeState.alertCooldown = 60000; // 60 seconds
      break;
    case 'medium':
      focusModeState.alertCooldown = 30000; // 30 seconds
      break;
    case 'high':
      focusModeState.alertCooldown = 15000; // 15 seconds
      break;
    default:
      focusModeState.alertCooldown = 30000; // Default to medium
  }
  
  console.log(`🎯 Focus mode sensitivity set to ${sensitivity} (${focusModeState.alertCooldown/1000}s cooldown)`);
}

// Privacy notice - shows what data is NOT collected
function showPrivacyNotice() {
  const notice = document.createElement('div');
  notice.id = 'privacy-notice';
  notice.innerHTML = `
    <div class="privacy-content">
      <h4>🔒 Privacy Notice</h4>
      <p>This extension <strong>does NOT</strong> collect:</p>
      <ul>
        <li>📱 Screen content or screenshots</li>
        <li>🎤 Audio or microphone data</li>
        <li>⌨️ Keystrokes or typing</li>
        <li>📄 Page content or text</li>
        <li>📊 Personal browsing analytics</li>
      </ul>
      <p><strong>Only collects:</strong> Domain names and time spent for usage tracking.</p>
      <button id="close-privacy-notice">Got it</button>
    </div>
  `;
  
  // Style the notice
  notice.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10005;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 20px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;
  
  document.body.appendChild(notice);
  
  // Add close functionality
  document.getElementById('close-privacy-notice').addEventListener('click', () => {
    notice.remove();
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notice.parentNode) {
      notice.remove();
    }
  }, 10000);
}

// Show toast message when overlays are disabled
function showToastMessage(message, type = 'info') {
  const toast = document.createElement('div');
  toast.id = 'doomscroll-toast';
  toast.textContent = message;
  
  // Style the toast
  const colors = {
    info: '#2196f3',
    warning: '#ff9800',
    success: '#4caf50',
    error: '#f44336'
  };
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10004;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 300px;
    word-wrap: break-word;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
  
  // Add CSS animations
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
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
