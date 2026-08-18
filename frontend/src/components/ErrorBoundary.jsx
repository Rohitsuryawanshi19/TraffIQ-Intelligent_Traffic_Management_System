import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ef4444' }}>⚠️ Runtime Component Error</h2>
          <p style={{ color: '#f8fafc', marginTop: '1rem' }}>{this.state.error?.toString()}</p>
          <pre style={{ background: '#020617', padding: '1rem', borderRadius: '6px', color: '#94a3b8', fontSize: '0.8rem', overflow: 'auto', marginTop: '1rem' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
