// Popup script for Doomscroll Detox extension

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize popup
    loadSettings();
    loadStats();
    
    // Add event listeners
    const saveButton = document.getElementById('save-settings');
    const resetButton = document.getElementById('reset-today');
    const refreshButton = document.getElementById('refresh-settings');
    const toggleCheckbox = document.getElementById('enabled-toggle');
    
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            saveSettings();
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetToday);
    }
    
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            refreshAllContentScripts();
            showMessage('Settings refreshed on all tabs!', 'success');
        });
    }
    
    if (toggleCheckbox) {
        toggleCheckbox.addEventListener('change', handleToggleChange);
    }
    
    const focusModeToggle = document.getElementById('focus-mode-toggle');
    if (focusModeToggle) {
        focusModeToggle.addEventListener('change', handleFocusModeToggle);
    }
    
    const addWebsiteBtn = document.getElementById('add-website-btn');
    if (addWebsiteBtn) {
        addWebsiteBtn.addEventListener('click', addNewWebsite);
    }
    
    const addCurrentSiteBtn = document.getElementById('add-current-site');
    if (addCurrentSiteBtn) {
        addCurrentSiteBtn.addEventListener('click', addCurrentSite);
    }
    
    const blockCurrentSiteBtn = document.getElementById('block-current-site');
    if (blockCurrentSiteBtn) {
        blockCurrentSiteBtn.addEventListener('click', blockCurrentSite);
    }
    
    const forceResetBtn = document.getElementById('force-reset');
    if (forceResetBtn) {
        forceResetBtn.addEventListener('click', forceDailyReset);
    }
    
    
    
    // Add event listener for delete data button
    const deleteDataBtn = document.getElementById('delete-data');
    if (deleteDataBtn) {
        deleteDataBtn.addEventListener('click', deleteUserData);
    }
    
    // Add collapsible section functionality
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsContent = document.getElementById('settings-content');
    if (settingsToggle && settingsContent) {
        settingsToggle.addEventListener('click', () => {
            settingsContent.classList.toggle('collapsed');
            settingsToggle.classList.toggle('collapsed');
        });
    }
    
    const websitesToggle = document.getElementById('websites-toggle');
    const websitesContent = document.getElementById('websites-content');
    if (websitesToggle && websitesContent) {
        websitesToggle.addEventListener('click', () => {
            websitesContent.classList.toggle('collapsed');
            websitesToggle.classList.toggle('collapsed');
        });
    }
});

// Load current settings from storage (only if not already loaded)
function loadSettings() {
  console.log('📂 Loading settings...');
  
  // Check if we already have settings loaded
  const dailyLimitInput = document.getElementById('daily-limit-input');
  if (dailyLimitInput && dailyLimitInput.value) {
    console.log('✅ Settings already loaded, skipping...');
    return;
  }
  
  // Try to get settings from active content script first
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      console.log('🔍 Getting settings from active content script...');
      
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSettings' }, (response) => {
        if (response && response.success && response.settings) {
          console.log('📥 Got settings from content script:', response.settings);
          
          const settings = {
            dailyLimit: response.settings.dailyLimit || 30,
            breakReminder: response.settings.breakReminder || 15,
            enabled: response.settings.enabled !== false,
            focusMode: response.settings.focusMode || false,
            focusSensitivity: response.settings.focusSensitivity || 'medium',
            showOverlays: response.settings.showOverlays !== false,
            monitoredWebsites: response.settings.monitoredWebsites || getDefaultWebsites()
          };
          
          // Update form elements with content script settings
          updateFormElements(settings);
          updateDisplay(settings);
          
          console.log('✅ Settings loaded from content script');
          console.log('🌐 Settings source: Content script');
        } else {
          console.log('⚠️ No response from content script, falling back to local storage');
          loadSettingsFromLocalStorage();
        }
      });
    } else {
      console.log('⚠️ No active tab, falling back to local storage');
      loadSettingsFromLocalStorage();
    }
  });
}

