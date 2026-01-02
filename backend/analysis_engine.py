import re
from typing import List, Tuple
from models import Analysis, AnalysisCreate, Content
from datetime import datetime

# Violence keywords
VIOLENCE_KEYWORDS = [
    "attack", "kill", "murder", "bomb", "explosion", "weapon", "gun", "knife", "stab",
    "shoot", "shooting", "riot", "violence", "violent", "assault", "terror", "terrorist",
    "massacre", "bloodshed", "warfare", "combat", "strike", "raid", "siege"
]

# Threat keywords
THREAT_KEYWORDS = [
    "threat", "threaten", "danger", "dangerous", "harm", "hurt", "destroy", "destruction",
    "attack", "eliminate", "target", "revenge", "retaliate", "retaliation", "warning",
    "ultimatum", "demand", "hostage", "kidnap"
]

# Hate keywords
HATE_KEYWORDS = [
    "hate", "hatred", "racist", "racism", "fascist", "extremist", "supremacist",
    "genocide", "ethnic cleansing", "discrimination", "bigot", "prejudice",
    "radical", "militant", "jihad", "crusade"
]

# Positive sentiment words
POSITIVE_WORDS = [
    "good", "great", "excellent", "wonderful", "fantastic", "amazing", "positive",
    "love", "beautiful", "happy", "joy", "peace", "harmony", "hope", "success"
]

# Negative sentiment words
NEGATIVE_WORDS = [
    "bad", "terrible", "awful", "horrible", "worst", "hate", "angry", "fear",
    "sad", "depressed", "negative", "crisis", "disaster", "failure", "death"
]

def normalize_text(text: str) -> str:
    """Normalize text for analysis"""
    return text.lower().strip()

def find_keywords(text: str, keywords: List[str]) -> Tuple[List[str], int]:
    """Find matching keywords in text and return count"""
    text_normalized = normalize_text(text)
    found = []
    for keyword in keywords:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
        matches = re.findall(pattern, text_normalized)
        if matches:
            found.extend([keyword] * len(matches))
    return list(set(found)), len(found)

def calculate_score(text: str, keywords: List[str], max_score: int = 100) -> Tuple[int, List[str]]:
    """Calculate risk score based on keyword matches"""
    found_keywords, count = find_keywords(text, keywords)
    # Score calculation: each keyword adds 10 points, capped at max_score
    score = min(count * 10, max_score)
    return score, found_keywords

def analyze_sentiment(text: str) -> str:
    """Analyze sentiment of text"""
    text_normalized = normalize_text(text)
    
    pos_count = sum(1 for word in POSITIVE_WORDS if word in text_normalized)
    neg_count = sum(1 for word in NEGATIVE_WORDS if word in text_normalized)
    
    if pos_count > neg_count:
        return "positive"
    elif neg_count > pos_count:
        return "negative"
    else:
        return "neutral"

def determine_risk_level(violence_score: int, threat_score: int, hate_score: int, high_threshold: int = 70, medium_threshold: int = 40) -> str:
    """Determine overall risk level"""
    max_score = max(violence_score, threat_score, hate_score)
    
    if max_score >= high_threshold:
        return "HIGH"
    elif max_score >= medium_threshold:
        return "MEDIUM"
    else:
        return "LOW"

def analyze_content(content: Content, high_threshold: int = 70, medium_threshold: int = 40) -> AnalysisCreate:
    """Analyze content and generate risk assessment"""
    text = content.text
    
    # Calculate scores
    violence_score, violence_keywords = calculate_score(text, VIOLENCE_KEYWORDS)
    threat_score, threat_keywords = calculate_score(text, THREAT_KEYWORDS)
    hate_score, hate_keywords = calculate_score(text, HATE_KEYWORDS)
    
    # Analyze sentiment
    sentiment = analyze_sentiment(text)
    
    # Determine risk level
    risk_level = determine_risk_level(violence_score, threat_score, hate_score, high_threshold, medium_threshold)
    
    # Combine all triggered keywords
    all_keywords = list(set(violence_keywords + threat_keywords + hate_keywords))
    
    # Generate explanation
    explanation_parts = []
    if violence_score > 0:
        explanation_parts.append(f"Violence indicators: {violence_score}/100")
    if threat_score > 0:
        explanation_parts.append(f"Threat indicators: {threat_score}/100")
    if hate_score > 0:
        explanation_parts.append(f"Hate indicators: {hate_score}/100")
    
    if not explanation_parts:
        explanation = "No significant risk indicators detected."
    else:
        explanation = ". ".join(explanation_parts) + f". Sentiment: {sentiment}."
    
    return AnalysisCreate(
        content_id=content.id,
        violence_score=violence_score,
        threat_score=threat_score,
        hate_score=hate_score,
        sentiment=sentiment,
        risk_level=risk_level,
        triggered_keywords=all_keywords,
        explanation=explanation
    )

async def update_keyword_lists(db, keywords_collection):
    """Update keyword lists from database"""
    global VIOLENCE_KEYWORDS, THREAT_KEYWORDS, HATE_KEYWORDS
    
    keywords = await keywords_collection.find({}, {"_id": 0}).to_list(1000)
    
    violence = [k["keyword"] for k in keywords if k["category"] == "violence"]
    threat = [k["keyword"] for k in keywords if k["category"] == "threat"]
    hate = [k["keyword"] for k in keywords if k["category"] == "hate"]
    
    if violence:
        VIOLENCE_KEYWORDS = violence
    if threat:
        THREAT_KEYWORDS = threat
    if hate:
        HATE_KEYWORDS = hate
