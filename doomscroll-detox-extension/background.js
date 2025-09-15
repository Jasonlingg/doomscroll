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

// Ensure a stable userId exists in chrome.storage.sync
async function initializeUserId() {
  try {
    const result = await chrome.storage.sync.get(['userId']);
    if (!result.userId) {
      const newUserId = generateUserId();
      await chrome.storage.sync.set({ userId: newUserId });
      showBackgroundLog(`🆔 Initialized persistent userId: ${newUserId}`);
    } else {
      showBackgroundLog(`🆔 Persistent userId present: ${result.userId}`);
    }
  } catch (error) {
    showBackgroundLog(`❌ Error initializing userId: ${error.message}`);
  }
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
    showBackgroundLog(`🌐 Saving settings to backend for user: ${userId}`);
    showBackgroundLog(`📋 Settings data: ${JSON.stringify(settings)}`);
    
    const requestBody = {
      user_id: userId,
      daily_limit: settings.dailyLimit || 30,
      break_reminder: settings.breakReminder || 15,
      focus_mode_enabled: settings.focusMode || false,
      focus_sensitivity: settings.focusSensitivity || 'medium',
      show_overlays: settings.showOverlays !== false,
      enabled: settings.enabled !== false,
      monitored_websites: settings.monitoredWebsites || []
    };
    
    showBackgroundLog(`📤 Request body: ${JSON.stringify(requestBody)}`);
    
    const response = await fetch(`${BACKEND_URL}/api/v1/users/${userId}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    showBackgroundLog(`📥 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      showBackgroundLog(`❌ HTTP error ${response.status}: ${errorText}`);
      return false;
    }
    
    const result = await response.json();
    showBackgroundLog(`📥 Response data: ${JSON.stringify(result)}`);
    
    if (result.success) {
      showBackgroundLog('✅ Settings saved to backend successfully');
      return true;
    } else {
      showBackgroundLog('❌ Failed to save settings to backend:', result.error);
      return false;
    }
  } catch (error) {
    showBackgroundLog('❌ Error saving settings to backend:', error.message);
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

// Listen for extension installation (not reload)
chrome.runtime.onInstalled.addListener(async (details) => {
  // Only run on actual installation, not reload
  if (details.reason === 'install') {
    showBackgroundLog('🚀 Doomscroll Detox extension installed successfully!');
    showBackgroundLog('📅 Initializing default settings...');
    
    // Check backend connectivity
    const backendHealthy = await checkBackendHealth();
    if (backendHealthy) {
      showBackgroundLog('✅ Backend API is running and healthy');
    } else {
      showBackgroundLog('⚠️ Backend API is not available - events will be logged locally only');
    }
    
    // Initialize default settings ONLY on first install
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
  } else if (details.reason === 'update') {
    showBackgroundLog('🔄 Extension updated - preserving existing settings');
  } else {
    showBackgroundLog('🔄 Extension reloaded - preserving existing settings');
  }
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
      showBackgroundLog(`🌐 Backend save result: ${backendSuccess ? 'Success' : 'Failed'}`);
      
      // Also save locally as backup, including sync timestamp
      const settingsWithSync = {
        ...request.settings,
        lastBackendSync: Date.now()
      };
      
      // Sanitize before writing to storage (avoid null/0 clobbers)
      const sanitized = {
        dailyLimit: Number.isFinite(settingsWithSync.dailyLimit) && settingsWithSync.dailyLimit > 0 ? settingsWithSync.dailyLimit : undefined,
        breakReminder: Number.isFinite(settingsWithSync.breakReminder) && settingsWithSync.breakReminder > 0 ? settingsWithSync.breakReminder : undefined,
        focusMode: typeof settingsWithSync.focusMode === 'boolean' ? settingsWithSync.focusMode : undefined,
        focusSensitivity: settingsWithSync.focusSensitivity || undefined,
        showOverlays: typeof settingsWithSync.showOverlays === 'boolean' ? settingsWithSync.showOverlays : undefined,
        enabled: typeof settingsWithSync.enabled === 'boolean' ? settingsWithSync.enabled : undefined,
        monitoredWebsites: Array.isArray(settingsWithSync.monitoredWebsites) ? settingsWithSync.monitoredWebsites : undefined,
        lastBackendSync: settingsWithSync.lastBackendSync
      };
      chrome.storage.sync.set(sanitized, () => {
        if (chrome.runtime.lastError) {
          showBackgroundLog(`❌ Local storage error: ${chrome.runtime.lastError.message}`);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          showBackgroundLog('✅ Settings updated successfully');
          sendResponse({ success: true, backendSaved: backendSuccess });
        }
      });
    }).catch(error => {
      showBackgroundLog(`❌ Backend save error: ${error.message}`);
      // Still save locally even if backend fails
      const settingsWithSync = {
        ...request.settings,
        lastBackendSync: Date.now()
      };
      
      chrome.storage.sync.set(settingsWithSync, () => {
        showBackgroundLog('⚠️ Settings saved locally only (backend failed)');
        sendResponse({ success: true, backendSaved: false, error: error.message });
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
      
      // Only try backend if we have no local settings. Avoid overwriting user-updated values with defaults.
      if (!result.dailyLimit) {
        showBackgroundLog('🔄 Syncing with backend...');
        loadSettingsFromBackend().then(backendSettings => {
          if (backendSettings) {
            // Convert backend format to extension format
            const extensionSettings = {
              dailyLimit: backendSettings.daily_limit ?? result.dailyLimit ?? 30,
              breakReminder: backendSettings.break_reminder ?? result.breakReminder ?? 15,
              focusMode: backendSettings.focus_mode_enabled ?? result.focusMode ?? false,
              focusSensitivity: backendSettings.focus_sensitivity ?? result.focusSensitivity ?? 'medium',
              showOverlays: (backendSettings.show_overlays ?? result.showOverlays)
                // Default true if both are undefined
                ?? true,
              enabled: (backendSettings.enabled ?? result.enabled)
                // Default true if both are undefined
                ?? true,
              // If backend returns empty or null, prefer existing local list
              monitoredWebsites: (Array.isArray(backendSettings.monitored_websites) && backendSettings.monitored_websites.length > 0)
                ? backendSettings.monitored_websites
                : (result.monitoredWebsites || []),
              lastBackendSync: now
            };
            
            // Save to local storage (sanitized to avoid null/0)
            const sanitized = {
              dailyLimit: Number.isFinite(extensionSettings.dailyLimit) && extensionSettings.dailyLimit > 0 ? extensionSettings.dailyLimit : undefined,
              breakReminder: Number.isFinite(extensionSettings.breakReminder) && extensionSettings.breakReminder > 0 ? extensionSettings.breakReminder : undefined,
              focusMode: typeof extensionSettings.focusMode === 'boolean' ? extensionSettings.focusMode : undefined,
              focusSensitivity: extensionSettings.focusSensitivity || undefined,
              showOverlays: typeof extensionSettings.showOverlays === 'boolean' ? extensionSettings.showOverlays : undefined,
              enabled: typeof extensionSettings.enabled === 'boolean' ? extensionSettings.enabled : undefined,
              monitoredWebsites: Array.isArray(extensionSettings.monitoredWebsites) ? extensionSettings.monitoredWebsites : undefined,
              lastBackendSync: extensionSettings.lastBackendSync
            };
            chrome.storage.sync.set(sanitized, () => {
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
  
  if (request.action === 'forceDailyReset') {
    showBackgroundLog('🔄 Manual daily reset requested...');
    chrome.storage.sync.set({ 
      lastReset: Date.now(), 
      dailyUsage: 0 
    }, () => {
      showBackgroundLog('✅ Manual daily reset completed');
      
      // Notify all content scripts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && isSocialMediaSite(tab.url)) {
            chrome.tabs.sendMessage(tab.id, { action: 'resetDailyUsage' }).catch(() => {
              // Ignore errors if content script not ready
            });
          }
        });
      });
      
      sendResponse({ success: true, message: 'Daily usage reset successfully' });
    });
    return true;
  }
  
  if (request.action === 'openSettings') {
    showBackgroundLog('⚙️ Opening settings popup...');
    chrome.action.openPopup();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'broadcastUsageUpdate') {
    showBackgroundLog(`📡 Broadcasting usage update: ${request.usage} minutes`);
    showBackgroundLog(`⏰ Timestamp: ${new Date(request.timestamp).toLocaleTimeString()}`);
    
    // Send usage update to all tabs
    chrome.tabs.query({}, async (tabs) => {
      showBackgroundLog(`🔍 Found ${tabs.length} total tabs`);
      
      // Process tabs in parallel for better performance
      const tabPromises = tabs.map(async (tab) => {
        if (tab.url) {
          try {
            const isMonitored = await isSocialMediaSite(tab.url);
            if (isMonitored) {
              showBackgroundLog(`📤 Sending update to monitored tab: ${tab.url}`);
              chrome.tabs.sendMessage(tab.id, { 
                action: 'usageUpdated', 
                usage: request.usage,
                timestamp: request.timestamp
              }).catch((error) => {
                showBackgroundLog(`❌ Failed to send to tab ${tab.url}: ${error.message}`);
              });
              return 1; // Count this tab
            }
          } catch (error) {
            showBackgroundLog(`❌ Error checking tab ${tab.url}: ${error.message}`);
          }
        }
        return 0; // Don't count this tab
      });
      
      // Wait for all tab checks to complete
      const results = await Promise.all(tabPromises);
      const monitoredTabs = results.reduce((sum, count) => sum + count, 0);
      
      showBackgroundLog(`✅ Broadcast sent to ${monitoredTabs} monitored tabs`);
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'refreshContentScripts') {
    showBackgroundLog('🔄 Refreshing content scripts...');
    registerContentScripts().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'checkDailyReset') {
    showBackgroundLog('🧪 Manual daily reset check requested');
    checkDailyReset();
    sendResponse({ success: true });
    return true;
  }
});

// Check if daily limit should be reset (new day)
function checkDailyReset() {
  showBackgroundLog('🔄 Checking for daily reset...');
  showBackgroundLog(`🕐 Current time: ${new Date().toLocaleString()}`);
  
  chrome.storage.sync.get(['lastReset', 'dailyUsage'], (result) => {
    const now = Date.now();
    const lastReset = result.lastReset || 0;
    const dailyUsage = result.dailyUsage || 0;
    
    // Get the date of the last reset (start of day)
    const lastResetDate = new Date(lastReset);
    const lastResetDay = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate());
    
    // Get the current date (start of day)
    const currentDate = new Date(now);
    const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    showBackgroundLog(`📅 Last reset date: ${lastResetDay.toLocaleDateString()}`);
    showBackgroundLog(`⏰ Current date: ${currentDay.toLocaleDateString()}`);
    showBackgroundLog(`📊 Current daily usage: ${dailyUsage} minutes`);
    showBackgroundLog(`🔍 Date comparison: ${lastResetDay.getTime()} vs ${currentDay.getTime()}`);
    
    // Check if it's a new day (different date)
    if (lastResetDay.getTime() !== currentDay.getTime()) {
      showBackgroundLog('🆕 New day detected! Resetting daily usage...');
      
      // Reset daily usage
      chrome.storage.sync.set({ 
        lastReset: now, 
        dailyUsage: 0 
      }, () => {
        showBackgroundLog('✅ Daily usage reset to 0');
        
        // Notify all content scripts to reset
        chrome.tabs.query({}, async (tabs) => {
          showBackgroundLog(`🔍 Found ${tabs.length} tabs, notifying content scripts...`);
          let notifiedCount = 0;
          
          // Process tabs in parallel for better performance
          const tabPromises = tabs.map(async (tab) => {
            if (tab.url) {
              try {
                const isMonitored = await isSocialMediaSite(tab.url);
                if (isMonitored) {
                  showBackgroundLog(`🔄 Resetting usage for: ${tab.url}`);
                  chrome.tabs.sendMessage(tab.id, { action: 'resetDailyUsage' }).catch(() => {
                    // Ignore errors if content script not ready
                  });
                  return 1; // Count this tab
                }
              } catch (error) {
                showBackgroundLog(`❌ Error checking tab ${tab.url}: ${error.message}`);
              }
            }
            return 0; // Don't count this tab
          });
          
          // Wait for all tab checks to complete
          const results = await Promise.all(tabPromises);
          notifiedCount = results.reduce((sum, count) => sum + count, 0);
          
          showBackgroundLog(`✅ Reset notification sent to ${notifiedCount} monitored tabs`);
        });
      });
    } else {
      showBackgroundLog('✅ No reset needed, same day');
    }
  });
}

// Check if URL is a monitored site
function isSocialMediaSite(url) {
  // Get monitored websites from storage
  return new Promise((resolve) => {
    chrome.storage.sync.get(['monitoredWebsites'], (result) => {
      const monitoredWebsites = result.monitoredWebsites || getDefaultWebsites();
      const enabledSites = monitoredWebsites.filter(site => site.enabled).map(site => site.domain);
      const isMonitored = enabledSites.some(site => url.includes(site));
      resolve(isMonitored);
    });
  });
}

// Get default websites (same as in other files)
function getDefaultWebsites() {
  return [
    { domain: 'facebook.com', name: 'Facebook', enabled: true, isDefault: true },
    { domain: 'x.com', name: 'X (Twitter)', enabled: true, isDefault: true },
    { domain: 'instagram.com', name: 'Instagram', enabled: true, isDefault: true },
    { domain: 'tiktok.com', name: 'TikTok', enabled: true, isDefault: true },
    { domain: 'reddit.com', name: 'Reddit', enabled: true, isDefault: true },
    { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
    { domain: 'linkedin.com', name: 'LinkedIn', enabled: true, isDefault: true },
    { domain: 'snapchat.com', name: 'Snapchat', enabled: true, isDefault: true }
  ];
}

// Set up periodic daily reset check (every 5 minutes for more reliable reset)
setInterval(checkDailyReset, 5 * 60 * 1000); // Check every 5 minutes

// Also check when extension starts
checkDailyReset(); // Initial check

// Set up a more frequent check around midnight
setInterval(() => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Check every minute between 11:50 PM and 12:10 AM
  if ((hour === 23 && minute >= 50) || (hour === 0 && minute <= 10)) {
    showBackgroundLog('🌙 Midnight check - verifying daily reset...');
    checkDailyReset();
  }
}, 60 * 1000); // Check every minute during midnight window

// Register content scripts dynamically for allowlisted domains
async function registerContentScripts() {
  try {
    // Get current allowlist from storage
    const result = await chrome.storage.sync.get(['allowlist']);
    const allowlist = result.allowlist || getDefaultAllowlist();
    
    showBackgroundLog('📝 Registering content scripts for allowlisted domains...');
    showBackgroundLog('🎯 Allowlist:', allowlist);
    
    // Clear existing registered scripts
    const existingScripts = await chrome.scripting.getRegisteredContentScripts();
    if (existingScripts.length > 0) {
      await chrome.scripting.unregisterContentScripts();
      showBackgroundLog('🗑️ Cleared existing content scripts');
    }
    
    // Register content scripts for each allowlisted domain
    const contentScripts = [];
    
    for (const domain of allowlist) {
      contentScripts.push({
        id: `doomscroll-${domain.replace(/[^a-zA-Z0-9]/g, '-')}`,
        matches: [`*://*.${domain}/*`],
        js: [
          'content/state-manager.js',
          'content/time-tracker.js',
          'content/ui-manager.js',
          'content/focus-mode.js',
          'content/message-handler.js',
          'content/utils.js',
          'content/content.js'
        ],
        css: ['css/content-styles.css'],
        runAt: 'document_end'  // Changed from document_start to document_end
      });
    }
    
    if (contentScripts.length > 0) {
      await chrome.scripting.registerContentScripts(contentScripts);
      showBackgroundLog(`✅ Registered ${contentScripts.length} content scripts`);
      
      // Log which domains are now monitored
      contentScripts.forEach(script => {
        showBackgroundLog(`📋 Registered script for: ${script.matches.join(', ')}`);
      });
    } else {
      showBackgroundLog('⚠️ No domains in allowlist, no content scripts registered');
    }
    
  } catch (error) {
    showBackgroundLog(`❌ Error registering content scripts: ${error.message}`);
  }
}

// Get default allowlist (same as manifest host_permissions)
function getDefaultAllowlist() {
  return ['youtube.com', 'instagram.com', 'x.com', 'reddit.com', 'linkedin.com', 'tiktok.com', 'snapchat.com', 'facebook.com'];
}

// Generate and store device_id (UUID)
async function initializeDeviceId() {
  try {
    const result = await chrome.storage.sync.get(['device_id']);
    
    if (!result.device_id) {
      // Generate UUID v4
      const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      await chrome.storage.sync.set({ device_id: deviceId });
      showBackgroundLog(`🆔 Generated new device ID: ${deviceId}`);
    } else {
      showBackgroundLog(`🆔 Using existing device ID: ${result.device_id}`);
    }
  } catch (error) {
    showBackgroundLog(`❌ Error initializing device ID: ${error.message}`);
  }
}

// Initialize default allowlist if not exists
async function initializeAllowlist() {
  try {
    const result = await chrome.storage.sync.get(['allowlist']);
    
    if (!result.allowlist) {
      const defaultAllowlist = getDefaultAllowlist();
      await chrome.storage.sync.set({ allowlist: defaultAllowlist });
      showBackgroundLog(`📋 Initialized default allowlist: ${defaultAllowlist.join(', ')}`);
    }
  } catch (error) {
    showBackgroundLog(`❌ Error initializing allowlist: ${error.message}`);
  }
}

// Extension startup function (runs on every load, but doesn't reset settings)
async function extensionStartup() {
  showBackgroundLog('🚀 Extension starting up...');
  
  // Initialize device ID and allowlist
  await initializeUserId();
  await initializeDeviceId();
  await initializeAllowlist();
  
  // Register content scripts dynamically
  await registerContentScripts();
  
  // Check backend connectivity
  const backendHealthy = await checkBackendHealth();
  if (backendHealthy) {
    showBackgroundLog('✅ Backend API is running and healthy');
  } else {
    showBackgroundLog('⚠️ Backend API is not available - events will be logged locally only');
  }
  
  // Check if we have existing settings
  chrome.storage.sync.get(['userId', 'dailyLimit'], (result) => {
    if (result.userId && result.dailyLimit) {
      showBackgroundLog('✅ Existing settings found - preserving user data');
    } else {
      showBackgroundLog('⚠️ No existing settings found - user may need to configure');
    }
  });
}

// Run startup on extension load
extensionStartup();