// Fallback: Load settings from local storage
function loadSettingsFromLocalStorage() {
  console.log('📦 Loading settings from local storage...');
  
  chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'focusMode', 'focusSensitivity', 'showOverlays', 'enabled', 'monitoredWebsites'], (localResult) => {
    console.log('📦 Local storage fallback:', localResult);
    
    const localSettings = {
      dailyLimit: localResult.dailyLimit || 30,
      breakReminder: localResult.breakReminder || 15,
      enabled: localResult.enabled !== false,
      focusMode: localResult.focusMode || false,
      focusSensitivity: localResult.focusSensitivity || 'medium',
      showOverlays: localResult.showOverlays !== false,
      monitoredWebsites: localResult.monitoredWebsites || getDefaultWebsites()
    };
    
    updateFormElements(localSettings);
    updateDisplay(localSettings);
    
    console.log('✅ Settings loaded from local storage');
    console.log('🌐 Settings source: Local storage');
  });
}

// Load current stats
function loadStats() {
    chrome.storage.sync.get(['lastReset', 'dailyUsage'], (result) => {
        const lastReset = result.lastReset || Date.now();
        const dailyUsage = result.dailyUsage || 0;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        // Check if it's a new day
        if (now - lastReset >= oneDay) {
            console.log('🆕 New day detected, resetting usage display');
            updateUsageDisplay(0);
        } else {
            console.log('📅 Same day, loading stored usage:', dailyUsage);
            // Use stored usage first, then try to get from content script
            updateUsageDisplay(dailyUsage);
            
            // Also try to get from content script if available
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0] && isSocialMediaSite(tabs[0].url)) {
                    // Request usage from content script
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'getUsage'}, (response) => {
                        if (response && response.usage !== undefined) {
                            console.log('📊 Got usage from content script:', response.usage);
                            updateUsageDisplay(response.usage);
                        } else {
                            console.log('📊 No response from content script, using stored:', dailyUsage);
                        }
                    });
                }
            });
        }
    });
}

// Update all display elements after settings change
function refreshDisplayElements() {
  console.log('🔄 Refreshing all display elements...');
  
  // Get current values from form
  const dailyLimit = parseInt(document.getElementById('daily-limit-input').value) || 30;
  const breakReminder = parseInt(document.getElementById('break-reminder-input').value) || 15;
  
  // Update daily limit display
  document.getElementById('daily-limit').textContent = dailyLimit + 'm';
  
  // Update usage display with current usage and new daily limit
  chrome.storage.sync.get(['dailyUsage'], (result) => {
    const currentUsage = result.dailyUsage || 0;
    updateUsageDisplay(currentUsage);
    console.log('📊 Updated usage display with new settings');
  });
  
  console.log('✅ All display elements refreshed');
}

// Update form elements with settings
function updateFormElements(settings) {
  console.log('🔄 Updating form elements with settings:', settings);
  
  const dailyLimitInput = document.getElementById('daily-limit-input');
  const breakReminderInput = document.getElementById('break-reminder-input');
  const enabledToggle = document.getElementById('enabled-toggle');
  const focusModeToggle = document.getElementById('focus-mode-toggle');
  const focusSensitivity = document.getElementById('focus-sensitivity');
  const overlayToggle = document.getElementById('overlay-toggle');
  
  if (dailyLimitInput) dailyLimitInput.value = settings.dailyLimit;
  if (breakReminderInput) breakReminderInput.value = settings.breakReminder;
  if (enabledToggle) enabledToggle.checked = settings.enabled;
  if (focusModeToggle) focusModeToggle.checked = settings.focusMode;
  if (focusSensitivity) focusSensitivity.value = settings.focusSensitivity;
  if (overlayToggle) overlayToggle.checked = settings.showOverlays;
  
  // Load website list
  loadWebsiteList(settings.monitoredWebsites);
  
  console.log('✅ Form elements updated');
}

// Update display with settings
function updateDisplay(settings) {
  console.log('🔄 Updating display with settings:', settings);
  
  // Update daily limit display
  const dailyLimitDisplay = document.getElementById('daily-limit');
  if (dailyLimitDisplay) {
    dailyLimitDisplay.textContent = settings.dailyLimit + 'm';
  }
  
  // Update usage display
  chrome.storage.sync.get(['dailyUsage'], (result) => {
    const currentUsage = result.dailyUsage || 0;
    updateUsageDisplay(currentUsage);
  });
  
  console.log('✅ Display updated');
}

