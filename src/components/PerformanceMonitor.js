// src/components/PerformanceMonitor.js
import React, { useState, useEffect } from 'react';
import { measurePerformance } from '../utils/performance';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    apiCalls: [],
    renderTimes: [],
    cacheHits: 0,
    cacheMisses: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Monitor performance entries
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const newMetrics = { ...metrics };
      
      entries.forEach(entry => {
        if (entry.name.includes('api-call')) {
          newMetrics.apiCalls.push({
            name: entry.name,
            duration: entry.duration,
            timestamp: Date.now()
          });
        } else if (entry.name.includes('render')) {
          newMetrics.renderTimes.push({
            name: entry.name,
            duration: entry.duration,
            timestamp: Date.now()
          });
        }
      });
      
      // Keep only last 20 entries
      newMetrics.apiCalls = newMetrics.apiCalls.slice(-20);
      newMetrics.renderTimes = newMetrics.renderTimes.slice(-20);
      
      setMetrics(newMetrics);
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#006400',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer',
          zIndex: 9999
        }}
        title="Show Performance Monitor"
      >
        📊
      </button>
    );
  }

  const avgApiTime = metrics.apiCalls.length > 0 
    ? metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) / metrics.apiCalls.length 
    : 0;

  const avgRenderTime = metrics.renderTimes.length > 0
    ? metrics.renderTimes.reduce((sum, render) => sum + render.duration, 0) / metrics.renderTimes.length
    : 0;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '300px',
      backgroundColor: '#2a2a2a',
      border: '1px solid #555',
      borderRadius: '8px',
      padding: '15px',
      color: 'white',
      fontSize: '12px',
      zIndex: 9999,
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h4 style={{ margin: 0 }}>Performance Monitor</h4>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h5 style={{ margin: '0 0 5px 0', color: '#4CAF50' }}>Summary</h5>
        <div>Avg API Time: {avgApiTime.toFixed(2)}ms</div>
        <div>Avg Render Time: {avgRenderTime.toFixed(2)}ms</div>
        <div>Cache Hits: {metrics.cacheHits}</div>
        <div>Cache Misses: {metrics.cacheMisses}</div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h5 style={{ margin: '0 0 5px 0', color: '#2196F3' }}>Recent API Calls</h5>
        {metrics.apiCalls.slice(-5).map((call, index) => (
          <div key={index} style={{ marginBottom: '3px' }}>
            <div style={{ color: '#ccc' }}>{call.name.split('-')[0]}</div>
            <div>{call.duration.toFixed(2)}ms</div>
          </div>
        ))}
      </div>

      <div>
        <h5 style={{ margin: '0 0 5px 0', color: '#FF9800' }}>Recent Renders</h5>
        {metrics.renderTimes.slice(-5).map((render, index) => (
          <div key={index} style={{ marginBottom: '3px' }}>
            <div style={{ color: '#ccc' }}>{render.name}</div>
            <div>{render.duration.toFixed(2)}ms</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          performance.clearMeasures();
          setMetrics({
            apiCalls: [],
            renderTimes: [],
            cacheHits: 0,
            cacheMisses: 0
          });
        }}
        style={{
          marginTop: '10px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Clear Metrics
      </button>
    </div>
  );
};

export default PerformanceMonitor;
