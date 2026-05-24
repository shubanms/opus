import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { db } from './db/db.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import DbRecovery from './components/DbRecovery.jsx';
import './styles/tokens.css';
import './styles/animations.css';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

function renderApp() {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <RouterProvider router={router} />
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
