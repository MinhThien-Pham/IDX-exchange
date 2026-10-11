import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error caught by boundary:', error, info);
  }
  render() {
    if (this.state.hasError)
      return (
        <main className="error-boundary">
          <div className="error-boundary-box">
            <h1>Something went wrong</h1>
            <p>Please refresh the page and try again.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
