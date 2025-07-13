// src/hooks/useBatchedAPI.js
import { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';

const requestQueue = [];
let batchTimeout = null;

const processBatch = async () => {
  if (requestQueue.length === 0) return;

  const batch = [...requestQueue];
  requestQueue.length = 0;

  try {
    // Send batched request to backend
    const response = await fetch(`${BACKEND_BASE_URL}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: batch.map(item => item.request) })
    });

    const results = await response.json();
    
    // Resolve all promises
    batch.forEach((item, index) => {
      if (results[index].error) {
        item.reject(new Error(results[index].error));
      } else {
        item.resolve(results[index].data);
      }
    });
  } catch (error) {
    batch.forEach(item => item.reject(error));
  }
};

export const useBatchedAPI = () => {
  const batchRequest = useCallback((endpoint, params = {}) => {
    return new Promise((resolve, reject) => {
      requestQueue.push({
        request: { endpoint, params },
        resolve,
        reject
      });

      // Clear existing timeout and set new one
      if (batchTimeout) clearTimeout(batchTimeout);
      batchTimeout = setTimeout(processBatch, 50); // Batch requests within 50ms
    });
  }, []);

  return { batchRequest };
};
