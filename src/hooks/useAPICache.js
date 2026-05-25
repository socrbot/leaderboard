// src/hooks/useAPICache.js
import { useState, useEffect, useRef } from 'react';

const cache = new Map();
const pendingRequests = new Map();

// 5 minute default TTL — caller-side stale check; no setTimeout-per-entry, so we
// avoid an unbounded number of pending timers on long-lived pages.
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function readFreshCache(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export const useAPICache = (url, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortController = useRef(null);

  useEffect(() => {
    if (!url) return;

    const cacheKey = url + JSON.stringify(dependencies);
    
    // Return cached data immediately (if still fresh)
    const cached = readFreshCache(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      setLoading(false);
      return;
    }

    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      pendingRequests.get(cacheKey).then(result => {
        setData(result);
        setLoading(false);
      }).catch(err => {
        setError(err.message);
        setLoading(false);
      });
      return;
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await fetch(url, {
          signal: abortController.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Cache the result with TTL — checked lazily on read, no timers.
        cache.set(cacheKey, { value: result, expiresAt: Date.now() + DEFAULT_TTL_MS });

        pendingRequests.delete(cacheKey);
        return result;
      } catch (error) {
        pendingRequests.delete(cacheKey);
        throw error;
      }
    };

    const promise = fetchData();
    pendingRequests.set(cacheKey, promise);

    promise
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [url, dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
};
