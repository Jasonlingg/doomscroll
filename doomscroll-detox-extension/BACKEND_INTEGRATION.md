# Doomscroll Detox - Backend Integration

## 🚀 Quick Start

### 1. Start the Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app:app --reload --port 8000
```

### 2. Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `doomscroll-detox-extension` folder

### 3. Test the Integration
1. Visit a social media site (YouTube, Facebook, etc.)
2. Open browser console (F12)
3. Copy and paste the contents of `test_backend_integration.js`
4. Check the backend logs and database

## 📊 What Gets Logged

The extension now sends these events to your backend:

- **`page_view`**: When you visit a monitored site
- **`break_reminder`**: When the break reminder appears
- **`focus_mode_alert`**: When focus mode triggers an alert
- **`daily_limit_reached`**: When you hit your daily limit
- **`focus_mode_started`**: When focus mode is activated

## 🔍 Check Your Data

### View API Documentation
Visit: http://127.0.0.1:8000/docs

### Check Database
```bash
cd backend
sqlite3 doomscroll_detox.db "SELECT * FROM usage_events ORDER BY timestamp DESC LIMIT 10;"
```

### Test API Endpoints
```bash
# Health check
curl http://127.0.0.1:8000/health

# Get user stats
curl http://127.0.0.1:8000/api/v1/users/test123/stats

# Send test event
curl -X POST http://127.0.0.1:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"events":[{"user_id":"test123","event_type":"test","domain":"example.com"}]}'
```

## 🛠️ Configuration

### Backend URL
The extension is configured to connect to `http://127.0.0.1:8000`. To change this:

1. Edit `background.js` line 3: `const BACKEND_URL = 'http://127.0.0.1:8000';`
2. Update `manifest.json` host permissions if needed

### Privacy Settings
Analytics are enabled by default. To disable:
1. Open extension popup
2. Go to settings
3. Disable "Analytics" feature flag

## 🐛 Troubleshooting

### Extension Not Loading
- Check Chrome extension page for errors
- Ensure all files are in the correct folder
- Verify manifest.json is valid

### Backend Connection Issues
- Ensure backend is running on port 8000
- Check if `http://127.0.0.1:8000/health` responds
- Look for CORS errors in browser console

### Events Not Logging
- Check browser console for errors
- Verify analytics feature flag is enabled
- Check backend logs for incoming requests

## 📈 Next Steps

1. **Add Analytics Dashboard**: Create a web interface to view your data
2. **Enhance Event Types**: Add more detailed tracking
3. **User Authentication**: Add proper user management
4. **Data Export**: Add ability to export usage data
5. **Notifications**: Add backend-triggered notifications
