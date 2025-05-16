import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Check if there's an existing service worker
      const existingRegistration = await navigator.serviceWorker.getRegistration();
      
      if (existingRegistration) {
        // If there's an update, wait for it to be installed
        existingRegistration.addEventListener('updatefound', () => {
          const newWorker = existingRegistration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                console.log('New service worker installed, will activate on next load');
              }
            });
          }
        });
      } else {
        // Only register new service worker if none exists
        const registration = await navigator.serviceWorker.register('./sw.js', {
          type: 'module',
          scope: './'
        });
        console.log('SW registered: ', registration);
      }
    } catch (error) {
      console.error('SW registration failed: ', error);
    }
  });
} else {
  console.warn('Service workers are not supported in this browser');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 