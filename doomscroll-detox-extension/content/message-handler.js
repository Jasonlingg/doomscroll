// Message Handler - Chrome extension messaging
// Handles all communication between content script, background script, and popup

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  console.log('📨 Content script received message:', request.action);
  
  const stateManager = window.stateManager;
  
  if (request.action === 'getUsage') {
    console.log('📊 Usage requested, current usage:', stateManager.getDailyUsage());
    // Ensure we have the latest usage from storage
    chrome.storage.sync.get(['dailyUsage'], (result) => {
      const storedUsage = result.dailyUsage || 0;
      if (Math.abs(storedUsage - stateManager.getDailyUsage()) > 0.1) { // If difference is more than 6 seconds
        console.log('🔄 Syncing usage with storage:', storedUsage, 'vs', stateManager.getDailyUsage());
        stateManager.setDailyUsage(storedUsage);
      }
      sendResponse({ usage: Math.floor(stateManager.getDailyUsage()) });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getSettings') {
    console.log('⚙️ Settings requested from popup, sending current settings:', stateManager.getCurrentSettings());
    
    // Get monitored websites from storage
    chrome.storage.sync.get(['monitoredWebsites'], (result) => {
      const monitoredWebsites = result.monitoredWebsites || [];
      
      const settings = {
        dailyLimit: stateManager.getCurrentSettings().dailyLimit,
        breakReminder: stateManager.getCurrentSettings().breakReminder,
        enabled: stateManager.getCurrentSettings().enabled,
        focusMode: stateManager.getCurrentSettings().focusMode,
        focusSensitivity: stateManager.getCurrentSettings().focusSensitivity,
        showOverlays: stateManager.getCurrentSettings().showOverlays,
        monitoredWebsites: monitoredWebsites
      };
      
      console.log('📤 Sending settings to popup:', settings);
      sendResponse({ success: true, settings: settings });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'resetDailyUsage') {
    console.log('🔄 Resetting daily usage...');
    stateManager.setDailyUsage(0);
    stateManager.setStartTime(Date.now());
    stateManager.setReminderShown(false);
    
    // Reset usage indicator
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      indicator.style.background = 'rgba(0, 0, 0, 0.8)';
      window.uiManager.updateUsageIndicator(0, 30);
    }
    
    // Save reset usage to storage
    window.timeTracker.saveDailyUsage();
  }
  
  if (request.action === 'settingsUpdated') {
    console.log('⚙️ Settings updated in content script:', request.settings);
    
    // Set flag to prevent time tracking from overriding
    stateManager.setSettingsJustUpdated(true);
    
    // Update current settings with new values
    if (request.settings.dailyLimit !== undefined) {
      stateManager.updateSettings({ dailyLimit: request.settings.dailyLimit });
      console.log('📊 Updated daily limit:', stateManager.getCurrentSettings().dailyLimit);
    }
    
    if (request.settings.breakReminder !== undefined) {
      stateManager.updateSettings({ breakReminder: request.settings.breakReminder });
      console.log('⏰ Updated break reminder:', stateManager.getCurrentSettings().breakReminder);
    }
    
    if (request.settings.focusMode !== undefined) {
      stateManager.updateSettings({ focusMode: request.settings.focusMode });
      console.log('🎯 Updated focus mode:', stateManager.getCurrentSettings().focusMode);
    }
    
    if (request.settings.focusSensitivity !== undefined) {
      stateManager.updateSettings({ focusSensitivity: request.settings.focusSensitivity });
      stateManager.updateFocusModeSensitivity(request.settings.focusSensitivity);
      console.log('⚡ Updated focus sensitivity:', stateManager.getCurrentSettings().focusSensitivity);
    }
    
    if (request.settings.showOverlays !== undefined) {
      stateManager.updateSettings({ showOverlays: request.settings.showOverlays });
      console.log('👁️ Updated show overlays:', stateManager.getCurrentSettings().showOverlays);
    }
    
    // Update the usage indicator with new limit
    const indicator = document.getElementById('doomscroll-indicator');
    if (indicator) {
      const limitElement = indicator.querySelector('.daily-limit');
      if (limitElement) {
        limitElement.textContent = `/${stateManager.getCurrentSettings().dailyLimit}m`;
        console.log('✅ Updated usage indicator with new limit:', stateManager.getCurrentSettings().dailyLimit);
      }
      
      // Update the current usage display
      window.uiManager.updateUsageIndicator(stateManager.getDailyUsage(), stateManager.getCurrentSettings().dailyLimit);
    }
    
    // Force update the indicator to ensure it's properly updated
    window.uiManager.forceUpdateIndicator();
    
    // Handle focus mode changes
    if (stateManager.getCurrentSettings().focusMode && !stateManager.getFocusModeActive()) {
      console.log('🎯 Focus mode enabled - starting focus mode');
      window.focusMode.startFocusMode();
    } else if (!stateManager.getCurrentSettings().focusMode && stateManager.getFocusModeActive()) {
      console.log('⏹️ Focus mode disabled - stopping focus mode');
      window.focusMode.stopFocusMode();
    }
    
    // Reset reminder flags if break reminder changed
    if (request.settings.breakReminder !== undefined) {
      stateManager.setReminderShown(false);
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
      if (stateManager.getFocusModeActive()) {
        window.focusMode.stopFocusMode();
        console.log('✅ Focus mode stopped');
      }
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', window.timeTracker.handleVisibilityChange);
      console.log('✅ Event listeners removed');
    }
  }
  
  if (request.action === 'backgroundLog') {
    console.log(`[Background] ${request.message}`);
    // Optionally show as toast notification
    if (request.type === 'error' || request.type === 'warning') {
      window.uiManager.showToastMessage(request.message, request.type);
    }
  }
  
  if (request.action === 'refreshSettings') {
    console.log('🔄 Refreshing settings from storage...');
    stateManager.refreshSettings();
    sendResponse({ success: true });
    return true;
  }
  
  // Handle usage updates from other tabs
  if (request.action === 'usageUpdated') {
    console.log('📥 Received usage update from another tab:', request.usage);
    window.timeTracker.handleUsageUpdateFromOtherTabs(request, sender, sendResponse);
    return true;
  }
}

// Export message handling functions
window.messageHandler = {
  handleMessage: handleMessage
};
