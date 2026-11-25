import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { UIProvider } from './components/UI';
import { AuthProvider } from './components/AuthContext';
import InstallApp from './components/InstallApp';
import './index.css';
import './ui.css';

createRoot(document.getElementById('root')).render(
  <>
    <HashRouter><UIProvider><AuthProvider><App /></AuthProvider></UIProvider></HashRouter>
    <InstallApp />
  </>
);

// App install (PWA) ke liye service worker. Sirf live (https) site par chalta hai.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/service-worker.js').catch(() => {}); });
}