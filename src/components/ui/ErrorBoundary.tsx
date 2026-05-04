"use client";
import React, { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: '#991b1b',
            background: '#fee2e2',
            borderRadius: 12,
            margin: 20,
          }}>
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{
                marginTop: 16,
                padding: '8px 16px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}>
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Optional named export for compatibility with imports that expect a named export
export { ErrorBoundary };
export default ErrorBoundary;
