# Chrome Web Store Submission Checklist

## ✅ Completed
- [x] Manifest V3 compliant
- [x] Proper permissions (minimal required)
- [x] Clear description
- [x] Privacy policy created
- [x] Homepage URL added

## 🔄 Still Needed

### 1. Icons (Required)
Create these icon files in the `icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels) 
- `icon128.png` (128x128 pixels)

**Icon Design Suggestions:**
- Simple, clean design
- Represents "time tracking" or "digital wellness"
- Avoid copyrighted material
- Use consistent branding colors

### 2. Screenshots (Required)
Create at least one screenshot (640x400 pixels minimum):
- Show the extension popup interface
- Demonstrate the floating usage indicator
- Show settings/configuration options

### 3. Store Listing Details
Prepare these for submission:
- **Category**: Productivity
- **Language**: English
- **Detailed Description**: Explain features, benefits, how it works
- **Keywords**: doomscrolling, productivity, time tracking, digital wellness

### 4. Developer Account Setup
- Register at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
- Pay $5 one-time registration fee
- Verify your identity

## 🚨 Potential Issues to Address

### 1. Backend Dependencies
- **Issue**: Extension references localhost backend
- **Solution**: Either remove backend dependency or host it publicly
- **Recommendation**: Make backend optional for store version

### 2. Permissions Justification
Be prepared to explain why you need:
- `tabs` permission (for cross-tab synchronization)
- `activeTab` permission (for content script injection)
- `storage` permission (for settings and usage data)

### 3. Content Script Scope
- **Current**: Runs on `<all_urls>`
- **Concern**: May be flagged as too broad
- **Solution**: Consider limiting to specific domains only

## 📋 Submission Steps

1. **Create Icons**: Design and add icon files
2. **Take Screenshots**: Capture extension in action
3. **Test Thoroughly**: Ensure all features work
4. **Package Extension**: Create ZIP file
5. **Submit for Review**: Upload to Chrome Web Store
6. **Wait for Review**: 1-3 weeks typically
7. **Address Feedback**: Respond to any rejection reasons

## 💡 Tips for Success

- **Clear Purpose**: Your extension has a clear, beneficial purpose
- **Minimal Permissions**: You're only requesting necessary permissions
- **User Privacy**: Privacy policy addresses data collection
- **Professional Quality**: Code is well-structured and documented

## 🎯 Estimated Timeline
- **Preparation**: 1-2 days (icons, screenshots, testing)
- **Review Process**: 1-3 weeks
- **Total**: 2-4 weeks to live on Chrome Web Store
