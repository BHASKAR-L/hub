const VIOLENCE_KEYWORDS = [
  "attack", "kill", "murder", "bomb", "explosion", "weapon", "gun", "knife", "stab",
  "shoot", "shooting", "riot", "violence", "violent", "assault", "terror", "terrorist",
  "massacre", "bloodshed", "warfare", "combat", "strike", "raid", "siege"
];

const THREAT_KEYWORDS = [
  "threat", "threaten", "danger", "dangerous", "harm", "hurt", "destroy", "destruction",
  "attack", "eliminate", "target", "revenge", "retaliate", "retaliation", "warning",
  "ultimatum", "demand", "hostage", "kidnap"
];

const HATE_KEYWORDS = [
  "hate", "hatred", "racist", "racism", "fascist", "extremist", "supremacist",
  "genocide", "ethnic cleansing", "discrimination", "bigot", "prejudice",
  "radical", "militant", "jihad", "crusade"
];

const POSITIVE_WORDS = [
  "good", "great", "excellent", "wonderful", "fantastic", "amazing", "positive",
  "love", "beautiful", "happy", "joy", "peace", "harmony", "hope", "success"
];

const NEGATIVE_WORDS = [
  "bad", "terrible", "awful", "horrible", "worst", "hate", "angry", "fear",
  "sad", "depressed", "negative", "crisis", "disaster", "failure", "death"
];

const normalizeText = (text) => {
  return text.toLowerCase().trim();
};

const findKeywords = (text, keywords) => {
  const textNormalized = normalizeText(text);
  const found = [];
  
  keywords.forEach(keyword => {
    // Use word boundaries to avoid partial matches
    const pattern = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
    const matches = textNormalized.match(pattern);
    if (matches) {
      matches.forEach(() => found.push(keyword));
    }
  });
  
  // Unique keywords found
  const uniqueFound = [...new Set(found)];
  return { found: uniqueFound, count: found.length };
};

const calculateScore = (text, keywords, maxScore = 100) => {
  const { found, count } = findKeywords(text, keywords);
  // Score calculation: each keyword adds 10 points, capped at maxScore
  const score = Math.min(count * 10, maxScore);
  return { score, foundKeywords: found };
};

const analyzeSentiment = (text) => {
  const textNormalized = normalizeText(text);
  
  let posCount = 0;
  POSITIVE_WORDS.forEach(word => {
    if (textNormalized.includes(word)) posCount++;
  });
  
  let negCount = 0;
  NEGATIVE_WORDS.forEach(word => {
    if (textNormalized.includes(word)) negCount++;
  });
  
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
};

const determineRiskLevel = (violenceScore, threatScore, hateScore, highThreshold = 70, mediumThreshold = 40) => {
  const maxScore = Math.max(violenceScore, threatScore, hateScore);
  
  if (maxScore >= highThreshold) return "HIGH";
  if (maxScore >= mediumThreshold) return "MEDIUM";
  return "LOW";
};

const analyzeContent = (text, highThreshold = 70, mediumThreshold = 40) => {
  const { score: violenceScore, foundKeywords: violenceKeywords } = calculateScore(text, VIOLENCE_KEYWORDS);
  const { score: threatScore, foundKeywords: threatKeywords } = calculateScore(text, THREAT_KEYWORDS);
  const { score: hateScore, foundKeywords: hateKeywords } = calculateScore(text, HATE_KEYWORDS);
  
  const sentiment = analyzeSentiment(text);
  const riskLevel = determineRiskLevel(violenceScore, threatScore, hateScore, highThreshold, mediumThreshold);
  
  const allKeywords = [...new Set([...violenceKeywords, ...threatKeywords, ...hateKeywords])];
  
  return {
    violence_score: violenceScore,
    threat_score: threatScore,
    hate_score: hateScore,
    sentiment,
    risk_level: riskLevel,
    triggered_keywords: allKeywords,
    explanation: `Detected ${allKeywords.length} keywords. Risk level: ${riskLevel}.`
  };
};

module.exports = {
  analyzeContent
};
