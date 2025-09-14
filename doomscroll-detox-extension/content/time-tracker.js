// Time Tracker - Usage tracking and storage functions
// Handles time tracking, storage operations, and backend synchronization

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
  const stateManager = window.stateManager;
  stateManager.setSessionStartTime(Date.now());
  stateManager.setLastMinuteCompleted(0);
  
  // Update every second
  setInterval(() => {
    if (stateManager.getIsActive()) {
      // Calculate time spent on this session only
      const sessionTime = Math.floor((Date.now() - stateManager.getSessionStartTime()) / 1000 / 60); // minutes
      
      // Only increment usage every full minute, and only if we haven't counted this minute yet
      let minuteJustCompleted = false;
      if (sessionTime > stateManager.getLastMinuteCompleted()) {
        const currentUsage = stateManager.getDailyUsage();
        const newUsage = currentUsage + 1; // Add 1 full minute
        stateManager.setDailyUsage(newUsage);
        stateManager.setLastMinuteCompleted(sessionTime);
        console.log('⏱️ Minute completed! Daily usage:', newUsage, 'minutes');
        console.log('🌐 Current site:', window.location.hostname);
        console.log('🔗 Current URL:', window.location.href);
        
        // Broadcast the update to all other tabs
        console.log('📡 About to broadcast usage update...');
        broadcastUsageUpdate(newUsage);
        
        // Save to storage when we increment
        saveDailyUsage();
        
        minuteJustCompleted = true;
      }
      
      // Update usage indicator with total daily usage (show damage animation if minute just completed)
      updateUsageIndicator(stateManager.getDailyUsage(), stateManager.getCurrentSettings().dailyLimit, minuteJustCompleted);
      
      // Clear the settings update flag after updating
      if (stateManager.getSettingsJustUpdated()) {
        stateManager.setSettingsJustUpdated(false);
        console.log('✅ Settings update flag cleared');
      }
      
      // Show break reminder
      if (stateManager.getDailyUsage() >= stateManager.getCurrentSettings().breakReminder && !stateManager.getReminderShown()) {
        showBreakReminder();
        stateManager.setReminderShown(true);
      }
      
      // Check daily limit
      // if (stateManager.getDailyUsage() >= stateManager.getCurrentSettings().dailyLimit) {
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
    window.stateManager.setDailyUsage(0);
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
          const usage = Math.floor(parseInt(localUsage) || 0);
          window.stateManager.setDailyUsage(usage);
          console.log('📊 Loaded daily usage from localStorage:', usage, 'minutes');
        } else {
          window.stateManager.setDailyUsage(0);
          console.log('📊 No local storage found, starting fresh');
        }
      } catch (e) {
        console.error('❌ Local storage also failed:', e);
        window.stateManager.setDailyUsage(0);
      }
      return;
    }
    
    const lastReset = result.lastReset || Date.now();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Check if it's a new day
    if (now - lastReset >= oneDay) {
      console.log('🆕 New day detected, resetting usage');
      window.stateManager.setDailyUsage(0);
      // Reset the last reset time
      saveDailyUsage();
    } else {
      console.log('📅 Same day, loading existing usage');
      const usage = Math.floor(result.dailyUsage || 0); // Ensure whole number
      window.stateManager.setDailyUsage(usage);
      // Don't adjust startTime - we'll track session time separately
    }
    
    console.log('📊 Loaded daily usage:', window.stateManager.getDailyUsage(), 'minutes');
  });
}

// Function to sync usage data with backend
async function syncUsageWithBackend() {
  try {
    console.log('📤 Syncing usage data with backend...');
    
    const stateManager = window.stateManager;
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
          duration: stateManager.getDailyUsage(),
          extension_version: '1.0.0',
          browser: 'Chrome',
          metadata: {
            daily_limit: stateManager.getCurrentSettings().dailyLimit,
            break_reminder: stateManager.getCurrentSettings().breakReminder,
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
  const stateManager = window.stateManager;
  // Ensure we save whole numbers
  const wholeMinutes = Math.floor(stateManager.getDailyUsage());
  
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
  const stateManager = window.stateManager;
  
  if (document.hidden) {
    stateManager.setIsActive(false);
    // Pause focus mode timer
    if (stateManager.getFocusModeActive() && stateManager.getFocusModeTimer()) {
      clearTimeout(stateManager.getFocusModeTimer());
      console.log('⏸️ Focus mode timer paused - page hidden');
    }
  } else {
    stateManager.setIsActive(true);
    
    // Reset session timer when coming back to tab (but don't affect daily usage)
    if (typeof stateManager.getSessionStartTime() !== 'undefined') {
      stateManager.setSessionStartTime(Date.now());
      stateManager.setLastMinuteCompleted(0);
      console.log('🔄 Reset session timer for new tab session');
    }
    
    // Resume focus mode timer if it was active
    if (stateManager.getFocusModeActive() && !stateManager.getFocusModeAlertShown()) {
      startFocusModeTimer();
      console.log('▶️ Focus mode timer resumed - page visible');
    }
  }
}

// Broadcast usage update to all other tabs
function broadcastUsageUpdate(newUsage) {
  console.log('📡 Broadcasting usage update to other tabs:', newUsage);
  console.log('🔍 Current tab URL:', window.location.href);
  
  try {
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      console.warn('⚠️ Extension context invalidated - skipping broadcast');
      return;
    }
    
    // Send message to background script to broadcast to all tabs
    chrome.runtime.sendMessage({
      action: 'broadcastUsageUpdate',
      usage: newUsage,
      timestamp: Date.now()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Extension context invalidated:', chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.success) {
        console.log('✅ Broadcast message sent successfully');
      } else {
        console.error('❌ Failed to send broadcast message');
      }
    });
  } catch (error) {
    console.warn('⚠️ Error broadcasting usage update:', error.message);
  }
}

// Handle usage updates from other tabs
function handleUsageUpdateFromOtherTabs(request, sender, sendResponse) {
  if (request.action === 'usageUpdated') {
    console.log('📥 Received usage update from another tab:', request.usage);
    console.log('🔍 Received from tab:', sender.tab?.url || 'unknown');
    console.log('⏰ Timestamp:', new Date(request.timestamp).toLocaleTimeString());
    
    const stateManager = window.stateManager;
    const currentUsage = stateManager.getDailyUsage();
    
    console.log('📊 Current usage in this tab:', currentUsage);
    console.log('📊 Incoming usage:', request.usage);
    
    // Only update if the incoming usage is higher (to avoid going backwards)
    if (request.usage > currentUsage) {
      console.log('🔄 Updating usage from other tab:', currentUsage, '->', request.usage);
      stateManager.setDailyUsage(request.usage);
      
      // Update the UI immediately with damage animation
      window.uiManager.updateUsageIndicator(request.usage, stateManager.getCurrentSettings().dailyLimit, true);
      
      // Save to storage
      saveDailyUsage();
      
      console.log('✅ Usage updated successfully from other tab');
    } else {
      console.log('⏸️ Ignoring update - incoming usage not higher than current');
    }
    
    // Always send response to prevent message channel timeout
    if (sendResponse) {
      sendResponse({ success: true });
    }
  }
}

// Export time tracking functions
window.timeTracker = {
  startTimeTracking: startTimeTracking,
  loadDailyUsage: loadDailyUsage,
  saveDailyUsage: saveDailyUsage,
  syncUsageWithBackend: syncUsageWithBackend,
  handleVisibilityChange: handleVisibilityChange,
  broadcastUsageUpdate: broadcastUsageUpdate,
  handleUsageUpdateFromOtherTabs: handleUsageUpdateFromOtherTabs
};
