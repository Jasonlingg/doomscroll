// DOM Adapters - Site-specific content extractors
// Fastest tier: Platform-specific DOM adapters

class DOMAdapters {
  constructor() {
    this.adapters = {
      'youtube.com': this.youtubeAdapter,
      'instagram.com': this.instagramAdapter,
      'x.com': this.twitterAdapter,
      'twitter.com': this.twitterAdapter,
      'tiktok.com': this.tiktokAdapter,
      'reddit.com': this.redditAdapter,
      'facebook.com': this.facebookAdapter,
      'linkedin.com': this.linkedinAdapter,
      'snapchat.com': this.snapchatAdapter
    };
  }

  // YouTube adapter
  youtubeAdapter() {
    const content = {
      title: '',
      description: '',
      channel: '',
      comments: [],
      type: 'video'
    };

    try {
      // Video title
      const titleSelectors = [
        'h1.ytd-video-primary-info-renderer',
        '#title h1 yt-formatted-string',
        'h1.title',
        '.ytd-video-primary-info-renderer h1'
      ];
      content.title = this.getFirstText(titleSelectors);

      // Video description
      const descSelectors = [
        '#description-text',
        '.ytd-video-secondary-info-renderer #content',
        '#content-text',
        '.ytd-video-secondary-info-renderer #description'
      ];
      content.description = this.getFirstText(descSelectors);

      // Channel name
      const channelSelectors = [
        '#channel-name a',
        '.ytd-channel-name a',
        '#owner-name a'
      ];
      content.channel = this.getFirstText(channelSelectors);

      // Comments (first few visible)
      const commentSelectors = [
        '.ytd-comment-thread-renderer #content-text',
        '.ytd-comment-renderer #content-text',
        '[id="content-text"]'
      ];
      content.comments = this.getMultipleText(commentSelectors, 3);

      // Detect if it's a Short
      if (window.location.pathname.includes('/shorts/') || 
          document.querySelector('[id*="shorts"]')) {
        content.type = 'short';
      }

    } catch (error) {
      console.warn('YouTube adapter error:', error);
    }

    return content;
  }

  // Instagram adapter
  instagramAdapter() {
    const content = {
      caption: '',
      username: '',
      comments: [],
      type: 'post'
    };

    try {
      // Post caption
      const captionSelectors = [
        'article header h1',
        'article div[role="button"] span',
        'article div[lang]',
        '[data-testid="post-comment"]'
      ];
      content.caption = this.getFirstText(captionSelectors);

      // Username
      const usernameSelectors = [
        'article header h2',
        'article header a',
        '[data-testid="post-comment"] a'
      ];
      content.username = this.getFirstText(usernameSelectors);

      // Comments
      const commentSelectors = [
        'article div[lang]',
        '.Comment',
        '[data-testid="post-comment"]'
      ];
      content.comments = this.getMultipleText(commentSelectors, 5);

      // Detect if it's a Reel
      if (document.querySelector('[role="main"] video') ||
          document.querySelector('video[playsinline]')) {
        content.type = 'reel';
      }

    } catch (error) {
      console.warn('Instagram adapter error:', error);
    }

    return content;
  }

  // Twitter/X adapter
  twitterAdapter() {
    const content = {
      tweet: '',
      username: '',
      replies: [],
      type: 'tweet'
    };

    try {
      // Tweet text
      const tweetSelectors = [
        '[data-testid="tweetText"]',
        'article div[lang]',
        '[data-testid="tweet"] div[lang]'
      ];
      content.tweet = this.getFirstText(tweetSelectors);

      // Username
      const usernameSelectors = [
        '[data-testid="User-Name"]',
        'article header a[role="link"]',
        '[data-testid="tweet"] a[role="link"]'
      ];
      content.username = this.getFirstText(usernameSelectors);

      // Replies
      const replySelectors = [
        '[data-testid="reply"]',
        '[data-testid="tweet"] div[lang]'
      ];
      content.replies = this.getMultipleText(replySelectors, 3);

    } catch (error) {
      console.warn('Twitter adapter error:', error);
    }

    return content;
  }

  // TikTok adapter
  tiktokAdapter() {
    const content = {
      description: '',
      username: '',
      comments: [],
      type: 'video'
    };

    try {
      // Video description
      const descSelectors = [
        '[data-e2e="browse-video-desc"]',
        '[data-e2e="video-desc"]',
        '[data-e2e="video-title"]'
      ];
      content.description = this.getFirstText(descSelectors);

      // Username
      const usernameSelectors = [
        '[data-e2e="user-title"]',
        '[data-e2e="browse-username"]'
      ];
      content.username = this.getFirstText(usernameSelectors);

      // Comments
      const commentSelectors = [
        '[data-e2e="comment-item"]',
        '.comment-item'
      ];
      content.comments = this.getMultipleText(commentSelectors, 3);

    } catch (error) {
      console.warn('TikTok adapter error:', error);
    }

    return content;
  }

