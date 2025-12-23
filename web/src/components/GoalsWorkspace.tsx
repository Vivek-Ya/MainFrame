import React, { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, CalendarDays, Plus, Target, X as Close } from 'lucide-react'
import type { ActivityType, Goal, GoalHistoryEntry, GoalPeriod, RpgStat } from '../api/types'

export type GoalPayload = {
  name: string
  activityType: ActivityType
  period: GoalPeriod
  targetValue: number
  unit?: string | null
  customPeriodDays?: number | null
  startDate?: string | null
  endDate?: string | null
  rpgStat?: RpgStat | null
}

export type GoalsWorkspaceProps = {
  open: boolean
  goals: Goal[]
  histories: Record<number, GoalHistoryEntry[]>
  onCreateGoal: (payload: GoalPayload) => Promise<Goal | void>
  onDeleteGoal: (id: number) => Promise<void>
  onClose: () => void
  onSelectGoal?: (goalId: number) => void
  selectedGoalId?: number | null
  todayKey?: string
}

type ViewMode = 'DAILY' | 'WEEKLY' | 'MONTHLY'

type ChartPoint = { label: string; value: number }

const activityOptions: { label: string; value: ActivityType }[] = [
  { label: 'GitHub Commit', value: 'GITHUB_COMMITS' },
  { label: 'Study Hour', value: 'STUDY' },
  { label: 'Gym Session', value: 'GYM' },
  { label: 'LinkedIn Post', value: 'LINKEDIN_POST' },
  { label: 'DSA Problem', value: 'DSA' },
  { label: 'Custom', value: 'CUSTOM' },
]

const defaultStatByType: Record<ActivityType, RpgStat> = {
  GITHUB_COMMITS: 'DEX',
  STUDY: 'INT',
  GYM: 'STR',
  LINKEDIN_POST: 'CHA',
  DSA: 'WIS',
  CUSTOM: 'VIT',
}

function isoWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function groupHistory(history: GoalHistoryEntry[], mode: ViewMode): ChartPoint[] {
  if (!history.length) return []
  const buckets = new Map<string, number>()
  history.forEach((entry) => {
    const date = new Date(entry.date)
    const key = (() => {
      if (mode === 'DAILY') return entry.date.slice(5)
      if (mode === 'MONTHLY') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const week = isoWeek(date)
      return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
    })()
    buckets.set(key, (buckets.get(key) ?? 0) + entry.value)
  })
  return Array.from(buckets.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function fallbackHistory(): ChartPoint[] {
  return []
}

const goalBadgeTiers = [
  { key: 'bronze', label: 'Bronze', threshold: 25 },
  { key: 'silver', label: 'Silver', threshold: 50 },
  { key: 'gold', label: 'Gold', threshold: 100 },
]

export function GoalsWorkspace({
  open,
  goals,
  histories,
  onCreateGoal,
  onDeleteGoal,
  onClose,
  onSelectGoal,
  selectedGoalId,
  todayKey,
}: GoalsWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('DAILY')
  const blankForm: GoalPayload = { name: '', activityType: 'CUSTOM', period: 'WEEKLY', targetValue: 0, unit: '', customPeriodDays: null, startDate: '', endDate: '', rpgStat: null }
  const [form, setForm] = useState<GoalPayload>(blankForm)
  const [activityInput, setActivityInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(selectedGoalId ?? null)

  useEffect(() => {
    if (open && goals.length && !selectedId) {
      setSelectedId(selectedGoalId ?? goals[0].id)
    }
  }, [open, goals, selectedGoalId, selectedId])

  useEffect(() => {
    if (selectedGoalId) setSelectedId(selectedGoalId)
  }, [selectedGoalId])

  const selectedGoal = useMemo(() => goals.find((g) => g.id === selectedId) ?? goals[0] ?? null, [goals, selectedId])
  const selectedHistory = useMemo(() => {
    if (!selectedGoal) return [] as GoalHistoryEntry[]
    return [...(histories[selectedGoal.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  }, [histories, selectedGoal])

  const groupedHistory = useMemo(() => ({
    DAILY: groupHistory(selectedHistory, 'DAILY'),
    WEEKLY: groupHistory(selectedHistory, 'WEEKLY'),
    MONTHLY: groupHistory(selectedHistory, 'MONTHLY'),
  }), [selectedHistory])

  const chartData = groupedHistory[viewMode].length ? groupedHistory[viewMode] : fallbackHistory()

  const rollups = useMemo(() => {
    const sum = (points: ChartPoint[]) => points.reduce((acc, p) => acc + p.value, 0)
    const avg = (points: ChartPoint[]) => (points.length ? sum(points) / points.length : 0)
    return {
      daily: { total: sum(groupedHistory.DAILY), avg: avg(groupedHistory.DAILY), max: Math.max(0, ...groupedHistory.DAILY.map((p) => p.value)) },
      weekly: { total: sum(groupedHistory.WEEKLY), avg: avg(groupedHistory.WEEKLY), max: Math.max(0, ...groupedHistory.WEEKLY.map((p) => p.value)) },
      monthly: { total: sum(groupedHistory.MONTHLY), avg: avg(groupedHistory.MONTHLY), max: Math.max(0, ...groupedHistory.MONTHLY.map((p) => p.value)) },
    }
  }, [groupedHistory])

  const completion = useMemo(() => {
    if (!selectedGoal?.targetValue) return 0
    return Math.min(100, Math.round(((selectedGoal.currentValue ?? 0) / selectedGoal.targetValue) * 100))
  }, [selectedGoal])

  const lastLogged = selectedHistory.at(-1)?.date ?? '—'

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      if ((form.targetValue ?? 0) <= 0) {
        throw new Error('Target must be greater than zero.')
      }
      if (form.period === 'CUSTOM' && (!form.customPeriodDays || form.customPeriodDays <= 0.5)) {
        throw new Error('Custom period must be greater than 0.5 days.')
      }
      const trimmedActivity = activityInput.trim()
      const suggestion = activityOptions.find((opt) => opt.label.toLowerCase() === trimmedActivity.toLowerCase() || opt.value === form.activityType)
      const activityType = suggestion ? suggestion.value : (trimmedActivity as ActivityType) || 'CUSTOM'
      const rpgStat = form.rpgStat || defaultStatByType[activityType]
      const saved = await onCreateGoal({
        name: form.name || trimmedActivity || 'My goal',
        activityType,
        period: form.period,
        targetValue: form.targetValue ?? 0,
        unit: form.unit,
        customPeriodDays: form.period === 'CUSTOM' ? form.customPeriodDays ?? undefined : undefined,
        rpgStat,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      })
      if (saved?.id) setSelectedId(saved.id)
      setActivityInput('')
      setForm(blankForm)
    } finally {
      setSaving(false)
    }
  }

  const handleSelectGoal = (id: number) => {
    setSelectedId(id)
    onSelectGoal?.(id)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 overflow-y-auto p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">Goals workspace</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">Plan, review, and add goals</h2>
            <p className="text-sm text-[var(--muted)]">Switch between daily, weekly, and monthly views to see momentum.</p>
          </div>
          <button className="rounded-full border border-[var(--border)] bg-[var(--panel)] p-2 text-[var(--text)] transition hover:text-[var(--accent)]" onClick={onClose} aria-label="Close goals workspace">
            <Close className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_1.35fr]">
          <div className="space-y-4">
            <section className="glass-panel rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">All goals</p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Your targets</h3>
                </div>
                <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">{goals.length} total</span>
              </div>
              <div className="mt-4 space-y-3">
                {goals.length === 0 && <p className="text-sm text-[var(--muted)]">No goals yet. Create one to start tracking.</p>}
                {goals.map((goal) => {
                  const target = goal.targetValue ?? 0
                  const current = goal.currentValue ?? 0
                  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
                  const isActive = goal.id === selectedGoal?.id
                  const history = histories[goal.id] ?? []
                  let streak = 0
                  for (let i = history.length - 1; i >= 0; i -= 1) {
                    if (history[i].value > 0) streak += 1
                    else break
                  }
                  return (
                    <button
                      key={goal.id}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${isActive ? 'border-[var(--accent)] bg-[var(--panel)] shadow-lg' : 'border-[var(--border)] bg-[var(--panel-strong)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]'}`}
                      onClick={() => handleSelectGoal(goal.id)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{goal.name || goal.activityType.replace('_', ' ')}</p>
                        <p className="text-xs text-[var(--muted)]">{goal.activityType.replace('_', ' ')} • {goal.period} • Target {target} • Current {current}</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--panel)]">
                          <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                          {goalBadgeTiers.map((tier) => (
                            <span
                              key={`${goal.id}-${tier.key}`}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${pct >= tier.threshold ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)]'}`}
                            >
                              {tier.label} {tier.threshold}%
                            </span>
                          ))}
                          {[7, 21, 90].map((threshold) => (
                            <span
                              key={`${goal.id}-streak-${threshold}`}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${streak >= threshold ? 'border-[var(--accent-2)] text-[var(--accent-2)]' : 'border-[var(--border)]'}`}
                            >
                              {threshold}d streak
                            </span>
                          ))}
                          <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2 py-1">Streak {streak}d</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-xs">
                        <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-[var(--muted)]">{pct}%</span>
                        <button
                          className="text-[var(--danger)] underline-offset-4 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            void onDeleteGoal(goal.id)
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="glass-panel rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Add goal</p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">New target</h3>
                </div>
                <Plus className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <form className="mt-3 grid gap-4 sm:grid-cols-2" onSubmit={handleCreateGoal}>
                <label className="text-sm text-[var(--muted)] sm:col-span-2">
                  Name
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:placeholder-transparent"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={120}
                    required
                    placeholder="e.g. 3 GitHub commits"
                  />
                </label>
                <label className="text-sm text-[var(--muted)] sm:col-span-2">
                  Activity (type anything)
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:placeholder-transparent"
                    value={activityInput}
                    onChange={(e) => setActivityInput(e.target.value)}
                    placeholder="Deep Work, Underwater Hockey"
                    required
                  />
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                    {activityOptions
                      .filter((opt) => opt.label.toLowerCase().includes(activityInput.trim().toLowerCase()) || activityInput.trim() === '')
                      .slice(0, 4)
                      .map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[var(--text)] hover:text-[var(--accent)]"
                          onClick={() => {
                            setActivityInput(opt.label)
                            setForm({ ...form, activityType: opt.value })
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    {activityInput.trim() && (
                      <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1">Create “{activityInput.trim()}”</span>
                    )}
                  </div>
                </label>
                <label className="text-sm text-[var(--muted)]">
                  Period
                  <select
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value as GoalPeriod })}
                  >
                    {['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'].map((p) => (
                      <option key={p} value={p}>
                        {p === 'CUSTOM' ? 'Custom (enter days)' : p}
                      </option>
                    ))}
                  </select>
                  {form.period === 'CUSTOM' && (
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        className="w-40 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                        placeholder="Days"
                        value={form.customPeriodDays ?? ''}
                        onChange={(e) => setForm({ ...form, customPeriodDays: e.target.value ? Number(e.target.value) : null })}
                      />
                      <span className="text-xs text-[var(--muted)]">e.g. 4.5 for every 4.5 days</span>
                    </div>
                  )}
                </label>
                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                  <label className="text-sm text-[var(--muted)]">
                    Target value
                    <input
                      type="number"
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      value={form.targetValue ?? ''}
                      onChange={(e) => setForm({ ...form, targetValue: e.target.value ? Number(e.target.value) : 0 })}
                      required
                      min={0}
                      step={0.5}
                      placeholder="e.g. 5"
                    />
                  </label>
                  <label className="text-sm text-[var(--muted)]">
                    Unit
                    <input
                      type="text"
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:placeholder-transparent"
                      value={form.unit ?? ''}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      maxLength={32}
                      placeholder="mins, pages, km"
                    />
                  </label>
                  <label className="text-sm text-[var(--muted)]">
                    RPG stat
                    <select
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-3 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      value={form.rpgStat ?? defaultStatByType[form.activityType]}
                      onChange={(e) => setForm({ ...form, rpgStat: e.target.value as RpgStat })}
                    >
                      {(['STR', 'DEX', 'INT', 'WIS', 'CHA', 'VIT'] as RpgStat[]).map((stat) => (
                        <option key={stat} value={stat}>
                          {stat === 'STR' ? 'Strength' : stat === 'DEX' ? 'Dexterity' : stat === 'INT' ? 'Intelligence' : stat === 'WIS' ? 'Wisdom' : stat === 'CHA' ? 'Charisma' : 'Vitality'} ({stat})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="text-sm text-[var(--muted)]">
                  Start date
                  <input
                    type="date"
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    value={form.startDate ?? ''}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                    <button type="button" className="rounded-full border border-[var(--border)] px-3 py-1" onClick={() => setForm({ ...form, startDate: new Date().toISOString().slice(0, 10) })}>
                      Today
                    </button>
                    <button type="button" className="rounded-full border border-[var(--border)] px-3 py-1" onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 1)
                      setForm({ ...form, startDate: d.toISOString().slice(0, 10) })
                    }}>
                      Tomorrow
                    </button>
                    <button type="button" className="rounded-full border border-[var(--border)] px-3 py-1" onClick={() => setForm({ ...form, startDate: '' })}>
                      Clear
                    </button>
                  </div>
                </label>
                <label className="text-sm text-[var(--muted)]">
                  End date
                  <input
                    type="date"
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    value={form.endDate ?? ''}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </label>
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-royal btn-shimmer w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60" disabled={saving}>
                    {saving ? 'Saving…' : 'Save goal'}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <section className="glass-panel rounded-3xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goal details</p>
                <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{selectedGoal ? selectedGoal.name || selectedGoal.activityType.replace('_', ' ') : 'Select a goal'}</h3>
                <p className="text-xs text-[var(--muted)]">{selectedGoal ? `${selectedGoal.activityType.replace('_', ' ')} • ${selectedGoal.period} target • last logged ${lastLogged}` : 'Pick a goal from the list.'}</p>
              </div>
              <div className="flex items-center gap-2">
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`rounded-full px-3 py-1 text-xs transition ${viewMode === mode ? 'border border-[var(--accent)] bg-[var(--panel)] text-[var(--accent)] shadow-sm' : 'border border-[var(--border)] bg-[var(--panel-strong)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                <p className="text-xs text-[var(--muted)]">Progress</p>
                <p className="text-2xl font-semibold text-[var(--text)]">{completion}%</p>
                <p className="text-xs text-[var(--muted)]">{selectedGoal ? `${selectedGoal.currentValue ?? 0} / ${selectedGoal.targetValue ?? 0}` : '—'}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                <p className="text-xs text-[var(--muted)]">Daily avg</p>
                <p className="text-2xl font-semibold text-[var(--text)]">{rollups.daily.avg.toFixed(1)}</p>
                <p className="text-xs text-[var(--muted)]">Total {rollups.daily.total.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                <p className="text-xs text-[var(--muted)]">Weekly pace</p>
                <p className="text-2xl font-semibold text-[var(--text)]">{rollups.weekly.avg.toFixed(1)}</p>
                <p className="text-xs text-[var(--muted)]">Peak {rollups.weekly.max.toFixed(1)}</p>
              </div>
            </div>

            <div className="mt-4 h-64 w-full">
              {selectedGoal ? (
                chartData.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
                      <defs>
                        <linearGradient id="goalws" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--accent-2)" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} stroke="var(--muted)" />
                      <YAxis tickLine={false} axisLine={false} stroke="var(--muted)" width={32} />
                      <Tooltip
                        cursor={{ stroke: 'var(--accent)', strokeWidth: 1, opacity: 0.35 }}
                        contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        labelStyle={{ color: 'var(--muted)' }}
                        formatter={(value: number) => [value, viewMode === 'DAILY' ? 'Value' : 'Total']}
                      />
                      <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#goalws)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="dotted-grid flex h-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-center text-sm text-[var(--muted)]">
                    <div className="space-y-1">
                      <p>No data yet for this goal.</p>
                      <p className="text-xs">Log an activity to see this chart move.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="dotted-grid flex h-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-center text-sm text-[var(--muted)]">
                  <div className="space-y-1">
                    <p>Select a goal to preview its cadence.</p>
                    <p className="text-xs">The dotted grid will animate once data is flowing.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                  <Target className="h-4 w-4 text-[var(--accent)]" />
                  {selectedGoal ? `${selectedGoal.period} objective` : 'No goal selected'}
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {selectedGoal
                    ? `You are ${completion}% toward your ${selectedGoal.period.toLowerCase()} target. Keep logging to stay above your pace.`
                    : 'Pick a goal to see narrative insights.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1">Last log: {lastLogged}</span>
                  <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1">Today: {todayKey ?? '—'}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                  <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
                  Period breakdown
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                  <li>Daily: avg {rollups.daily.avg.toFixed(1)} • best {rollups.daily.max.toFixed(1)}</li>
                  <li>Weekly: avg {rollups.weekly.avg.toFixed(1)} • best {rollups.weekly.max.toFixed(1)}</li>
                  <li>Monthly: avg {rollups.monthly.avg.toFixed(1)} • best {rollups.monthly.max.toFixed(1)}</li>
                </ul>
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                  <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
                  {selectedGoal ? `${selectedGoal.startDate || 'No start'} → ${selectedGoal.endDate || 'Open-ended'}` : 'Set a start and end date for sharper pacing.'}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
