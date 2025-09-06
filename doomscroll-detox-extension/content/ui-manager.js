// UI Manager - Indicator, overlays, and UI components
// Handles all visual elements, indicators, overlays, and UI interactions

// Function to wait for data to be populated before removing loading state
function waitForDataAndUpdate() {
  console.log('⏳ Waiting for data to be populated...');
  
  const stateManager = window.stateManager;
  
  // Check if we have valid data
  const hasValidData = () => {
    return stateManager.getCurrentSettings() && 
           stateManager.getCurrentSettings().dailyLimit && 
           stateManager.getCurrentSettings().dailyLimit > 0 &&
           stateManager.getDailyUsage() !== undefined &&
           stateManager.getDailyUsage() >= 0;
  };
  
  // If data is already valid, update immediately
  if (hasValidData()) {
    console.log('✅ Data already populated, updating immediately');
    forceUpdateIndicator();
    return;
  }
  
  // Otherwise, wait for data to be populated
  const checkData = () => {
    if (hasValidData()) {
      console.log('✅ Data populated, updating indicator');
      forceUpdateIndicator();
    } else {
      console.log('⏳ Still waiting for data... (dailyLimit:', stateManager.getCurrentSettings()?.dailyLimit, 'dailyUsage:', stateManager.getDailyUsage(), ')');
      // Check again in 100ms
      setTimeout(checkData, 100);
    }
  };
  
  // Start checking
  checkData();
}

// Function to remove loading state and show real data
function removeLoadingState() {
  const stateManager = window.stateManager;
  const indicator = document.getElementById('doomscroll-indicator');
  if (indicator && !stateManager.getLoadingStateRemoved()) {
    indicator.classList.remove('loading');
    stateManager.setLoadingStateRemoved(true);
    console.log('✅ Removed loading state from indicator');
  }
}

// Function to force update the usage indicator
function forceUpdateIndicator() {
  const stateManager = window.stateManager;
  const indicator = document.getElementById('doomscroll-indicator');
  if (indicator) {
    // Remove loading state
    removeLoadingState();
    
    // Update the limit display
    const limitElement = indicator.querySelector('.daily-limit');
    if (limitElement) {
      limitElement.textContent = `/${stateManager.getCurrentSettings().dailyLimit}m`;
      console.log('✅ Updated indicator limit to:', stateManager.getCurrentSettings().dailyLimit);
    }
    
    // Update the time display
    const timeElement = indicator.querySelector('.time-spent');
    if (timeElement) {
      timeElement.textContent = `${Math.floor(stateManager.getDailyUsage())}m`;
      console.log('✅ Updated indicator time to:', Math.floor(stateManager.getDailyUsage()));
    }
    
    // Force update background color immediately with purple gradients
    const wholeMinutes = Math.floor(stateManager.getDailyUsage());
    let newBackground = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'; // Default purple gradient
    if (wholeMinutes >= stateManager.getCurrentSettings().dailyLimit) {
      newBackground = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'; // Red gradient for limit reached
    } else if (wholeMinutes >= stateManager.getCurrentSettings().dailyLimit * 0.8) {
      newBackground = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'; // Yellow gradient for warning
    } else if (wholeMinutes > 0) {
      newBackground = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)'; // Purple gradient when active
    }
    indicator.style.background = newBackground;
    
    console.log('✅ Force updated indicator with limit:', stateManager.getCurrentSettings().dailyLimit, 'and time:', wholeMinutes);
  } else {
    console.log('⚠️ No indicator found to update');
  }
}

// Add usage indicator to the page
function addUsageIndicator() {
  const stateManager = window.stateManager;
  const indicator = document.createElement('div');
  indicator.id = 'doomscroll-indicator';
  indicator.innerHTML = `
    <div class="doomscroll-badge">
      <span class="time-spent">...</span>
      <span class="daily-limit">/...</span>
    </div>
    <button class="settings-btn" title="Open App Settings">⚡</button>
  `;
  
  // Add loading class for styling
  indicator.classList.add('loading');
  
  // Reset loading state flag for new indicator
  stateManager.setLoadingStateRemoved(false);
  
  // Add click handler for settings button
  const settingsBtn = indicator.querySelector('.settings-btn');
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: 'openSettings' });
  });
  
  document.body.appendChild(indicator);
}

