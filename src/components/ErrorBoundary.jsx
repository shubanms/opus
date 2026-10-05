import React from 'react';
import { useRouteError } from 'react-router-dom';

/** The one "something broke" screen, for render errors and route errors alike. */
export function ErrorScreen() {
  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center px-8 text-center"
      style={{ background: 'var(--color-chalk)' }}
    >
      <p className="font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Something broke
      </p>
      <p className="mt-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        An unexpected error occurred. Your data is safe.
      </p>
      <button
        type="button"
        onClick={() => window.location.assign(import.meta.env.BASE_URL)}
        className="mt-6 min-h-11 rounded-xl px-8 py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
      >
        Reload OPUS
      </button>
    </div>
  );
}

/**
 * `errorElement` for the router.
 *
 * React Router catches errors thrown while rendering a route *before* they can
 * reach the ErrorBoundary around the app, and without an `errorElement` it
 * shows its own developer page: "Unexpected Application Error!", a raw stack
 * trace, no navigation and no way back except killing the app. This is the
 * same calm screen the boundary shows, with the same way out.
 */
export function RouteError() {
  const error = useRouteError();
  React.useEffect(() => {
    console.error('Route error:', error);
  }, [error]);
  return <ErrorScreen />;
}

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorScreen />;
  }
}
