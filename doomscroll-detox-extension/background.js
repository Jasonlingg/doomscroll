// Background service worker for Doomscroll Detox extension

// Backend API configuration
const BACKEND_URL = 'http://127.0.0.1:8000';
const API_ENDPOINTS = {
  events: `${BACKEND_URL}/api/v1/events`,
  health: `${BACKEND_URL}/health`
};

// Helper function to send events to backend
async function sendEventToBackend(eventData) {
  try {
    console.log('📤 Sending event to backend:', eventData);
    
    const response = await fetch(API_ENDPOINTS.events, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [eventData]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Event sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send event to backend:', error);
    return null;
  }
}

// Helper function to check backend health
async function checkBackendHealth() {
  try {
    const response = await fetch(API_ENDPOINTS.health);
    if (response.ok) {
      const health = await response.json();
      console.log('🏥 Backend health check:', health);
      return true;
    }
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
  }
  return false;
}

// Helper function to generate user ID (more consistent hash of browser fingerprint)
function generateUserId() {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const platform = navigator.platform;
  const fingerprint = `${userAgent}|${language}|${timezone}|${platform}`;
  
  // More consistent hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

// Helper function to get user ID from storage
async function getUserId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['userId'], (result) => {
      const userId = result.userId || generateUserId();
      showBackgroundLog(`👤 Using user ID: ${userId}`);
      resolve(userId);
    });
  });
}

