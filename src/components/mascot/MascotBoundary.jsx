import { Component } from 'react';

// Catches anything Magnus throws — a WebGL context that can't be created or is
// lost, a model that fails to load offline, the lazy chunk itself failing —
// and renders nothing in his place. He is decoration; nothing he does is worth
// the app-level error screen, which is what an uncaught error here used to be.
export default class MascotBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('Magnus could not be shown:', error?.message ?? error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
