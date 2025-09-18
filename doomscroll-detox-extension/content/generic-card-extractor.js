// Generic Visible Card Extractor with Shadow-DOM Traversal
// Fallback tier: Works on any site when specific adapters fail

class GenericCardExtractor {
  constructor() {
    this.maxChars = 180;
    this.observedCards = new Set();
    this.observer = null;
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
          this.observedCards.add(entry.target);
        } else {
          this.observedCards.delete(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.3 // Card must be 30% visible
    });
  }

  startObserving() {
    // Generic card selectors that work across most sites
    const cardSelectors = [
      'article',
      '[role="article"]',
      '.card',
      '.post',
      '.item',
      '.tile',
      '.feed-item',
      '.content-item',
      '[data-testid*="post"]',
      '[data-testid*="tweet"]',
      '[data-testid*="card"]',
      '[data-testid*="item"]',
      '.ytd-video-renderer',
      '.ytd-rich-item-renderer',
      '.ytd-compact-video-renderer'
    ];

    let totalObserved = 0;
    cardSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`🔍 Found ${elements.length} potential cards for selector: ${selector}`);
      
      elements.forEach(el => {
        if (this.isValidCard(el)) {
          this.observer.observe(el);
          totalObserved++;
          console.log(`👁️ Observing card:`, {
            tagName: el.tagName,
            className: el.className,
            textPreview: this.extractCardText(el).slice(0, 50) + '...',
            id: el.id
          });
        }
      });
    });
    
    console.log(`📊 Total cards being observed: ${totalObserved}`);
  }

  isValidCard(element) {
    // Skip hidden or invalid elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // Must have some text content
    const text = this.extractCardText(element);
    if (text.length < 10) {
      return false;
    }

    // Skip navigation, headers, footers
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    const skipPatterns = [
      'nav', 'header', 'footer', 'sidebar', 'menu',
      'navigation', 'breadcrumb', 'pagination'
    ];
    
    if (skipPatterns.some(pattern => 
      tagName.includes(pattern) || 
      className.includes(pattern) || 
      id.includes(pattern)
    )) {
      return false;
    }

    return true;
  }

  // Extract text from a card, including shadow DOM traversal
  extractCardText(element) {
    let text = '';
    
    try {
      // First try direct text content
      text = this.getDirectText(element);
      
      // If not enough text, traverse shadow DOM
      if (text.length < 20) {
        text += this.traverseShadowDOM(element);
      }
      
      // If still not enough, get nested text
      if (text.length < 20) {
        text += this.getNestedText(element);
      }
      
    } catch (error) {
      console.warn('Card text extraction error:', error);
      text = element.textContent || '';
    }

    return this.cleanText(text);
  }

  // Get direct text content
  getDirectText(element) {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  // Traverse shadow DOM
  traverseShadowDOM(element) {
    let text = '';
    
    try {
      // Check if element has shadow root
      if (element.shadowRoot) {
        text += this.extractTextFromShadowRoot(element.shadowRoot);
      }
      
      // Check all child elements for shadow roots
      const children = element.querySelectorAll('*');
      for (const child of children) {
        if (child.shadowRoot) {
          text += this.extractTextFromShadowRoot(child.shadowRoot);
        }
      }
      
    } catch (error) {
      // Shadow DOM access might be restricted
      console.warn('Shadow DOM traversal error:', error);
    }
    
    return text;
  }

  // Extract text from shadow root
  extractTextFromShadowRoot(shadowRoot) {
    let text = '';
    
    try {
      // Get all text nodes in shadow root
      const walker = document.createTreeWalker(
        shadowRoot,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      let node;
      while (node = walker.nextNode()) {
        text += node.textContent + ' ';
      }
      
    } catch (error) {
      console.warn('Shadow root text extraction error:', error);
    }
    
    return text;
  }

  // Get nested text content
  getNestedText(element) {
    let text = '';
    
    // Prioritize certain elements
    const prioritySelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span', 'div',
      '[data-testid*="text"]',
      '[data-testid*="content"]',
      '[data-testid*="title"]',
      '[data-testid*="description"]'
    ];
    
    for (const selector of prioritySelectors) {
      const elements = element.querySelectorAll(selector);
      for (const el of elements) {
        const elText = el.textContent?.trim();
        if (elText && elText.length > 3) {
          text += elText + ' ';
          if (text.length > this.maxChars) break;
        }
      }
      if (text.length > this.maxChars) break;
    }
    
    return text;
  }

  // Clean and filter text
  cleanText(text) {
    if (!text) return '';
    
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Skip very short text
    if (text.length < 3) return '';
    
    // Skip navigation/UI text
    const skipPatterns = [
      /^(home|about|contact|login|sign up|menu|search|filter|sort|more|less)$/i,
      /^\d+$/,
      /^[^\w\s]+$/,
      /^(click|tap|swipe|scroll|load|loading)$/i,
      /^(share|like|comment|follow|subscribe)$/i
    ];
    
    if (skipPatterns.some(pattern => pattern.test(text))) {
      return '';
    }
    
    return text;
  }

  // Get content from visible cards
  getVisibleCardsContent() {
    const cards = Array.from(this.observedCards);
    let content = '';
    
    console.log(`👀 Processing ${cards.length} visible cards`);
    
    // Sort cards by visibility and importance
    const sortedCards = cards.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      
      // Prioritize cards higher on screen
      if (aRect.top !== bRect.top) {
        return aRect.top - bRect.top;
      }
      
      // Prioritize larger cards
      return bRect.width * bRect.height - aRect.width * aRect.height;
    });
    
    // Extract text from top cards
    for (let i = 0; i < Math.min(sortedCards.length, 5); i++) {
      const card = sortedCards[i];
      const cardText = this.extractCardText(card);
      
      if (cardText && content.length + cardText.length <= this.maxChars) {
        content += cardText + ' ';
        console.log(`📄 Card ${i + 1}: "${cardText}"`);
      }
    }
    
    const finalContent = content.trim().slice(0, this.maxChars);
    console.log(`📊 Generic card content (${finalContent.length}/${this.maxChars} chars): "${finalContent}"`);
    
    return finalContent;
  }

  // Cleanup
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export for use in other modules
window.genericCardExtractor = new GenericCardExtractor();
