// Popup script for Doomscroll Detox extension

console.log('🚀 Popup script loaded!');
console.log('📅 Current time:', new Date().toLocaleString());
console.log('🔧 Testing basic functionality...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM Content Loaded - popup ready!');
    console.log('🔍 Checking if elements exist...');
    console.log('Save button exists:', !!document.getElementById('save-settings'));
    console.log('Daily limit input exists:', !!document.getElementById('daily-limit-input'));
    
    // Initialize popup
    loadSettings();
    loadStats();
    
    // Add event listeners
    console.log('🔗 Adding event listeners...');
    
    const saveButton = document.getElementById('save-settings');
    const resetButton = document.getElementById('reset-today');
    const toggleCheckbox = document.getElementById('enabled-toggle');
    
    console.log('🔍 Button elements found:', {
        saveButton: !!saveButton,
        resetButton: !!resetButton,
        toggleCheckbox: !!toggleCheckbox
    });
    
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            console.log('🎯 Save button clicked!');
            saveSettings();
        });
        console.log('✅ Save button event listener added');
    } else {
        console.log('❌ Save button not found!');
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetToday);
        console.log('✅ Reset button event listener added');
    }
    
    if (toggleCheckbox) {
        toggleCheckbox.addEventListener('change', handleToggleChange);
        console.log('✅ Toggle checkbox event listener added');
    }
    
    const focusModeToggle = document.getElementById('focus-mode-toggle');
    if (focusModeToggle) {
        focusModeToggle.addEventListener('change', handleFocusModeToggle);
        console.log('✅ Focus mode toggle event listener added');
    }
    
    const addWebsiteBtn = document.getElementById('add-website-btn');
    if (addWebsiteBtn) {
        addWebsiteBtn.addEventListener('click', addNewWebsite);
        console.log('✅ Add website button event listener added');
    }
    
    const addCurrentSiteBtn = document.getElementById('add-current-site');
    if (addCurrentSiteBtn) {
        addCurrentSiteBtn.addEventListener('click', addCurrentSite);
        console.log('✅ Add current site button event listener added');
    }
    
    const blockCurrentSiteBtn = document.getElementById('block-current-site');
    if (blockCurrentSiteBtn) {
        blockCurrentSiteBtn.addEventListener('click', blockCurrentSite);
        console.log('✅ Block current site button event listener added');
    }
    
    console.log('✅ Event listeners setup complete');
});

// Load current settings from storage
function loadSettings() {
  console.log('📂 Loading settings from storage...');
  chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'enabled', 'focusMode', 'focusSensitivity', 'showOverlays', 'monitoredWebsites'], (result) => {
    console.log('📥 Retrieved settings from storage:', result);
    
    const dailyLimit = result.dailyLimit || 30;
    const breakReminder = result.breakReminder || 15;
    const enabled = result.enabled !== false; // Default to true
    const focusMode = result.focusMode || false;
    const focusSensitivity = result.focusSensitivity || 'medium';
    const showOverlays = result.showOverlays !== false; // Default to true
    const monitoredWebsites = result.monitoredWebsites || getDefaultWebsites();
    
    console.log('⚙️ Setting form values:', { dailyLimit, breakReminder, enabled, focusMode, focusSensitivity, showOverlays, monitoredWebsites });
    
    document.getElementById('daily-limit-input').value = dailyLimit;
    document.getElementById('break-reminder-input').value = breakReminder;
    document.getElementById('enabled-toggle').checked = enabled;
    document.getElementById('focus-mode-toggle').checked = focusMode;
    document.getElementById('focus-sensitivity').value = focusSensitivity;
    document.getElementById('overlay-toggle').checked = showOverlays;
    
    // Update display
    document.getElementById('daily-limit').textContent = dailyLimit + 'm';
    
    // Load website list
    loadWebsiteList(monitoredWebsites);
    
    console.log('✅ Settings loaded and form updated');
  });
}

