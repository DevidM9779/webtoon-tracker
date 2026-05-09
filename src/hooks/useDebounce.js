import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Improved fuzzy matching function with scoring
export function fuzzyMatch(text, query) {
  if (!query) return true;
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Exact match gets highest priority
  if (lowerText === lowerQuery) return { match: true, score: 1.0 };
  
  // Starts with query gets high priority
  if (lowerText.startsWith(lowerQuery)) return { match: true, score: 0.9 };
  
  // Contains query gets medium priority
  if (lowerText.includes(lowerQuery)) return { match: true, score: 0.8 };
  
  // Fuzzy match - check if all characters in query exist in text in order
  let queryIndex = 0;
  let matchCount = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
      matchCount++;
    }
  }
  
  if (queryIndex === lowerQuery.length) {
    // Calculate score based on how compact the match is
    const score = 0.5 + (matchCount / lowerText.length) * 0.3;
    return { match: true, score };
  }
  
  return { match: false, score: 0 };
}

// Sort users by fuzzy match score
export function sortByFuzzyScore(users, query) {
  if (!query) return users;
  
  return users
    .map(user => ({
      ...user,
      score: fuzzyMatch(user.displayName, query).score
    }))
    .filter(user => user.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...user }) => user);
}