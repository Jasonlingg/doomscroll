-- Quick database queries for better viewing
-- Save these as .sql files and run with: sqlite3 doomscroll_detox.db < query.sql

-- 1. Recent Activity (Last 20 events)
SELECT 
    event_type,
    domain,
    duration,
    strftime('%Y-%m-%d %H:%M', timestamp) as time,
    substr(user_id, 1, 8) as user_short
FROM usage_events 
ORDER BY timestamp DESC 
LIMIT 20;

-- 2. User Summary
SELECT 
    substr(id, 1, 8) as user_id,
    daily_limit,
    break_reminder,
    focus_mode_enabled,
    analytics_enabled,
    strftime('%Y-%m-%d %H:%M', created_at) as created
FROM users
ORDER BY created_at DESC;

-- 3. Website Usage Summary
SELECT 
    domain,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(duration), 1) as avg_duration,
    MAX(duration) as max_duration,
    SUM(duration) as total_duration_minutes
FROM usage_events 
WHERE event_type = 'usage_sync'
GROUP BY domain
ORDER BY total_duration_minutes DESC;

-- 4. Daily Usage by Date
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as active_users,
    ROUND(AVG(duration), 1) as avg_duration,
    SUM(duration) as total_minutes
FROM usage_events 
WHERE event_type = 'usage_sync'
GROUP BY DATE(timestamp)
ORDER BY date DESC
LIMIT 7;

-- 5. Event Type Summary
SELECT 
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(duration), 1) as avg_duration
FROM usage_events 
GROUP BY event_type
ORDER BY count DESC;