// Load current stats
function loadStats() {
    chrome.storage.sync.get(['lastReset'], (result) => {
        const lastReset = result.lastReset || Date.now();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        // Check if it's a new day
        if (now - lastReset >= oneDay) {
            updateUsageDisplay(0);
        } else {
            // Get current tab to check usage
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0] && isSocialMediaSite(tabs[0].url)) {
                    // Request usage from content script
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'getUsage'}, (response) => {
                        if (response && response.usage !== undefined) {
                            updateUsageDisplay(response.usage);
                        } else {
                            updateUsageDisplay(0);
                        }
                    });
                } else {
                    updateUsageDisplay(0);
                }
            });
        }
    });
}

// Update usage display
function updateUsageDisplay(usage) {
    const dailyLimit = parseInt(document.getElementById('daily-limit-input').value) || 30;
    const percentage = Math.min((usage / dailyLimit) * 100, 100);
    
    document.getElementById('today-usage').textContent = usage + 'm';
    document.getElementById('progress-fill').style.width = percentage + '%';
    
    // Update progress bar color
    const progressFill = document.getElementById('progress-fill');
    if (percentage >= 100) {
        progressFill.style.backgroundColor = '#ff6b6b'; // Red
    } else if (percentage >= 80) {
        progressFill.style.backgroundColor = '#ffa500'; // Orange
    } else {
        progressFill.style.backgroundColor = '#4ecdc4'; // Teal
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
  
  console.log('✅ Validation passed, saving to storage...');
  
  // Get current monitored websites
  chrome.storage.sync.get(['monitoredWebsites'], (result) => {
    const monitoredWebsites = result.monitoredWebsites || getDefaultWebsites();
    
    // Save to storage
    chrome.storage.sync.set({
      dailyLimit: dailyLimit,
      breakReminder: breakReminder,
      enabled: enabled,
      focusMode: focusMode,
      focusSensitivity: focusSensitivity,
      showOverlays: showOverlays,
      monitoredWebsites: monitoredWebsites
    }, () => {
      console.log('✅ Settings saved to storage successfully');
      showMessage('Settings saved successfully!', 'success');
      
      // Update display
      document.getElementById('daily-limit').textContent = dailyLimit + 'm';
      console.log('📊 Updated display with new daily limit:', dailyLimit + 'm');
      
      // Notify content scripts of settings change
      chrome.tabs.query({}, (tabs) => {
        console.log('🔍 Found', tabs.length, 'tabs, notifying content scripts...');
        tabs.forEach(tab => {
          if (tab.url && isMonitoredSite(tab.url, monitoredWebsites)) {
            console.log('📨 Sending settings update to:', tab.url);
            chrome.tabs.sendMessage(tab.id, {
              action: 'settingsUpdated',
              settings: { dailyLimit, breakReminder, enabled, focusMode, focusSensitivity, showOverlays }
            });
          }
        });
      });
    });
  });
}

// Reset today's usage
function resetToday() {
    chrome.storage.sync.set({ lastReset: Date.now() }, () => {
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
    
    websites.forEach((website, index) => {
        const websiteItem = document.createElement('div');
        websiteItem.className = 'website-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'website-checkbox';
        checkbox.checked = website.enabled;
        checkbox.id = `website-${index}`;
        
        const label = document.createElement('label');
        label.className = 'website-label';
        label.htmlFor = `website-${index}`;
        label.textContent = website.name;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-website';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove website';
        
        // Only show remove button for custom websites
        if (!website.isDefault) {
            removeBtn.style.display = 'inline-block';
            removeBtn.addEventListener('click', () => removeWebsite(website.domain));
        } else {
            removeBtn.style.display = 'none';
        }
        
        // Add event listener for checkbox changes
        checkbox.addEventListener('change', () => {
            console.log('🔄 Website checkbox changed:', website.name, 'enabled:', checkbox.checked);
            website.enabled = checkbox.checked;
            updateWebsiteSettings(websites);
        });
        
        websiteItem.appendChild(checkbox);
        websiteItem.appendChild(label);
        websiteItem.appendChild(removeBtn);
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
