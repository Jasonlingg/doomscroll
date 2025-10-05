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
  
  // Initialize content analysis
  if (window.contentAnalyzer && window.localClassifier) {
    console.log('🧠 Content analysis system initialized');
    
    // Backend ML analysis helper with local fallback
    async function analyzeContentWithBackend(contentData) {
      // Backend disabled for production - use local classifier only
      console.warn('ML backend disabled for production, using local classifier');
      return window.localClassifier.analyze(contentData);
    }

    // Track analysis state to prevent overlapping calls
    let isAnalyzing = false;
    
    // Analyze content periodically (every 30 seconds)
    setInterval(async () => {
      // Only run when tab is visible and not already analyzing
      if (document.visibilityState !== 'visible') {
        console.log('⏸️ Skipping analysis - tab not visible');
        return;
      }
      
      if (isAnalyzing) {
        console.log('⏸️ Skipping analysis - already in progress');
        return;
      }
      
      isAnalyzing = true;
      try {
        const contentData = window.contentAnalyzer.analyzeContent();
        const analysis = await analyzeContentWithBackend(contentData);
        
        console.log('🔍 === CONTENT ANALYSIS DETAILS ===');
        console.log('📊 Raw Content Data:', contentData);
        console.log('🧠 Analysis Results:', analysis);
        console.log('📈 Summary:', {
          sentiment: analysis.sentiment,
          content_type: analysis.content_type,
          doom_score: analysis.doom_score,
          scroll_score: analysis.scroll_score,
          hf_ok: analysis.hf_ok,
          model_version: analysis.model_version,
          text_included: !!analysis.visible_text,
          visible_text_length: analysis.visible_text ? analysis.visible_text.length : 0,
          structured_data_keys: analysis.structured_data ? Object.keys(analysis.structured_data) : []
        });
        console.log('🔍 === END ANALYSIS ===');
        
        // No-op: analyze_and_log already persisted if it succeeded
        // Send analysis to backend (persist in usage_events)
        try {
          await fetch('http://127.0.0.1:8000/api/v1/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: [{
                user_id: 'user_123',
                event_type: 'content_analysis',
                domain: window.location.hostname,
                url: window.location.href,
                duration: 0,
                extension_version: '1.0.0',
                browser: 'Chrome',
                snippet_opt_in: analysis.visible_text ? 1 : 0,
                snippet_text: analysis.visible_text || null,
                behavior_json: {
                  sentiment: analysis.sentiment,
                  content_type: analysis.content_type,
                  doom_score: analysis.doom_score,
                  scroll_score: analysis.scroll_score,
                  hf_ok: analysis.hf_ok,
                  model_version: analysis.model_version
                },
                vision_json: null
              }]
            })
          });
        } catch (e) {
          console.warn('Failed to persist content analysis event:', e.message);
        }
        
      } catch (error) {
        console.warn('Content analysis error:', error);
      } finally {
        isAnalyzing = false;
      }
    }, 30000); // 30 seconds
    
    // Also analyze immediately on page load
    setTimeout(async () => {
      // Only run if tab is visible and not already analyzing
      if (document.visibilityState !== 'visible') {
        console.log('⏸️ Skipping initial analysis - tab not visible');
        return;
      }
      
      if (isAnalyzing) {
        console.log('⏸️ Skipping initial analysis - already in progress');
        return;
      }
      
      isAnalyzing = true;
      try {
        const contentData = window.contentAnalyzer.analyzeContent();
        const analysis = await analyzeContentWithBackend(contentData);
        
        console.log('🚀 === INITIAL CONTENT ANALYSIS ===');
        console.log('📊 Raw Content Data:', contentData);
        console.log('🧠 Analysis Results:', analysis);
        console.log('📈 Summary:', {
          sentiment: analysis.sentiment,
          content_type: analysis.content_type,
          doom_score: analysis.doom_score,
          scroll_score: analysis.scroll_score,
          hf_ok: analysis.hf_ok,
          model_version: analysis.model_version,
          text_included: !!analysis.visible_text,
          visible_text_length: analysis.visible_text ? analysis.visible_text.length : 0,
          structured_data_keys: analysis.structured_data ? Object.keys(analysis.structured_data) : []
        });
        console.log('🚀 === END INITIAL ANALYSIS ===');
        
      } catch (error) {
        console.warn('Initial content analysis error:', error);
      } finally {
        isAnalyzing = false;
      }
    }, 2000); // 2 seconds after page load
  }
  
  // Add error handling for chrome.storage
  if (!chrome.storage) {
    console.error('❌ Chrome storage API not available');
    // Continue with localStorage fallback
    window.timeTracker.startTimeTracking(30, 15); // Use default values
    return;
  }
  
  // Check if we already have settings locally first
  chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'enabled', 'monitoredWebsites', 'lastBackendSync'], (localResult) => {
    // If we have recent settings (less than 5 minutes old), use them
    const hasRecentSettings = localResult.lastBackendSync && 
      (Date.now() - localResult.lastBackendSync) < (5 * 60 * 1000) &&
      localResult.dailyLimit && localResult.breakReminder;
    
    if (hasRecentSettings) {
      console.log('✅ Using existing local settings (recent sync)');
      console.log('📅 Last sync:', new Date(localResult.lastBackendSync).toLocaleTimeString());
      // Use the existing initialization logic with local settings
      // Initialize with local settings (same logic as backend but using local data)
      const dailyLimit = localResult.dailyLimit || 30;
      const breakReminder = localResult.breakReminder || 15;
      const focusMode = localResult.focusMode || false;
      const focusSensitivity = localResult.focusSensitivity || 'medium';
      const showOverlays = localResult.showOverlays !== false;
      const enabled = localResult.enabled !== false;
      const monitoredWebsites = localResult.monitoredWebsites && localResult.monitoredWebsites.length > 0 
        ? localResult.monitoredWebsites 
        : getDefaultWebsites();
      
      // Update current settings
      const stateManager = window.stateManager;
      stateManager.updateSettings({ dailyLimit, breakReminder, enabled, focusMode, focusSensitivity, showOverlays });
      stateManager.updateFocusModeSensitivity(focusSensitivity);
      
      console.log('🚀 Initializing content script with local settings:', stateManager.getCurrentSettings());
      console.log('📋 Monitored websites:', monitoredWebsites);
      
      // Check if current site is monitored
      const currentSite = window.location.hostname;
      const currentUrl = window.location.href;
      const isMonitored = monitoredWebsites.some(site => {
        if (!site.enabled) return false;
        return currentSite.includes(site.domain) || currentUrl.includes(site.domain);
      });
      
      console.log('🎯 Current site monitored?', isMonitored, 'Site:', currentSite);
      
      if (!enabled) {
        console.log('❌ Extension is disabled, content script will not run');
        return;
      }
      
      if (isMonitored) {
        console.log('✅ Site is monitored, starting tracking...');
        window.timeTracker.startTimeTracking(dailyLimit, breakReminder);
        window.uiManager.waitForDataAndUpdate();
        
        if (focusMode) {
          window.uiManager && window.uiManager.checkHardLockMode && window.uiManager.checkHardLockMode();
        }
        
        document.addEventListener('visibilitychange', window.timeTracker.handleVisibilityChange);
        chrome.runtime.onMessage.addListener(window.messageHandler.handleMessage);
      } else {
        console.log('❌ Site is not monitored, content script will not run');
      }
      return;
    }
    
    // Load settings from backend for new users or stale settings
    console.log('🔄 Loading fresh settings from backend...');
    loadSettingsFromBackend();
  });
}

function loadSettingsFromBackend() {
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
        
        // Wait for data to be populated before removing loading state
        window.uiManager.waitForDataAndUpdate();
        
        // Enforce hard lock if enabled
        if (focusMode) {
          window.uiManager && window.uiManager.checkHardLockMode && window.uiManager.checkHardLockMode();
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
          
          // Wait for data to be populated before removing loading state
          window.uiManager.waitForDataAndUpdate();
          
          // Enforce hard lock if enabled
          if (focusMode) {
            window.uiManager && window.uiManager.checkHardLockMode && window.uiManager.checkHardLockMode();
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
  } catch (error) {
    console.warn('⚠️ Error loading settings:', error.message);
    loadSettingsFromLocalStorage();
  }
}

// Export utility functions
window.utils = {
  init: init
};
