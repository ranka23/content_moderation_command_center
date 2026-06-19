import React from 'react'
import { Icon } from '../../lib/icons'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary catches React component render errors and displays a
 * fallback UI instead of crashing the entire app.
 *
 * @param children  - Components to wrap with error protection.
 * @param fallback  - Optional custom fallback UI (defaults to a styled error card).
 * @param onError   - Optional callback for logging/reporting errors.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          role="alert"
          className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-8 tw-text-center"
          style={{
            minHeight: '200px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
          }}
        >
          <span style={{ fontSize: '40px', marginBottom: '12px' }}>
            <Icon name="warning" size={40} />
          </span>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              margin: '0 0 8px',
            }}
          >
            Something went wrong
          </h3>
          <p
            style={{
              fontSize: '13px',
              margin: '0 0 16px',
              color: '#b91c1c',
              maxWidth: '400px',
            }}
          >
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
