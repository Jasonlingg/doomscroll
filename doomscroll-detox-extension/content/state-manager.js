// State Manager - Global state and settings management
// Handles all global variables, settings, and state synchronization

// Global state variables
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
  try {
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      console.warn('⚠️ Extension context invalidated - using local storage fallback');
      loadSettingsFromLocalStorage();
      return;
    }
    
    chrome.runtime.sendMessage({ action: 'loadSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Extension context invalidated:', chrome.runtime.lastError.message);
        loadSettingsFromLocalStorage();
        return;
      }
      
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
  } catch (error) {
    console.warn('⚠️ Error refreshing settings:', error.message);
    loadSettingsFromLocalStorage();
  }
}

// Listen for storage changes to automatically refresh settings
let storageChangeDebounceTimer = null;
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;
  console.log('🔄 Storage changed');
  console.log('📝 Changes:', changes);

  // Ignore backend-sync batches (we already applied them during load)
  if (Object.prototype.hasOwnProperty.call(changes, 'lastBackendSync')) {
    console.log('🛑 Ignoring backend-sync storage event');
    return;
  }

  // Ignore non-settings signals
  const settingsKeys = ['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'enabled', 'monitoredWebsites'];
  const changedSettingEntries = Object.entries(changes)
    .filter(([key]) => settingsKeys.includes(key))
    // Drop null/undefined updates to avoid clobbering values
    .filter(([, delta]) => delta && delta.newValue !== null && delta.newValue !== undefined);
  if (changedSettingEntries.length === 0) return;

  // Debounce rapid bursts
  if (storageChangeDebounceTimer) clearTimeout(storageChangeDebounceTimer);
  storageChangeDebounceTimer = setTimeout(() => {
    // Merge changed keys directly into current settings (local-first), avoid backend fetch
    const merged = { ...window.stateManager.getCurrentSettings() };
    changedSettingEntries.forEach(([key, delta]) => {
      merged[key] = delta.newValue;
    });
    window.stateManager.updateSettings(merged);

    // Apply sensitivity update if changed
    if (changes.focusSensitivity && changes.focusSensitivity.newValue) {
      updateFocusModeSensitivity(changes.focusSensitivity.newValue);
    }

    // Force UI to reflect updates
    const usage = window.stateManager.getDailyUsage();
    const limit = merged.dailyLimit || 30;
    window.uiManager.updateUsageIndicator(usage, limit, false);
    window.uiManager.forceUpdateIndicator && window.uiManager.forceUpdateIndicator();

    console.log('✅ Applied local storage changes without backend refresh');
  }, 150);
});

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

// Export state management functions
window.stateManager = {
  // State getters
  getStartTime: () => startTime,
  getIsActive: () => isActive,
  getDailyUsage: () => dailyUsage,
  getReminderShown: () => reminderShown,
  getFocusModeActive: () => focusModeActive,
  getFocusModeTimer: () => focusModeTimer,
  getFocusModeAlertShown: () => focusModeAlertShown,
  getFocusModeState: () => focusModeState,
  getCurrentSettings: () => currentSettings,
  getSessionStartTime: () => sessionStartTime,
  getLastMinuteCompleted: () => lastMinuteCompleted,
  getSettingsJustUpdated: () => settingsJustUpdated,
  getLoadingStateRemoved: () => loadingStateRemoved,
  
  // State setters
  setStartTime: (value) => { startTime = value; },
  setIsActive: (value) => { isActive = value; },
  setDailyUsage: (value) => { dailyUsage = value; },
  setReminderShown: (value) => { reminderShown = value; },
  setFocusModeActive: (value) => { focusModeActive = value; },
  setFocusModeTimer: (value) => { focusModeTimer = value; },
  setFocusModeAlertShown: (value) => { focusModeAlertShown = value; },
  setSessionStartTime: (value) => { sessionStartTime = value; },
  setLastMinuteCompleted: (value) => { lastMinuteCompleted = value; },
  setSettingsJustUpdated: (value) => { settingsJustUpdated = value; },
  setLoadingStateRemoved: (value) => { loadingStateRemoved = value; },
  
  // Settings management
  updateSettings: (newSettings) => {
    Object.assign(currentSettings, newSettings);
  },
  refreshSettings: refreshSettings,
  updateFocusModeSensitivity: updateFocusModeSensitivity
};
