import { Component } from 'react'
import { logger } from '@/utils/logger'

const log = logger('ErrorBoundary')

/**
 * Generic React error boundary.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something broke</p>}>
 *     <WidgetThatMightCrash />
 *   </ErrorBoundary>
 *
 * Or with a render function:
 *   <ErrorBoundary fallback={(error, reset) => <button onClick={reset}>Retry</button>}>
 *
 * Props:
 *   fallback  — ReactNode or (error, resetFn) => ReactNode
 *   onError   — optional (error, errorInfo) => void callback for logging
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    log.error('Uncaught render error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset)
      }
      return fallback ?? (
        <div style={{ padding: 16, color: 'var(--c-danger)', fontSize: 13 }}>
          Something went wrong. <button onClick={this.reset} style={{ textDecoration: 'underline', color: 'inherit', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Lightweight inline error boundary for individual widgets/cards.
 * Shows a minimal fallback that doesn't break the surrounding layout.
 */
export function WidgetErrorBoundary({ children, name }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div style={{
          padding: '12px 16px', background: 'var(--bg2)', borderRadius: 'var(--r2)',
          border: '1px solid var(--c-danger)30', fontSize: 12, color: 'var(--tx3)',
        }}>
          <span style={{ color: 'var(--c-danger)', fontWeight: 500 }}>
            {name ?? 'Widget'} error
          </span>
          {' — '}
          <button onClick={reset} style={{
            color: 'var(--accent)', background: 'none', border: 'none',
            cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit',
          }}>
            retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
