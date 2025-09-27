import React, { useState, useEffect } from 'react';
import './App.css';

interface Settings {
  enabled: boolean;
  dailyLimit: number;
  breakReminder: number;
  focusMode: boolean;
  focusSensitivity: 'low' | 'medium' | 'high';
  showOverlays: boolean;
  aiTextAnalysis: boolean;
}

interface Website {
  domain: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    dailyLimit: 30,
    breakReminder: 15,
    focusMode: false,
    focusSensitivity: 'medium',
    showOverlays: true,
    aiTextAnalysis: false
  });
  
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [newWebsite, setNewWebsite] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const settingsResponse = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (settingsResponse.success) {
        setSettings(settingsResponse.settings);
      }

      // Load daily usage
      const usageResponse = await chrome.runtime.sendMessage({ action: 'getDailyUsage' });
      if (usageResponse.success) {
        setDailyUsage(usageResponse.usage);
      }

      // Load websites
      const websitesResponse = await chrome.runtime.sendMessage({ action: 'getMonitoredWebsites' });
      if (websitesResponse.success) {
        setWebsites(websitesResponse.websites);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('Saving...');
      const response = await chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings 
      });
      
      if (response.success) {
        setSaveStatus('Settings saved!');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('Error saving settings');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('Error saving settings');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleResetToday = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'resetTodayUsage' });
      if (response.success) {
        setDailyUsage(0);
        setSaveStatus('Today\'s usage reset!');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error resetting today:', error);
    }
  };

  const handleWebsiteToggle = async (index: number) => {
    const updatedWebsites = [...websites];
    updatedWebsites[index].enabled = !updatedWebsites[index].enabled;
    setWebsites(updatedWebsites);
    
    try {
      await chrome.runtime.sendMessage({ 
        action: 'updateMonitoredWebsites', 
        websites: updatedWebsites 
      });
    } catch (error) {
      console.error('Error updating websites:', error);
    }
  };

  const handleAddWebsite = async () => {
    if (!newWebsite.trim()) return;
    
    const newSite: Website = {
      domain: newWebsite.trim(),
      name: newWebsite.trim(),
      enabled: true,
      isDefault: false
    };
    
    const updatedWebsites = [...websites, newSite];
    setWebsites(updatedWebsites);
    setNewWebsite('');
    
    try {
      await chrome.runtime.sendMessage({ 
        action: 'updateMonitoredWebsites', 
        websites: updatedWebsites 
      });
    } catch (error) {
      console.error('Error adding website:', error);
    }
  };

  const handleRemoveWebsite = async (index: number) => {
    const updatedWebsites = websites.filter((_, i) => i !== index);
    setWebsites(updatedWebsites);
    
    try {
      await chrome.runtime.sendMessage({ 
        action: 'updateMonitoredWebsites', 
        websites: updatedWebsites 
      });
    } catch (error) {
      console.error('Error removing website:', error);
    }
  };

  const usagePercentage = Math.min((dailyUsage / settings.dailyLimit) * 100, 100);

  if (isLoading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🧘‍♀️ Doomscroll Detox</h1>
        <p className="subtitle">Break free from endless scrolling</p>
      </header>
      
      <main className="popup-main">
        <div className="stats-section">
          <div className="stat-card">
            <h3>Today's Usage</h3>
            <div className="stat-value">{Math.floor(dailyUsage)}m</div>
            <div className="stat-label">of {settings.dailyLimit}m daily limit</div>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="daily-limit-input">Daily Limit (minutes):</label>
            <input 
              type="number" 
              id="daily-limit-input" 
              min="5" 
              max="480" 
              value={settings.dailyLimit}
              onChange={(e) => setSettings({...settings, dailyLimit: parseInt(e.target.value) || 30})}
            />
          </div>
          
          <div className="setting-item">
            <label htmlFor="break-reminder-input">Break Reminder (minutes):</label>
            <input 
              type="number" 
              id="break-reminder-input" 
              min="5" 
              max="60" 
              value={settings.breakReminder}
              onChange={(e) => setSettings({...settings, breakReminder: parseInt(e.target.value) || 15})}
            />
          </div>
          
          <div className="setting-item">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                id="enabled-toggle" 
                checked={settings.enabled}
                onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
              />
              <span className="toggle-text">Extension Enabled</span>
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                id="focus-mode-toggle" 
                checked={settings.focusMode}
                onChange={(e) => setSettings({...settings, focusMode: e.target.checked})}
              />
              <span className="toggle-text">Hard Lock Mode</span>
              <span className="toggle-slider"></span>
            </label>
            <p className="setting-description">Completely blocks access to monitored sites with a lock screen</p>
          </div>
          
          <div className="setting-item">
            <label htmlFor="focus-sensitivity">Lock Duration:</label>
            <select 
              id="focus-sensitivity"
              value={settings.focusSensitivity}
              onChange={(e) => setSettings({...settings, focusSensitivity: e.target.value as 'low' | 'medium' | 'high'})}
            >
              <option value="low">5 minutes</option>
              <option value="medium">15 minutes</option>
              <option value="high">30 minutes</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                id="overlay-toggle" 
                checked={settings.showOverlays}
                onChange={(e) => setSettings({...settings, showOverlays: e.target.checked})}
              />
              <span className="toggle-text">Show Overlays (alerts + suggestions)</span>
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                id="ai-text-analysis-toggle" 
                disabled
                checked={settings.aiTextAnalysis}
              />
              <span className="toggle-text">AI text analysis (send text to backend)</span>
              <span className="toggle-slider"></span>
            </label>
            <p className="setting-description">AI text analysis is currently disabled for production. Only analysis labels are sent.</p>
          </div>
        </div>
        
        <div className="website-section">
          <h3>Monitored Websites</h3>
          <p className="section-description">Select which websites to monitor and add your own:</p>
          
          <div className="website-list">
            {websites.map((website, index) => (
              <div key={index} className="website-item">
                <input 
                  type="checkbox" 
                  className="website-checkbox"
                  checked={website.enabled}
                  onChange={() => handleWebsiteToggle(index)}
                />
                <label className="website-label">
                  {website.name}
                </label>
                {!website.isDefault && (
                  <button 
                    className="remove-website"
                    onClick={() => handleRemoveWebsite(index)}
                    title="Remove website"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="add-website">
            <input 
              type="text" 
              id="new-website-input" 
              placeholder="Enter website (e.g., youtube.com)"
              value={newWebsite}
              onChange={(e) => setNewWebsite(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddWebsite()}
            />
            <button 
              id="add-website-btn" 
              className="btn-secondary"
              onClick={handleAddWebsite}
            >
              Add Website
            </button>
          </div>
        </div>
        
        <div className="actions-section">
          <button 
            id="save-settings" 
            className="btn-primary"
            onClick={handleSaveSettings}
          >
            {saveStatus || 'Save Settings'}
          </button>
          <button 
            id="reset-today" 
            className="btn-secondary"
            onClick={handleResetToday}
          >
            Reset Today's Usage
          </button>
        </div>
      </main>
      
      <footer className="popup-footer">
        <p>Take control of your digital wellbeing</p>
      </footer>
    </div>
  );
};

export default App;