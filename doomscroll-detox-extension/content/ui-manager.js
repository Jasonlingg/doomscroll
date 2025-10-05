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

// Minimal hard lock: hide page content but keep indicator visible with settings access
function enforceMinimalHardLock() {
  // Ensure indicator exists
  const indicator = document.getElementById('doomscroll-indicator') || createOrGetIndicator();
  if (!indicator) return;
  
  // Pause time tracking while in hard lock
  try {
    const stateManager = window.stateManager;
    if (stateManager) {
      stateManager.setIsActive(false);
      // Visually mark indicator as paused
      indicator.classList.add('hard-lock-paused');
      // Keep UI consistent
      window.uiManager.updateUsageIndicator(stateManager.getDailyUsage(), stateManager.getCurrentSettings().dailyLimit, false);
    }
  } catch (e) {
    // no-op
  }
  
  // Create an overlay container if not present
  let overlay = document.getElementById('minimal-hard-lock-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'minimal-hard-lock-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      background: rgba(0,0,0,0.08) !important;
      backdrop-filter: blur(1px) !important;
      z-index: 99998 !important;
      pointer-events: auto !important; /* capture clicks to block page */
    `;
    document.body.appendChild(overlay);
  }
  
  // Create a centered lock message card if not present
  if (!document.getElementById('minimal-hard-lock-message')) {
    const lockMsg = document.createElement('div');
    lockMsg.id = 'minimal-hard-lock-message';
    lockMsg.innerHTML = `
      <div class="hard-lock-card">
        <div class="hard-lock-icon">🔒</div>
        <h2 class="hard-lock-title">You're locked from this site</h2>
        <p class="hard-lock-subtitle">Hard Lock is enabled. Take a short break.</p>
        <div class="hard-lock-actions">
          <button id="hard-lock-open-settings" class="btn-animated">Open Settings</button>
        </div>
      </div>
    `;
    document.body.appendChild(lockMsg);
    const openBtn = lockMsg.querySelector('#hard-lock-open-settings');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const indicatorEl = document.getElementById('doomscroll-indicator');
        if (indicatorEl && !indicatorEl.classList.contains('settings-panel')) {
          transformToSettingsPanel();
        }
      });
    }
  }
  
  // Hide all content except the indicator
  document.documentElement.classList.add('doomscroll-minimal-hard-lock');
  injectMinimalHardLockStyles();
  
  // Disable page scrolling
  if (!document.documentElement.hasAttribute('data-hard-lock-scroll')) {
    document.documentElement.setAttribute('data-hard-lock-scroll', 'disabled');
    document.documentElement.style.overflow = 'hidden';
  }
}

function removeMinimalHardLock() {
  const overlay = document.getElementById('minimal-hard-lock-overlay');
  if (overlay) overlay.remove();
  const lockMsg = document.getElementById('minimal-hard-lock-message');
  if (lockMsg) lockMsg.remove();
  document.documentElement.classList.remove('doomscroll-minimal-hard-lock');
  
  // Re-enable page scrolling
  if (document.documentElement.getAttribute('data-hard-lock-scroll') === 'disabled') {
    document.documentElement.removeAttribute('data-hard-lock-scroll');
    document.documentElement.style.overflow = '';
  }
  
  // Resume time tracking and restore indicator visuals
  try {
    const stateManager = window.stateManager;
    if (stateManager) {
      const indicator = document.getElementById('doomscroll-indicator');
      if (indicator) indicator.classList.remove('hard-lock-paused');
      stateManager.setIsActive(true);
      // Reset session timing so we don't double count within current minute
      stateManager.setSessionStartTime(Date.now());
      stateManager.setLastMinuteCompleted(0);
      window.uiManager.updateUsageIndicator(stateManager.getDailyUsage(), stateManager.getCurrentSettings().dailyLimit, false);
    }
  } catch (e) {
    // no-op
  }
}

function injectMinimalHardLockStyles() {
  if (document.getElementById('minimal-hard-lock-styles')) return;
  const style = document.createElement('style');
  style.id = 'minimal-hard-lock-styles';
  style.textContent = `
    .doomscroll-minimal-hard-lock body > *:not(#doomscroll-indicator):not(#minimal-hard-lock-overlay),
    .doomscroll-minimal-hard-lock html > *:not(body):not(head):not(#doomscroll-indicator):not(#minimal-hard-lock-overlay) {
      visibility: hidden !important;
    }
    /* Lock message container */
    #minimal-hard-lock-message {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 99999 !important;
      pointer-events: auto !important;
    }
    .hard-lock-card {
      background: rgba(255,255,255,0.96) !important;
      border-radius: 16px !important;
      padding: 28px 24px !important;
      width: 92vw !important;
      max-width: 420px !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18) !important;
      border: 1px solid rgba(0,0,0,0.06) !important;
      text-align: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      backdrop-filter: blur(6px) !important;
    }
    .hard-lock-icon { font-size: 44px !important; margin-bottom: 8px !important; }
    .hard-lock-title { font-size: 20px !important; margin: 6px 0 !important; color: #111827 !important; }
    .hard-lock-subtitle { font-size: 14px !important; margin: 0 0 16px 0 !important; color: #6b7280 !important; }
    .hard-lock-actions { display: flex !important; justify-content: center !important; }
    #hard-lock-open-settings { min-width: 160px !important; }

    /* Keep the overlay clickable to block interactions */
    #minimal-hard-lock-overlay { cursor: not-allowed !important; }

    /* Ensure indicator remains interactive above overlay */
    #doomscroll-indicator { pointer-events: auto !important; }
    #doomscroll-indicator {
      position: fixed !important;
      top: 16px !important;
      right: 16px !important;
      z-index: 99999 !important;
    }
    /* Grey style only when NOT showing settings panel */
    #doomscroll-indicator.hard-lock-paused:not(.settings-panel) {
      background: linear-gradient(135deg, #9ca3af 0%, #9ca3af 100%) !important; /* gray */
      border: 1px solid rgba(0, 0, 0, 0.15) !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
      filter: grayscale(25%);
    }
  `;
  document.head.appendChild(style);
}

function createOrGetIndicator() {
  let indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) {
    addUsageIndicator();
    indicator = document.getElementById('doomscroll-indicator');
  }
  return indicator;
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
  // Check if indicator already exists
  if (document.getElementById('doomscroll-indicator')) {
    console.log('⚠️ Indicator already exists, skipping creation');
    return;
  }
  
  const stateManager = window.stateManager;
  const indicator = document.createElement('div');
  indicator.id = 'doomscroll-indicator';
  
  // Get actual loaded data
  const dailyUsage = stateManager.getDailyUsage() || 0;
  const dailyLimit = stateManager.getCurrentSettings()?.dailyLimit || 30;
  
  indicator.innerHTML = `
    <div class="doomscroll-badge">
      <span class="time-spent">${dailyUsage}m</span>
      <span class="daily-limit">/${dailyLimit}m</span>
    </div>
    <button class="settings-btn" title="Open App Settings">⚡</button>
  `;
  
  // Set background color based on usage
  const wholeMinutes = Math.floor(dailyUsage);
  let background = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'; // Default purple gradient
  
  if (wholeMinutes >= dailyLimit) {
    background = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'; // Red gradient for limit reached/exceeded
  } else if (wholeMinutes >= dailyLimit * 0.8) {
    background = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'; // Orange gradient for warning (80%+)
  } else if (wholeMinutes >= dailyLimit * 0.6) {
    background = 'linear-gradient(135deg, #eab308 0%, #facc15 100%)'; // Yellow gradient for caution (60%+)
  } else if (wholeMinutes > 0) {
    background = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)'; // Purple gradient when active
  }
  
  indicator.style.background = background;
  
  // Add click handler for settings button - transform to settings panel
  const settingsBtn = indicator.querySelector('.settings-btn');
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    transformToSettingsPanel();
  });
  
  document.body.appendChild(indicator);
  console.log('✅ Indicator created with loaded data:', dailyUsage, 'minutes');
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
    newBackground = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'; // Red gradient for limit reached/exceeded
    console.log('🚨 Daily limit reached/exceeded! Turning indicator red');
  } else if (wholeMinutes >= dailyLimit * 0.8) {
    newBackground = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'; // Orange gradient for warning (80%+)
    console.log('⚠️ Approaching daily limit! Turning indicator orange');
  } else if (wholeMinutes >= dailyLimit * 0.6) {
    newBackground = 'linear-gradient(135deg, #eab308 0%, #facc15 100%)'; // Yellow gradient for caution (60%+)
    console.log('⚠️ Daily limit warning zone! Turning indicator yellow');
  } else if (wholeMinutes > 0) {
    newBackground = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)'; // Purple gradient when active
  }
  
  // Add red border and glow when limit is reached/exceeded
  let newBorder = '1px solid rgba(255, 255, 255, 0.2)';
  let newBoxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
  
  if (wholeMinutes >= dailyLimit) {
    newBorder = '2px solid rgba(220, 38, 38, 0.8)';
    newBoxShadow = '0 4px 20px rgba(220, 38, 38, 0.4), 0 0 30px rgba(220, 38, 38, 0.2)';
  }
  
  // Only update background if it changed
  if (indicator.style.background !== newBackground) {
    updates.push(() => {
      indicator.style.background = newBackground;
    });
  }
  
  // Update border and box shadow for limit reached state
  if (indicator.style.border !== newBorder) {
    updates.push(() => {
      indicator.style.border = newBorder;
    });
  }
  
  if (indicator.style.boxShadow !== newBoxShadow) {
    updates.push(() => {
      indicator.style.boxShadow = newBoxShadow;
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
  
  // Add pulsing animation when limit is reached/exceeded
  if (wholeMinutes >= dailyLimit) {
    indicator.classList.add('limit-reached');
  } else {
    indicator.classList.remove('limit-reached');
  }
}

// Inject all CSS styles immediately when the module loads
function injectAllStyles() {
  // Inject Font Awesome for floating settings checkboxes
  if (!document.getElementById('font-awesome')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.id = 'font-awesome';
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }
  
  if (!document.getElementById('doomscroll-styles')) {
    const style = document.createElement('style');
    style.id = 'doomscroll-styles';
    style.textContent = `
      .damage-animation {
        animation: damageShake 0.8s ease-in-out;
        box-shadow: 0 0 30px rgba(220, 38, 38, 1), 0 0 60px rgba(255, 100, 100, 0.6) !important;
        transform: scale(1.15) !important;
        filter: brightness(1.3) !important;
      }
      
      .limit-reached {
        animation: limitPulse 2s ease-in-out infinite;
      }
      
      @keyframes limitPulse {
        0% { 
          box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4), 0 0 30px rgba(220, 38, 38, 0.2);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 4px 25px rgba(220, 38, 38, 0.6), 0 0 40px rgba(220, 38, 38, 0.4);
          transform: scale(1.05);
        }
        100% { 
          box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4), 0 0 30px rgba(220, 38, 38, 0.2);
          transform: scale(1);
        }
      }
      
      @keyframes damageShake {
        0% { transform: scale(1.15) translate(0, 0) rotate(0deg); }
        5% { transform: scale(1.2) translate(-4px, -2px) rotate(-2deg); }
        10% { transform: scale(1.18) translate(4px, 2px) rotate(2deg); }
        15% { transform: scale(1.22) translate(-3px, 4px) rotate(-2deg); }
        20% { transform: scale(1.16) translate(3px, -2px) rotate(2deg); }
        25% { transform: scale(1.24) translate(-2px, 3px) rotate(-2deg); }
        30% { transform: scale(1.19) translate(2px, 2px) rotate(2deg); }
        35% { transform: scale(1.21) translate(-3px, -2px) rotate(-2deg); }
        40% { transform: scale(1.17) translate(3px, -3px) rotate(2deg); }
        45% { transform: scale(1.23) translate(-2px, 2px) rotate(-2deg); }
        50% { transform: scale(1.2) translate(2px, 1px) rotate(2deg); }
        55% { transform: scale(1.18) translate(-1px, -1px) rotate(-1deg); }
        60% { transform: scale(1.16) translate(1px, 1px) rotate(1deg); }
        65% { transform: scale(1.14) translate(-1px, -1px) rotate(-1deg); }
        70% { transform: scale(1.12) translate(1px, -1px) rotate(1deg); }
        75% { transform: scale(1.1) translate(-1px, 1px) rotate(-1deg); }
        80% { transform: scale(1.08) translate(1px, -1px) rotate(1deg); }
        85% { transform: scale(1.06) translate(-1px, 1px) rotate(-1deg); }
        90% { transform: scale(1.04) translate(1px, -1px) rotate(1deg); }
        95% { transform: scale(1.02) translate(-1px, 1px) rotate(-1deg); }
        100% { transform: scale(1.15) translate(0, 0) rotate(0deg); }
      }
      
      .damage-animation .doomscroll-badge {
        animation: damagePulse 0.8s ease-in-out;
        filter: brightness(1.4) !important;
      }
      
      @keyframes damagePulse {
        0% { transform: scale(1); filter: brightness(1.4); }
        10% { transform: scale(1.15); filter: brightness(1.6); }
        20% { transform: scale(1.05); filter: brightness(1.3); }
        30% { transform: scale(1.2); filter: brightness(1.7); }
        40% { transform: scale(0.95); filter: brightness(1.2); }
        50% { transform: scale(1.1); filter: brightness(1.5); }
        60% { transform: scale(0.98); filter: brightness(1.3); }
        70% { transform: scale(1.05); filter: brightness(1.4); }
        80% { transform: scale(0.99); filter: brightness(1.3); }
        90% { transform: scale(1.02); filter: brightness(1.35); }
        100% { transform: scale(1); filter: brightness(1.4); }
      }
      
        /* Simple purple checkboxes for floating settings */
        .website-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #e9ecef;
          transition: all 0.3s ease;
        }

        .website-item:last-child {
          border-bottom: none;
        }

        .website-item:hover {
          background: rgba(139, 92, 246, 0.05);
        }

        .website-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: 12px;
        }

        .website-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }

        .website-domain {
          font-size: 12px;
          color: #666;
        }

        .website-checkbox {
          position: relative;
          width: 20px;
          height: 20px;
          border: 2px solid #8b5cf6;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .website-checkbox.checked {
          background: #8b5cf6;
          border-color: #8b5cf6;
        }

        .website-checkbox.checked::after {
          content: '\\f00c';
          font-family: 'Font Awesome 6 Free';
          font-weight: 900;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
        }
      
      /* Alert animations */
      @keyframes alertSlideIn {
        0% { 
          transform: translate(-50%, -50%) scale(0.8) rotate(-5deg);
          opacity: 0;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.05) rotate(2deg);
          opacity: 0.8;
        }
        100% { 
          transform: translate(-50%, -50%) scale(1) rotate(0deg);
          opacity: 1;
        }
      }
      
      /* Button layout and spacing */
      .focus-alert-buttons {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        margin-top: 32px !important;
        width: 100% !important;
      }
      
      /* Clean white buttons */
      .btn-animated {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 1px solid rgba(255, 255, 255, 0.8) !important;
        color: #333 !important;
        padding: 14px 20px !important;
        border-radius: 8px !important;
        font-weight: 500 !important;
        font-size: 14px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        width: 100% !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      }
      
      .btn-animated:hover {
        background: rgba(255, 255, 255, 1) !important;
        border-color: rgba(255, 255, 255, 1) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      }
      
      .btn-animated:active {
        transform: translateY(0) !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
      }
      
      .btn-danger {
        background: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(255, 255, 255, 0.8) !important;
        color: #dc2626 !important;
      }
      
      .btn-danger:hover {
        background: rgba(255, 255, 255, 1) !important;
        border-color: rgba(255, 255, 255, 1) !important;
        color: #b91c1c !important;
      }
      
      .btn-success {
        background: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(255, 255, 255, 0.8) !important;
        color: #16a34a !important;
      }
      
      .btn-success:hover {
        background: rgba(255, 255, 255, 1) !important;
        border-color: rgba(255, 255, 255, 1) !important;
        color: #15803d !important;
      }
      
      .btn-snooze {
        background: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(255, 255, 255, 0.8) !important;
        color: #7c3aed !important;
      }
      
      .btn-snooze:hover {
        background: rgba(255, 255, 255, 1) !important;
        border-color: rgba(255, 255, 255, 1) !important;
        color: #6d28d9 !important;
      }
    `;
    document.head.appendChild(style);
    console.log('✅ All Doomscroll styles injected immediately');
  }
  
  // Add glass/blur visual styles for indicator and settings
  injectGlassStyles();
}

// Show damage animation on the indicator
function showDamageAnimationOnIndicator() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  console.log('💥 Showing damage animation on indicator');
  
  // Add damage animation class
  indicator.classList.add('damage-animation');
  
  // CSS is already injected, no need to check
  
  // Remove animation class after animation completes
  setTimeout(() => {
    indicator.classList.remove('damage-animation');
    console.log('✅ Damage animation completed');
  }, 800);
}

// Inject glass (liquid) styles for indicator and settings panel
function injectGlassStyles() {
  if (document.getElementById('doomscroll-glass-styles')) return;
  const style = document.createElement('style');
  style.id = 'doomscroll-glass-styles';
  style.textContent = `
    /* Floating indicator glass treatment */
    #doomscroll-indicator {
      backdrop-filter: saturate(160%) blur(14px) !important;
      -webkit-backdrop-filter: saturate(160%) blur(14px) !important;
      background: rgba(255, 255, 255, 0.06) !important; /* more transparent */
      border: 1px solid rgba(255, 255, 255, 0.28) !important;
    }
    /* Preserve paused grey override */
    #doomscroll-indicator.hard-lock-paused:not(.settings-panel) {
      backdrop-filter: saturate(120%) blur(10px) !important;
      -webkit-backdrop-filter: saturate(120%) blur(10px) !important;
    }
    /* Settings panel glass */
    #doomscroll-indicator.settings-panel {
      background: rgba(255, 255, 255, 0.3) !important;
      backdrop-filter: saturate(170%) blur(22px) !important;
      -webkit-backdrop-filter: saturate(170%) blur(22px) !important;
      border: 1px solid rgba(255, 255, 255, 0.38) !important;
      box-shadow: 0 20px 40px rgba(0,0,0,0.18) !important;
      color: rgba(255, 255, 255, 0.96) !important; /* lighter text */
    }
    /* Settings inner elements subtle glass */
    #doomscroll-indicator.settings-panel .floating-stat-card,
    #doomscroll-indicator.settings-panel .floating-settings-header {
      background: rgba(255, 255, 255, 0.38) !important;
      border: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08) inset, 0 1px 0 rgba(255,255,255,0.35) !important;
    }
    /* Make individual setting rows transparent */
    #doomscroll-indicator.settings-panel .setting-item {
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
    }
    #doomscroll-indicator.settings-panel .floating-settings-content {
      background: transparent !important;
    }
    /* Lighter text across settings */
    #doomscroll-indicator.settings-panel h3,
    #doomscroll-indicator.settings-panel h4,
    #doomscroll-indicator.settings-panel label,
    #doomscroll-indicator.settings-panel .floating-stat-value,
    #doomscroll-indicator.settings-panel .floating-stat-label,
    #doomscroll-indicator.settings-panel .section-description,
    #doomscroll-indicator.settings-panel .website-name,
    #doomscroll-indicator.settings-panel .website-domain {
      color: rgba(255, 255, 255, 0.95) !important;
    }
    #doomscroll-indicator.settings-panel input,
    #doomscroll-indicator.settings-panel select,
    #doomscroll-indicator.settings-panel button {
      color: rgba(255, 255, 255, 0.98) !important;
    }
    #doomscroll-indicator.settings-panel input::placeholder { color: rgba(255,255,255,0.7) !important; }
    
    /* Indicator numbers lighter */
    #doomscroll-indicator .doomscroll-badge .time-spent,
    #doomscroll-indicator .doomscroll-badge .daily-limit { color: rgba(255,255,255,0.97) !important; }
  `;
  document.head.appendChild(style);
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
  
  // Create dark overlay with blur
  const overlay = document.createElement('div');
  overlay.className = 'alert-overlay';
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.7) !important;
    z-index: 10001 !important;
    backdrop-filter: blur(5px) !important;
  `;
  
  const reminder = document.createElement('div');
  reminder.id = 'doomscroll-reminder';
  reminder.innerHTML = `
    <div class="reminder-content">
      <h3>🕐 Time for a break!</h3>
      <p>You've been scrolling for a while. Consider taking a short break.</p>
      <button id="dismiss-reminder" class="btn-animated">Dismiss</button>
    </div>
  `;
  
  reminder.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10002;
    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
    color: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(78, 205, 196, 0.4);
    text-align: center;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: alertSlideIn 0.5s ease-out;
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(reminder);
  
  // Add dismiss functionality
  document.getElementById('dismiss-reminder').addEventListener('click', () => {
    overlay.remove();
    reminder.remove();
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (reminder.parentNode) {
      overlay.remove();
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
  
  // Create dark overlay with blur
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
  
  const limitMessage = document.createElement('div');
  limitMessage.id = 'doomscroll-limit';
  limitMessage.innerHTML = `
    <div class="limit-content">
      <h3>🚫 Daily Limit Reached</h3>
      <p>You've reached your daily social media limit. Time to step away!</p>
      <button id="override-limit" class="btn-animated btn-danger">Override (not recommended)</button>
    </div>
  `;
  
  limitMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10003;
    background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
    color: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(220, 38, 38, 0.4);
    text-align: center;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: alertSlideIn 0.5s ease-out;
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(limitMessage);
  
  // Add override functionality
  document.getElementById('override-limit').addEventListener('click', () => {
    overlay.remove();
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
  // Create dark overlay with blur
  const overlay = document.createElement('div');
  overlay.className = 'alert-overlay';
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.7) !important;
    z-index: 10004 !important;
    backdrop-filter: blur(5px) !important;
  `;
  
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
      <button id="close-suggestion" class="btn-animated btn-success">Got it!</button>
    </div>
  `;
  
  // Style the suggestion
  suggestion.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10005;
    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
    color: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(78, 205, 196, 0.4);
    text-align: center;
    max-width: 500px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: alertSlideIn 0.5s ease-out;
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(suggestion);
  
  // Add close functionality
  document.getElementById('close-suggestion').addEventListener('click', () => {
    overlay.remove();
    suggestion.remove();
  });
}

// Transform floating indicator to settings panel
function transformToSettingsPanel() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  console.log('🔄 Transforming indicator to settings panel');
  
  // Get current settings
  const stateManager = window.stateManager;
  const settings = stateManager.getCurrentSettings();
  
  // Get current usage data
  const dailyUsage = stateManager.getDailyUsage() || 0;
  const dailyLimit = settings.dailyLimit || 30;
  const usagePercentage = Math.min((dailyUsage / dailyLimit) * 100, 100);
  
        // Create settings panel HTML
        const settingsHTML = `
          <div class="floating-settings-header">
            <h3>⚙️ Settings</h3>
          </div>
    
    <div class="floating-settings-content">
      <div class="floating-stats-section">
        <div class="floating-stat-card">
          <h4>Today's Usage</h4>
          <div class="floating-stat-value">${Math.floor(dailyUsage)}m</div>
          <div class="floating-stat-label">of ${dailyLimit}m daily limit</div>
        </div>
        <div class="floating-progress-bar">
          <div class="floating-progress-fill" style="width: ${usagePercentage}%"></div>
        </div>
      </div>
      <div class="setting-item">
        <label for="floating-daily-limit">Daily Limit (min):</label>
        <input type="number" id="floating-daily-limit" min="5" max="480" value="${settings.dailyLimit || 30}">
      </div>
      
      <div class="setting-item">
        <label for="floating-break-reminder">Break Reminder (min):</label>
        <input type="number" id="floating-break-reminder" min="5" max="60" value="${settings.breakReminder || 15}">
      </div>
      
      <div class="setting-item">
        <label class="toggle-label">
          <input type="checkbox" id="floating-enabled-toggle" ${settings.enabled ? 'checked' : ''}>
          <span class="toggle-text">Extension Enabled</span>
          <span class="toggle-slider"></span>
        </label>
      </div>
      
      <div class="setting-item">
        <label class="toggle-label">
          <input type="checkbox" id="floating-focus-mode-toggle" ${settings.focusMode ? 'checked' : ''}>
          <span class="toggle-text">Hard Lock Mode</span>
          <span class="toggle-slider"></span>
        </label>
        <p class="floating-setting-description">Completely blocks access to monitored sites with a lock screen</p>
      </div>
      
      <div class="setting-item">
        <label for="floating-focus-sensitivity">Lock Duration:</label>
        <select id="floating-focus-sensitivity">
          <option value="low" ${settings.focusSensitivity === 'low' ? 'selected' : ''}>5 minutes</option>
          <option value="medium" ${settings.focusSensitivity === 'medium' ? 'selected' : ''}>15 minutes</option>
          <option value="high" ${settings.focusSensitivity === 'high' ? 'selected' : ''}>30 minutes</option>
        </select>
      </div>
      
      <div class="setting-item">
        <label class="toggle-label">
          <input type="checkbox" id="floating-overlay-toggle" ${settings.showOverlays ? 'checked' : ''}>
          <span class="toggle-text">Show Overlays (alerts + suggestions)</span>
          <span class="toggle-slider"></span>
        </label>
      </div>
      
      <div class="setting-item">
        <label class="toggle-label">
          <input type="checkbox" id="floating-ai-text-analysis-toggle" disabled>
          <span class="toggle-text">AI text analysis (send text to backend)</span>
          <span class="toggle-slider"></span>
        </label>
        <p class="floating-setting-description">AI text analysis is currently disabled for production. Only analysis labels are sent.</p>
      </div>
      
      <div class="setting-item">
        <h3>Monitored Websites</h3>
        <p class="section-description">Select which websites to monitor and add your own:</p>
        <div class="website-list" id="floating-website-list">
          <!-- Websites will be populated by JavaScript -->
        </div>
      </div>
      
      <div class="floating-settings-actions">
        <button id="floating-save-settings" class="btn-primary">Save</button>
        <button id="floating-reset-today" class="btn-secondary">Reset Today</button>
      </div>
    </div>
  `;
  
  // Replace content with settings panel
  indicator.innerHTML = settingsHTML;
  
  // Add settings panel class
  indicator.classList.add('settings-panel');
  
  // Add event listeners
  setupFloatingSettingsListeners();
  
  // Populate website list
  populateFloatingWebsiteList();
  
  console.log('✅ Settings panel created');
}

// Setup event listeners for floating settings panel
function setupFloatingSettingsListeners() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  
  // Save settings button
  const saveBtn = indicator.querySelector('#floating-save-settings');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveFloatingSettings();
    });
  }
  
  // Reset today button
  const resetBtn = indicator.querySelector('#floating-reset-today');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetTodayUsage();
    });
  }
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!indicator.contains(e.target) && indicator.classList.contains('settings-panel')) {
      transformBackToIndicator();
    }
  });
}

