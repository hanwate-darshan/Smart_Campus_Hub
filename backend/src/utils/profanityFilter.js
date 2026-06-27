// A basic list of profane/abusive words (English & Transliterated Hindi/Marathi)
// Used purely to prevent abusive language in complaints/comments.
const BANNED_WORDS = [
  "ass", "asshole", "bastard", "bitch", "bullshit", "crap", "cunt",
  "damn", "dick", "douche", "fag", "fuck", "fucker", "fucking",
  "idiot", "jerk", "motherfucker", "prick", "pussy", "shit", "shithead",
  "slut", "whore", "chutiya", "bc", "mc", "madarchod", "bhenchod",
  "gandu", "kamina", "harami", "kutta", "suar", "bhosadike"
];

const containsProfanity = (text) => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  // Remove punctuation and split by whitespace
  const words = lowerText.replace(/[^\w\s]/g, '').split(/\s+/);
  
  return words.some(word => BANNED_WORDS.includes(word));
};

const getProfanityMatches = (text) => {
  if (!text) return [];
  
  const lowerText = text.toLowerCase();
  const words = lowerText.replace(/[^\w\s]/g, '').split(/\s+/);
  
  return words.filter(word => BANNED_WORDS.includes(word));
};

module.exports = {
  containsProfanity,
  getProfanityMatches
};
