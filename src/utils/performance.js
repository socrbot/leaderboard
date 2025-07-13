// src/utils/performance.js
export const measurePerformance = {
  startTimer: (label) => {
    performance.mark(`${label}-start`);
  },
  
  endTimer: (label) => {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
    
    return measure.duration;
  },
  
  measureAPICall: async (url, options = {}) => {
    const start = performance.now();
    
    try {
      const response = await fetch(url, options);
      const end = performance.now();
      
      console.log(`API Call (${url}): ${(end - start).toFixed(2)}ms`);
      return response;
    } catch (error) {
      const end = performance.now();
      console.error(`API Call Failed (${url}): ${(end - start).toFixed(2)}ms`, error);
      throw error;
    }
  }
};
