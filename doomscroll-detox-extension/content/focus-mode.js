// Focus Mode - Focus mode functionality
// Handles focus mode alerts, timers, and productivity tracking

// Focus mode functions with improved stability
function startFocusMode() {
  console.log('🎯 Starting focus mode...');
  
  const stateManager = window.stateManager;
  
  // Log focus mode start event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'focus_mode_started',
    domain: window.location.hostname,
    url: window.location.href,
    duration: stateManager.getDailyUsage()
  });
  
  stateManager.setFocusModeActive(true);
  stateManager.setFocusModeAlertShown(false);
  const focusModeState = stateManager.getFocusModeState();
  focusModeState.lastAlertTime = 0;
  
  // Clear any existing timers
  if (stateManager.getFocusModeTimer()) {
    clearTimeout(stateManager.getFocusModeTimer());
    stateManager.setFocusModeTimer(null);
  }
  
  startFocusModeTimer();
  startIdleDetection();
}

function stopFocusMode() {
  console.log('⏹️ Stopping focus mode...');
  const stateManager = window.stateManager;
  stateManager.setFocusModeActive(false);
  
  if (stateManager.getFocusModeTimer()) {
    clearTimeout(stateManager.getFocusModeTimer());
    stateManager.setFocusModeTimer(null);
  }
  
  const focusModeState = stateManager.getFocusModeState();
  if (focusModeState.idleTimeout) {
    clearTimeout(focusModeState.idleTimeout);
    focusModeState.idleTimeout = null;
  }
  
  stateManager.setFocusModeAlertShown(false);
  focusModeState.isIdle = false;
}

function startFocusModeTimer() {
  const stateManager = window.stateManager;
  
  if (stateManager.getFocusModeTimer()) {
    clearTimeout(stateManager.getFocusModeTimer());
  }
  
  // Get timer duration from current settings
  let timerDuration = 30000; // Default 30 seconds
  switch (stateManager.getCurrentSettings().focusSensitivity) {
    case 'low':
      timerDuration = 60000; // 60 seconds
      break;
    case 'medium':
      timerDuration = 30000; // 30 seconds
      break;
    case 'high':
      timerDuration = 15000; // 15 seconds
      break;
  }
  
  console.log(`⏰ Starting focus mode timer for ${timerDuration/1000}s...`);
  const timer = setTimeout(() => {
    if (stateManager.getFocusModeActive() && !stateManager.getFocusModeAlertShown() && !stateManager.getFocusModeState().isIdle) {
      showFocusModeAlert();
    }
  }, timerDuration);
  
  stateManager.setFocusModeTimer(timer);
}

function startIdleDetection() {
  const stateManager = window.stateManager;
  const focusModeState = stateManager.getFocusModeState();
  
  // Reset idle state
  focusModeState.isIdle = false;
  
  // Clear existing timeout
  if (focusModeState.idleTimeout) {
    clearTimeout(focusModeState.idleTimeout);
  }
  
  // Set new idle timeout (5 minutes)
  focusModeState.idleTimeout = setTimeout(() => {
    focusModeState.isIdle = true;
    console.log('😴 User marked as idle, pausing focus mode');
  }, 300000); // 5 minutes
}