// Update usage display
function updateUsageDisplay(usage) {
    const dailyLimit = parseInt(document.getElementById('daily-limit-input').value) || 30;
    // Ensure usage is a whole number
    const wholeUsage = Math.floor(usage);
    const percentage = Math.min((wholeUsage / dailyLimit) * 100, 100);
    
    document.getElementById('today-usage').textContent = wholeUsage + 'm';
    document.getElementById('progress-fill').style.width = percentage + '%';
    document.getElementById('progress-percentage').textContent = Math.round(percentage) + '%';
    
    // Update progress bar color
    const progressFill = document.getElementById('progress-fill');
    if (percentage >= 100) {
        progressFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ff5252 100%)'; // Red
    } else if (percentage >= 80) {
        progressFill.style.background = 'linear-gradient(90deg, #ffa500 0%, #ff8c00 100%)'; // Orange
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #4caf50 0%, #45a049 100%)'; // Green
    }
}

// Save settings to storage
function saveSettings() {
  console.log('💾 Save settings function called');
  console.log('🎯 Button was clicked!');
  
  const dailyLimit = parseInt(document.getElementById('daily-limit-input').value);
  const breakReminder = parseInt(document.getElementById('break-reminder-input').value);
  const enabled = document.getElementById('enabled-toggle').checked;
  const focusMode = document.getElementById('focus-mode-toggle').checked;
  const focusSensitivity = document.getElementById('focus-sensitivity').value;
  const showOverlays = document.getElementById('overlay-toggle').checked;
  
  console.log('📝 Settings to save:', { dailyLimit, breakReminder, enabled, focusMode, focusSensitivity, showOverlays });
  
  // Validate inputs
  if (dailyLimit < 5 || dailyLimit > 480) {
    console.log('❌ Daily limit validation failed:', dailyLimit);
    showMessage('Daily limit must be between 5 and 480 minutes', 'error');
    return;
  }
  
  if (breakReminder < 5 || breakReminder > 60) {
    console.log('❌ Break reminder validation failed:', breakReminder);
    showMessage('Break reminder must be between 5 and 60 minutes', 'error');
    return;
  }
  
  console.log('✅ Validation passed, saving to backend...');
  
  // Get current monitored websites
  const monitoredWebsites = getCurrentWebsites();
  console.log('📋 Monitored websites to save:', monitoredWebsites);
  
  // Save settings via background script (which will save to backend)
  const settings = {
    dailyLimit: dailyLimit,
    breakReminder: breakReminder,
    enabled: enabled,
    focusMode: focusMode,
    focusSensitivity: focusSensitivity,
    showOverlays: showOverlays,
    monitoredWebsites: monitoredWebsites
  };
  
  console.log('💾 Sending settings to background script:', settings);
  
  chrome.runtime.sendMessage({ action: 'updateSettings', settings: settings }, (response) => {
    if (response && response.success) {
      console.log('✅ Settings saved successfully');
      console.log('🌐 Backend saved:', response.backendSaved ? 'Yes' : 'No');
      
      showMessage('Settings saved successfully!', 'success');
      
      // Refresh all display elements with new settings
      refreshDisplayElements();
      
      // Notify content scripts of settings change
      chrome.tabs.query({}, (tabs) => {
        console.log('🔍 Found', tabs.length, 'tabs, notifying content scripts...');
        tabs.forEach(tab => {
          if (tab.url && isMonitoredSite(tab.url, monitoredWebsites)) {
            console.log('📨 Sending settings update to:', tab.url);
            chrome.tabs.sendMessage(tab.id, {
              action: 'settingsUpdated',
              settings: { dailyLimit, breakReminder, enabled, focusMode, focusSensitivity, showOverlays }
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log('⚠️ Content script not ready on tab:', tab.url);
              } else {
                console.log('✅ Settings update sent successfully to:', tab.url);
              }
            });
          }
        });
      });
    } else {
      console.error('❌ Failed to save settings');
      showMessage('Failed to save settings', 'error');
    }
  });
}

// Function to refresh all content scripts
function refreshAllContentScripts() {
  console.log('🔄 Refreshing all content scripts...');
  
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && isSocialMediaSite(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { action: 'refreshSettings' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('⚠️ Content script not ready on tab:', tab.url);
          } else {
            console.log('✅ Settings refresh sent to:', tab.url);
          }
        });
      }
    });
  });
}

