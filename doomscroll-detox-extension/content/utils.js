// Utils - Utility functions and helpers
// Contains helper functions and utilities used across modules

// Import shared website configuration
// This ensures all files use the same source of truth
const WEBSITE_CONFIG = {
  MONITORED_WEBSITES: [
    { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
    { domain: 'instagram.com', name: 'Instagram', enabled: true, isDefault: true },
    { domain: 'x.com', name: 'X (Twitter)', enabled: true, isDefault: true },
    { domain: 'reddit.com', name: 'Reddit', enabled: true, isDefault: true },
    { domain: 'linkedin.com', name: 'LinkedIn', enabled: true, isDefault: true },
    { domain: 'tiktok.com', name: 'TikTok', enabled: true, isDefault: true },
    { domain: 'snapchat.com', name: 'Snapchat', enabled: true, isDefault: true },
    { domain: 'facebook.com', name: 'Facebook', enabled: true, isDefault: true }
  ]
};

// Get default websites
function getDefaultWebsites() {
  return WEBSITE_CONFIG.MONITORED_WEBSITES.map(site => ({ ...site }));
}

// Initialize content script
function init() {
  console.log('🌐 Content script initializing on:', window.location.hostname);
  console.log('🔗 Current URL:', window.location.href);
  console.log('📅 Current time:', new Date().toLocaleTimeString());
  
  // Add error handling for chrome.storage
  if (!chrome.storage) {
    console.error('❌ Chrome storage API not available');
    // Continue with localStorage fallback
    window.timeTracker.startTimeTracking(30, 15); // Use default values
    window.uiManager.addUsageIndicator();
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
      const enabled = response.settings.enabled !== false; // Default to true
      const monitoredWebsites = response.settings.monitoredWebsites && response.settings.monitoredWebsites.length > 0 
        ? response.settings.monitoredWebsites 
        : getDefaultWebsites();
      
      // Update current settings
      const stateManager = window.stateManager;
      stateManager.updateSettings({ dailyLimit, breakReminder, enabled, focusMode, focusSensitivity, showOverlays });
      
      // Update focus mode cooldown based on sensitivity
      stateManager.updateFocusModeSensitivity(focusSensitivity);
      
      console.log('🚀 Initializing content script with backend settings:', stateManager.getCurrentSettings());
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
      console.log('🔧 Extension enabled?', enabled);
      
      // Check if extension is enabled first
      if (!enabled) {
        console.log('❌ Extension is disabled, content script will not run');
        return;
      }
      
      if (isMonitored) {
        console.log('✅ Site is monitored, starting tracking...');
        
        // Start tracking time
        window.timeTracker.startTimeTracking(dailyLimit, breakReminder);
        
        // Add visual indicators
        window.uiManager.addUsageIndicator();
        
        // Wait for data to be populated before removing loading state
        window.uiManager.waitForDataAndUpdate();
        
        // Start focus mode if enabled
        if (focusMode) {
          window.focusMode.startFocusMode();
        }
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', window.timeTracker.handleVisibilityChange);
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener(window.messageHandler.handleMessage);
      } else {
        console.log('❌ Site is not monitored, content script will not run');
      }
    } else {
      console.error('❌ Failed to load settings from backend, using local fallback');
      // Fallback to local storage
      chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'enabled', 'monitoredWebsites'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Storage access error during init:', chrome.runtime.lastError);
          // Use default settings and localStorage fallback
          const stateManager = window.stateManager;
          stateManager.updateSettings({ dailyLimit: 30, breakReminder: 15, enabled: true, focusMode: false, focusSensitivity: 'medium', showOverlays: true });
          window.timeTracker.startTimeTracking(30, 15);
          window.uiManager.addUsageIndicator();
          return;
        }
        
        const dailyLimit = result.dailyLimit || 30;
        const breakReminder = result.breakReminder || 15;
        const focusMode = result.focusMode || false;
        const focusSensitivity = result.focusSensitivity || 'medium';
        const showOverlays = result.showOverlays !== false; // Default to true
        const enabled = result.enabled !== false; // Default to true
        const monitoredWebsites = result.monitoredWebsites && result.monitoredWebsites.length > 0 
          ? result.monitoredWebsites 
          : getDefaultWebsites();
        
        // Update current settings
        const stateManager = window.stateManager;
        stateManager.updateSettings({ dailyLimit, breakReminder, enabled, focusMode, focusSensitivity, showOverlays });
        
        // Update focus mode cooldown based on sensitivity
        stateManager.updateFocusModeSensitivity(focusSensitivity);
        
        console.log('🚀 Initializing content script with local settings:', stateManager.getCurrentSettings());
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
        console.log('🔧 Extension enabled?', enabled);
        
        // Check if extension is enabled first
        if (!enabled) {
          console.log('❌ Extension is disabled, content script will not run');
          return;
        }
        
        if (isMonitored) {
          console.log('✅ Site is monitored, starting tracking...');
          
          // Start tracking time
          window.timeTracker.startTimeTracking(dailyLimit, breakReminder);
          
          // Add visual indicators
          window.uiManager.addUsageIndicator();
          
          // Wait for data to be populated before removing loading state
          window.uiManager.waitForDataAndUpdate();
          
          // Start focus mode if enabled
          if (focusMode) {
            window.focusMode.startFocusMode();
          }
          
          // Listen for page visibility changes
          document.addEventListener('visibilitychange', window.timeTracker.handleVisibilityChange);
          
          // Listen for messages from background script
          chrome.runtime.onMessage.addListener(window.messageHandler.handleMessage);
        } else {
          console.log('❌ Site is not monitored, content script will not run');
        }
      });
    }
  });
}

// Export utility functions
window.utils = {
  init: init
};
