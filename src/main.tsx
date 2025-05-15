import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Registering service worker...');
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
        // Don't throw the error, just log it
      });
  });
} else {
  console.warn('Service workers are not supported in this browser');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 