// Reset today's usage
function resetToday() {
    chrome.storage.sync.set({ lastReset: Date.now(), dailyUsage: 0 }, () => {
        showMessage('Today\'s usage has been reset!', 'success');
        updateUsageDisplay(0);
        
        // Notify content scripts to reset
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && isSocialMediaSite(tab.url)) {
                    chrome.tabs.sendMessage(tab.id, { action: 'resetDailyUsage' });
                }
            });
        });
    });
}

// Handle toggle change
function handleToggleChange() {
    const enabled = document.getElementById('enabled-toggle').checked;
    
    // Save immediately
    chrome.storage.sync.set({ enabled: enabled }, () => {
        const message = enabled ? 'Extension enabled' : 'Extension disabled';
        showMessage(message, 'info');
        
        // Notify content scripts
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && isSocialMediaSite(tab.url)) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'extensionToggled',
                        enabled: enabled
                    });
                }
            });
        });
    });
}

// Handle focus mode toggle change
function handleFocusModeToggle() {
    const focusMode = document.getElementById('focus-mode-toggle').checked;
    console.log('🎯 Focus mode toggled:', focusMode);
    
    // Save immediately
    chrome.storage.sync.set({ focusMode: focusMode }, () => {
        const message = focusMode ? 'Focus mode enabled' : 'Focus mode disabled';
        showMessage(message, 'info');
        
        // Notify content scripts
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && isSocialMediaSite(tab.url)) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'settingsUpdated',
                        settings: { focusMode: focusMode }
                    });
                }
            });
        });
    });
}

// Check if URL is a monitored site
function isSocialMediaSite(url) {
    // Get the current monitored websites from storage
    chrome.storage.sync.get(['monitoredWebsites'], (result) => {
        const monitoredWebsites = result.monitoredWebsites || getDefaultWebsites();
        const enabledSites = monitoredWebsites.filter(site => site.enabled).map(site => site.domain);
        return enabledSites.some(site => url.includes(site));
    });
}

// Get current websites from the UI
function getCurrentWebsites() {
  const websiteList = document.getElementById('website-list');
  if (!websiteList) return getDefaultWebsites();
  
  const websites = [];
  const checkboxes = websiteList.querySelectorAll('.website-checkbox');
  
  // Map website names to their actual domains
  const websiteMapping = {
    'YouTube': 'youtube.com',
    'Instagram': 'instagram.com', 
    'X (Twitter)': 'x.com',
    'Reddit': 'reddit.com',
    'LinkedIn': 'linkedin.com',
    'TikTok': 'tiktok.com',
    'Snapchat': 'snapchat.com',
    'Facebook': 'facebook.com'
  };
  
  checkboxes.forEach((checkbox, index) => {
    const label = checkbox.nextElementSibling;
    if (label && label.textContent) {
      const name = label.textContent.trim();
      const domain = websiteMapping[name] || name.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
      
      websites.push({
        domain: domain,
        name: name,
        enabled: checkbox.checked,
        isDefault: true // All our websites are default
      });
    }
  });
  
  console.log('📋 Current websites from UI:', websites);
  return websites.length > 0 ? websites : getDefaultWebsites();
}

