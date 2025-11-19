import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

if (window.location.protocol === 'http:' && !isLocalhost) {
  const secureURL = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(secureURL);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);

