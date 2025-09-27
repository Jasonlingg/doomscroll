import React, { useState, useEffect } from 'react';
import './HardLockScreen.css';

interface Settings {
  enabled: boolean;
  dailyLimit: number;
  breakReminder: number;
  focusMode: boolean;
  focusSensitivity: 'low' | 'medium' | 'high';
  showOverlays: boolean;
  aiTextAnalysis: boolean;
}

interface HardLockScreenProps {
  settings: Settings;
}

const HardLockScreen: React.FC<HardLockScreenProps> = ({ settings }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    // Calculate lock duration
    let lockDuration = 5; // default 5 minutes
    switch(settings.focusSensitivity) {
      case 'low': lockDuration = 5; break;
      case 'medium': lockDuration = 15; break;
      case 'high': lockDuration = 30; break;
    }
    
    setTimeLeft(lockDuration * 60); // Convert to seconds
    
    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleUnlock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [settings.focusSensitivity]);

  const handleUnlock = () => {
    setIsVisible(false);
    // Remove the lock screen from DOM
    setTimeout(() => {
      const container = document.getElementById('doomscroll-lock-container');
      if (container) {
        container.remove();
      }
    }, 300);
  };

  const handleEmergencyUnlock = async () => {
    try {
      // Disable hard lock mode temporarily
      const updatedSettings = { ...settings, focusMode: false };
      await chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings: updatedSettings 
      });
      
      handleUnlock();
    } catch (error) {
      console.error('Error with emergency unlock:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="hard-lock-overlay">
      <div className="hard-lock-content">
        <div className="lock-icon">🔒</div>
        <h2>Site Locked</h2>
        <p>This site is temporarily blocked by Doomscroll Detox.</p>
        <p>Lock duration: <strong>
          {settings.focusSensitivity === 'low' ? '5' : 
           settings.focusSensitivity === 'medium' ? '15' : '30'} minutes
        </strong></p>
        <div className="lock-timer">
          <div className="timer-circle">
            <span className="countdown">{formatTime(timeLeft)}</span>
          </div>
        </div>
        <p className="lock-message">Take a break and come back later!</p>
        <button 
          className="emergency-btn"
          onClick={handleEmergencyUnlock}
        >
          Emergency Unlock
        </button>
      </div>
    </div>
  );
};

export default HardLockScreen;
