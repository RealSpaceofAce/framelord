import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// TEMPORARILY DISABLED StrictMode to test BlockSuite slash menu
// StrictMode causes double-mount which can break BlockSuite initialization
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
