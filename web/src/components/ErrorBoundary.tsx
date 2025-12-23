import React from 'react'

type State = { hasError: boolean; message?: string }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="theme-night min-h-screen bg-black text-red-100 flex items-center justify-center p-6">
          <div className="max-w-lg rounded-2xl border border-red-500/40 bg-red-900/30 p-5 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-red-200">UI Error</p>
            <h1 className="mt-2 text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-red-200/80">{this.state.message ?? 'Check console for details.'}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