// Transform settings panel back to indicator
function transformBackToIndicator() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  console.log('🔄 Transforming settings panel back to indicator');
  
  // Get current data
  const stateManager = window.stateManager;
  const dailyUsage = stateManager.getDailyUsage() || 0;
  const dailyLimit = stateManager.getCurrentSettings()?.dailyLimit || 30;
  
  // Create indicator HTML
  const indicatorHTML = `
    <div class="doomscroll-badge">
      <span class="time-spent">${Math.floor(dailyUsage)}m</span>
      <span class="daily-limit">/${dailyLimit}m</span>
    </div>
    <button class="settings-btn" title="Open Settings">⚡</button>
  `;
  
  // Replace content with indicator
  indicator.innerHTML = indicatorHTML;
  
  // Remove settings panel class
  indicator.classList.remove('settings-panel');
  
  // Re-add settings button click handler
  const settingsBtn = indicator.querySelector('.settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      transformToSettingsPanel();
    });
  }
  
  console.log('✅ Indicator restored');
}

// Save settings from floating panel
function saveFloatingSettings() {
  const indicator = document.getElementById('doomscroll-indicator');
  if (!indicator) return;
  
  // Get form values
  const dailyLimit = parseInt(indicator.querySelector('#floating-daily-limit').value);
  const breakReminder = parseInt(indicator.querySelector('#floating-break-reminder').value);
  const enabled = indicator.querySelector('#floating-enabled-toggle').checked;
  const focusMode = indicator.querySelector('#floating-focus-mode-toggle').checked;
  const focusSensitivity = indicator.querySelector('#floating-focus-sensitivity').value;
  const showOverlays = indicator.querySelector('#floating-overlay-toggle').checked;
  
  // Validate inputs
  if (dailyLimit < 5 || dailyLimit > 480) {
    showToastMessage('Daily limit must be between 5 and 480 minutes', 'error');
    return;
  }
  
  if (breakReminder < 5 || breakReminder > 60) {
    showToastMessage('Break reminder must be between 5 and 60 minutes', 'error');
    return;
  }
  
  // Save settings via background script
  const settings = {
    dailyLimit: dailyLimit,
    breakReminder: breakReminder,
    enabled: enabled,
    focusMode: focusMode,
    focusSensitivity: focusSensitivity,
    showOverlays: showOverlays
  };
  
  console.log('💾 Saving floating settings:', settings);
  
  // Get current save button
  const saveBtn = indicator.querySelector('#floating-save-settings');
  const originalText = saveBtn.textContent;
  
  // Change button text to show saving
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  chrome.runtime.sendMessage({ action: 'updateSettings', settings: settings }, (response) => {
    if (response && response.success) {
      // Show success in button with animation
      saveBtn.textContent = 'Saved!';
      saveBtn.style.background = '#10b981';
      saveBtn.classList.add('save-success');
      
      // Remove animation class after animation completes
      setTimeout(() => {
        saveBtn.classList.remove('save-success');
      }, 600);
      
      // Reset button after 2 seconds
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
        saveBtn.disabled = false;
      }, 2000);
      
      // Transform back to indicator after successful save
      setTimeout(() => {
        transformBackToIndicator();
      }, 2000);
    } else {
      // Show error in button with animation
      saveBtn.textContent = 'Error';
      saveBtn.style.background = '#ef4444';
      saveBtn.classList.add('save-error');
      
      // Remove animation class after animation completes
      setTimeout(() => {
        saveBtn.classList.remove('save-error');
      }, 500);
      
      // Reset button after 2 seconds
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
        saveBtn.disabled = false;
      }, 2000);
    }
  });
}

