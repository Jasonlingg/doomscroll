import { defineContentScript } from 'wxt';
import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatingIndicator from './components/FloatingIndicator';
import HardLockScreen from './components/HardLockScreen';

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    // Create container for floating indicator
    const indicatorContainer = document.createElement('div');
    indicatorContainer.id = 'doomscroll-indicator-container';
    document.body.appendChild(indicatorContainer);

    // Create container for hard lock screen
    const lockContainer = document.createElement('div');
    lockContainer.id = 'doomscroll-lock-container';
    document.body.appendChild(lockContainer);

    // Render floating indicator
    const indicatorRoot = ReactDOM.createRoot(indicatorContainer);
    indicatorRoot.render(React.createElement(FloatingIndicator));

    // Check for hard lock mode
    checkHardLockMode();
  },
});

// Check if hard lock mode should be active
async function checkHardLockMode() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (!response.success) return;
    
    const settings = response.settings;
    if (!settings.focusMode || !settings.enabled) return;
    
    const currentDomain = window.location.hostname;
    const websitesResponse = await chrome.runtime.sendMessage({ action: 'getMonitoredWebsites' });
    
    if (!websitesResponse.success) return;
    
    const websites = websitesResponse.websites;
    const isMonitored = websites.some((site: any) => 
      site.enabled && (currentDomain.includes(site.domain) || site.domain.includes(currentDomain))
    );
    
    if (isMonitored) {
      // Render hard lock screen
      const lockContainer = document.getElementById('doomscroll-lock-container');
      if (lockContainer) {
        const lockRoot = ReactDOM.createRoot(lockContainer);
        lockRoot.render(React.createElement(HardLockScreen, { settings }));
      }
    }
  } catch (error) {
    console.error('Error checking hard lock mode:', error);
  }
}

