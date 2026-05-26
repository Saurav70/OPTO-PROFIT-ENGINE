import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '3rem',
          textAlign: 'center',
          gap: '1.5rem',
          background: 'var(--card-bg, #f8fafc)',
          borderRadius: '16px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <AlertTriangle size={28} color="#ef4444" />
          </div>

          <div>
            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 900,
              color: 'var(--text-main, #1e293b)',
              letterSpacing: '2px',
              margin: '0 0 0.5rem 0',
            }}>
              MODULE ERROR
            </h2>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-sub, #64748b)',
              margin: 0,
              maxWidth: '400px',
              lineHeight: 1.6,
            }}>
              An unexpected error occurred in this module. This won&apos;t affect your saved data.
            </p>
          </div>

          {/* P2-4: Only show raw error details in development mode */}
          {import.meta.env.DEV && this.state.error && (
            <div
              style={{
                background: 'var(--bg-tertiary, #1e293b)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1.2rem',
                maxHeight: '160px',
                overflowY: 'auto',
              }}
            >
              <pre style={{ margin: 0, fontSize: '0.72rem', color: 'var(--accent-danger, #ef4444)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {this.state.error.toString()}
              </pre>
            </div>
          )}

          <button
            onClick={this.handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.7rem 1.5rem',
              background: 'var(--accent-primary, #0d9488)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={16} />
            RETRY MODULE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
