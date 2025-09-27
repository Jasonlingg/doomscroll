// Background service worker for Doomscroll Detox extension

// Backend API configuration - disabled for production
const BACKEND_URL = null; // Set to null to disable backend features
const API_ENDPOINTS = {
  events: null,
  health: null
};

// Helper function to send events to backend
async function sendEventToBackend(eventData: any) {
  // Backend disabled for production
  return null;
}

// Helper function to check backend health
async function checkBackendHealth() {
  // Backend disabled for production
  return false;
}

// Helper function to generate user ID (more consistent hash of browser fingerprint)
function generateUserId(): string {
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
    console.error('❌ Error initializing userId:', error);
  }
}

// Helper function to show background logs
function showBackgroundLog(message: string) {
  console.log(`[Background] ${message}`);
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  showBackgroundLog('🚀 Doomscroll Detox extension installed/updated');
  await initializeUserId();
  
  // Initialize default settings
  const defaultSettings = {
    enabled: true,
    dailyLimit: 30,
    breakReminder: 15,
    focusMode: false,
    focusSensitivity: 'medium',
    showOverlays: true,
    aiTextAnalysis: false
  };
  
  try {
    const result = await chrome.storage.sync.get(['settings']);
    if (!result.settings) {
      await chrome.storage.sync.set({ settings: defaultSettings });
      showBackgroundLog('✅ Default settings initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing settings:', error);
  }
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  // Handle async responses
  const handleAsync = async () => {
    try {
      switch (message.action) {
        case 'updateSettings':
          await handleUpdateSettings(message.settings, sendResponse);
          break;
        case 'getSettings':
          await handleGetSettings(sendResponse);
          break;
        case 'resetTodayUsage':
          await handleResetTodayUsage(sendResponse);
          break;
        case 'getDailyUsage':
          await handleGetDailyUsage(sendResponse);
          break;
        case 'updateDailyUsage':
          await handleUpdateDailyUsage(message.usage, sendResponse);
          break;
        case 'getMonitoredWebsites':
          await handleGetMonitoredWebsites(sendResponse);
          break;
        case 'updateMonitoredWebsites':
          await handleUpdateMonitoredWebsites(message.websites, sendResponse);
          break;
        default:
          console.log('❓ Unknown action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  };
  
  handleAsync();
  return true; // Keep message channel open for async response
});

// Handle settings update
async function handleUpdateSettings(settings: any, sendResponse: (response: any) => void) {
  try {
    await chrome.storage.sync.set({ settings });
    showBackgroundLog('✅ Settings updated');
    
    // Notify all content scripts of settings change
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'settingsUpdated', 
            settings 
          });
        } catch (error) {
          // Tab might not have content script, ignore
        }
      }
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle get settings
async function handleGetSettings(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.sync.get(['settings']);
    const settings = result.settings || {
      enabled: true,
      dailyLimit: 30,
      breakReminder: 15,
      focusMode: false,
      focusSensitivity: 'medium',
      showOverlays: true,
      aiTextAnalysis: false
    };
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('❌ Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle reset today usage
async function handleResetTodayUsage(sendResponse: (response: any) => void) {
  try {
    const now = new Date();
    const today = now.toDateString();
    
    await chrome.storage.sync.set({ 
      lastReset: today,
      dailyUsage: 0
    });
    
    showBackgroundLog('✅ Today usage reset');
    
    // Notify all content scripts to reset their state
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'resetTodayUsage'
          });
        } catch (error) {
          // Tab might not have content script, ignore
        }
      }
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Error resetting today usage:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle get daily usage
async function handleGetDailyUsage(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.sync.get(['dailyUsage', 'lastReset']);
    const now = new Date();
    const today = now.toDateString();
    
    // Reset if it's a new day
    if (result.lastReset !== today) {
      await chrome.storage.sync.set({ 
        lastReset: today,
        dailyUsage: 0
      });
      sendResponse({ success: true, usage: 0 });
    } else {
      sendResponse({ success: true, usage: result.dailyUsage || 0 });
    }
  } catch (error) {
    console.error('❌ Error getting daily usage:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle update daily usage
async function handleUpdateDailyUsage(usage: number, sendResponse: (response: any) => void) {
  try {
    await chrome.storage.sync.set({ dailyUsage: usage });
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Error updating daily usage:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle get monitored websites
async function handleGetMonitoredWebsites(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.sync.get(['monitoredWebsites']);
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
    
    const websites = result.monitoredWebsites || defaultWebsites;
    sendResponse({ success: true, websites });
  } catch (error) {
    console.error('❌ Error getting monitored websites:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle update monitored websites
async function handleUpdateMonitoredWebsites(websites: any[], sendResponse: (response: any) => void) {
  try {
    await chrome.storage.sync.set({ monitoredWebsites: websites });
    showBackgroundLog('✅ Monitored websites updated');
    sendResponse({ success: true });
  } catch (error) {
    console.error('❌ Error updating monitored websites:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Tab update listener for daily reset
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const result = await chrome.storage.sync.get(['lastReset']);
      const now = new Date();
      const today = now.toDateString();
      
      // Reset if it's a new day
      if (result.lastReset !== today) {
        await chrome.storage.sync.set({ 
          lastReset: today,
          dailyUsage: 0
        });
        showBackgroundLog('🔄 Daily usage reset for new day');
      }
    } catch (error) {
      console.error('❌ Error checking daily reset:', error);
    }
  }
});

showBackgroundLog('🎯 Background script loaded');

export default {};