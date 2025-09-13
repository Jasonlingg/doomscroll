#!/bin/bash
# Script to update all website configurations from a single source

echo "🔧 Updating website configurations..."

# Define the single source of truth
WEBSITES='[
  { "domain": "youtube.com", "name": "YouTube", "enabled": true, "isDefault": true },
  { "domain": "instagram.com", "name": "Instagram", "enabled": true, "isDefault": true },
  { "domain": "x.com", "name": "X (Twitter)", "enabled": true, "isDefault": true },
  { "domain": "reddit.com", "name": "Reddit", "enabled": true, "isDefault": true },
  { "domain": "linkedin.com", "name": "LinkedIn", "enabled": true, "isDefault": true },
  { "domain": "tiktok.com", "name": "TikTok", "enabled": true, "isDefault": true },
  { "domain": "snapchat.com", "name": "Snapchat", "enabled": true, "isDefault": true },
  { "domain": "facebook.com", "name": "Facebook", "enabled": true, "isDefault": true }
]'

# Extract domains for manifest
DOMAINS=$(echo $WEBSITES | jq -r '.[].domain')

echo "📋 Domains:"
echo "$DOMAINS" | sed 's/^/  - /'

echo ""
echo "🔐 Host permissions (for manifest.json):"
echo "$DOMAINS" | sed 's/^/  "*:\/\/*./' | sed 's/$/\/*",/'

echo ""
echo "📜 Content matches (for manifest.json):"
echo "$DOMAINS" | sed 's/^/  "*:\/\/*./' | sed 's/$/\/*",/'

echo ""
echo "📝 Allowlist domains (for background.js):"
echo "$DOMAINS" | sed "s/^/  '/" | sed "s/$/',/"

echo "✅ Configuration extracted successfully!"
echo ""
echo "To update files manually:"
echo "1. Update manifest.json host_permissions and content_scripts matches"
echo "2. Update background.js getDefaultAllowlist() and getDefaultWebsites()"
echo "3. Update content/utils.js getDefaultWebsites()"
echo "4. Update popup.js getDefaultWebsites() if it exists"
