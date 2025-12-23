import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: number; message: string; variant?: 'info' | 'success' | 'error' }

type ToastContextValue = {
  pushToast: (message: string, variant?: Toast['variant']) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback((message: string, variant: Toast['variant'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, variant }].slice(-4))
    setTimeout(() => {
      dismissToast(id)
    }, 3400)
  }, [dismissToast])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-[min(90vw,380px)] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            aria-live="assertive"
            className={`toast-card pointer-events-auto relative overflow-hidden rounded-2xl border px-4 py-3 text-sm shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_22px_55px_-18px_rgba(0,0,0,0.55)] ${toast.variant === 'error'
              ? 'border-[var(--danger)]/55 text-[var(--danger)]'
              : toast.variant === 'success'
                ? 'border-[var(--success)]/50 text-[var(--success)]'
                : 'border-[var(--accent)]/45 text-[var(--text)]'
            }`}
          >
            <span
              aria-hidden
              className={`absolute left-0 top-0 h-full w-1.5 ${toast.variant === 'error'
                ? 'bg-[var(--danger)]/85'
                : toast.variant === 'success'
                  ? 'bg-[var(--success)]/85'
                  : 'bg-[var(--accent)]/80'
              }`}
            />
            <div className="flex items-start gap-3 pl-2">
              <div className="flex-1 text-[var(--text)]">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="toast-close text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