// Update usage indicator with performance optimizations
function updateUsageIndicator(timeSpent, dailyLimit, showDamageAnimation = false) {
  const stateManager = window.stateManager;
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  // Remove loading state if present and not already removed
  if (!stateManager.getLoadingStateRemoved()) {
    removeLoadingState();
  }
  
  // Ensure timeSpent is a whole number
  const wholeMinutes = Math.floor(timeSpent);
  
  // Batch DOM updates to avoid excessive reflows
  const updates = [];
  
  const timeElement = indicator.querySelector('.time-spent');
  const limitElement = indicator.querySelector('.daily-limit');
  
  if (timeElement && timeElement.textContent !== `${wholeMinutes}m`) {
    updates.push(() => timeElement.textContent = `${wholeMinutes}m`);
  }
  
  if (limitElement && limitElement.textContent !== `/${dailyLimit}m`) {
    updates.push(() => limitElement.textContent = `/${dailyLimit}m`);
  }
  
  // Determine new background color with purple gradients
  let newBackground = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'; // Default purple gradient
  
  if (wholeMinutes >= dailyLimit) {
    newBackground = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'; // Red gradient for limit reached
  } else if (wholeMinutes >= dailyLimit * 0.8) {
    newBackground = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'; // Yellow gradient for warning
  } else if (wholeMinutes > 0) {
    newBackground = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)'; // Purple gradient when active
  }
  
  // Only update background if it changed
  if (indicator.style.background !== newBackground) {
    updates.push(() => {
      indicator.style.background = newBackground;
    });
  }
  
  // Batch all updates in one frame
  if (updates.length > 0) {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }
  
  // Show damage animation if requested
  if (showDamageAnimation) {
    showDamageAnimationOnIndicator();
  }
}

