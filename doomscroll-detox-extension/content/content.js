// Content script for Doomscroll Detox extension
// Main coordinator that loads and initializes all modules

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize the extension
    if (window.utils && window.utils.init) {
      window.utils.init();
    } else {
      console.error('❌ Utils module not loaded properly');
    }
  });
      } else {
  // Initialize immediately if DOM is already ready
  if (window.utils && window.utils.init) {
    window.utils.init();
  } else {
    console.error('❌ Utils module not loaded properly');
  }
}
