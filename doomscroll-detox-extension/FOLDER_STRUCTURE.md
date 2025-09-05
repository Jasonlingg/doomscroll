# Doomscroll Detox Extension - Folder Structure

This document describes the organized folder structure for the Doomscroll Detox Chrome extension.

## 📁 Folder Organization

```
doomscroll-detox-extension/
├── 📄 manifest.json          # Extension configuration
├── 📄 background.js          # Background service worker
├── 📁 css/                   # All CSS stylesheets
│   ├── 📄 content-styles.css # Styles for content script elements
│   └── 📄 styles.css         # Styles for popup UI
├── 📁 content/               # Content script files
│   └── 📄 content.js         # Main content script logic
├── 📁 popup/                 # Popup UI files
│   ├── 📄 popup.html         # Popup HTML structure
│   └── 📄 popup.js           # Popup JavaScript logic
└── 📁 dist/                  # Built/compiled files (if any)
```

## 🎯 Purpose of Each Folder

### `css/`
- **Purpose**: Contains all stylesheets separated from logic
- **Files**:
  - `content-styles.css`: Styles for floating indicators, alerts, and overlays injected by content script
  - `styles.css`: Styles for the extension popup interface

### `content/`
- **Purpose**: Contains files that run on web pages
- **Files**:
  - `content.js`: Main content script that tracks usage, shows indicators, and handles alerts

### `popup/`
- **Purpose**: Contains files for the extension popup interface
- **Files**:
  - `popup.html`: HTML structure for the settings popup
  - `popup.js`: JavaScript logic for popup interactions and settings management

## 🔧 Manifest Configuration

The `manifest.json` has been updated to reference the new file paths:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["css/content-styles.css"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html"
  }
}
```

## ✅ Benefits of This Structure

1. **Separation of Concerns**: CSS is separated from JavaScript logic
2. **Better Organization**: Related files are grouped together
3. **Easier Maintenance**: Clear structure makes it easier to find and modify files
4. **Scalability**: Easy to add new features in appropriate folders
5. **Professional Structure**: Follows common extension development patterns

## 🚀 Usage

The extension will work exactly the same as before, but now with a cleaner, more maintainable codebase structure.
