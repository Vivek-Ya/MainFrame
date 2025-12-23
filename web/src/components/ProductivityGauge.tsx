import React from 'react'

type Props = {
  score: number
  breakdown: Record<string, number>
  icons?: Record<string, React.ReactNode>
}

export function ProductivityGauge({ score, breakdown, icons }: Props) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const segments = Array.from({ length: 12 }).map((_, idx) => idx)
  const pct = Math.min(score, 100)
  const danger = pct >= 90

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-md border border-[var(--border)] bg-[var(--panel-strong)]/80 p-3 shadow-inner clip-boost">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <span>Turbo meter</span>
          <span className={`${danger ? 'text-red-400 animate-pulse' : 'text-[var(--accent)]'}`}>{pct}%</span>
        </div>
        <div className="grid grid-cols-12 gap-1">
          {segments.map((s) => {
            const filled = pct >= ((s + 1) / segments.length) * 100
            return (
              <div
                key={s}
                className={`h-8 rounded-sm border border-[var(--border)] transition-all ${filled ? (danger ? 'bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_12px_rgba(248,113,113,0.55)]' : 'bg-gradient-to-b from-[var(--accent)] to-[var(--accent-2)] shadow-[0_0_12px_rgba(92,244,255,0.5)]') : 'bg-[var(--panel)]'}`}
              />
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm text-[var(--muted)]">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="holo-card px-3 py-2">
            <div className="flex items-center justify-between text-[var(--text)]">
              <div className="flex items-center gap-2">
                {icons?.[key]}
                <span className="capitalize">{key}</span>
              </div>
              <span className="text-[var(--accent)]">{((value / total) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
