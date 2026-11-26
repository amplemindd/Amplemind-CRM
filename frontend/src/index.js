import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { UIProvider } from './components/UI';
import { AuthProvider } from './components/AuthContext';
import './index.css';
import './ui.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter><UIProvider><AuthProvider><App /></AuthProvider></UIProvider></BrowserRouter>
);
