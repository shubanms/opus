import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { db } from './db/db.js';
import useSettingsStore from './store/settingsStore.js';
import { applyTheme } from './utils/theme.js';
import { requestPersistence } from './utils/storage.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import MotionProvider from './motion/index.jsx';
import DbRecovery from './components/DbRecovery.jsx';
import './styles/tokens.css';
import './styles/animations.css';
import './index.css';

// Apply the saved theme before first paint, and follow the OS while on 'system'.
applyTheme(useSettingsStore.getState().theme);
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (useSettingsStore.getState().theme === 'system') applyTheme('system');
});

// Ask the browser not to evict our IndexedDB. There is no backend, so eviction
// would destroy the user's entire history. Fire-and-forget: it never prompts
// and never throws, and onboarding asks again once the user has engaged.
requestPersistence();

const root = ReactDOM.createRoot(document.getElementById('root'));

function renderApp() {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <MotionProvider>
          <RouterProvider router={router} />
        </MotionProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Open the database before mounting so a failed/blocked upgrade shows a
// recovery screen instead of a blank app with every query throwing.
db.open().then(renderApp).catch((err) => {
  console.error('OpusDB failed to open:', err);
  root.render(
    <React.StrictMode>
      <DbRecovery />
    </React.StrictMode>
  );
});
