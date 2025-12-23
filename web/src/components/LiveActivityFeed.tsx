import type { ActivityResponse } from '../api/types'

type Props = {
  items: ActivityResponse[]
  loading?: boolean
}

const typeLabel: Record<string, string> = {
  GITHUB_COMMITS: 'GitHub',
  STUDY: 'Study',
  GYM: 'Gym',
  LINKEDIN_POST: 'LinkedIn',
  DSA: 'DSA',
  CUSTOM: 'Custom',
}

export function LiveActivityFeed({ items, loading }: Props) {
  return (
    <section className="glass-panel rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Live feed</p>
          <h2 className="mt-1 text-xl font-semibold">Realtime updates</h2>
        </div>
        <span className={`flex h-3 w-3 ${loading ? 'animate-pulse' : ''} rounded-full bg-[var(--accent)] shadow-[0_0_0_6px_rgba(77,208,225,0.25)]`} />
      </div>
      <div className="mt-5 space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {loading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14 border border-[var(--border)] bg-[var(--panel)]" />
            ))}
          </>
        )}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel)] px-4 py-5 text-sm text-[var(--muted)]">
            No activity yet. Log something to see it here.
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="group flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 transition hover:-translate-y-[1px]">
            <div>
              <p className="text-sm">{item.description || item.type.replace('_', ' ')}</p>
              <p className="text-xs text-[var(--muted)]">{new Date(item.occurredAt).toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)] group-hover:text-[var(--accent)]">{typeLabel[item.type] ?? item.type}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
