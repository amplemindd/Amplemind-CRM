import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { UIProvider } from './components/UI';
import { AuthProvider } from './components/AuthContext';
import './index.css';
import './ui.css';

createRoot(document.getElementById('root')).render(
  <HashRouter><UIProvider><AuthProvider><App /></AuthProvider></UIProvider></HashRouter>
);