// Reset today's usage
function resetTodayUsage() {
  chrome.runtime.sendMessage({ action: 'resetTodayUsage' }, (response) => {
    if (response && response.success) {
      showToastMessage('Today\'s usage reset successfully!', 'success');
      // Transform back to indicator after successful reset
      setTimeout(() => {
        transformBackToIndicator();
      }, 1000);
    } else {
      showToastMessage('Failed to reset usage', 'error');
    }
  });
}

// Get default websites (exact copy from popup.js)
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

// Load website list in the UI (exact copy from popup.js)
function populateFloatingWebsiteList() {
    const websiteList = document.getElementById('floating-website-list');
    if (!websiteList) return;
    
    // Get websites from storage
    chrome.storage.sync.get(['monitoredWebsites'], (result) => {
        const websites = result.monitoredWebsites || getDefaultWebsites();
        
        // Simple website list for floating settings
        const websiteIcons = {
            'youtube.com': { name: 'YouTube' },
            'instagram.com': { name: 'Instagram' },
            'x.com': { name: 'X (Twitter)' },
            'twitter.com': { name: 'X (Twitter)' },
            'reddit.com': { name: 'Reddit' },
            'linkedin.com': { name: 'LinkedIn' },
            'tiktok.com': { name: 'TikTok' },
            'snapchat.com': { name: 'Snapchat' },
            'facebook.com': { name: 'Facebook' }
        };
        
        websiteList.innerHTML = '';
        
        websites.forEach((website, index) => {
            const websiteItem = document.createElement('div');
            websiteItem.className = 'website-item';
            
            // Get display name
            const displayName = websiteIcons[website.domain]?.name || website.name;
            
            websiteItem.innerHTML = `
                <div class="website-checkbox ${website.enabled ? 'checked' : ''}" data-index="${index}"></div>
                <div class="website-info">
                    <div class="website-name">${displayName}</div>
                    <div class="website-domain">${website.domain}</div>
                </div>
            `;
            
            // Add event listener for checkbox
            const checkbox = websiteItem.querySelector('.website-checkbox');
            checkbox.addEventListener('click', () => {
                website.enabled = !website.enabled;
                checkbox.classList.toggle('checked', website.enabled);
                updateFloatingWebsiteSettings(websites);
            });
            
            websiteList.appendChild(websiteItem);
        });
    });
}


