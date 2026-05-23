import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
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
          onClick={() => window.location.assign(import.meta.env.BASE_URL)}
          className="mt-6 rounded-xl px-8 py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Reload OPUS
        </button>
      </div>
    );
  }
}