  // Reddit adapter
  redditAdapter() {
    const content = {
      title: '',
      post: '',
      comments: [],
      type: 'post'
    };

    try {
      // Post title
      const titleSelectors = [
        '[data-test-id="post-content"] h1',
        'h1[data-test-id="post-content"]',
        '[data-testid="post-content"] h1'
      ];
      content.title = this.getFirstText(titleSelectors);

      // Post content
      const postSelectors = [
        '[data-test-id="post-content"]',
        '[data-testid="post-content"]',
        '.Comment'
      ];
      content.post = this.getFirstText(postSelectors);

      // Comments
      const commentSelectors = [
        '.Comment',
        '[data-testid="comment"]'
      ];
      content.comments = this.getMultipleText(commentSelectors, 5);

    } catch (error) {
      console.warn('Reddit adapter error:', error);
    }

    return content;
  }

  // Facebook adapter
  facebookAdapter() {
    const content = {
      post: '',
      username: '',
      comments: [],
      type: 'post'
    };

    try {
      // Post content
      const postSelectors = [
        '[data-pagelet="FeedUnit"]',
        'div[role="article"]',
        '[data-testid="post_message"]'
      ];
      content.post = this.getFirstText(postSelectors);

      // Username
      const usernameSelectors = [
        '[data-pagelet="FeedUnit"] a[role="link"]',
        'div[role="article"] a[role="link"]'
      ];
      content.username = this.getFirstText(usernameSelectors);

      // Comments
      const commentSelectors = [
        '[data-pagelet="FeedUnit"] div[role="article"]',
        'div[role="article"] div[role="article"]'
      ];
      content.comments = this.getMultipleText(commentSelectors, 3);

      // Detect if it's a video
      if (document.querySelector('[data-pagelet="VideoPlayer"]')) {
        content.type = 'video';
      }

    } catch (error) {
      console.warn('Facebook adapter error:', error);
    }

    return content;
  }

  // LinkedIn adapter
  linkedinAdapter() {
    const content = {
      post: '',
      author: '',
      comments: [],
      type: 'post'
    };

    try {
      // Post content
      const postSelectors = [
        'article div[lang]',
        '.feed-shared-text',
        '.feed-shared-inline-show-more-text'
      ];
      content.post = this.getFirstText(postSelectors);

      // Author
      const authorSelectors = [
        'article header a[role="link"]',
        '.feed-shared-actor__name'
      ];
      content.author = this.getFirstText(authorSelectors);

      // Comments
      const commentSelectors = [
        '.comments-comment-item-content',
        '.comment-item'
      ];
      content.comments = this.getMultipleText(commentSelectors, 3);

    } catch (error) {
      console.warn('LinkedIn adapter error:', error);
    }

    return content;
  }

  // Snapchat adapter
  snapchatAdapter() {
    const content = {
      story: '',
      username: '',
      type: 'story'
    };

    try {
      // Story content
      const storySelectors = [
        '[data-testid="story-text"]',
        '.story-text',
        '[data-e2e="story-text"]'
      ];
      content.story = this.getFirstText(storySelectors);

      // Username
      const usernameSelectors = [
        '[data-testid="username"]',
        '.username',
        '[data-e2e="username"]'
      ];
      content.username = this.getFirstText(usernameSelectors);

    } catch (error) {
      console.warn('Snapchat adapter error:', error);
    }

    return content;
  }

  // Helper methods
  getFirstText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const text = element.textContent.trim();
        if (text.length > 3) {
          return text;
        }
      }
    }
    return '';
  }

  getMultipleText(selectors, maxCount = 5) {
    const texts = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.length > 3 && !texts.includes(text)) {
            texts.push(text);
            if (texts.length >= maxCount) break;
          }
        }
      }
      if (texts.length >= maxCount) break;
    }
    return texts;
  }

  // Main extraction method
  extractContent(hostname) {
    const domain = hostname.replace('www.', '');
    
    for (const [siteDomain, adapter] of Object.entries(this.adapters)) {
      if (domain.includes(siteDomain)) {
        console.log(`🎯 Using ${siteDomain} adapter`);
        const content = adapter.call(this);
        console.log(`📊 ${siteDomain} content:`, content);
        return content;
      }
    }
    
    console.log('❌ No specific adapter found for:', hostname);
    return null;
  }
}

// Export for use in other modules
window.domAdapters = new DOMAdapters();
