import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
        };
    }

    static getDerivedStateFromError() {
        return {
            hasError: true,
        };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
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
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
