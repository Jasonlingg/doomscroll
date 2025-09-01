// Background service worker for Doomscroll Detox extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Doomscroll Detox extension installed successfully!');
  console.log('📅 Initializing default settings...');
  
  // Initialize default settings
  chrome.storage.sync.set({
    enabled: true,
    dailyLimit: 30, // minutes
    breakReminder: 15, // minutes
    lastReset: Date.now()
  }, () => {
    console.log('✅ Default settings initialized:', {
      enabled: true,
      dailyLimit: 30,
      breakReminder: 15
    });
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action, 'from:', sender.tab?.url || 'popup');
  
  if (request.action === 'getStats') {
    console.log('📊 Getting stats...');
    chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'lastReset'], (result) => {
      console.log('📈 Stats retrieved:', result);
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'updateSettings') {
    console.log('⚙️ Updating settings:', request.settings);
    chrome.storage.sync.set(request.settings, () => {
      console.log('✅ Settings updated successfully');
      sendResponse({ success: true });
    });
    return true;
  }
});

// Check if daily limit should be reset (new day)
function checkDailyReset() {
  console.log('🔄 Checking for daily reset...');
  chrome.storage.sync.get(['lastReset'], (result) => {
    const now = Date.now();
    const lastReset = result.lastReset || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    
    console.log('📅 Last reset:', new Date(lastReset).toLocaleString());
    console.log('⏰ Current time:', new Date(now).toLocaleString());
    console.log('⏱️ Time since last reset:', Math.floor((now - lastReset) / (1000 * 60 * 60)), 'hours');
    
    if (now - lastReset >= oneDay) {
      console.log('🆕 New day detected! Resetting daily usage...');
      chrome.storage.sync.set({ lastReset: now });
      // Reset daily usage tracking
      chrome.tabs.query({}, (tabs) => {
        console.log('🔍 Found', tabs.length, 'tabs, checking for social media sites...');
        tabs.forEach(tab => {
          if (tab.url && isSocialMediaSite(tab.url)) {
            console.log('🔄 Resetting usage for:', tab.url);
            chrome.tabs.sendMessage(tab.id, { action: 'resetDailyUsage' });
          }
        });
      });
    } else {
      console.log('✅ No reset needed, same day');
    }
  });
}

// Check if URL is a social media site
function isSocialMediaSite(url) {
  const socialSites = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com'];
  return socialSites.some(site => url.includes(site));
}

// Run daily reset check every hour
setInterval(checkDailyReset, 60 * 60 * 1000);
checkDailyReset(); // Initial check
