import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Admin from './Admin';
import './style.css';

const isAdminPage = window.location.pathname.replace(/\/+$/, '') === '/admin';

createRoot(document.getElementById('root')).render(
  isAdminPage ? <Admin /> : <App />
);
