// Content Analyzer - Captures meaning, not raw content
// Focuses on visible DOM text and structured data parsing

class ContentAnalyzer {
  constructor() {
    this.observer = null;
    this.visibleElements = new Set();
    this.maxChars = 180;
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.startObserving();
  }

  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.visibleElements.add(entry.target);
        } else {
          this.visibleElements.delete(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1 // Element is considered visible when 10% is in viewport
    });
  }

  startObserving() {
    // Observe safe content regions - expanded for better content capture
    const selectors = [
      'h1', 'h2', 'h3', // All headings
      '[data-testid*="caption"]', '[data-testid*="description"]', '[data-testid*="text"]', // Captions/descriptions
      '.comment', '[data-testid*="comment"]', '[data-testid*="reply"]', // Comments
      'article', 'main', '[role="main"]', // Main content areas
      '.post-text', '.tweet-text', '.video-description', '.content-text', // Platform-specific content
      'p', 'div[class*="text"]', 'span[class*="text"]', // General text elements
      '[data-testid*="post"]', '[data-testid*="tweet"]', '[data-testid*="video"]' // Platform posts
    ];

    let totalObserved = 0;
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`🔍 Found ${elements.length} elements for selector: ${selector}`);
      elements.forEach(el => {
        if (this.isSafeElement(el)) {
          this.observer.observe(el);
          totalObserved++;
          console.log(`👁️ Observing element:`, {
            tagName: el.tagName,
            className: el.className,
            textPreview: el.textContent?.slice(0, 50) + '...',
            id: el.id,
            selector: selector
          });
        }
      });
    });
    
    console.log(`📊 Total elements being observed: ${totalObserved}`);
  }

  isSafeElement(element) {
    // Skip hidden, script, or potentially sensitive elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg'].includes(tagName)) {
      return false;
    }

    // Skip elements with sensitive classes/attributes
    const className = element.className || '';
    const sensitivePatterns = ['password', 'credit', 'ssn', 'social-security'];
    if (sensitivePatterns.some(pattern => className.toLowerCase().includes(pattern))) {
      return false;
    }

    return true;
  }

  getVisibleText() {
    let text = '';
    const elements = Array.from(this.visibleElements);

    console.log(`👀 Currently visible elements: ${elements.length}`);
    elements.forEach((el, index) => {
      console.log(`Element ${index + 1}:`, {
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent?.slice(0, 100) + '...',
        selector: el.getAttribute('data-testid') || 'no-testid'
      });
    });

    // Prioritize headings first
    const headings = elements.filter(el => ['h1', 'h2', 'h3'].includes(el.tagName.toLowerCase()));
    console.log(`📝 Found ${headings.length} visible headings`);
    headings.forEach((heading, index) => {
      const headingText = this.extractText(heading);
      console.log(`Heading ${index + 1}: "${headingText}"`);
      if (headingText && text.length + headingText.length <= this.maxChars) {
        text += headingText + ' ';
      }
    });

    // Then captions/descriptions
    const captions = elements.filter(el => 
      el.getAttribute('data-testid')?.includes('caption') ||
      el.getAttribute('data-testid')?.includes('description') ||
      el.getAttribute('data-testid')?.includes('text') ||
      el.className?.includes('caption') ||
      el.className?.includes('description') ||
      el.className?.includes('post-text') ||
      el.className?.includes('tweet-text') ||
      el.className?.includes('video-description')
    );
    console.log(`📝 Found ${captions.length} visible captions/descriptions`);
    captions.forEach((caption, index) => {
      const captionText = this.extractText(caption);
      console.log(`Caption ${index + 1}: "${captionText}"`);
      if (captionText && text.length + captionText.length <= this.maxChars) {
        text += captionText + ' ';
      }
    });

    // Then comments (limit to one)
    const comments = elements.filter(el => 
      el.getAttribute('data-testid')?.includes('comment') ||
      el.getAttribute('data-testid')?.includes('reply') ||
      el.className?.includes('comment')
    );
    console.log(`💬 Found ${comments.length} visible comments`);
    if (comments.length > 0) {
      const commentText = this.extractText(comments[0]);
      console.log(`Comment: "${commentText}"`);
      if (commentText && text.length + commentText.length <= this.maxChars) {
        text += commentText + ' ';
      }
    }

    // Finally, general text content (paragraphs, divs with text)
    const generalText = elements.filter(el => 
      el.tagName.toLowerCase() === 'p' ||
      (el.tagName.toLowerCase() === 'div' && el.className?.includes('text')) ||
      (el.tagName.toLowerCase() === 'span' && el.className?.includes('text'))
    );
    console.log(`📄 Found ${generalText.length} general text elements`);
    generalText.forEach((textEl, index) => {
      const textContent = this.extractText(textEl);
      console.log(`Text ${index + 1}: "${textContent}"`);
      if (textContent && text.length + textContent.length <= this.maxChars) {
        text += textContent + ' ';
      }
    });

    const finalText = this.compressWhitespace(text).slice(0, this.maxChars);
    console.log(`📊 Final visible text (${finalText.length}/${this.maxChars} chars): "${finalText}"`);
    
    return finalText;
  }

  extractText(element) {
    if (!element) return '';
    
    // Get direct text content, avoiding nested elements
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    
    // If no direct text, get all text content but clean it up
    if (!text.trim()) {
      text = element.textContent || '';
    }
    
    // Clean up the text - remove extra whitespace, newlines, etc.
    text = text.replace(/\s+/g, ' ').trim();
    
    // Skip very short text (likely navigation or UI elements)
    if (text.length < 3) return '';
    
    // Skip text that looks like navigation or UI elements
    const skipPatterns = [
      /^(home|about|contact|login|sign up|menu|search|filter|sort)$/i,
      /^\d+$/,
      /^[^\w\s]+$/, // Only symbols
      /^(click|tap|swipe|scroll)$/i
    ];
    
    if (skipPatterns.some(pattern => pattern.test(text))) {
      return '';
    }
    
    return text;
  }

  compressWhitespace(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }

  // Parse structured data (JSON-LD/Schema.org)
  getStructuredData() {
    const structuredData = {
      headline: '',
      description: '',
      keywords: [],
      content_type: 'unknown'
    };

    console.log('🔍 Parsing structured data...');

    try {
      // Look for JSON-LD scripts
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      console.log(`📄 Found ${jsonLdScripts.length} JSON-LD scripts`);
      
      jsonLdScripts.forEach((script, index) => {
        try {
          const data = JSON.parse(script.textContent);
          console.log(`📄 JSON-LD Script ${index + 1}:`, data);
          this.parseJsonLdData(data, structuredData);
        } catch (e) {
          console.log(`❌ Invalid JSON in script ${index + 1}:`, e.message);
        }
      });

      // Fallback to meta tags
      console.log('🔍 Checking meta tags...');
      if (!structuredData.headline) {
        structuredData.headline = this.getMetaContent('og:title') || 
                                 this.getMetaContent('twitter:title') || 
                                 document.title || '';
        console.log(`📰 Headline from meta: "${structuredData.headline}"`);
      }

      if (!structuredData.description) {
        structuredData.description = this.getMetaContent('og:description') || 
                                    this.getMetaContent('twitter:description') || 
                                    this.getMetaContent('description') || '';
        console.log(`📝 Description from meta: "${structuredData.description}"`);
      }

      // Detect content type from structured data or meta
      structuredData.content_type = this.detectContentType(structuredData);
      console.log(`🏷️ Detected content type: ${structuredData.content_type}`);

      console.log('📊 Final structured data:', structuredData);

    } catch (error) {
      console.warn('Error parsing structured data:', error);
    }

    return structuredData;
  }

  parseJsonLdData(data, structuredData) {
    if (Array.isArray(data)) {
      data.forEach(item => this.parseJsonLdData(item, structuredData));
      return;
    }

    if (typeof data !== 'object' || !data) return;

    // Article data
    if (data['@type'] === 'Article' || data['@type'] === 'NewsArticle') {
      if (data.headline) structuredData.headline = data.headline;
      if (data.description) structuredData.description = data.description;
      if (data.keywords) {
        const keywords = Array.isArray(data.keywords) ? data.keywords : [data.keywords];
        structuredData.keywords.push(...keywords);
      }
    }

    // Video data
    if (data['@type'] === 'VideoObject') {
      if (data.name) structuredData.headline = data.name;
      if (data.description) structuredData.description = data.description;
      structuredData.content_type = 'video';
    }

    // WebPage data
    if (data['@type'] === 'WebPage') {
      if (data.name) structuredData.headline = data.name;
      if (data.description) structuredData.description = data.description;
    }

    // Recursively parse nested objects
    Object.values(data).forEach(value => {
      if (typeof value === 'object') {
        this.parseJsonLdData(value, structuredData);
      }
    });
  }

  getMetaContent(name) {
    const el = document.querySelector(`meta[name="${name}"]`) || 
               document.querySelector(`meta[property="${name}"]`);
    return el ? el.getAttribute('content') || '' : '';
  }

  detectContentType(structuredData) {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Platform-specific detection
    if (hostname.includes('youtube.com')) {
      if (url.includes('/shorts/')) return 'short';
      if (structuredData.content_type === 'video') return 'video';
      return 'video';
    }

    if (hostname.includes('instagram.com')) {
      if (document.querySelector('[role="main"] video')) return 'reel';
      return 'post';
    }

    if (hostname.includes('tiktok.com')) {
      return 'video';
    }

    if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
      return 'tweet';
    }

    if (hostname.includes('reddit.com')) {
      return 'post';
    }

    if (hostname.includes('facebook.com')) {
      if (document.querySelector('[data-pagelet="VideoPlayer"]')) return 'video';
      return 'post';
    }

    return structuredData.content_type || 'unknown';
  }

  // Platform-specific content extraction
  getPlatformSpecificContent() {
    const hostname = window.location.hostname;
    let content = '';

    try {
      if (hostname.includes('youtube.com')) {
        // YouTube specific selectors
        const selectors = [
          '#title h1 yt-formatted-string',
          '#description-text',
          '#content-text',
          '.ytd-video-secondary-info-renderer #content',
          '.ytd-comment-thread-renderer #content-text'
        ];
        
        selectors.forEach(selector => {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text.length > 10 && content.length + text.length <= this.maxChars) {
              content += text + ' ';
            }
          }
        });
      }
      
      else if (hostname.includes('instagram.com')) {
        // Instagram specific selectors
        const selectors = [
          'article header h1',
          'article div[role="button"] span',
          '[data-testid="post-comment"]',
          'article div[lang]'
        ];
        
        selectors.forEach(selector => {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text.length > 10 && content.length + text.length <= this.maxChars) {
              content += text + ' ';
            }
          }
        });
      }
      
      else if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
        // Twitter/X specific selectors
        const selectors = [
          '[data-testid="tweetText"]',
          '[data-testid="User-Name"]',
          '[data-testid="reply"]',
          'article div[lang]'
        ];
        
        selectors.forEach(selector => {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text.length > 10 && content.length + text.length <= this.maxChars) {
              content += text + ' ';
            }
          }
        });
      }
      
      else if (hostname.includes('tiktok.com')) {
        // TikTok specific selectors
        const selectors = [
          '[data-e2e="browse-video-desc"]',
          '[data-e2e="video-desc"]',
          '[data-e2e="user-title"]',
          '[data-e2e="video-title"]'
        ];
        
        selectors.forEach(selector => {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text.length > 10 && content.length + text.length <= this.maxChars) {
              content += text + ' ';
            }
          }
        });
      }
      
      else if (hostname.includes('reddit.com')) {
        // Reddit specific selectors
        const selectors = [
          '[data-test-id="post-content"]',
          'h1[data-test-id="post-content"]',
          '.Comment',
          '[data-testid="post-content"]'
        ];
        
        selectors.forEach(selector => {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text.length > 10 && content.length + text.length <= this.maxChars) {
              content += text + ' ';
            }
          }
        });
      }
      
      else if (hostname.includes('facebook.com')) {
        // Facebook specific selectors
        const selectors = [
          '[data-pagelet="FeedUnit"]',
          '[data-pagelet="VideoPlayer"]',
          'div[role="article"]',
          '[data-testid="post_message"]'
        ];
        
        selectors.forEach(selector => {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            const text = el.textContent.trim();
            if (text.length > 10 && content.length + text.length <= this.maxChars) {
              content += text + ' ';
            }
          }
        });
      }
      
    } catch (error) {
      console.warn('Platform-specific content extraction error:', error);
    }

    const finalContent = this.compressWhitespace(content).slice(0, this.maxChars);
    console.log(`🎯 Platform-specific content (${finalContent.length}/${this.maxChars} chars): "${finalContent}"`);
    
    return finalContent;
  }

  // Get comprehensive content analysis using tiered detector
  analyzeContent() {
    const hostname = window.location.hostname;
    const structuredData = this.getStructuredData();
    
    // Tier 1: Try DOM adapters first (fastest, most accurate)
    let content = '';
    let extractionMethod = 'none';
    
    if (window.domAdapters) {
      const adapterContent = window.domAdapters.extractContent(hostname);
      if (adapterContent) {
        // Combine adapter content
        const parts = [];
        if (adapterContent.title) parts.push(adapterContent.title);
        if (adapterContent.description) parts.push(adapterContent.description);
        if (adapterContent.caption) parts.push(adapterContent.caption);
        if (adapterContent.tweet) parts.push(adapterContent.tweet);
        if (adapterContent.post) parts.push(adapterContent.post);
        if (adapterContent.story) parts.push(adapterContent.story);
        
        // Add first few comments
        if (adapterContent.comments && adapterContent.comments.length > 0) {
          parts.push(adapterContent.comments.slice(0, 2).join(' '));
        }
        
        content = parts.join(' ').slice(0, this.maxChars);
        extractionMethod = 'dom-adapter';
        
        console.log(`🎯 DOM Adapter extracted:`, {
          method: extractionMethod,
          content: content,
          type: adapterContent.type,
          username: adapterContent.username || adapterContent.channel || adapterContent.author
        });
      }
    }
    
    // Tier 2: Fallback to generic card extractor
    if (!content && window.genericCardExtractor) {
      content = window.genericCardExtractor.getVisibleCardsContent();
      extractionMethod = 'generic-cards';
      
      console.log(`🔄 Generic Card Extractor:`, {
        method: extractionMethod,
        content: content
      });
    }
    
    // Tier 3: Fallback to original visible text method
    if (!content) {
      content = this.getVisibleText();
      extractionMethod = 'visible-text';
      
      console.log(`📄 Visible Text Fallback:`, {
        method: extractionMethod,
        content: content
      });
    }
    
    return {
      visible_text: content,
      structured_data: structuredData,
      extraction_method: extractionMethod,
      timestamp: Date.now(),
      url: window.location.href,
      hostname: window.location.hostname
    };
  }

  // Cleanup
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export for use in other modules
window.contentAnalyzer = new ContentAnalyzer();