function showFocusModeAlert() {
  const stateManager = window.stateManager;
  const currentTime = Date.now();
  const currentDomain = window.location.hostname;
  const focusModeState = stateManager.getFocusModeState();
  
  // Check if we should show alert (debouncing per domain)
  if (currentTime - focusModeState.lastAlertTime < focusModeState.alertCooldown) {
    console.log('⏳ Alert cooldown active, skipping...');
    return;
  }
  
  // Log focus mode alert event to backend
  chrome.runtime.sendMessage({
    action: 'logEvent',
    eventType: 'focus_mode_alert',
    domain: window.location.hostname,
    url: window.location.href,
    duration: stateManager.getDailyUsage()
  });
  
  // Check if overlays are disabled
  if (!stateManager.getCurrentSettings().showOverlays) {
    console.log('🚫 Overlays disabled, showing toast instead');
    window.uiManager.showToastMessage('Focus Mode: Time to check if you\'re being productive!', 'warning');
    return;
  }
  
  console.log('🚨 Showing focus mode alert!');
  stateManager.setFocusModeAlertShown(true);
  focusModeState.lastAlertTime = currentTime;
  
  // Detect content type for better messaging
  const contentType = detectContentType();
  const alertMessage = getContentTypeMessage(contentType);
  
  // Create dark overlay
  const overlay = document.createElement('div');
  overlay.className = 'alert-overlay';
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.7) !important;
    z-index: 10002 !important;
    backdrop-filter: blur(5px) !important;
  `;
  
  const alert = document.createElement('div');
  alert.id = 'focus-mode-alert';
  alert.innerHTML = `
    <div class="focus-alert-content">
      <h3>🚨 Focus Mode Alert!</h3>
      <p>${alertMessage}</p>
      <p><strong>Are you being productive?</strong></p>
      <div class="focus-alert-buttons">
        <button id="yes-productive" class="btn-animated btn-success">Yes, I'm being productive</button>
        <button id="no-productive" class="btn-animated btn-danger">No, I'm being unproductive</button>
        <button id="snooze-alert" class="btn-animated btn-snooze">Snooze 5 min</button>
      </div>
    </div>
  `;
  
  // Style the alert
  alert.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10003;
    background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
    color: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(139, 92, 246, 0.4);
    text-align: center;
    max-width: 450px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(alert);
  
  // Add button functionality
  document.getElementById('yes-productive').addEventListener('click', () => {
    console.log('✅ User confirmed they are being productive');
    overlay.remove();
    alert.remove();
    // Reset timer for another 30 seconds
    stateManager.setFocusModeAlertShown(false);
    startFocusModeTimer();
  });
  
  document.getElementById('no-productive').addEventListener('click', () => {
    console.log('❌ User admitted they are being unproductive');
    overlay.remove();
    alert.remove();
    // Show motivational message and suggest alternatives
    window.uiManager.showProductivitySuggestion();
  });
  
  document.getElementById('snooze-alert').addEventListener('click', () => {
    console.log('⏰ User snoozed alert for 5 minutes');
    overlay.remove();
    alert.remove();
    // Snooze for 5 minutes
    setTimeout(() => {
      stateManager.setFocusModeAlertShown(false);
      startFocusModeTimer();
    }, 300000); // 5 minutes
  });
}

// Detect content type for better focus mode messaging
function detectContentType() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  if (hostname.includes('youtube.com') && url.includes('/shorts/')) {
    return 'youtube-shorts';
  } else if (hostname.includes('tiktok.com')) {
    return 'tiktok';
  } else if (hostname.includes('instagram.com') && url.includes('/reels/')) {
    return 'instagram-reels';
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'twitter-feed';
  } else if (hostname.includes('reddit.com')) {
    return 'reddit-feed';
  } else if (hostname.includes('facebook.com')) {
    return 'facebook-feed';
  }
  
  return 'general';
}

// Get appropriate message based on content type and sensitivity
function getContentTypeMessage(contentType) {
  const stateManager = window.stateManager;
  const sensitivity = stateManager.getCurrentSettings().focusSensitivity;
  
  // Get timer duration based on sensitivity
  let timerDuration = 30; // Default 30 seconds
  switch (sensitivity) {
    case 'low':
      timerDuration = 60; // 60 seconds
      break;
    case 'medium':
      timerDuration = 30; // 30 seconds
      break;
    case 'high':
      timerDuration = 15; // 15 seconds
      break;
  }
  
  const messages = {
    'youtube-shorts': `You've been watching YouTube Shorts for ${timerDuration} seconds.`,
    'tiktok': `You've been scrolling TikTok for ${timerDuration} seconds.`,
    'instagram-reels': `You've been watching Instagram Reels for ${timerDuration} seconds.`,
    'twitter-feed': `You've been scrolling Twitter/X for ${timerDuration} seconds.`,
    'reddit-feed': `You've been browsing Reddit for ${timerDuration} seconds.`,
    'facebook-feed': `You've been scrolling Facebook for ${timerDuration} seconds.`,
    'general': `You've been on this social media site for ${timerDuration} seconds.`
  };
  
  return messages[contentType] || messages.general;
}

// Export focus mode functions
window.focusMode = {
  startFocusMode: startFocusMode,
  stopFocusMode: stopFocusMode,
  startFocusModeTimer: startFocusModeTimer,
  startIdleDetection: startIdleDetection,
  showFocusModeAlert: showFocusModeAlert,
  detectContentType: detectContentType,
  getContentTypeMessage: getContentTypeMessage
};
