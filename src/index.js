import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for caching (only in production)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    // First unregister any existing service workers to prevent conflicts
    navigator.serviceWorker.getRegistrations()
      .then(registrations => {
        // Unregister all existing service workers
        return Promise.all(registrations.map(reg => {
          console.log('Unregistering old service worker');
          return reg.unregister();
        }));
      })
      .then(() => {
        // Now register the new service worker
        return navigator.serviceWorker.register('/sw.js');
      })
      .then(registration => {
        console.log('SW registered successfully:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found, installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('New service worker activated');
              // Reload page to use new service worker
              if (navigator.serviceWorker.controller) {
                console.log('Reloading to use new service worker');
                window.location.reload();
              }
            }
          });
        });
        
        // Check for updates on page focus (when user returns to tab)
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && registration) {
            registration.update();
          }
        });
      })
      .catch(error => {
        console.error('SW registration failed:', error);
        // Clear any corrupted caches if registration fails
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              console.log('Clearing cache:', name);
              caches.delete(name);
            });
          });
        }
      });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
