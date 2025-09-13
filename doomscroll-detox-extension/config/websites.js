// Single source of truth for monitored websites
// This file defines all social media platforms that can be monitored

const MONITORED_WEBSITES = [
  { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
  { domain: 'instagram.com', name: 'Instagram', enabled: true, isDefault: true },
  { domain: 'x.com', name: 'X (Twitter)', enabled: true, isDefault: true },
  { domain: 'reddit.com', name: 'Reddit', enabled: true, isDefault: true },
  { domain: 'linkedin.com', name: 'LinkedIn', enabled: true, isDefault: true },
  { domain: 'tiktok.com', name: 'TikTok', enabled: true, isDefault: true },
  { domain: 'snapchat.com', name: 'Snapchat', enabled: true, isDefault: true },
  { domain: 'facebook.com', name: 'Facebook', enabled: true, isDefault: true }
];

// Helper functions to extract data from the single source
function getDefaultWebsites() {
  return MONITORED_WEBSITES.map(site => ({ ...site }));
}

function getDefaultAllowlist() {
  return MONITORED_WEBSITES.map(site => site.domain);
}

function getHostPermissions() {
  return MONITORED_WEBSITES.map(site => `*://*.${site.domain}/*`);
}

function getContentScriptMatches() {
  return MONITORED_WEBSITES.map(site => `*://*.${site.domain}/*`);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    MONITORED_WEBSITES,
    getDefaultWebsites,
    getDefaultAllowlist,
    getHostPermissions,
    getContentScriptMatches
  };
} else {
  // Browser environment
  window.WEBSITE_CONFIG = {
    MONITORED_WEBSITES,
    getDefaultWebsites,
    getDefaultAllowlist,
    getHostPermissions,
    getContentScriptMatches
  };
}
