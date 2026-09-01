import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Dev-only console hook for testing the Vince trim module before its UI
// (Step 4) exists. Dynamically imported so ffmpeg.wasm is never pulled into
// any bundle outside of local dev. Not present in production builds.
if (import.meta.env.DEV) {
  import('./services/vince/trim').then((trim) => {
    (window as any).__trimDebug = trim;
    console.log('[VinceTrim] Debug API available at window.__trimDebug');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);