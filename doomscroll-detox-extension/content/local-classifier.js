// Local Classifier - Runs on-device analysis
// Sends only labels, not raw text (unless AI text analysis is enabled)

class LocalClassifier {
  constructor() {
    this.modelVersion = '1.0';
    this.init();
  }

  init() {
    // Simple lexicon-based classifier (can be replaced with tiny ML model later)
    this.sentimentLexicon = {
      positive: ['amazing', 'awesome', 'great', 'love', 'best', 'excellent', 'wonderful', 'fantastic', 'incredible', 'perfect'],
      negative: ['terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'stupid', 'annoying', 'boring', 'disappointing'],
      neutral: ['okay', 'fine', 'normal', 'average', 'standard', 'regular', 'typical', 'usual', 'common', 'basic']
    };

    this.contentTypeKeywords = {
      news: ['breaking', 'news', 'report', 'update', 'alert', 'announcement'],
      entertainment: ['funny', 'comedy', 'joke', 'meme', 'viral', 'trending'],
      educational: ['learn', 'tutorial', 'how to', 'explain', 'guide', 'lesson'],
      promotional: ['sale', 'discount', 'offer', 'deal', 'promo', 'advertisement'],
      personal: ['my', 'i', 'me', 'personal', 'story', 'experience']
    };

    this.doomScoreKeywords = {
      high: ['addictive', 'scrolling', 'endless', 'binge', 'waste time', 'procrastinate'],
      medium: ['interesting', 'engaging', 'compelling', 'fascinating'],
      low: ['boring', 'skip', 'not interested', 'irrelevant']
    };
  }

  // Analyze sentiment using simple lexicon
  analyzeSentiment(text) {
    if (!text || text.length === 0) return 'neutral';

    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      if (this.sentimentLexicon.positive.includes(word)) {
        positiveScore++;
      }
      if (this.sentimentLexicon.negative.includes(word)) {
        negativeScore++;
      }
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  // Classify content type
  classifyContentType(text, contentType) {
    if (!text) return contentType || 'unknown';

    const words = text.toLowerCase();
    
    for (const [type, keywords] of Object.entries(this.contentTypeKeywords)) {
      if (keywords.some(keyword => words.includes(keyword))) {
        return type;
      }
    }

    return contentType || 'unknown';
  }

  // Calculate doom score (likelihood of mindless scrolling)
  calculateDoomScore(text, contentType, sentiment) {
    if (!text) return 0.5; // Neutral score

    const words = text.toLowerCase();
    let score = 0.5; // Start neutral

    // High doom indicators
    if (this.doomScoreKeywords.high.some(keyword => words.includes(keyword))) {
      score += 0.3;
    }

    // Medium doom indicators
    if (this.doomScoreKeywords.medium.some(keyword => words.includes(keyword))) {
      score += 0.1;
    }

    // Low doom indicators
    if (this.doomScoreKeywords.low.some(keyword => words.includes(keyword))) {
      score -= 0.2;
    }

    // Content type adjustments
    switch (contentType) {
      case 'short':
      case 'reel':
        score += 0.2; // Short-form content is more addictive
        break;
      case 'news':
        score += 0.1; // News can be addictive
        break;
      case 'educational':
        score -= 0.1; // Educational content is less addictive
        break;
    }

    // Sentiment adjustments
    switch (sentiment) {
      case 'positive':
        score += 0.1; // Positive content can be more engaging
        break;
      case 'negative':
        score -= 0.1; // Negative content can be less engaging
        break;
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  // Main classification function
  classify(contentData) {
    const { visible_text, structured_data } = contentData;
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(visible_text);
    
    // Classify content type
    const contentType = this.classifyContentType(visible_text, structured_data.content_type);
    
    // Calculate doom score
    const doomScore = this.calculateDoomScore(visible_text, contentType, sentiment);

    return {
      sentiment,
      content_type: contentType,
      doom_score: Math.round(doomScore * 100) / 100, // Round to 2 decimal places
      model_version: this.modelVersion,
      timestamp: Date.now()
    };
  }

  // Check if AI text analysis is enabled
  async isAiTextAnalysisEnabled() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['ai_text_analysis_enabled'], (result) => {
        resolve(result.ai_text_analysis_enabled === true);
      });
    });
  }

  // Get analysis result (with or without text based on user preference)
  async analyze(contentData) {
    const classification = this.classify(contentData);
    const includeText = await this.isAiTextAnalysisEnabled();

    const result = {
      ...classification,
      url: contentData.url,
      hostname: contentData.hostname
    };

    // Only include text if user has explicitly enabled AI text analysis
    if (includeText) {
      result.visible_text = contentData.visible_text;
      result.structured_data = contentData.structured_data;
    }

    return result;
  }
}

// Export for use in other modules
window.localClassifier = new LocalClassifier();