// Update website settings
function updateFloatingWebsiteSettings(websites) {
  chrome.storage.sync.set({ monitoredWebsites: websites }, () => {
    console.log('✅ Website settings updated');
  });
}

// Hard lock mode - completely block access to monitored sites
function checkHardLockMode() {
  const stateManager = window.stateManager;
  if (!stateManager) return;
  
  const settings = stateManager.getCurrentSettings();
  if (!settings.focusMode || !settings.enabled) {
    removeMinimalHardLock();
    return;
  }
  
  const currentDomain = window.location.hostname;
  // Read monitored websites from storage (fallback to defaults)
  chrome.storage.sync.get(['monitoredWebsites'], (result) => {
    const monitoredWebsites = result.monitoredWebsites || getDefaultWebsites();
    
    // Check if current site is monitored and enabled
    const isMonitored = monitoredWebsites.some(site => 
      site && site.enabled && (
        (typeof site.domain === 'string' && (currentDomain.includes(site.domain) || site.domain.includes(currentDomain)))
      )
    );
    
    if (isMonitored) {
      enforceMinimalHardLock();
    } else {
      removeMinimalHardLock();
    }
  });
}

// Show hard lock screen overlay
function showHardLockScreen() {
  // Deprecated full-screen lock; use minimal lock that keeps indicator visible
  enforceMinimalHardLock();
}

