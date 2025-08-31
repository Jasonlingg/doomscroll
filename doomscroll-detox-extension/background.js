// Background service worker for Doomscroll Detox extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Doomscroll Detox extension installed');
  
  // Initialize default settings
  chrome.storage.sync.set({
    enabled: true,
    dailyLimit: 30, // minutes
    breakReminder: 15, // minutes
    lastReset: Date.now()
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'lastReset'], (result) => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'updateSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Check if daily limit should be reset (new day)
function checkDailyReset() {
  chrome.storage.sync.get(['lastReset'], (result) => {
    const now = Date.now();
    const lastReset = result.lastReset || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - lastReset >= oneDay) {
      chrome.storage.sync.set({ lastReset: now });
      // Reset daily usage tracking
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && isSocialMediaSite(tab.url)) {
            chrome.tabs.sendMessage(tab.id, { action: 'resetDailyUsage' });
          }
        });
      });
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