// Backend settings management
async function saveSettingsToBackend(settings) {
  try {
    const userId = await getUserId();
    const response = await fetch(`${BACKEND_URL}/api/v1/users/${userId}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        daily_limit: settings.dailyLimit || 30,
        break_reminder: settings.breakReminder || 15,
        focus_mode_enabled: settings.focusMode || false,
        focus_sensitivity: settings.focusSensitivity || 'medium',
        show_overlays: settings.showOverlays !== false,
        enabled: settings.enabled !== false,
        monitored_websites: settings.monitoredWebsites || []
      })
    });
    
    const result = await response.json();
    if (result.success) {
      showBackgroundLog('✅ Settings saved to backend successfully');
      return true;
    } else {
      showBackgroundLog('❌ Failed to save settings to backend:', result.error);
      return false;
    }
  } catch (error) {
    showBackgroundLog('❌ Error saving settings to backend:', error);
    return false;
  }
}

async function loadSettingsFromBackend() {
  try {
    const userId = await getUserId();
    const response = await fetch(`${BACKEND_URL}/api/v1/users/${userId}/settings`);
    const result = await response.json();
    
    if (result.success) {
      showBackgroundLog('✅ Settings loaded from backend:', result.settings);
      return result.settings;
    } else {
      showBackgroundLog('❌ Failed to load settings from backend:', result.error);
      return null;
    }
  } catch (error) {
    showBackgroundLog('❌ Error loading settings from backend:', error);
    return null;
  }
}

// Helper function to show visual logs
function showBackgroundLog(message, type = 'info') {
  console.log(`[Background] ${message}`);
  
  // Also send to any open popup or content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && isSocialMediaSite(tab.url)) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'backgroundLog',
          message: message,
          type: type
        }).catch(() => {
          // Ignore errors if content script not ready
        });
      }
    });
  });
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async () => {
  showBackgroundLog('🚀 Doomscroll Detox extension installed successfully!');
  showBackgroundLog('📅 Initializing default settings...');
  
  // Check backend connectivity
  const backendHealthy = await checkBackendHealth();
  if (backendHealthy) {
    showBackgroundLog('✅ Backend API is running and healthy');
  } else {
    showBackgroundLog('⚠️ Backend API is not available - events will be logged locally only');
  }
  
  // Initialize default settings
  const defaultWebsites = [
    { domain: 'facebook.com', name: 'Facebook', enabled: true, isDefault: true },
    { domain: 'twitter.com', name: 'Twitter/X', enabled: true, isDefault: true },
    { domain: 'x.com', name: 'X (Twitter)', enabled: true, isDefault: true },
    { domain: 'instagram.com', name: 'Instagram', enabled: true, isDefault: true },
    { domain: 'tiktok.com', name: 'TikTok', enabled: true, isDefault: true },
    { domain: 'reddit.com', name: 'Reddit', enabled: true, isDefault: true },
    { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
    { domain: 'linkedin.com', name: 'LinkedIn', enabled: false, isDefault: true },
    { domain: 'snapchat.com', name: 'Snapchat', enabled: false, isDefault: true }
  ];
  
  chrome.storage.sync.set({
    enabled: true,
    dailyLimit: 30, // minutes
    breakReminder: 15, // minutes
    focusMode: false, // focus mode disabled by default
    focusSensitivity: 'medium', // medium sensitivity by default
    showOverlays: true, // show overlays by default
    monitoredWebsites: defaultWebsites,
    lastReset: Date.now(),
    userId: generateUserId(), // Generate unique user ID
    // Privacy defaults - OFF by default for sensitive features
    featureFlags: {
      screenCapture: false, // No screen capture
      audioCapture: false, // No audio capture
      keystrokeTracking: false, // No keystroke tracking
      contentAnalysis: false, // No content analysis
      analytics: true // Enable analytics for backend
    }
  }, () => {
    showBackgroundLog('✅ Default settings initialized with privacy defaults');
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  showBackgroundLog(`📨 Message received: ${request.action} from: ${sender.tab?.url || 'popup'}`);
  
  if (request.action === 'getStats') {
    showBackgroundLog('📊 Getting stats...');
    chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'lastReset'], (result) => {
      showBackgroundLog(`📈 Stats retrieved: ${JSON.stringify(result)}`);
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'updateSettings') {
    showBackgroundLog(`⚙️ Updating settings: ${JSON.stringify(request.settings)}`);
    
    // Save to backend first
    saveSettingsToBackend(request.settings).then(backendSuccess => {
      // Also save locally as backup, including sync timestamp
      const settingsWithSync = {
        ...request.settings,
        lastBackendSync: Date.now()
      };
      
      chrome.storage.sync.set(settingsWithSync, () => {
        showBackgroundLog('✅ Settings updated successfully');
        sendResponse({ success: true, backendSaved: backendSuccess });
      });
    });
    return true;
  }
  
  if (request.action === 'loadSettings') {
    showBackgroundLog('📂 Loading settings...');
    
    // First try to get from local storage
    chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'enabled', 'monitoredWebsites', 'lastBackendSync'], (result) => {
      const now = Date.now();
      const lastSync = result.lastBackendSync || 0;
      const syncInterval = 5 * 60 * 1000; // 5 minutes
      
      // Always try backend first if we have no local settings or if sync is old
      if (!result.dailyLimit || now - lastSync > syncInterval) {
        showBackgroundLog('🔄 Syncing with backend...');
        loadSettingsFromBackend().then(backendSettings => {
          if (backendSettings) {
            // Convert backend format to extension format
            const extensionSettings = {
              dailyLimit: backendSettings.daily_limit,
              breakReminder: backendSettings.break_reminder,
              focusMode: backendSettings.focus_mode_enabled,
              focusSensitivity: backendSettings.focus_sensitivity,
              showOverlays: backendSettings.show_overlays,
              enabled: backendSettings.enabled,
              monitoredWebsites: backendSettings.monitored_websites,
              lastBackendSync: now
            };
            
            // Save to local storage
            chrome.storage.sync.set(extensionSettings, () => {
              showBackgroundLog('✅ Settings synced from backend to local storage');
              sendResponse({ success: true, settings: extensionSettings, fromBackend: true });
            });
          } else {
            // Backend failed, use local settings or defaults
            showBackgroundLog('⚠️ Backend failed, using local settings or defaults');
            const fallbackSettings = {
              dailyLimit: result.dailyLimit || 30,
              breakReminder: result.breakReminder || 15,
              focusMode: result.focusMode || false,
              focusSensitivity: result.focusSensitivity || 'medium',
              showOverlays: result.showOverlays !== false,
              enabled: result.enabled !== false,
              monitoredWebsites: result.monitoredWebsites || []
            };
            sendResponse({ success: true, settings: fallbackSettings, fromBackend: false });
          }
        });
      } else {
        // Use local settings (recently synced)
        showBackgroundLog('✅ Using recently synced local settings');
        const localSettings = {
          dailyLimit: result.dailyLimit || 30,
          breakReminder: result.breakReminder || 15,
          focusMode: result.focusMode || false,
          focusSensitivity: result.focusSensitivity || 'medium',
          showOverlays: result.showOverlays !== false,
          enabled: result.enabled !== false,
          monitoredWebsites: result.monitoredWebsites || []
        };
        sendResponse({ success: true, settings: localSettings, fromBackend: false });
      }
    });
    return true;
  }
  
  if (request.action === 'logEvent') {
    showBackgroundLog(`📝 Logging event: ${request.eventType}`);
    chrome.storage.sync.get(['userId', 'featureFlags'], async (result) => {
      if (result.featureFlags?.analytics) {
        const eventData = {
          user_id: result.userId || generateUserId(),
          event_type: request.eventType,
          domain: request.domain,
          url: request.url,
          duration: request.duration,
          extension_version: '1.0.0',
          browser: 'Chrome'
        };
        
        await sendEventToBackend(eventData);
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

// Check if daily limit should be reset (new day)
function checkDailyReset() {
  showBackgroundLog('🔄 Checking for daily reset...');
  chrome.storage.sync.get(['lastReset', 'dailyUsage'], (result) => {
    const now = Date.now();
    const lastReset = result.lastReset || 0;
    const dailyUsage = result.dailyUsage || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    
    showBackgroundLog(`📅 Last reset: ${new Date(lastReset).toLocaleString()}`);
    showBackgroundLog(`⏰ Current time: ${new Date(now).toLocaleString()}`);
    showBackgroundLog(`⏱️ Time since last reset: ${Math.floor((now - lastReset) / (1000 * 60 * 60))} hours`);
    showBackgroundLog(`📊 Current daily usage: ${dailyUsage} minutes`);
    
    if (now - lastReset >= oneDay) {
      showBackgroundLog('🆕 New day detected! Resetting daily usage...');
      chrome.storage.sync.set({ lastReset: now, dailyUsage: 0 });
      // Reset daily usage tracking
      chrome.tabs.query({}, (tabs) => {
        showBackgroundLog(`🔍 Found ${tabs.length} tabs, checking for social media sites...`);
        tabs.forEach(tab => {
          if (tab.url && isSocialMediaSite(tab.url)) {
            showBackgroundLog(`🔄 Resetting usage for: ${tab.url}`);
            chrome.tabs.sendMessage(tab.id, { action: 'resetDailyUsage' });
          }
        });
      });
    } else {
      showBackgroundLog('✅ No reset needed, same day');
    }
  });
}

// Check if URL is a monitored site
function isSocialMediaSite(url) {
  // This will be updated dynamically based on user settings
  // For now, check against common social media sites
  const commonSites = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com'];
  return commonSites.some(site => url.includes(site));
}

// Set up periodic daily reset check (every hour)
setInterval(checkDailyReset, 60 * 60 * 1000); // Check every hour

// Also check when extension starts
checkDailyReset();
setInterval(checkDailyReset, 60 * 60 * 1000);
checkDailyReset(); // Initial check
