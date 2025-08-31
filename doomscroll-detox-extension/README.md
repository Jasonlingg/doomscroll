# 🧘‍♀️ Doomscroll Detox

A browser extension designed to help you break free from endless social media scrolling and promote healthier digital habits.

## 🌟 Features

### **Real-time Usage Tracking**
- Monitors time spent on social media platforms
- Visual indicator showing daily usage vs. limit
- Color-coded progress (green → orange → red)

### **Smart Reminders**
- Break reminders after configurable time periods
- Daily limit enforcement with gentle nudges
- Page visibility detection for accurate timing

### **Customizable Settings**
- Adjustable daily time limits (5-480 minutes)
- Configurable break reminder intervals (5-60 minutes)
- Enable/disable extension with one click

### **Beautiful Interface**
- Modern, gradient-based design
- Responsive popup interface
- Smooth animations and hover effects

## 🎯 Supported Platforms

- **Facebook** - Social networking
- **Twitter/X** - Microblogging
- **Instagram** - Photo sharing
- **TikTok** - Short-form video
- **Reddit** - Community discussions

## 🚀 Installation

### **For Development/Testing**

1. **Clone or download** this repository
2. **Open Chrome/Edge** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the `doomscroll-detox-extension` folder
5. **Pin the extension** to your toolbar for easy access

### **For Production Distribution**

*Coming soon: Chrome Web Store and Firefox Add-ons*

## 📱 Usage

### **Getting Started**

1. **Click the extension icon** in your browser toolbar
2. **Review your current settings** and adjust as needed
3. **Set your daily limit** (recommended: 30-60 minutes)
4. **Choose break reminder timing** (recommended: 15-20 minutes)

### **Daily Experience**

- **Usage indicator** appears on social media sites (top-right corner)
- **Break reminders** pop up when you've been scrolling for a while
- **Daily limit alerts** help you step away when you've reached your goal
- **Progress tracking** shows how much time you have left

### **Settings Management**

- **Daily Limit**: Set maximum time per day on social media
- **Break Reminder**: Get notified to take breaks during long sessions
- **Extension Toggle**: Quickly enable/disable without uninstalling
- **Reset Usage**: Start fresh if you need to reset your daily tracking

## 🏗️ Project Structure

```
doomscroll-detox-extension/
├─ manifest.json      # Extension configuration (Manifest V3)
├─ background.js      # Service worker for background tasks
├─ content.js         # Content script for social media pages
├─ popup.html         # Extension popup interface
├─ popup.js           # Popup functionality and settings
├─ styles.css         # Modern, responsive styling
└─ README.md          # This documentation
```

## 🔧 Technical Details

### **Architecture**
- **Manifest V3** - Latest Chrome extension standard
- **Service Worker** - Background processing and storage
- **Content Scripts** - Page integration and usage tracking
- **Popup Interface** - User settings and statistics

### **Data Storage**
- **Chrome Storage API** - Settings and usage data
- **Local persistence** - Data survives browser restarts
- **Daily reset logic** - Automatic usage tracking reset

### **Performance**
- **Efficient tracking** - Only active when needed
- **Minimal overhead** - Lightweight implementation
- **Smart updates** - Real-time progress without lag

## 🎨 Customization

### **Styling**
The extension uses modern CSS with:
- Gradient backgrounds and smooth transitions
- Responsive design for different screen sizes
- Custom animations and hover effects
- Professional typography and spacing

### **Behavior**
- Adjustable reminder frequencies
- Customizable daily limits
- Flexible break timing
- Override options for special circumstances

## 🐛 Troubleshooting

### **Common Issues**

**Extension not working on social media sites?**
- Ensure the extension is enabled
- Check that the site is in the supported list
- Refresh the page after enabling

**Settings not saving?**
- Click "Save Settings" after making changes
- Check browser storage permissions
- Try refreshing the popup

**Usage not tracking accurately?**
- Make sure the page is visible/active
- Check for page visibility changes
- Verify the extension is loaded

### **Reset Options**

- **Reset Today's Usage**: Start fresh for the current day
- **Reload Extension**: Unload and reload if experiencing issues
- **Clear Browser Data**: Last resort for persistent problems

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and test thoroughly
4. **Commit your changes** (`git commit -m 'Add amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### **Development Setup**

1. **Clone the repository**
2. **Load as unpacked extension** in Chrome/Edge
3. **Make changes** to the source files
4. **Reload the extension** to see changes
5. **Test thoroughly** before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chrome Extensions Team** for the excellent documentation
- **Browser extension community** for best practices and examples
- **Digital wellbeing advocates** for inspiration and motivation

## 🔮 Roadmap

### **Upcoming Features**
- [ ] **Usage Analytics** - Detailed reports and insights
- [ ] **Goal Setting** - Weekly/monthly targets
- [ ] **Social Features** - Share progress with friends
- [ ] **Mobile Support** - Companion mobile app
- [ ] **AI Insights** - Smart recommendations based on usage patterns

### **Platform Expansion**
- [ ] **Firefox Add-on** - Cross-browser compatibility
- [ ] **Safari Extension** - Apple ecosystem support
- [ ] **Edge Add-on** - Microsoft browser integration

## 📞 Support

- **GitHub Issues** - Report bugs or request features
- **Documentation** - Check this README for common questions
- **Community** - Join discussions in our community forum

---

**Remember**: The goal isn't to eliminate social media entirely, but to use it mindfully and intentionally. Take breaks, set boundaries, and prioritize your real-world connections and activities.

**Happy detoxing! 🧘‍♀️✨**