// Get default websites
function getDefaultWebsites() {
    return [
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
}

// Load website list in the UI
function loadWebsiteList(websites) {
    const websiteList = document.getElementById('website-list');
    if (!websiteList) return;
    
    websiteList.innerHTML = '';
    
    // Website icon mapping with emoji and modern styling
    const websiteIcons = {
        'youtube.com': { emoji: '📺', class: 'youtube', color: '#ff0000' },
        'instagram.com': { emoji: '📷', class: 'instagram', color: '#e4405f' },
        'x.com': { emoji: '🐦', class: 'x', color: '#000000' },
        'twitter.com': { emoji: '🐦', class: 'x', color: '#000000' },
        'reddit.com': { emoji: '🔴', class: 'reddit', color: '#ff4500' },
        'linkedin.com': { emoji: '💼', class: 'linkedin', color: '#0077b5' },
        'tiktok.com': { emoji: '🎵', class: 'tiktok', color: '#000000' },
        'snapchat.com': { emoji: '👻', class: 'snapchat', color: '#fffc00' },
        'facebook.com': { emoji: '👥', class: 'facebook', color: '#1877f2' }
    };
    
    websites.forEach((website, index) => {
        const websiteItem = document.createElement('div');
        websiteItem.className = 'website-item';
        
        // Get icon info
        const iconInfo = websiteIcons[website.domain] || { emoji: '🌐', class: 'default', color: '#8b5cf6' };
        
        websiteItem.innerHTML = `
            <div class="website-icon ${iconInfo.class}" style="background: ${iconInfo.color}20; border: 2px solid ${iconInfo.color}40;">
                <span class="website-emoji">${iconInfo.emoji}</span>
            </div>
            <div class="website-info">
                <div class="website-name">${website.name}</div>
                <div class="website-domain">${website.domain}</div>
            </div>
            <div class="website-toggle ${website.enabled ? 'active' : ''}" data-index="${index}"></div>
            ${!website.isDefault ? `<button class="remove-website" data-domain="${website.domain}">×</button>` : ''}
        `;
        
        // Add event listener for toggle
        const toggle = websiteItem.querySelector('.website-toggle');
        toggle.addEventListener('click', () => {
            website.enabled = !website.enabled;
            toggle.classList.toggle('active', website.enabled);
            updateWebsiteSettings(websites);
        });
        
        // Add event listener for remove button (if not default)
        if (!website.isDefault) {
            const removeBtn = websiteItem.querySelector('.remove-website');
            removeBtn.addEventListener('click', () => removeWebsite(website.domain));
        }
        
        websiteList.appendChild(websiteItem);
    });
}

// Add new website
function addNewWebsite() {
    const input = document.getElementById('new-website-input');
    const domain = input.value.trim().toLowerCase();
    
    if (!domain) {
        showMessage('Please enter a website domain', 'error');
        return;
    }
    
    // Basic validation
    if (!domain.includes('.') || domain.length < 3) {
        showMessage('Please enter a valid website domain (e.g., youtube.com)', 'error');
        return;
    }
    
    // Check if website already exists
    chrome.storage.sync.get(['monitoredWebsites'], (result) => {
        const websites = result.monitoredWebsites || getDefaultWebsites();
        const exists = websites.some(site => site.domain === domain);
        
        if (exists) {
            showMessage('This website is already in your list', 'error');
            return;
        }
        
        // Add new website
        const newWebsite = {
            domain: domain,
            name: domain.replace('www.', ''),
            enabled: true,
            isDefault: false
        };
        
        websites.push(newWebsite);
        updateWebsiteSettings(websites);
        
        // Clear input
        input.value = '';
        showMessage('Website added successfully!', 'success');
    });
}

// Remove website
function removeWebsite(domain) {
    chrome.storage.sync.get(['monitoredWebsites'], (result) => {
        const websites = result.monitoredWebsites || getDefaultWebsites();
        const filteredWebsites = websites.filter(site => site.domain !== domain);
        updateWebsiteSettings(filteredWebsites);
        showMessage('Website removed successfully!', 'success');
    });
}

// Update website settings in storage
function updateWebsiteSettings(websites) {
    console.log('💾 Saving website settings to storage:', websites);
    
    chrome.storage.sync.set({ monitoredWebsites: websites }, () => {
        if (chrome.runtime.lastError) {
            console.error('❌ Error saving website settings:', chrome.runtime.lastError);
            showMessage('Failed to save website settings', 'error');
            return;
        }
        
        console.log('✅ Website settings saved to storage successfully');
        
        // Reload the website list
        loadWebsiteList(websites);
        
        // Notify content scripts of the change
        chrome.tabs.query({}, (tabs) => {
            console.log('🔍 Notifying content scripts of website changes...');
            tabs.forEach(tab => {
                if (tab.url && isMonitoredSite(tab.url, websites)) {
                    console.log('📨 Sending websitesUpdated to:', tab.url);
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'websitesUpdated',
                        websites: websites
                    });
                }
            });
        });
        
        showMessage('Website settings updated!', 'success');
    });
}

// Check if URL is monitored (helper function)
function isMonitoredSite(url, websites) {
    const enabledSites = websites.filter(site => site.enabled).map(site => site.domain);
    return enabledSites.some(site => url.includes(site));
}