// Show damage animation on the indicator
function showDamageAnimationOnIndicator() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  console.log('💥 Showing damage animation on indicator');
  
  // Add damage animation class
  indicator.classList.add('damage-animation');
  
  // Add CSS for damage animation if not already present
  if (!document.getElementById('damage-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'damage-animation-styles';
    style.textContent = `
      .damage-animation {
        animation: damageShake 0.6s ease-in-out;
        box-shadow: 0 0 20px rgba(220, 38, 38, 0.8) !important;
      }
      
      @keyframes damageShake {
        0% { transform: translate(0, 0) rotate(0deg); }
        10% { transform: translate(-2px, -1px) rotate(-1deg); }
        20% { transform: translate(2px, 1px) rotate(1deg); }
        30% { transform: translate(-1px, 2px) rotate(-1deg); }
        40% { transform: translate(1px, -1px) rotate(1deg); }
        50% { transform: translate(-1px, 1px) rotate(-1deg); }
        60% { transform: translate(1px, 1px) rotate(1deg); }
        70% { transform: translate(-1px, -1px) rotate(-1deg); }
        80% { transform: translate(1px, -1px) rotate(1deg); }
        90% { transform: translate(-1px, 1px) rotate(-1deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      
      .damage-animation .doomscroll-badge {
        animation: damagePulse 0.6s ease-in-out;
      }
      
      @keyframes damagePulse {
        0% { transform: scale(1); }
        25% { transform: scale(1.1); }
        50% { transform: scale(0.95); }
        75% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Remove animation class after animation completes
  setTimeout(() => {
    indicator.classList.remove('damage-animation');
    console.log('✅ Damage animation completed');
  }, 600);
}

// Show break reminder
function showBreakReminder() {
  const stateManager = window.stateManager;
  
  // Log break reminder event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'break_reminder',
    domain: window.location.hostname,
    url: window.location.href,
    duration: stateManager.getDailyUsage()
  });
  
  const reminder = document.createElement('div');
  reminder.id = 'doomscroll-reminder';
  reminder.innerHTML = `
    <div class="reminder-content">
      <h3>🕐 Time for a break!</h3>
      <p>You've been scrolling for a while. Consider taking a short break.</p>
      <button id="dismiss-reminder">Dismiss</button>
    </div>
  `;
  
  reminder.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 300px;
  `;
  
  document.body.appendChild(reminder);
  
  // Add dismiss functionality
  document.getElementById('dismiss-reminder').addEventListener('click', () => {
    reminder.remove();
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (reminder.parentNode) {
      reminder.remove();
    }
  }, 10000);
}

// Show daily limit reached message
function showDailyLimitReached() {
  const stateManager = window.stateManager;
  
  // Log daily limit reached event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'daily_limit_reached',
    domain: window.location.hostname,
    url: window.location.href,
    duration: stateManager.getDailyUsage()
  });
  
  const limitMessage = document.createElement('div');
  limitMessage.id = 'doomscroll-limit';
  limitMessage.innerHTML = `
    <div class="limit-content">
      <h3>🚫 Daily Limit Reached</h3>
      <p>You've reached your daily social media limit. Time to step away!</p>
      <button id="override-limit">Override (not recommended)</button>
    </div>
  `;
  
  limitMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10002;
    background: #ff6b6b;
    color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 300px;
  `;
  
  document.body.appendChild(limitMessage);
  
  // Add override functionality
  document.getElementById('override-limit').addEventListener('click', () => {
    limitMessage.remove();
  });
}

// Show toast message when overlays are disabled
function showToastMessage(message, type = 'info') {
  const toast = document.createElement('div');
  toast.id = 'doomscroll-toast';
  toast.textContent = message;
  
  // Style the toast
  const colors = {
    info: '#2196f3',
    warning: '#ff9800',
    success: '#4caf50',
    error: '#f44336'
  };
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10004;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 300px;
    word-wrap: break-word;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
  
  // Add CSS animations
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// Privacy notice - shows what data is NOT collected
function showPrivacyNotice() {
  const notice = document.createElement('div');
  notice.id = 'privacy-notice';
  notice.innerHTML = `
    <div class="privacy-content">
      <h4>🔒 Privacy Notice</h4>
      <p>This extension <strong>does NOT</strong> collect:</p>
      <ul>
        <li>📱 Screen content or screenshots</li>
        <li>🎤 Audio or microphone data</li>
        <li>⌨️ Keystrokes or typing</li>
        <li>📄 Page content or text</li>
        <li>📊 Personal browsing analytics</li>
      </ul>
      <p><strong>Only collects:</strong> Domain names and time spent for usage tracking.</p>
      <button id="close-privacy-notice">Got it</button>
    </div>
  `;
  
  // Style the notice
  notice.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10005;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 20px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;
  
  document.body.appendChild(notice);
  
  // Add close functionality
  document.getElementById('close-privacy-notice').addEventListener('click', () => {
    notice.remove();
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notice.parentNode) {
      notice.remove();
    }
  }, 10000);
}

function showProductivitySuggestion() {
  const suggestion = document.createElement('div');
  suggestion.id = 'productivity-suggestion';
  suggestion.innerHTML = `
    <div class="suggestion-content">
      <h3>💪 Great Self-Awareness!</h3>
      <p>Recognizing unproductive behavior is the first step to change.</p>
      <div class="suggestion-ideas">
        <h4>Try these instead:</h4>
        <ul>
          <li>📚 Read a book or article</li>
          <li>🎯 Work on a personal project</li>
          <li>🏃‍♂️ Take a short walk</li>
          <li>🧘‍♀️ Practice mindfulness</li>
          <li>📝 Journal your thoughts</li>
        </ul>
      </div>
      <button id="close-suggestion" class="btn-close">Got it!</button>
    </div>
  `;
  
  // Style the suggestion
  suggestion.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10004;
    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
    color: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 450px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  document.body.appendChild(suggestion);
  
  // Add close functionality
  document.getElementById('close-suggestion').addEventListener('click', () => {
    suggestion.remove();
  });
}

// Export UI management functions
window.uiManager = {
  waitForDataAndUpdate: waitForDataAndUpdate,
  removeLoadingState: removeLoadingState,
  forceUpdateIndicator: forceUpdateIndicator,
  addUsageIndicator: addUsageIndicator,
  updateUsageIndicator: updateUsageIndicator,
  showBreakReminder: showBreakReminder,
  showDailyLimitReached: showDailyLimitReached,
  showToastMessage: showToastMessage,
  showPrivacyNotice: showPrivacyNotice,
  showProductivitySuggestion: showProductivitySuggestion
};
