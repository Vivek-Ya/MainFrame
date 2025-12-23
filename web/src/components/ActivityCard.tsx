import React from 'react'

type Props = {
  title: string
  value: number
  delta: string
  positive?: boolean
  accent: string
  icon?: React.ReactNode
}

export function ActivityCard({ title, value, delta, accent, icon, positive = true }: Props) {
  const formattedValue = new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value)

  return (
    <div className={`holo-card glitch-hover relative overflow-hidden p-5`}
      >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-15`} aria-hidden />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-2)] to-[var(--accent-3)]" aria-hidden />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">{title}</p>
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--panel-strong)]/70 text-[var(--accent)] shadow-inner">
            {icon}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <h3 className="font-display text-4xl text-[var(--text)] drop-shadow-lg">{formattedValue}</h3>
          <span className={`badge-shine rounded-md px-3 py-1 text-xs font-semibold ${positive ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--danger)]/20 text-[var(--danger)]'}`}>{delta}</span>
        </div>
      </div>
    </div>
  )
}
