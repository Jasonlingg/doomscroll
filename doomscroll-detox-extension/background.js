// Background service worker for Doomscroll Detox extension

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
chrome.runtime.onInstalled.addListener(() => {
  showBackgroundLog('🚀 Doomscroll Detox extension installed successfully!');
  showBackgroundLog('📅 Initializing default settings...');
  
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
    // Privacy defaults - OFF by default for sensitive features
    featureFlags: {
      screenCapture: false, // No screen capture
      audioCapture: false, // No audio capture
      keystrokeTracking: false, // No keystroke tracking
      contentAnalysis: false, // No content analysis
      analytics: false // No analytics
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
    chrome.storage.sync.set(request.settings, () => {
      showBackgroundLog('✅ Settings updated successfully');
      sendResponse({ success: true });
    });
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
