// Popup script for Doomscroll Detox extension

console.log('🚀 Popup script loaded!');
alert('Popup script is working!'); // Temporary test

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
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('reset-today').addEventListener('click', resetToday);
    document.getElementById('enabled-toggle').addEventListener('change', handleToggleChange);
    console.log('✅ Event listeners added successfully');
});

// Load current settings from storage
function loadSettings() {
  console.log('📂 Loading settings from storage...');
  chrome.storage.sync.get(['dailyLimit', 'breakReminder', 'enabled'], (result) => {
    console.log('📥 Retrieved settings from storage:', result);
    
    const dailyLimit = result.dailyLimit || 30;
    const breakReminder = result.breakReminder || 15;
    const enabled = result.enabled !== false; // Default to true
    
    console.log('⚙️ Setting form values:', { dailyLimit, breakReminder, enabled });
    
    document.getElementById('daily-limit-input').value = dailyLimit;
    document.getElementById('break-reminder-input').value = breakReminder;
    document.getElementById('enabled-toggle').checked = enabled;
    
    // Update display
    document.getElementById('daily-limit').textContent = dailyLimit + 'm';
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
  
  console.log('📝 Settings to save:', { dailyLimit, breakReminder, enabled });
  
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
  
  // Save to storage
  chrome.storage.sync.set({
    dailyLimit: dailyLimit,
    breakReminder: breakReminder,
    enabled: enabled
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
        if (tab.url && isSocialMediaSite(tab.url)) {
          console.log('📨 Sending settings update to:', tab.url);
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            settings: { dailyLimit, breakReminder, enabled }
          });
        }
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

// Check if URL is a social media site
function isSocialMediaSite(url) {
    const socialSites = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com'];
    return socialSites.some(site => url.includes(site));
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
