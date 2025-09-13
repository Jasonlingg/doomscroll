# Website Configuration Management

## 🎯 Single Source of Truth

To add or modify monitored websites, you need to update **4 files** to keep them in sync:

### Files to Update:

1. **`manifest.json`**
   - `host_permissions` array
   - `content_scripts[0].matches` array

2. **`background.js`**
   - `getDefaultAllowlist()` function
   - `getDefaultWebsites()` function

3. **`content/utils.js`**
   - `getDefaultWebsites()` function

4. **`popup/popup.js`** (if it has getDefaultWebsites)
   - `getDefaultWebsites()` function

### Current Websites:

```javascript
const WEBSITES = [
  { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
  { domain: 'instagram.com', name: 'Instagram', enabled: true, isDefault: true },
  { domain: 'x.com', name: 'X (Twitter)', enabled: true, isDefault: true },
  { domain: 'reddit.com', name: 'Reddit', enabled: true, isDefault: true },
  { domain: 'linkedin.com', name: 'LinkedIn', enabled: true, isDefault: true },
  { domain: 'tiktok.com', name: 'TikTok', enabled: true, isDefault: true },
  { domain: 'snapchat.com', name: 'Snapchat', enabled: true, isDefault: true },
  { domain: 'facebook.com', name: 'Facebook', enabled: true, isDefault: true }
];
```

### Helper Script:

Run `./scripts/update-websites.sh` to extract the configuration:

```bash
./scripts/update-websites.sh
```

This will show you the exact strings to copy into each file.

### Adding a New Website:

1. **Add to the list above**
2. **Update manifest.json:**
   ```json
   "host_permissions": [
     "*://*.youtube.com/*",
     "*://*.instagram.com/*",
     "*://*.x.com/*",
     "*://*.reddit.com/*",
     "*://*.linkedin.com/*",
     "*://*.tiktok.com/*",
     "*://*.snapchat.com/*",
     "*://*.facebook.com/*",
     "*://*.newsite.com/*"  // ← Add here
   ]
   ```

3. **Update content_scripts matches:**
   ```json
   "matches": [
     "*://*.youtube.com/*",
     "*://*.instagram.com/*",
     "*://*.x.com/*",
     "*://*.reddit.com/*",
     "*://*.linkedin.com/*",
     "*://*.tiktok.com/*",
     "*://*.snapchat.com/*",
     "*://*.facebook.com/*",
     "*://*.newsite.com/*"  // ← Add here
   ]
   ```

4. **Update background.js:**
   ```javascript
   function getDefaultAllowlist() {
     return ['youtube.com', 'instagram.com', 'x.com', 'reddit.com', 'linkedin.com', 'tiktok.com', 'snapchat.com', 'facebook.com', 'newsite.com'];
   }
   
   function getDefaultWebsites() {
     return [
       { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
       // ... other sites ...
       { domain: 'newsite.com', name: 'New Site', enabled: true, isDefault: true }
     ];
   }
   ```

5. **Update content/utils.js:**
   ```javascript
   function getDefaultWebsites() {
     return [
       { domain: 'youtube.com', name: 'YouTube', enabled: true, isDefault: true },
       // ... other sites ...
       { domain: 'newsite.com', name: 'New Site', enabled: true, isDefault: true }
     ];
   }
   ```

### Testing:

After updating all files:
1. Reload the extension in Chrome
2. Visit the new website
3. Check that the floating indicator appears
4. Verify it's listed in the popup's monitored websites

## 🚨 Important Notes:

- **Always update ALL 4 files** - missing one will cause issues
- **Test thoroughly** after adding new sites
- **Consider Chrome Web Store policies** - too many permissions might get rejected
- **Keep the list manageable** - more sites = more complexity