// Show message to user
function showMessage(text, type = 'info') {
    // Remove existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const message = document.createElement('div');
    message.className = `message message-${type}`;
    message.textContent = text;
    
    // Style the message
    message.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 4px;
        color: white;
        font-size: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            message.style.backgroundColor = '#4caf50';
            break;
        case 'error':
            message.style.backgroundColor = '#f44336';
            break;
        case 'info':
        default:
            message.style.backgroundColor = '#2196f3';
            break;
    }
    
    document.body.appendChild(message);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Add current site to monitored websites
function addCurrentSite() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            const url = new URL(tabs[0].url);
            const domain = url.hostname;
            
            chrome.storage.sync.get(['monitoredWebsites'], (result) => {
                const websites = result.monitoredWebsites || getDefaultWebsites();
                
                // Check if already exists
                if (websites.some(site => site.domain === domain)) {
                    showMessage('Site already monitored!', 'info');
                    return;
                }
                
                // Add new site
                websites.push({
                    domain: domain,
                    enabled: true,
                    name: domain
                });
                
                chrome.storage.sync.set({monitoredWebsites: websites}, () => {
                    if (chrome.runtime.lastError) {
                        showMessage('Failed to add site', 'error');
                    } else {
                        showMessage(`Added ${domain} to monitored sites!`, 'success');
                        loadWebsiteList(websites);
                    }
                });
            });
        }
    });
}

// Block current site (remove from monitored)
function blockCurrentSite() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            const url = new URL(tabs[0].url);
            const domain = url.hostname;
            
            chrome.storage.sync.get(['monitoredWebsites'], (result) => {
                const websites = result.monitoredWebsites || getDefaultWebsites();
                
                // Find and disable the site
                const siteIndex = websites.findIndex(site => site.domain === domain);
                if (siteIndex !== -1) {
                    websites[siteIndex].enabled = false;
                    
                    chrome.storage.sync.set({monitoredWebsites: websites}, () => {
                        if (chrome.runtime.lastError) {
                            showMessage('Failed to block site', 'error');
                        } else {
                            showMessage(`Blocked ${domain}!`, 'success');
                            loadWebsiteList(websites);
                        }
                    });
                } else {
                    showMessage('Site not found in monitored list', 'info');
                }
            });
        }
    });
}

// Force daily reset (manual trigger)
function forceDailyReset() {
    console.log('🔄 Force daily reset requested...');
    
    chrome.runtime.sendMessage({ action: 'forceDailyReset' }, (response) => {
        if (response && response.success) {
            console.log('✅ Force daily reset completed');
            showMessage('Daily usage reset successfully!', 'success');
            
            // Update the display to show 0 usage
            updateUsageDisplay(0);
            
            // Notify content scripts
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.url && isSocialMediaSite(tab.url)) {
                        chrome.tabs.sendMessage(tab.id, { action: 'resetDailyUsage' }).catch(() => {
                            // Ignore errors if content script not ready
                        });
                    }
                });
            });
        } else {
            console.error('❌ Force daily reset failed');
            showMessage('Failed to reset daily usage', 'error');
        }
    });
}



// Delete user data function
function deleteUserData() {
    const confirmed = confirm(
        '⚠️ WARNING: This will permanently delete ALL your data!\n\n' +
        'This includes:\n' +
        '• All usage statistics\n' +
        '• Settings and preferences\n' +
        '• Monitored websites list\n' +
        '• Device ID\n\n' +
        'This action cannot be undone!\n\n' +
        'Are you sure you want to continue?'
    );
    
    if (!confirmed) {
        console.log('❌ User cancelled data deletion');
        return;
    }
    
    console.log('🗑️ User confirmed data deletion');
    showMessage('Deleting all data...', 'info');
    
    // Clear all storage
    chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
            console.error('❌ Failed to clear sync storage:', chrome.runtime.lastError);
            showMessage('Failed to delete sync data', 'error');
            return;
        }
        
        chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
                console.error('❌ Failed to clear local storage:', chrome.runtime.lastError);
                showMessage('Failed to delete local data', 'error');
                return;
            }
            
            console.log('✅ All local data cleared');
            
            // Call backend to delete user data
            chrome.storage.sync.get(['device_id'], (result) => {
                if (result.device_id) {
                    // Backend disabled for production - skip backend deletion
                    console.log('Backend disabled for production, skipping backend deletion');
                } else {
                    console.log('✅ No device ID found, only local data cleared');
                    showMessage('All data deleted successfully!', 'success');
                    
                    // Reload the popup
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });
        });
    });
}