// Start countdown timer
function startLockCountdown(seconds) {
  // No-op for minimal hard lock mode
}

// Close lock screen
function closeLockScreen() {
  removeMinimalHardLock();
}

// Emergency unlock
function emergencyUnlock() {
  removeMinimalHardLock();
  
  // Disable hard lock mode temporarily
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    settings.focusMode = false;
    chrome.storage.sync.set({ settings });
    
    showToastMessage('Emergency unlock activated. Hard lock disabled.', 'warning');
  });
}

// Unlock site when timer expires
function unlockSite() {
  removeMinimalHardLock();
}

// Inject styles immediately when module loads
injectAllStyles();

// Check hard lock mode when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkHardLockMode);
} else {
  checkHardLockMode();
}

// Re-evaluate lock when monitored websites or settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;
  if (changes.monitoredWebsites || changes.focusMode || changes.enabled) {
    checkHardLockMode();
  }
});

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
  showProductivitySuggestion: showProductivitySuggestion,
  injectAllStyles: injectAllStyles,
  transformToSettingsPanel: transformToSettingsPanel,
  transformBackToIndicator: transformBackToIndicator,
  saveFloatingSettings: saveFloatingSettings,
  resetTodayUsage: resetTodayUsage,
  checkHardLockMode: checkHardLockMode,
  enforceMinimalHardLock: enforceMinimalHardLock,
  removeMinimalHardLock: removeMinimalHardLock
};
