import type { DashboardSummary } from '../api/types'

export function GoalProgress({ goals, loading = false }: { goals: DashboardSummary['goals']; loading?: boolean }) {
  if (loading) {
    return (
      <section className="holo-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goals</p>
            <h2 className="mt-1 text-xl font-semibold">Progress</h2>
          </div>
          <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">Loading…</span>
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 border border-[var(--border)] bg-[var(--panel)]" />
          ))}
        </div>
      </section>
    )
  }

  if (!goals?.length) {
    return (
      <section className="holo-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goals</p>
            <h2 className="mt-1 text-xl font-semibold">Progress</h2>
          </div>
          <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">No goals yet</span>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">Create goals to track weekly or monthly targets.</p>
      </section>
    )
  }

  return (
    <section className="holo-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goals</p>
          <h2 className="mt-1 text-xl font-semibold">Progress</h2>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {goals.map((goal) => (
          <div key={goal.id} className="glitch-hover rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium text-[var(--text)]">{(goal as any).name || goal.activityType.replace('_', ' ')} · {goal.period}</div>
              <div className="text-[var(--muted)]">
                {typeof goal.currentValue === 'number' ? goal.currentValue.toFixed(1) : '0.0'} / {typeof goal.targetValue === 'number' ? goal.targetValue.toFixed(1) : '0.0'}{(goal as any).unit ? ` ${(goal as any).unit}` : ''}
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--panel-strong)]">
              <div
                className="hp-bar h-full transition-all"
                style={{ width: `${Math.min(100, Math.round((goal.progress ?? 0) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
