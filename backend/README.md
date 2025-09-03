# Doomscroll Detox Backend

Simple database backend for the Doomscroll Detox browser extension.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize database:**
   ```bash
   python setup_db.py
   ```

3. **Verify setup:**
   - Check that `doomscroll_detox.db` file was created
   - Database will contain sample user data

## Database Schema

### Users Table
- `id`: Hashed user identifier
- `created_at`: Account creation timestamp
- `last_active`: Last activity timestamp
- `daily_limit`: Daily usage limit (minutes)
- `break_reminder`: Break reminder interval (minutes)
- `focus_mode_enabled`: Whether focus mode is enabled
- `analytics_enabled`: Whether analytics are enabled

### Usage Events Table
- `id`: Unique event ID
- `user_id`: Hashed user identifier
- `event_type`: Type of event (page_view, scroll, focus_alert, etc.)
- `timestamp`: Event timestamp
- `domain`: Website domain
- `url`: Full URL (optional)
- `duration`: Event duration in seconds (optional)
- `extension_version`: Extension version
- `browser`: Browser type

### Daily Stats Table
- `id`: Unique stat ID
- `user_id`: Hashed user identifier
- `date`: Date of statistics
- `total_time`: Total time spent (seconds)
- `page_views`: Number of page views
- `focus_alerts`: Number of focus alerts
- `break_reminders`: Number of break reminders

## Files

- `models.py`: Database models and schema
- `db.py`: Database connection and utilities
- `setup_db.py`: Database initialization script
- `requirements.txt`: Python dependencies
- `config.env`: Configuration file

## Next Steps

When ready to add APIs:
1. Create `app.py` with FastAPI routes
2. Add data validation with Pydantic schemas
3. Implement event ingestion endpoints
4. Add analytics and reporting endpoints
