// src/hooks/useAPICache.js
import { useState, useEffect, useRef } from 'react';

const cache = new Map();
const pendingRequests = new Map();

export const useAPICache = (url, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortController = useRef(null);

  useEffect(() => {
    if (!url) return;

    const cacheKey = url + JSON.stringify(dependencies);
    
    // Return cached data immediately
    if (cache.has(cacheKey)) {
      setData(cache.get(cacheKey));
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
        
        // Cache the result with TTL (5 minutes)
        cache.set(cacheKey, result);
        setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
        
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
