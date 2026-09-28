import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Stops a rendering bug in one page from blanking the whole app.
 * Render it with a `key` that changes on navigation so moving to another page clears the error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <section role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">This page hit an unexpected error. Try again, or go back to the catalog.</p>
        <div className="form-actions">
          <button type="button" onClick={() => this.setState({ error: null })}>Try again</button>
          <a href="/">Back to products</a>
        </div>
      </section>
    )
  }
}
