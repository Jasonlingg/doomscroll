"""
Backend ML service: heuristic classifier for content analysis.
This will later be replaced with a Hugging Face model. For now, hf_ok=False.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class HeuristicClassifier:
    """Simple lexicon and rules based classifier.

    Notes:
        - Returns scroll_score mirroring doom_score for now
        - Sets hf_ok to False (placeholder for HF integration)
    """

    def __init__(self) -> None:
        self.model_version: str = "heuristic-1.0"
        self.sentiment_lexicon = {
            "positive": {"amazing", "awesome", "great", "love", "best", "excellent", "wonderful", "fantastic", "incredible", "perfect"},
            "negative": {"terrible", "awful", "hate", "worst", "horrible", "disgusting", "stupid", "annoying", "boring", "disappointing"},
        }
        self.content_type_keywords = {
            "news": {"breaking", "news", "report", "update", "alert", "announcement"},
            "entertainment": {"funny", "comedy", "joke", "meme", "viral", "trending"},
            "educational": {"learn", "tutorial", "how to", "explain", "guide", "lesson"},
            "promotional": {"sale", "discount", "offer", "deal", "promo", "advertisement"},
            "personal": {"my", "i", "me", "personal", "story", "experience"},
        }
        self.doom_keywords = {
            "high": {"addictive", "scrolling", "endless", "binge", "waste time", "procrastinate"},
            "medium": {"interesting", "engaging", "compelling", "fascinating"},
            "low": {"boring", "skip", "not interested", "irrelevant"},
        }

    def analyze_sentiment(self, text: Optional[str]) -> str:
        if not text:
            return "neutral"
        words = text.lower().split()
        pos = sum(1 for w in words if w in self.sentiment_lexicon["positive"])
        neg = sum(1 for w in words if w in self.sentiment_lexicon["negative"])
        if pos > neg:
            return "positive"
        if neg > pos:
            return "negative"
        return "neutral"

    def classify_content_type(self, text: Optional[str], hint: Optional[str]) -> str:
        if not text and hint:
            return hint
        if not text:
            return hint or "unknown"
        lowered = text.lower()
        for ctype, keywords in self.content_type_keywords.items():
            if any(k in lowered for k in keywords):
                return ctype
        return hint or "unknown"

    def calculate_doom_score(self, text: Optional[str], content_type: str, sentiment: str) -> float:
        if not text:
            return 0.5
        lowered = text.lower()
        score = 0.5
        if any(k in lowered for k in self.doom_keywords["high"]):
            score += 0.3
        if any(k in lowered for k in self.doom_keywords["medium"]):
            score += 0.1
        if any(k in lowered for k in self.doom_keywords["low"]):
            score -= 0.2

        if content_type in {"short", "reel"}:
            score += 0.2
        elif content_type == "news":
            score += 0.1
        elif content_type == "educational":
            score -= 0.1

        if sentiment == "positive":
            score += 0.1
        elif sentiment == "negative":
            score -= 0.1

        return max(0.0, min(1.0, score))

    def classify(self, *, visible_text: Optional[str], structured_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        structured_data = structured_data or {}
        hint = structured_data.get("content_type")
        sentiment = self.analyze_sentiment(visible_text)
        content_type = self.classify_content_type(visible_text, hint)
        doom_score = self.calculate_doom_score(visible_text, content_type, sentiment)
        doom_score = round(doom_score, 2)
        return {
            "sentiment": sentiment,
            "content_type": content_type,
            "doom_score": doom_score,
            "scroll_score": doom_score,
            "hf_ok": False,
            "model_version": self.model_version,
            "timestamp": __import__("time").time(),
        }


classifier = HeuristicClassifier()


def classify_content(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience wrapper to classify content from a generic payload.

    Expected keys:
        - visible_text: str | None
        - structured_data: dict | None
    """
    return classifier.classify(
        visible_text=payload.get("visible_text"),
        structured_data=payload.get("structured_data") or {},
    )


