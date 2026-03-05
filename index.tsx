import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { ToastProvider } from './components/ToastContext';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if the file exists first or handle 401 gracefully
    fetch('/sw.js').then(response => {
      if (response.status === 200) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('Service Worker registration failed: ', err);
        });
      } else {
        console.warn('Service Worker file not accessible (status: ' + response.status + ')');
      }
    }).catch(err => {
      console.error('Error checking Service Worker file: ', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);