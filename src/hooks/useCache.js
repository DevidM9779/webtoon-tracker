import { useRef, useCallback } from 'react';

// Simple in-memory cache implementation
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL

/**
 * Custom hook for caching data to reduce Firebase reads
 * @param {string} key - Unique cache key
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {object} Cache utilities: get, set, clear, clearAll
 */
export function useCache(key, ttl = CACHE_TTL) {
  const cacheKeyRef = useRef(key);

  const get = useCallback(() => {
    const cached = cache.get(cacheKeyRef.current);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }, [ttl]);

  const set = useCallback((data) => {
    cache.set(cacheKeyRef.current, {
      data,
      timestamp: Date.now()
    });
  }, []);

  const clear = useCallback(() => {
    cache.delete(cacheKeyRef.current);
  }, []);

  return { get, set, clear };
}

/**
 * Clear all cache entries
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Clear cache entries matching a pattern
 * @param {string} pattern - Pattern to match cache keys
 */
export function clearCachePattern(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}