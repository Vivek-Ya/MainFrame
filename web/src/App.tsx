import React, { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Activity as Pulse, Brain, Dumbbell, BookOpen, TrendingUp, ShieldCheck, Sparkles, X, Github } from 'lucide-react'
import clsx from 'clsx'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Switch } from './components/Switch'
import { ProductivityGauge } from './components/ProductivityGauge'
import { LiveActivityFeed } from './components/LiveActivityFeed'
import { GoalProgress } from './components/GoalProgress'
import { GoalsWorkspace } from './components/GoalsWorkspace'
import { BackgroundEffects } from './components/BackgroundEffects'
import { UserStatusCluster } from './components/UserStatusCluster'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import {
  createActivity,
  fetchActivityFeed,
  fetchDashboard,
  connectLive,
  setToken,
  loginEmail,
  startGoogleLogin,
  fetchGoals,
  upsertGoal,
  deleteGoal,
  fetchGoalHistory,
  setGoalProgress,
  fetchLeaderboard,
  fetchAchievements,
  signupEmail,
  fetchProfile,
  setUnauthorizedHandler,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
  checkHealth,
} from './api/client'
import type { ActivityRequest, ActivityResponse, ActivityType, DashboardSummary, Goal, LeaderboardEntry, Achievement, GoalPeriod, Profile, GoalHistoryEntry, UpdateProfilePayload, RpgStat } from './api/types'
import { LoginPage } from './components/LoginPage'
import { useToast } from './components/Toast'
const TrendChartLazy = React.lazy(async () => ({ default: (await import('./components/Charts')).TrendChart }))
const ProductivityRadialLazy = React.lazy(async () => ({ default: (await import('./components/Charts')).ProductivityRadial }))
const PillarsRadarLazy = React.lazy(async () => ({ default: (await import('./components/Charts')).PillarsRadar }))

const EMAIL_FEATURE_ENABLED = false

function GoalSparkline({ data }: { data: { label: string; value: number }[] }) {
  const gradientId = useId()
  return (
    <div className="h-28 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
          <defs>
            <linearGradient id={`goalSpark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--accent-2)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={4} stroke="var(--muted)" />
          <Tooltip
            cursor={{ stroke: 'var(--accent)', strokeWidth: 1, opacity: 0.35 }}
            contentStyle={{ background: 'var(--panel-strong)', border: `1px solid var(--border)`, color: 'var(--text)' }}
            labelStyle={{ color: 'var(--muted)' }}
            formatter={(value: number) => [value.toLocaleString('en-US'), 'Value']}
          />
          <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill={`url(#goalSpark-${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

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

const canonicalActivityTypes: ActivityType[] = ['GITHUB_COMMITS', 'STUDY', 'GYM', 'LINKEDIN_POST', 'DSA', 'CUSTOM']

const normalizeActivitySelection = (type: ActivityType) => {
  if (canonicalActivityTypes.includes(type)) {
    return { type, customLabel: null as string | null }
  }
  return { type: 'CUSTOM' as ActivityType, customLabel: type as string }
}

const fuzzyScore = (input: string, target: string) => {
  const a = input.toLowerCase()
  const b = target.toLowerCase()
  if (!a || !b) return 0
  if (b.includes(a)) return a.length / b.length
  let score = 0
  let ai = 0
  for (let bi = 0; bi < b.length && ai < a.length; bi += 1) {
    if (a[ai] === b[bi]) {
      score += 1
      ai += 1
    }
  }
  return score / b.length
}

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type OnboardingState = { dismissed: boolean; openedWorkspace: boolean }

const defaultOnboardingState: OnboardingState = { dismissed: false, openedWorkspace: false }

function App() {
  const [darkMode, setDarkMode] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'goals'>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [feed, setFeed] = useState<ActivityResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [liveConnected, setLiveConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [token, setTokenState] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('lifedash_token') : null)
  const [form, setForm] = useState<ActivityRequest>({
    type: 'GITHUB_COMMITS',
    rpgStat: defaultStatByType.GITHUB_COMMITS,
    value: null,
    description: '',
    metadata: '',
    occurredAt: '',
    platform: '',
  })
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalHistories, setGoalHistories] = useState<Record<number, GoalHistoryEntry[]>>({})
  const [favoriteGoalIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('goalFavorites')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [recentActivities, setRecentActivities] = useState<ActivityType[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('recentActivities')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [dailyGoalChecks, setDailyGoalChecks] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem('goalTicks') || '{}')
    } catch {
      return {}
    }
  })
  const [backfillGoalId, setBackfillGoalId] = useState<number | null>(null)
  const [backfillDate, setBackfillDate] = useState<string>('')
  const [backfillValue, setBackfillValue] = useState<number>(1)
  const [backfillSaving, setBackfillSaving] = useState(false)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [goalEntryValues, setGoalEntryValues] = useState<Record<number, number>>({})
  const [goalHistoryLoading, setGoalHistoryLoading] = useState(false)
  const [goalsWorkspaceOpen, setGoalsWorkspaceOpen] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null)
  const [nudgeShown, setNudgeShown] = useState(false)
  const resolveTz = () => (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC')
  const [quietStart, setQuietStart] = useState(() => {
    if (typeof window === 'undefined') return '22:00'
    const stored = localStorage.getItem('quietStart')
    return stored || '22:00'
  })
  const [quietEnd, setQuietEnd] = useState(() => {
    if (typeof window === 'undefined') return '07:00'
    const stored = localStorage.getItem('quietEnd')
    return stored || '07:00'
  })
  const [quietTimezone, setQuietTimezone] = useState(() => {
    if (typeof window === 'undefined') return resolveTz()
    const stored = localStorage.getItem('quietTimezone')
    return stored || resolveTz()
  })
  const [tickDialog, setTickDialog] = useState<{ goalId: number; label: string } | null>(null)
  const [tickValue, setTickValue] = useState('1')
  const [tickNote, setTickNote] = useState('')
  const [startDatePreset, setStartDatePreset] = useState<'today' | 'tomorrow' | 'custom'>('today')
  const [celebration, setCelebration] = useState<{ open: boolean; title: string; subtitle: string }>({ open: false, title: '', subtitle: '' })
  const [goalForm, setGoalForm] = useState<{ name: string; activityInput: string; activityType: ActivityType; period: GoalPeriod; customPeriodDays: number | null; targetValue: number | null; unit: string; startDate: string; endDate: string; rpgStat: RpgStat | null }>({
    name: 'My goal',
    activityInput: 'GitHub Commit',
    activityType: 'GITHUB_COMMITS',
    period: 'WEEKLY',
    customPeriodDays: null,
    targetValue: 10,
    unit: 'commits',
    startDate: '',
    endDate: '',
    rpgStat: defaultStatByType.GITHUB_COMMITS,
  })
  const [activityFilter, setActivityFilter] = useState('')
  const [quickGoalChoice, setQuickGoalChoice] = useState<number | 'custom'>('custom')
  const goalDropdownOptions = useMemo(
    () =>
      goals.map((g) => ({
        value: g.id,
        label: g.name || g.activityType.replace('_', ' '),
        detail: `${g.period.toLowerCase()} • target ${g.targetValue ?? 0}${g.unit ? ` ${g.unit}` : ''}`,
      })),
    [goals],
  )
  const selectedGoal = useMemo(() => goals.find((g) => g.id === quickGoalChoice), [goals, quickGoalChoice])
  const matchingGoalForActivity = useMemo(() => {
    if (quickGoalChoice !== 'custom') {
      const picked = goals.find((g) => g.id === quickGoalChoice)
      if (picked) return picked
    }
    const type = form.type?.toLowerCase()
    const nameQuery = activityFilter.trim().toLowerCase()
    const found = goals.find(
      (g) => g.activityType?.toLowerCase() === type || g.name?.toLowerCase() === type || (nameQuery && g.name?.toLowerCase() === nameQuery),
    )
    return found ?? null
  }, [activityFilter, form.type, goals, quickGoalChoice])
  const [lastActivity, setLastActivity] = useState<ActivityRequest | null>(null)
  const quickCaptureRef = useRef<HTMLDivElement | null>(null)
  const activityFilterRef = useRef<HTMLInputElement | null>(null)
  const [quickCaptureError, setQuickCaptureError] = useState<string | null>(null)
  const [goalFormError, setGoalFormError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'fail'>('checking')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [secondaryError, setSecondaryError] = useState<string | null>(null)
  const [secondaryLoading, setSecondaryLoading] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', timezone: '', notificationsEnabled: false, weeklyEmailEnabled: false, gender: 'unspecified' as 'male' | 'female' | 'unspecified' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const { pushToast } = useToast()
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const yesterdayKey = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }, [])
  const [autoApplyGoals, setAutoApplyGoals] = useState(true)
  const onboardingKey = useMemo(() => `onboarding-${profile?.id ?? 'guest'}`, [profile?.id])
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(defaultOnboardingState)
  const onboardingCompleteRef = useRef(false)
  const [goalBadgeUnlocks, setGoalBadgeUnlocks] = useState<Record<number, { tiers: string[]; streaks: string[] }>>({})
  const [logPeriod, setLogPeriod] = useState<GoalPeriod>('DAILY')
  const [logDate, setLogDate] = useState<string>(() => new Date().toISOString().slice(0, 16))
  const timezones = useMemo(() => {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      return (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
    }
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'Europe/Moscow',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Australia/Sydney',
    ]
  }, [])

  const focusQuickCapture = useCallback(() => {
    quickCaptureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => activityFilterRef.current?.focus(), 120)
  }, [])

  const openGoalsWorkspace = useCallback(() => {
    setGoalsWorkspaceOpen(true)
    setOnboardingState((prev) => (prev.openedWorkspace ? prev : { ...prev, openedWorkspace: true }))
  }, [])

  const scrollToSection = useCallback(
    (id: string) => {
      if (id === 'goals-page') {
        setCurrentPage('goals')
        setMenuOpen(false)
        return
      }
      if (id === 'settings') {
        setCurrentPage('dashboard')
        setProfileModalOpen(true)
        setMenuOpen(false)
        return
      }
      if (id === 'goals-workspace') {
        setCurrentPage('dashboard')
        openGoalsWorkspace()
        setMenuOpen(false)
        return
      }
      setCurrentPage('dashboard')
      const el = typeof document !== 'undefined' ? document.getElementById(id) : null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setMenuOpen(false)
    },
    [openGoalsWorkspace],
  )

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', target: 'top' },
      { label: 'Goals', target: 'goals-page' },
      { label: 'Analytics', target: 'analytics-section' },
      { label: 'Settings', target: 'settings' },
    ],
    [],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('goalFavorites', JSON.stringify(favoriteGoalIds))
  }, [favoriteGoalIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('recentActivities', JSON.stringify(recentActivities))
  }, [recentActivities])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('quietStart', quietStart)
    localStorage.setItem('quietEnd', quietEnd)
    localStorage.setItem('quietTimezone', quietTimezone)
  }, [quietStart, quietEnd, quietTimezone])

  useEffect(() => {
    if (goals.length && quickGoalChoice === 'custom') {
      const first = goals[0]
      setQuickGoalChoice(first.id)
      const { type, customLabel } = normalizeActivitySelection(first.activityType as ActivityType)
      setForm((prev) => ({
        ...prev,
        type,
        metadata: customLabel ?? prev.metadata,
        rpgStat: first.rpgStat ?? prev.rpgStat ?? defaultStatByType[type] ?? 'STR',
      }))
      setActivityFilter(first.name || first.activityType.replace('_', ' '))
    }
  }, [goals, quickGoalChoice])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(onboardingKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as OnboardingState
        setOnboardingState({ ...defaultOnboardingState, ...parsed })
      } catch (err) {
        console.warn('Failed to parse onboarding state', err)
      }
    }
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        focusQuickCapture()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focusQuickCapture, onboardingKey])

  const goalBadge = useCallback((goal: Goal) => {
    const palette = [
      { emoji: '🎯', color: '#5cf4ff' },
      { emoji: '🚀', color: '#ff3fb4' },
      { emoji: '🌿', color: '#6fff00' },
      { emoji: '🔥', color: '#ff8a3d' },
      { emoji: '🌙', color: '#8ca6ff' },
      { emoji: '💎', color: '#9ef1ff' },
      { emoji: '⚡', color: '#f5d042' },
      { emoji: '🛰️', color: '#cba6f7' },
    ] as const
    const key = (goal.name || goal.activityType || '').toString()
    const hash = key.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return palette[hash % palette.length]
  }, [])

  const goalBadgeTiers = useMemo(
    () => [
      { key: 'bronze', label: 'Bronze', threshold: 25, color: 'var(--accent-2)' },
      { key: 'silver', label: 'Silver', threshold: 50, color: 'var(--accent)' },
      { key: 'gold', label: 'Gold', threshold: 100, color: 'var(--success)' },
    ],
    [],
  )

  const goalStreakTiers = useMemo(
    () => [
      { key: 'streak7', label: '7d streak', threshold: 7 },
      { key: 'streak21', label: '21d streak', threshold: 21 },
      { key: 'streak90', label: '90d streak', threshold: 90 },
    ],
    [],
  )

  const goalStreaksFor = useCallback(
    (goalId: number) => {
      const history = goalHistories[goalId] ?? []
      if (!history.length) return { streak: 0, tiers: goalStreakTiers.map((tier) => ({ ...tier, unlocked: false })) }
      let streak = 0
      for (let i = history.length - 1; i >= 0; i -= 1) {
        if (history[i].value > 0) streak += 1
        else break
      }
      return {
        streak,
        tiers: goalStreakTiers.map((tier) => ({ ...tier, unlocked: streak >= tier.threshold })),
      }
    },
    [goalHistories, goalStreakTiers],
  )

  const activityOptionsWithGoals = useMemo(() => {
    const base = [...activityOptions]
    const recentSet = new Set<string>(recentActivities.map((r) => r.toLowerCase()))
    const favoriteSet = new Set<number>(favoriteGoalIds)
    const seen = new Set<string>()

    const goalOptions = goals.map((g) => {
      const badge = goalBadge(g)
      const label = `${badge.emoji} ${(g.name || g.activityType || 'Custom').trim()}`
      const value = (g.activityType && g.activityType !== 'CUSTOM' ? g.activityType : (g.name || g.activityType)) as ActivityType
      return { label, value, goalId: g.id, badge }
    })

    const sortedGoals = goalOptions.sort((a, b) => {
      const aFav = favoriteSet.has(a.goalId ?? -1)
      const bFav = favoriteSet.has(b.goalId ?? -1)
      if (aFav !== bFav) return aFav ? -1 : 1
      const aRecent = recentSet.has(a.value.toLowerCase())
      const bRecent = recentSet.has(b.value.toLowerCase())
      if (aRecent !== bRecent) return aRecent ? -1 : 1
      return a.label.localeCompare(b.label)
    })

    const merged = [...base]
    sortedGoals.forEach((opt) => {
      if (!seen.has(opt.value.toLowerCase())) {
        merged.push({ label: opt.label as string, value: opt.value })
        seen.add(opt.value.toLowerCase())
      }
    })

    // Bring recent custom activities to the top if they’re not already present
    recentActivities.forEach((r) => {
      const existing = merged.find((m) => m.value.toLowerCase() === r.toLowerCase())
      if (!existing) {
        merged.unshift({ label: `🕑 ${r}`, value: r })
      }
    })

    return merged
  }, [goals, recentActivities, favoriteGoalIds, goalBadge])

  const bestActivitySuggestion = useMemo(() => {
    const query = activityFilter.trim()
    if (!query) return null
    const scored = activityOptionsWithGoals
      .map((opt) => ({ opt, score: fuzzyScore(query, opt.label) + fuzzyScore(query, opt.value) }))
      .sort((a, b) => b.score - a.score)
    return scored[0]?.score && scored[0].score > 0.25 ? scored[0].opt : null
  }, [activityFilter, activityOptionsWithGoals])

  useEffect(() => {
    if (!matchingGoalForActivity) return
    setForm((prev) => {
      // Only set a default if the user has not already provided a value
      if (prev.type !== form.type) return prev
      if (prev.value !== null && prev.value !== undefined) return prev
      const fallback = matchingGoalForActivity.targetValue ?? 1
      return { ...prev, value: fallback }
    })
  }, [matchingGoalForActivity, form.type])

  const paceInfo = useMemo(() => {
    const g = matchingGoalForActivity
    if (!g || !g.targetValue || g.targetValue <= 0) return null
    const current = g.currentValue ?? 0
    const target = g.targetValue
    const pct = Math.min(100, Math.round((current / target) * 100))
    const delta = pct - 50
    const ahead = delta >= 0

    const today = new Date()
    const msDay = 24 * 60 * 60 * 1000
    let nextCheckDate: Date
    if (g.period === 'CUSTOM' && g.customPeriodDays) {
      const start = g.startDate ? new Date(g.startDate) : today
      const daysSince = Math.max(0, (today.getTime() - start.getTime()) / msDay)
      const cycles = Math.floor(daysSince / g.customPeriodDays)
      nextCheckDate = new Date(start.getTime() + (cycles + 1) * g.customPeriodDays * msDay)
    } else if (g.period === 'DAILY') {
      nextCheckDate = new Date(today.getTime() + msDay)
    } else if (g.period === 'WEEKLY') {
      const daysToWeekEnd = 7 - today.getDay()
      nextCheckDate = new Date(today.getTime() + daysToWeekEnd * msDay)
    } else if (g.period === 'MONTHLY') {
      nextCheckDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    } else if (g.period === 'QUARTERLY') {
      const month = today.getMonth()
      const nextQuarterStart = month - (month % 3) + 3
      nextCheckDate = new Date(today.getFullYear(), nextQuarterStart, 1)
    } else {
      nextCheckDate = new Date(today.getTime() + msDay)
    }

    return {
      pct,
      ahead,
      delta,
      nextCheckIn: formatShortDate(nextCheckDate.toISOString()),
      unit: g.unit,
      target,
      current,
      goalName: g.name || g.activityType,
    }
  }, [matchingGoalForActivity])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const oauthToken = url.searchParams.get('token')
    const isOauthReturn = url.pathname === '/oauth2/success'
    if (isOauthReturn && oauthToken) {
      setToken(oauthToken)
      setTokenState(oauthToken)
      url.searchParams.delete('token')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setHealthStatus('checking')
      const ok = await checkHealth()
      if (cancelled) return
      setHealthStatus(ok ? 'ok' : 'fail')
      if (!ok) pushToast('API health check failed', 'error')
    }
    void run()
    const id = window.setInterval(run, 30000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pushToast])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTokenState(null)
      setProfile(null)
      setDashboard(null)
      setFeed([])
      setGoals([])
      setSelectedGoalId(null)
      setLeaderboard([])
      setAchievements([])
      setError('Session expired. Please sign in again.')
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    if (!goals.length) {
      setSelectedGoalId(null)
      return
    }
    setSelectedGoalId((prev) => {
      if (prev && goals.some((g) => g.id === prev)) return prev
      return goals[0]?.id ?? null
    })
  }, [goals])

  useEffect(() => {
    setToken(token)
  }, [token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(onboardingKey, JSON.stringify(onboardingState))
  }, [onboardingKey, onboardingState])

  useEffect(() => {
    if (onboardingCompleteRef.current) return
    if (onboardingState.dismissed) return
    const hasGoals = goals.length > 0
    const hasRecentActivity = feed.length > 0
    if (hasGoals && hasRecentActivity) {
      setOnboardingState((prev) => ({ ...prev, dismissed: true }))
      onboardingCompleteRef.current = true
    }
  }, [goals.length, feed.length, onboardingState.dismissed])

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const tomorrowStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }, [])

  useEffect(() => {
    if (startDatePreset === 'today' && goalForm.startDate !== todayStr) {
      setGoalForm((prev) => ({ ...prev, startDate: todayStr }))
    }
    if (startDatePreset === 'tomorrow' && goalForm.startDate !== tomorrowStr) {
      setGoalForm((prev) => ({ ...prev, startDate: tomorrowStr }))
    }
    if (startDatePreset === 'custom' && goalForm.startDate === '') {
      setGoalForm((prev) => ({ ...prev, startDate: '' }))
    }
  }, [startDatePreset, goalForm.startDate, todayStr, tomorrowStr])

  useEffect(() => {
    if (goalForm.startDate === todayStr) {
      setStartDatePreset('today')
    } else if (goalForm.startDate === tomorrowStr) {
      setStartDatePreset('tomorrow')
    } else if (goalForm.startDate) {
      setStartDatePreset('custom')
    }
  }, [goalForm.startDate, todayStr, tomorrowStr])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setProfileModalOpen(false)
        setGoalsWorkspaceOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!profile?.themePreference) return
    if (profile.themePreference === 'dark') setDarkMode(true)
    if (profile.themePreference === 'light') setDarkMode(false)
  }, [profile?.themePreference])

  useEffect(() => {
    if (!profile) return
    setProfileForm({
      name: profile.name ?? '',
      timezone: profile.timezone ?? '',
      notificationsEnabled: Boolean(profile.notificationsEnabled),
      weeklyEmailEnabled: Boolean(profile.weeklyEmailEnabled),
      gender: (profile.gender ?? 'unspecified') as 'male' | 'female' | 'unspecified',
    })
  }, [profile])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('goalTicks', JSON.stringify(dailyGoalChecks))
  }, [dailyGoalChecks])

  useEffect(() => {
    if (!token || goals.length === 0) {
      setGoalHistories({})
      return
    }
    let cancelled = false
    const loadHistories = async () => {
      setGoalHistoryLoading(true)
      try {
        const histories = await Promise.all(
          goals.map(async (goal) => {
            try {
              const history = await fetchGoalHistory(goal.id)
              return [goal.id, history] as const
            } catch (err) {
              console.warn('Failed to fetch history for goal', goal.id, err)
              return [goal.id, [] as GoalHistoryEntry[]] as const
            }
          }),
        )
        if (cancelled) return
        setGoalHistories(Object.fromEntries(histories))
        setDailyGoalChecks((prev) => {
          const next = { ...prev }
          histories.forEach(([id, history]) => {
            const today = history.find((h) => h.date === todayKey)
            if (today) next[`${id}:${todayKey}`] = today.value > 0
          })
          return next
        })
      } catch (err) {
        console.error('Failed to load goal histories', err)
      } finally {
        if (!cancelled) setGoalHistoryLoading(false)
      }
    }
    void loadHistories()
    return () => {
      cancelled = true
    }
  }, [goals, token, todayKey])

  useEffect(() => {
    let mounted = true
    if (!token) {
      setProfile(null)
      setLoading(false)
      return () => {
        mounted = false
      }
    }
    const load = async () => {
      try {
        const [user, dash, recent, goalList, lb, ach] = await Promise.all([
          fetchProfile(),
          fetchDashboard(),
          fetchActivityFeed(20),
          fetchGoals(),
          fetchLeaderboard(),
          fetchAchievements(),
        ])
        if (!mounted) return
        setProfile(user)
        setDashboard(dash)
        setFeed(recent)
        setError(null)
        setGoals(goalList)
        setLeaderboard(lb)
        setAchievements(ach)
        setSecondaryError(null)
        pushToast('Live data refreshed', 'success')
      } catch (err) {
        console.error('Failed to load live data', err)
        if (!mounted) return
        setError('Session invalid or API unavailable. Please sign in again.')
        setSecondaryError('Could not load live data. Sign in or check API.')
        setTokenState(null)
        setToken(null)
        setProfile(null)
        setDashboard(null)
        setFeed([])
        setGoals([])
        setLeaderboard([])
        setAchievements([])
        setGoalBadgeUnlocks({})
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    const client = connectLive(
      (activity) => {
        setFeed((prev) => [activity, ...prev].slice(0, 50))
      },
      {
        onConnect: () => setLiveConnected(true),
        onDisconnect: () => setLiveConnected(false),
      },
    )
    return () => {
      void client.deactivate()
    }
  }, [token])

  const chartData = useMemo(() => {
    if (!dashboard) return []
    const merged = new Map<string, number>()
    dashboard.trends.forEach((trend) => {
      trend.points.forEach((p) => {
        merged.set(p.period, (merged.get(p.period) || 0) + (p.value || 0))
      })
    })
    if (merged.size === 0) return []
    return Array.from(merged.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value, focus: 'Aggregated' }))
  }, [dashboard])

  const chartStats = useMemo(() => {
    if (!chartData.length) return { total: 0, peak: 0 }
    const total = chartData.reduce((sum, item) => sum + (item.value ?? 0), 0)
    const peak = chartData.reduce((max, item) => Math.max(max, item.value ?? 0), 0)
    return { total, peak }
  }, [chartData])

  const applyGoalProgress = async (goalId: number, date: string, value: number, opts?: { silent?: boolean }) => {
    if (!token) {
      pushToast('Sign in to save goal progress', 'error')
      return
    }

    const prevHistoryState = goalHistories
    const prevGoalsState = goals
    const prevHistory = goalHistories[goalId] ?? []
    const prevEntry = prevHistory.find((h) => h.date === date)
    const prevValue = prevEntry?.value ?? 0
    const delta = value - prevValue

    const upsertHistory = (entry: GoalHistoryEntry) => {
      setGoalHistories((prev) => {
        const filtered = (prev[goalId] ?? []).filter((h) => h.date !== date)
        return { ...prev, [goalId]: [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date)) }
      })
    }

    upsertHistory({ date, value })
    if (date === todayKey) setDailyGoalChecks((prev) => ({ ...prev, [`${goalId}:${todayKey}`]: value > 0 }))
    if (delta !== 0) {
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, currentValue: (g.currentValue ?? 0) + delta } : g)))
    }

    try {
      const saved = await setGoalProgress(goalId, value, date)
      const savedDelta = saved.value - prevValue
      upsertHistory(saved)
      if (savedDelta !== delta) {
        setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, currentValue: (g.currentValue ?? 0) + savedDelta } : g)))
      }
      if (date === todayKey) setDailyGoalChecks((prev) => ({ ...prev, [`${goalId}:${todayKey}`]: saved.value > 0 }))
      if (!opts?.silent) pushToast('Progress saved', 'success')
    } catch (err) {
      console.error(err)
      setGoalHistories(prevHistoryState)
      setGoals(prevGoalsState)
      if (date === todayKey) setDailyGoalChecks((prev) => ({ ...prev, [`${goalId}:${todayKey}`]: prevValue > 0 }))
      if (!opts?.silent) pushToast('Failed to save goal progress', 'error')
    }
  }

  const exportGoalHistory = () => {
    const rows: Array<Array<string | number>> = [['Goal', 'Date', 'Value', 'Unit']]

    goals.forEach((goal) => {
      const history = goalHistories[goal.id] ?? []
      history.forEach((entry) => {
        rows.push([
          goal.name || goal.activityType.replace('_', ' '),
          entry.date,
          entry.value ?? 0,
          goal.unit ?? '',
        ])
      })
    })

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'goal-history.csv'
    link.click()
    URL.revokeObjectURL(url)
    pushToast('Goal history exported', 'success')
  }

  const openBackfill = (goalId: number) => {
    const history = goalHistories[goalId] ?? []
    const recent = history.length ? history[history.length - 1]?.date : todayKey
    setBackfillGoalId(goalId)
    setBackfillDate(recent)
    setBackfillValue(1)
    setBackfillError(null)
  }

  const closeBackfill = () => {
    setBackfillGoalId(null)
    setBackfillSaving(false)
    setBackfillError(null)
  }

  const submitBackfill = async () => {
    if (!backfillGoalId || !backfillDate) {
      setBackfillError('Select a date to backfill')
      pushToast('Select a date to backfill', 'error')
      return
    }
    if (backfillValue < 0) {
      setBackfillError('Value must be zero or higher')
      pushToast('Value must be zero or higher', 'error')
      return
    }
    setBackfillSaving(true)
    await applyGoalProgress(backfillGoalId, backfillDate, Math.max(0, backfillValue), { silent: true })
    setBackfillSaving(false)
    closeBackfill()
    void fetchGoals().then(setGoals).catch((err) => console.warn('Failed to refresh goals after backfill', err))
    pushToast('Backfill saved', 'success')
  }

  const reminders = useMemo(() => {
    return goals
      .map((g) => {
        const key = `${g.id}:${todayKey}`
        const todayHistory = goalHistories[g.id]?.find((h) => h.date === todayKey)
        const done = todayHistory ? todayHistory.value > 0 : Boolean(dailyGoalChecks[key])
        const label = `${g.name || g.activityType.replace('_', ' ')} · ${g.targetValue ?? 0}${g.unit ? ` ${g.unit}` : ''}`
        return { id: g.id, label, done }
      })
      .filter((r) => !r.done)
      .slice(0, 5)
  }, [goals, goalHistories, dailyGoalChecks, todayKey])

  const onboardingComplete = onboardingState.dismissed || (goals.length > 0 && feed.length > 0)
  const showOnboarding = !onboardingComplete

  const dismissOnboarding = () => setOnboardingState((prev) => ({ ...prev, dismissed: true }))

  const recordMilestone = useCallback(
    (goal: Goal, message: string, opts?: { toast?: boolean; confetti?: boolean }) => {
      if (opts?.toast) pushToast(message, 'success')
      const synthetic: ActivityResponse = {
        id: Number(`-9${goal.id}${Date.now() % 10000}`),
        type: 'CUSTOM',
        description: message,
        value: goal.targetValue ?? goal.currentValue ?? null,
        metadata: 'milestone',
        occurredAt: new Date().toISOString(),
        platform: null,
        repository: null,
        difficulty: null,
        timeSpentMinutes: null,
        setsCompleted: null,
        repsCompleted: null,
        likes: null,
        comments: null,
        shares: null,
      }
      setFeed((prev) => [synthetic, ...prev].slice(0, 50))
      if (opts?.confetti) {
        setCelebration({
          open: true,
          title: 'Milestone Unlocked',
          subtitle: message,
        })
      }
    },
    [pushToast],
  )

  const setTodayValue = (goalId: number, value: number) => applyGoalProgress(goalId, todayKey, value)

  const markYesterday = (goalId: number) => applyGoalProgress(goalId, yesterdayKey, 1)

  const toggleGoalTick = async (goalId: number) => {
    const key = `${goalId}:${todayKey}`
    const alreadyDone = Boolean(dailyGoalChecks[key])
    if (alreadyDone) {
      await applyGoalProgress(goalId, todayKey, 0)
      return
    }

    const goal = goals.find((g) => g.id === goalId)
    setTickDialog({ goalId, label: goal?.name || goal?.activityType?.replace('_', ' ') || 'Goal' })
    setTickValue('1')
    setTickNote('')
  }

  const confirmTickDialog = async () => {
    if (!tickDialog) return
    const parsed = Number(tickValue)
    const value = Number.isFinite(parsed) ? parsed : 1
    await applyGoalProgress(tickDialog.goalId, todayKey, value)
    if (value > 0) {
      setCelebration({
        open: true,
        title: 'Milestone Unlocked',
        subtitle: `${tickDialog.label} logged for today (${value}${value === 1 ? '' : ' units'})`,
      })
    }
    if (tickNote.trim()) pushToast(`Noted: ${tickNote.trim()}`, 'info')
    setTickDialog(null)
  }

  const trackGoalUnlocks = useCallback(() => {
    goals.forEach((goal) => {
      const target = goal.targetValue ?? 0
      const current = goal.currentValue ?? 0
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      const history = goalHistories[goal.id] ?? []
      let streak = 0
      for (let i = history.length - 1; i >= 0; i -= 1) {
        if (history[i].value > 0) streak += 1
        else break
      }
      const prior = goalBadgeUnlocks[goal.id] ?? { tiers: [], streaks: [] }
      const nextTiers = new Set(prior.tiers)
      const nextStreaks = new Set(prior.streaks)

      goalBadgeTiers.forEach((tier) => {
        if (pct >= tier.threshold && !nextTiers.has(tier.key)) {
          nextTiers.add(tier.key)
          recordMilestone(goal, `${tier.label} badge unlocked for ${goal.name || goal.activityType.replace('_', ' ')}`, {
            toast: true,
            confetti: tier.threshold >= 100,
          })
        }
      })

      goalStreakTiers.forEach((tier) => {
        if (streak >= tier.threshold && !nextStreaks.has(tier.key)) {
          nextStreaks.add(tier.key)
          recordMilestone(goal, `${tier.label} for ${goal.name || goal.activityType.replace('_', ' ')}`, { toast: true, confetti: tier.threshold >= 21 })
        }
      })

      if (nextTiers.size !== prior.tiers.length || nextStreaks.size !== prior.streaks.length) {
        setGoalBadgeUnlocks((prev) => ({ ...prev, [goal.id]: { tiers: Array.from(nextTiers), streaks: Array.from(nextStreaks) } }))
      }
    })
  }, [goals, goalHistories, goalBadgeTiers, goalStreakTiers, goalBadgeUnlocks, recordMilestone])

  useEffect(() => {
    trackGoalUnlocks()
  }, [trackGoalUnlocks])

  const upcomingBadgeNudge = useMemo<{ goal: Goal; tier: { label: string; threshold: number }; delta: number } | null>(() => {
    let best: { goal: Goal; tier: { label: string; threshold: number }; delta: number } | null = null
    goals.forEach((goal) => {
      const target = goal.targetValue ?? 0
      const current = goal.currentValue ?? 0
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      goalBadgeTiers.forEach((tier) => {
        if (pct >= tier.threshold) return
        const delta = tier.threshold - pct
        if (delta <= 5 && (!best || delta < best.delta)) {
          best = { goal, tier, delta }
        }
      })
    })
    return best
  }, [goals, goalBadgeTiers])
  
  useEffect(() => {
    if (token && reminders.length > 0 && !nudgeShown) {
      pushToast(`You have ${reminders.length} goal${reminders.length > 1 ? 's' : ''} to log today`, 'info')
      setNudgeShown(true)
    }
  }, [reminders, token, nudgeShown, pushToast])

  const goalHistoryCards = useMemo(() => {
    if (!goals.length) return []
    return goals.map((g) => {
      const history = [...(goalHistories[g.id] ?? [])].sort((a, b) => a.date.localeCompare(b.date))
      const shaped = history.length
        ? history.slice(-7).map((h) => ({ label: h.date.slice(5), value: h.value }))
        : Array.from({ length: 7 }).map((_, idx) => ({ label: `D${idx + 1}`, value: Math.max(0, Math.round((g.currentValue ?? 5) / 2) + (idx % 3) - 1) }))
      return { goal: g, history: shaped }
    })
  }, [goals, goalHistories])

  const passwordIssues = useMemo(() => {
    const issues: string[] = []
    if (!passwordForm.current.trim()) issues.push('Current password required')
    if (!passwordForm.next.trim()) issues.push('New password required')
    if (passwordForm.next && passwordForm.next.length < 8) issues.push('At least 8 characters')
    if (passwordForm.next && !/[A-Za-z]/.test(passwordForm.next)) issues.push('Include a letter')
    if (passwordForm.next && !/\d/.test(passwordForm.next)) issues.push('Include a number')
    if (passwordForm.next && passwordForm.current && passwordForm.next === passwordForm.current) issues.push('New password must differ')
    if (passwordForm.confirm && passwordForm.next !== passwordForm.confirm) issues.push('Confirm password does not match')
    return issues
  }, [passwordForm])

  const breakdown = dashboard?.breakdown ?? {}
  const score = dashboard?.productivityScore ?? 0
  const xpProgress = Math.min(100, score)
  const cardSpring = { type: 'spring', stiffness: 220, damping: 26, mass: 1 }
  const cardHoverSpring = { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }

  const radarData = useMemo(() => {
    const stats = dashboard?.rpgStats ?? {}
    const order: RpgStat[] = ['STR', 'DEX', 'INT', 'WIS', 'CHA', 'VIT']
    return order.map((stat) => ({ stat, value: stats[stat] ?? 0 }))
  }, [dashboard])

  const [radarInfoOpen, setRadarInfoOpen] = useState(false)
  const statFullName: Record<RpgStat, string> = {
    STR: 'Strength',
    DEX: 'Dexterity',
    INT: 'Intelligence',
    WIS: 'Wisdom',
    CHA: 'Charisma',
    VIT: 'Vitality',
  }

  const radarGoals = useMemo(() => {
    return ['STR', 'DEX', 'INT', 'WIS', 'CHA', 'VIT'].map((stat) => {
      const matched = goals.filter((g) => (g.rpgStat || defaultStatByType[g.activityType]) === stat)
      return { stat: stat as RpgStat, goals: matched }
    })
  }, [goals])

  const saveActivity = async (base: ActivityRequest) => {
    const { type: normalizedType, customLabel } = normalizeActivitySelection(base.type)
    const resolvedStat = base.rpgStat ?? defaultStatByType[normalizedType] ?? 'STR'
    const payload: ActivityRequest = {
      ...base,
      type: normalizedType,
      rpgStat: resolvedStat,
      value: base.value ?? null,
      description: base.description || customLabel || '',
      metadata: base.metadata || customLabel || null,
      occurredAt: base.occurredAt ? new Date(base.occurredAt).toISOString() : null,
    }
    const saved = await createActivity(payload)
    const recentKey = customLabel ?? saved.type
    setLastActivity({ ...payload, type: recentKey as ActivityType })
    setFeed((prev) => [saved, ...prev].slice(0, 50))
    setRecentActivities((prev) => {
      const next = [recentKey, ...prev.filter((p) => p.toLowerCase() !== recentKey.toLowerCase())]
      return next.slice(0, 6)
    })
    setActivityFilter('')
    if (autoApplyGoals && goals.length) {
      const date = saved.occurredAt?.slice(0, 10) ?? todayKey
      const val = saved.value ?? 1
      const savedType = (saved.type || '').toLowerCase()
      const matchLabel = (customLabel ?? base.type ?? '').toString().toLowerCase()
      const matching = goals.filter((g) =>
        g.activityType?.toLowerCase() === savedType || g.name?.toLowerCase() === savedType || (matchLabel && g.name?.toLowerCase() === matchLabel),
      )
      if (matching.length) {
        await Promise.all(matching.map((g) => applyGoalProgress(g.id, date, val, { silent: true })))
        pushToast(`Auto-applied to ${matching.length} goal${matching.length > 1 ? 's' : ''}`, 'success')
        void fetchGoals().then(setGoals).catch((err) => console.warn('Failed to refresh goals after auto-apply', err))
      }
    }
    const refreshed = await fetchDashboard()
    setDashboard(refreshed)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setQuickCaptureError(null)
      if (form.value !== null && form.value !== undefined && form.value < 0) {
        setQuickCaptureError('Value cannot be negative.')
        return
      }
      await saveActivity(form)
      setForm({ ...form, description: '', metadata: '', value: null })
      setQuickGoalChoice('custom')
    } catch (err) {
      console.error(err)
      setError('Failed to save activity. Check token/API base.')
      setQuickCaptureError('Failed to save. Check API base or token and retry.')
      pushToast('Failed to save activity', 'error')
    }
  }
  const saveGoal = async (payload: { name: string; activityType: ActivityType; period: GoalPeriod; targetValue: number; unit?: string | null; customPeriodDays?: number | null; startDate?: string | null; endDate?: string | null; rpgStat?: RpgStat | null }) => {
    try {
      const saved = await upsertGoal(payload)
      const [goalList, refreshedDash] = await Promise.all([fetchGoals(), fetchDashboard()])
      if (saved?.id) {
        try {
          const history = await fetchGoalHistory(saved.id)
          setGoalHistories((prev) => ({ ...prev, [saved.id]: history }))
        } catch (err) {
          console.warn('Failed to refresh goal history after save', err)
        }
      }
      setGoals(goalList)
      setDashboard(refreshedDash)
      setSelectedGoalId(saved?.id ?? goalList[0]?.id ?? null)
      setError(null)
      return saved
    } catch (err) {
      console.error(err)
      setError('Failed to save goal. Check token/API base.')
      pushToast('Failed to save goal', 'error')
      throw err
    }
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setGoalFormError(null)
      if ((goalForm.targetValue ?? 0) <= 0) {
        setGoalFormError('Target must be greater than zero.')
        return
      }
      if (goalForm.period === 'CUSTOM' && (!goalForm.customPeriodDays || goalForm.customPeriodDays <= 0.5)) {
        setGoalFormError('Custom period must be greater than 0.5 days.')
        return
      }
      const trimmedActivity = goalForm.activityInput.trim()
      const suggestion = activityOptions.find((opt) => opt.label.toLowerCase() === trimmedActivity.toLowerCase() || opt.value === goalForm.activityType)
      const activityType = suggestion ? suggestion.value : (trimmedActivity as ActivityType) || 'CUSTOM'
      const name = goalForm.name.trim() || trimmedActivity || 'My goal'
      const rpgStat = goalForm.rpgStat || defaultStatByType[activityType]
      await saveGoal({
        name,
        activityType,
        period: goalForm.period,
        targetValue: goalForm.targetValue ?? 0,
        unit: goalForm.unit.trim() || undefined,
        customPeriodDays: goalForm.period === 'CUSTOM' ? goalForm.customPeriodDays ?? undefined : undefined,
        rpgStat,
        startDate: goalForm.startDate || null,
        endDate: goalForm.endDate || null,
      })
    } catch {
      // already handled in saveGoal
      setGoalFormError('Failed to save goal. Check API base or token and retry.')
    }
  }

  const handleDeleteGoal = async (id: number) => {
    try {
      await deleteGoal(id)
      const [goalList, refreshedDash] = await Promise.all([fetchGoals(), fetchDashboard()])
      setGoals(goalList)
      setDashboard(refreshedDash)
      setSelectedGoalId((prev) => {
        if (prev && prev === id) return goalList[0]?.id ?? null
        return prev
      })
    } catch (err) {
      console.error(err)
      setError('Failed to delete goal.')
      pushToast('Failed to delete goal', 'error')
    }
  }

  const refreshLiveData = async () => {
    setSecondaryLoading(true)
    try {
      const [user, dash, recent, goalList, lb, ach] = await Promise.all([
        fetchProfile(),
        fetchDashboard(),
        fetchActivityFeed(20),
        fetchGoals(),
        fetchLeaderboard(),
        fetchAchievements(),
      ])
      setProfile(user)
      setDashboard(dash)
      setFeed(recent)
      setGoals(goalList)
      setLeaderboard(lb)
      setAchievements(ach)
      setSecondaryError(null)
    } catch (err) {
      console.error(err)
      setSecondaryError('Refresh failed. Check API or token.')
      pushToast('Refresh failed', 'error')
    } finally {
      setSecondaryLoading(false)
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setProfileMessage(null)
    const trimmedName = profileForm.name.trim()
    if (!trimmedName) {
      setProfileMessage('Name is required')
      pushToast('Add your name to save profile.', 'error')
      return
    }
    setProfileSaving(true)
    try {
      const payload: UpdateProfilePayload = {
        name: trimmedName,
        timezone: profileForm.timezone || null,
        notificationsEnabled: profileForm.notificationsEnabled,
        gender: profileForm.gender,
      }
      if (EMAIL_FEATURE_ENABLED) {
        payload.weeklyEmailEnabled = profileForm.weeklyEmailEnabled
      }
      const updated = await updateProfile(payload)
      setProfile(updated)
      setProfileMessage('Profile updated')
      pushToast('Profile updated', 'success')
    } catch (err) {
      console.error(err)
      setProfileMessage('Failed to update profile')
      pushToast('Failed to update profile', 'error')
    }
    finally {
      setProfileSaving(false)
    }
  }

  const handleAvatarSelected = async (file?: File) => {
    if (!file) return
    setAvatarUploading(true)
    try {
      const updated = await uploadAvatar(file)
      setProfile(updated)
      pushToast('Profile photo updated', 'success')
    } catch (err) {
      console.error(err)
      pushToast('Failed to upload avatar', 'error')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarRemove = async () => {
    setAvatarUploading(true)
    try {
      const updated = await deleteAvatar()
      setProfile(updated)
      pushToast('Profile photo removed', 'info')
    } catch (err) {
      console.error(err)
      pushToast('Failed to remove avatar', 'error')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setPasswordMessage(null)
    if (passwordIssues.length) {
      setPasswordMessage(passwordIssues.join(' • '))
      pushToast('Fix password requirements before saving.', 'error')
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword(passwordForm.current, passwordForm.next)
      setPasswordForm({ current: '', next: '', confirm: '' })
      setPasswordMessage('Password updated')
      pushToast('Password updated', 'success')
    } catch (err) {
      console.error(err)
      setPasswordMessage('Failed to update password')
      pushToast('Failed to update password', 'error')
    }
    finally {
      setPasswordSaving(false)
    }
  }

  const themeClass = darkMode ? 'theme-night text-[var(--text)]' : 'theme-day text-[var(--text)]'

  const fallbackAvatar = (gender?: string | null) => {
    if (gender === 'female') return '/avatars/female.svg'
    if (gender === 'male') return '/avatars/male.svg'
    return '/avatars/male.svg'
  }

  if (!token) {
    return (
      <LoginPage
        darkMode={darkMode}
          onToggleTheme={async () => {
            setDarkMode((v) => !v)
            if (profile) {
              const nextPref = darkMode ? 'light' : 'dark'
              try {
                const updated = await updateProfile({ themePreference: nextPref })
                setProfile(updated)
              } catch (err) {
                console.warn('Failed to persist theme preference', err)
              }
            }
          }}
        onLogin={async (email, password) => {
          const auth = await loginEmail(email, password)
          setToken(auth.token)
          setTokenState(auth.token)
          setProfile((prev) =>
            prev ?? {
              id: auth.userId,
              name: auth.name,
              email: auth.email,
              gender: null,
              themePreference: null,
              notificationsEnabled: null,
              weeklyEmailEnabled: null,
              timezone: null,
              trackedActivities: null,
              passwordResetExpiry: null,
              avatarUrl: null,
            },
          )
          pushToast('Signed in successfully', 'success')
        }}
        onSignup={async (name, email, password) => {
          const auth = await signupEmail(name, email, password)
          setToken(auth.token)
          setTokenState(auth.token)
          setProfile({
            id: auth.userId,
            name: auth.name,
            email: auth.email,
            gender: null,
            themePreference: null,
            notificationsEnabled: null,
            weeklyEmailEnabled: null,
            timezone: null,
            trackedActivities: null,
            passwordResetExpiry: null,
            avatarUrl: null,
          })
          pushToast('Account created', 'success')
        }}
        onGoogle={startGoogleLogin}
      />
    )
  }

  return (
    <div className={clsx(themeClass, 'relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors')}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--panel-strong)] focus:px-4 focus:py-2 focus:text-[var(--text)] focus:shadow-lg"
      >
        Skip to main content
      </a>
      <BackgroundEffects darkMode={darkMode} />
      <CelebrationOverlay
        isOpen={celebration.open}
        onClose={() => setCelebration((prev) => ({ ...prev, open: false }))}
        title={celebration.title}
        subtitle={celebration.subtitle}
        isDark={darkMode}
      />
      {goalsWorkspaceOpen && (
        <GoalsWorkspace
          open={goalsWorkspaceOpen}
          goals={goals}
          histories={goalHistories}
          onCreateGoal={saveGoal}
          onDeleteGoal={handleDeleteGoal}
          onClose={() => setGoalsWorkspaceOpen(false)}
          onSelectGoal={(id) => setSelectedGoalId(id)}
          selectedGoalId={selectedGoalId}
          todayKey={todayKey}
        />
      )}
      <div className="hud-grid" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-80 blur-3xl">
        <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-[var(--accent)]/20" />
        <div className="absolute right-20 top-8 h-72 w-72 rounded-full bg-[var(--accent-2)]/18" />
        <div className="absolute left-1/3 top-24 h-56 w-80 rotate-12 rounded-[999px] bg-gradient-to-r from-[var(--accent)]/14 via-[var(--accent-2)]/16 to-transparent" />
      </div>
      <main id="main-content" className="mx-auto max-w-7xl px-6 py-10 lg:px-12">
        {error && (
          <div className="notice-card fixed right-4 top-4 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm text-[var(--text)] shadow-xl">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--danger)]" />
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">Notice</p>
                    <p className="text-[var(--muted)]">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setSecondaryError(null)
                    }}
                    aria-label="Dismiss notice"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-base text-[var(--muted)] transition hover:border-[var(--border)] hover:text-[var(--text)]"
                  >
                    ×
                  </button>
                </div>
                {secondaryError && (
                  <button
                    className="notice-action mt-2 rounded-full border px-3 py-1 text-xs"
                    onClick={refreshLiveData}
                    disabled={secondaryLoading}
                  >
                    {secondaryLoading ? 'Refreshing…' : 'Retry live data'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <nav className="flex items-center justify-between text-sm" aria-label="Primary">
          <div className="hidden items-center gap-10 text-[var(--muted)] sm:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={clsx(
                  'group relative inline-flex cursor-pointer items-center gap-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                  item.target === 'goals-page' && currentPage === 'goals' && 'text-[var(--accent)]',
                )}
              >
                <span>{item.label}</span>
                <span className="absolute bottom-[-6px] left-0 h-[2px] w-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-200 group-hover:w-full" />
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-xs text-[var(--muted)] shadow-lg">
              <span className={`flex h-2.5 w-2.5 rounded-full ${token ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
            </div>
            <button
              className="flex sm:hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-xs text-[var(--muted)] shadow-lg"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              type="button"
            >
              <span className="text-base">☰</span>
            </button>

            <motion.button
              type="button"
              className="relative flex h-9 w-16 items-center rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-1 shadow-lg"
              aria-label="Toggle theme"
              onClick={() => setDarkMode((v) => !v)}
              layout
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              <motion.div
                className={clsx(
                  'absolute top-1 h-7 w-7 rounded-full shadow-md',
                  darkMode ? 'bg-[var(--accent)]' : 'bg-amber-200',
                )}
                layout
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                style={{ left: darkMode ? 'calc(100% - 30px)' : '4px' }}
              >
                <div className="flex h-full w-full items-center justify-center text-[var(--text)]">
                  {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-600" />}
                </div>
              </motion.div>
            </motion.button>

            {profile && (
              <div className="ml-2 flex items-center">
                <UserStatusCluster
                  avatarUrl={profile.avatarUrl}
                  fallbackAvatar={fallbackAvatar(profile.gender)}
                  secureState={token ? 'secure' : 'alert'}
                  progress={(dashboard?.productivityScore ?? 50) / 100}
                  darkMode={darkMode}
                  onClick={() => setProfileModalOpen(true)}
                />
              </div>
            )}
          </div>
        </nav>

            {menuOpen && (
              <div
                id="mobile-menu"
                className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 text-[var(--muted)] sm:hidden"
                role="menu"
              >
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="text-left text-sm"
                    onClick={() => scrollToSection(item.target)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {profileModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setProfileModalOpen(false)} />
                <div
                  className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel-strong)] via-[var(--panel)] to-[var(--panel-strong)] shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Profile settings"
                >
                  <div className="flex items-start justify-between border-b border-[var(--border)] bg-[var(--panel-strong)]/80 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={(profile?.avatarUrl || fallbackAvatar(profile?.gender)) ?? fallbackAvatar('unspecified')}
                        alt="Avatar"
                        className="h-12 w-12 rounded-full border border-[var(--border)] object-cover"
                      />
                      <div className="leading-tight">
                        <p className="text-sm text-[var(--muted)]">Profile center</p>
                        <p className="text-lg font-semibold text-[var(--text)]">{profile?.name}</p>
                        <p className="text-xs text-[var(--muted)]">Fine-tune your identity, security, and alerts.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileModalOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                      aria-label="Close profile modal"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid gap-6 bg-[var(--panel)]/70 p-6 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 shadow-lg">
                        <p className="text-sm font-semibold text-[var(--text)]">Identity</p>
                        <p className="text-xs text-[var(--muted)]">Upload an image and keep your basic info current.</p>
                        <div className="mt-4 flex items-center gap-3">
                          <img
                            src={(profile?.avatarUrl || fallbackAvatar(profile?.gender)) ?? fallbackAvatar('unspecified')}
                            alt="Avatar preview"
                            className="h-14 w-14 rounded-full border border-[var(--border)] object-cover"
                          />
                          <div className="flex flex-col gap-2 text-sm">
                            <label className="cursor-pointer rounded-full border border-dashed border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--text)] shadow-sm transition hover:border-[var(--accent)]">
                              Upload new picture
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleAvatarSelected(e.target.files?.[0])}
                              />
                            </label>
                            <button
                              type="button"
                              className="text-left text-xs text-[var(--muted)] underline underline-offset-4 hover:text-[var(--danger)]"
                              onClick={handleAvatarRemove}
                              disabled={avatarUploading}
                            >
                              Remove current avatar
                            </button>
                          </div>
                        </div>
                      </div>

                      <form className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 shadow-lg" onSubmit={handleProfileSave}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[var(--text)]">Profile details</p>
                          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Live</span>
                        </div>
                        <label className="text-sm text-[var(--muted)]">
                          Display name
                          <input
                            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            placeholder="How should we address you?"
                          />
                        </label>
                        <label className="text-sm text-[var(--muted)]">
                          Timezone
                          <input
                            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                            value={profileForm.timezone}
                            onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                            placeholder="e.g. America/Los_Angeles"
                          />
                        </label>
                        <label className="text-sm text-[var(--muted)]">
                          Gender
                          <select
                            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                            value={profileForm.gender}
                            onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value as 'male' | 'female' | 'unspecified' })}
                          >
                            <option value="unspecified">Prefer not to say</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                          </select>
                        </label>
                        <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--muted)]">
                          In-app notifications
                          <Switch
                            checked={profileForm.notificationsEnabled}
                            onChange={() => setProfileForm({ ...profileForm, notificationsEnabled: !profileForm.notificationsEnabled })}
                          />
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="submit"
                            className="btn-royal flex-1 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                            disabled={profileSaving}
                          >
                            {profileSaving ? 'Saving…' : 'Save profile'}
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
                            onClick={() => setProfileModalOpen(false)}
                          >
                            Close
                          </button>
                        </div>
                        {profileMessage && <p className="text-xs text-[var(--muted)]">{profileMessage}</p>}
                      </form>
                    </div>

                    <form className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 shadow-lg" onSubmit={handlePasswordSave}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">Password</p>
                          <p className="text-xs text-[var(--muted)]">Min 8 chars, include a letter and a number, and differ from the current password.</p>
                        </div>
                        <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Secure</span>
                      </div>
                      <label className="text-sm text-[var(--muted)]">
                        Current password
                        <input
                          type="password"
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        />
                      </label>
                      <label className="text-sm text-[var(--muted)]">
                        New password
                        <input
                          type="password"
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                          value={passwordForm.next}
                          onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                        />
                      </label>
                      <label className="text-sm text-[var(--muted)]">
                        Confirm new password
                        <input
                          type="password"
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        />
                      </label>
                      {passwordIssues.length > 0 && (
                        <ul className="space-y-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--danger)]">
                          {passwordIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      )}
                      {passwordMessage && <p className="text-xs text-[var(--muted)]">{passwordMessage}</p>}
                      <button
                        type="submit"
                        className="btn-royal w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        disabled={passwordSaving}
                      >
                        {passwordSaving ? 'Updating…' : 'Update password'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            <header id="top" className="mt-8 text-center">
          <p className="text-xs uppercase tracking-[0.48em] text-[var(--accent-3)]">Mission Briefing</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl md:text-6xl text-[var(--text)] drop-shadow-[0_0_20px_rgba(92,244,255,0.35)]">Life as a Video Game</h1>
          <p className="mt-3 text-sm text-[var(--muted)] sm:text-base">
            Tactical HUD for your week: sprint objectives, live telemetry, and boost meters.
          </p>
          {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
        </header>

            {currentPage === 'dashboard' ? (
              <>

        <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          {showOnboarding && (
            <section className="lg:col-span-2 mb-4 grid gap-4 rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-5 shadow-[0_12px_50px_-28px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Getting started</p>
                  <h3 className="text-lg font-semibold text-[var(--text)]">Start with one activity and one goal</h3>
                  <p className="text-sm text-[var(--muted)]">Log something you did, then open the goals workspace to set a target. We&apos;ll auto-hide this once you have both.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text)] transition hover:text-[var(--accent)]"
                    onClick={dismissOnboarding}
                  >
                    Skip for now
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className={`rounded-2xl border px-4 py-3 ${feed.length ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--panel)]'}`}>
                  <div className="flex items-center justify-between text-sm text-[var(--text)]">
                    <span>1) Log an activity</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${feed.length ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--panel-strong)] text-[var(--muted)]'}`}>{feed.length ? 'Done' : 'Todo'}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">Use quick capture to add anything you did.</p>
                  <button
                    className="mt-3 w-full rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:text-[var(--accent)]"
                    onClick={focusQuickCapture}
                  >
                    Jump to quick capture
                  </button>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${goals.length ? 'border-[var(--accent-2)] bg-[var(--accent-2)]/5' : 'border-[var(--border)] bg-[var(--panel)]'}`}>
                  <div className="flex items-center justify-between text-sm text-[var(--text)]">
                    <span>2) Create a goal</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${goals.length ? 'bg-[var(--accent-2)]/20 text-[var(--accent-2)]' : 'bg-[var(--panel-strong)] text-[var(--muted)]'}`}>{goals.length ? 'Done' : 'Todo'}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">Open the goals workspace to add your first target.</p>
                  <button
                    className="mt-3 w-full rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:text-[var(--accent)]"
                    onClick={openGoalsWorkspace}
                  >
                    Open goals workspace
                  </button>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${onboardingState.openedWorkspace ? 'border-[var(--accent-3)] bg-[var(--accent-3)]/5' : 'border-[var(--border)] bg-[var(--panel)]'}`}>
                  <div className="flex items-center justify-between text-sm text-[var(--text)]">
                    <span>3) Auto-apply progress</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${onboardingState.openedWorkspace ? 'bg-[var(--accent-3)]/20 text-[var(--accent-3)]' : 'bg-[var(--panel-strong)] text-[var(--muted)]'}`}>{onboardingState.openedWorkspace ? 'Ready' : 'Optional'}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">Keep “Auto-apply to matching goals” on to sync your logs.</p>
                  <div className="mt-3 flex items-center justify-between rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-[11px] text-[var(--muted)]">
                    <span>Auto-apply</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${autoApplyGoals ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--panel)] text-[var(--muted)]'}`}>{autoApplyGoals ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
          <div className="holo-card p-6">
            <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="relative h-20 w-20 rounded-full border border-[var(--border)] p-[6px]"
                  style={{ background: `conic-gradient(var(--accent) ${xpProgress}%, rgba(255,255,255,0.06) ${xpProgress}% 100%)` }}
                >
                  <div className="absolute inset-[6px] rounded-full bg-[var(--panel-strong)]" />
                  <img
                    src={profile?.avatarUrl || fallbackAvatar(profile?.gender)}
                    alt="Avatar"
                    className="relative z-10 h-full w-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">Operative status</p>
                  <p className="text-2xl font-semibold text-[var(--text)]">{profile?.name || 'Pilot'}</p>
                  <p className="text-sm text-[var(--muted)]">XP to next milestone: {xpProgress}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="holo-card px-3 py-2">
                  <p className="text-[var(--muted)]">Active goals</p>
                  <p className="text-lg font-semibold text-[var(--text)]">{goals.length || '—'}</p>
                </div>
                <div className="holo-card px-3 py-2">
                  <p className="text-[var(--muted)]">Today open</p>
                  <p className="text-lg font-semibold text-[var(--text)]">{reminders.length || '0'}</p>
                </div>
                <div className="holo-card px-3 py-2">
                  <p className="text-[var(--muted)]">Live link</p>
                  <p className={`text-lg font-semibold ${liveConnected ? 'text-[var(--success)] animate-pulse' : 'text-[var(--muted)]'}`}>{liveConnected ? 'Connected' : 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="holo-card p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">Boost actions</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text)]">Log a win or set a goal</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <button
                className="btn-royal rounded-md px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  const el = document.getElementById('activity-form')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Log activity
              </button>
              <button
                className="rounded-md border border-[var(--border)] px-4 py-2 text-[var(--text)] transition hover:text-[var(--accent)]"
                onClick={() => {
                  openGoalsWorkspace()
                }}
              >
                Jump to goals
              </button>
            </div>
          </div>
        </div>

        {/* Cyber-sport HUD row */}
        <div className="mt-10 grid gap-4 md:grid-cols-4 auto-rows-[minmax(200px,_1fr)]">
          <motion.section
            initial={{ y: 12, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            transition={cardSpring}
            whileHover={{ y: -4, scale: 1.01, transition: cardHoverSpring }}
            className="md:col-span-2 holo-card p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Turbo / Boost</p>
                <h2 className="text-lg font-semibold">Central engine</h2>
              </div>
              <div className={`rounded-md px-3 py-1 text-xs text-white ${score >= 90 ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)]'}`}>{Math.round(score)}%</div>
            </div>
            <div className="mt-3 h-64 w-full">
              <Suspense fallback={<div className="skeleton h-full w-full rounded-2xl" />}>
                <ProductivityRadialLazy score={score} />
              </Suspense>
            </div>
          </motion.section>

          <motion.section
            initial={{ y: 14, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            transition={cardSpring}
            whileHover={{ y: -4, scale: 1.01, transition: cardHoverSpring }}
            className="holo-card p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Pillars</p>
                <h2 className="text-lg font-semibold">System radar</h2>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)] hover:text-[var(--accent)]"
                onClick={() => setRadarInfoOpen((p) => !p)}
                aria-label="Show radar info"
              >
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Info
              </button>
            </div>
            <div className="mt-3 h-56 w-full">
              <Suspense fallback={<div className="skeleton h-full w-full rounded-2xl" />}>
                <PillarsRadarLazy data={radarData} darkMode={darkMode} />
              </Suspense>
            </div>
            {radarInfoOpen && (
              <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--text)]">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Goals by component</p>
                  <button className="text-[var(--muted)] hover:text-[var(--accent)]" onClick={() => setRadarInfoOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {radarGoals.map(({ stat, goals: statGoals }) => (
                    <div key={stat} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{statFullName[stat]} ({stat})</p>
                      {statGoals.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-[var(--text)]">
                          {statGoals.map((g) => (
                            <li key={g.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">{g.name || g.activityType}</span>
                              <span className="text-[var(--muted)]">{g.period}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-[11px] text-[var(--muted)]">No goals tagged.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ y: 10, opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            transition={cardSpring}
            whileHover={{ y: -4, scale: 1.01, transition: cardHoverSpring }}
            className="holo-card p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Momentum</p>
                <h2 className="text-lg font-semibold">Goal velocity</h2>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">
                {goalHistories[selectedGoalId ?? -1]?.length ? 'Tracking' : 'Set a goal'}
              </span>
            </div>
            <div className="mt-4 h-64">
              <Suspense fallback={<div className="skeleton h-full w-full rounded-2xl" />}> 
                <TrendChartLazy data={chartData} darkMode={darkMode} />
              </Suspense>
            </div>
          </motion.section>
        </div>

        <section className="mt-8 grid gap-6 rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Reminders</p>
                <h2 className="mt-1 text-xl font-semibold">Today&apos;s goals</h2>
              </div>
              <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">Auto-sync</span>
            </div>
            <div className="space-y-2">
              {reminders.length === 0 && <p className="text-sm text-[var(--muted)]">All clear for today.</p>}
              {reminders.map((item) => (
                <label key={item.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleGoalTick(item.id)}
                    className="h-4 w-4"
                  />
                  <span className={clsx('flex-1', item.done ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]')}>{item.label}</span>
                  <span className="text-[11px] text-[var(--muted)]">Today</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Quiet hours</p>
                <h3 className="text-sm font-semibold text-[var(--text)]">Delay pings overnight</h3>
              </div>
              <select
                className="rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-1 text-[10px] text-[var(--text)]"
                value={quietTimezone}
                onChange={(e) => setQuietTimezone(e.target.value)}
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1 text-[var(--muted)]">
                Start
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="rounded border border-[var(--border)] bg-[var(--panel-strong)] px-2 py-1 text-[var(--text)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[var(--muted)]">
                End
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="rounded border border-[var(--border)] bg-[var(--panel-strong)] px-2 py-1 text-[var(--text)]"
                />
              </label>
            </div>
            <p className="text-xs text-[var(--muted)]">We&apos;ll hold reminder emails during these hours.</p>
          </div>
        </section>

        <div id="analytics-section" className="mt-10 grid gap-6 lg:grid-cols-3">
          <section className="glass-panel lg:col-span-2 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Activity Trends</p>
                <h2 className="mt-1 text-xl font-semibold">Last periods</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx('flex items-center gap-2 rounded-full px-3 py-1 text-xs shadow-inner transition', liveConnected ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--panel-strong)] text-[var(--muted)]')}>
                  <Pulse className="h-4 w-4" />
                  {liveConnected ? 'Live' : 'Offline'}
                </span>
                <span className="hidden sm:flex items-center gap-2 rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  {chartStats.total.toLocaleString()} total
                </span>
                <span className="hidden sm:flex items-center gap-2 rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-2)]" />
                  Peak {chartStats.peak.toLocaleString()}
                </span>
                {secondaryError && (
                  <button
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)] hover:text-[var(--accent)]"
                    onClick={refreshLiveData}
                    disabled={secondaryLoading}
                  >
                    {secondaryLoading ? 'Refreshing…' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-6 h-72 w-full">
              {loading && !dashboard ? (
                <div className="skeleton h-full w-full rounded-2xl" />
              ) : (
                <Suspense fallback={<div className="skeleton h-full w-full rounded-2xl" />}>
                  <TrendChartLazy data={chartData} darkMode={darkMode} />
                </Suspense>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Productivity</p>
                <h2 className="mt-1 text-xl font-semibold">Composite score</h2>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)] shadow-inner">Realtime</span>
            </div>
            <div className="mt-6">
              {loading && !dashboard ? (
                <div className="space-y-3">
                  <div className="skeleton h-12 border border-[var(--border)] bg-[var(--panel)]" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-10 border border-[var(--border)] bg-[var(--panel)]" />
                  ))}
                </div>
              ) : (
                <ProductivityGauge
                  score={score}
                  breakdown={breakdown}
                  icons={{ code: <TrendingUp className="h-4 w-4" />, study: <Brain className="h-4 w-4" />, health: <Dumbbell className="h-4 w-4" />, brand: <BookOpen className="h-4 w-4" /> }}
                />
              )}
            </div>
          </section>
        </div>

        {tickDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Log progress</p>
                  <h3 className="text-lg font-semibold text-[var(--text)]">{tickDialog.label}</h3>
                </div>
                <button
                  type="button"
                  className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--panel)] hover:text-[var(--accent)]"
                  onClick={() => setTickDialog(null)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex flex-col gap-1 text-sm text-[var(--muted)]">
                  Value for today
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={tickValue}
                    onChange={(e) => setTickValue(e.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-[var(--muted)]">
                  Details (optional)
                  <textarea
                    rows={3}
                    value={tickNote}
                    onChange={(e) => setTickNote(e.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                    placeholder="What did you complete? reps, notes, links..."
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-3 text-sm font-semibold">
                <button
                  type="button"
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--muted)] transition hover:text-[var(--accent)]"
                  onClick={() => setTickDialog(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[var(--accent)] px-5 py-2 text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] transition hover:-translate-y-[1px]"
                  onClick={() => void confirmTickDialog()}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section className="glass-panel rounded-3xl p-6 lg:col-span-2" ref={quickCaptureRef}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Log activity</p>
                <h2 className="mt-1 text-xl font-semibold">Quick capture</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={clsx(
                    'flex items-center gap-2 rounded-full border px-3 py-1',
                    healthStatus === 'ok'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : healthStatus === 'checking'
                        ? 'border-[var(--border)] text-[var(--muted)]'
                        : 'border-[var(--danger)] text-[var(--danger)]',
                  )}
                >
                  <span className={clsx('h-2 w-2 rounded-full', healthStatus === 'ok' ? 'bg-[var(--accent)]' : healthStatus === 'checking' ? 'bg-[var(--muted)]' : 'bg-[var(--danger)]')} />
                  API {healthStatus === 'ok' ? 'healthy' : healthStatus === 'checking' ? 'checking…' : 'unreachable'}
                </span>
                {upcomingBadgeNudge && (
                  <span className="flex items-center gap-2 rounded-full border border-[var(--accent)] px-3 py-1 text-[var(--accent)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    {upcomingBadgeNudge.delta.toFixed(0)}% to {upcomingBadgeNudge.tier.label} on {upcomingBadgeNudge.goal.name || upcomingBadgeNudge.goal.activityType.replace('_', ' ')}
                  </span>
                )}
                {paceInfo && (
                  <span className={clsx('rounded-full border px-3 py-1', paceInfo.ahead ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--danger)] text-[var(--danger)]')}>
                    Pace: {paceInfo.ahead ? 'Ahead' : 'Behind'} {Math.abs(paceInfo.delta)}%
                  </span>
                )}
                {paceInfo?.nextCheckIn && (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[var(--muted)]">Next check-in {paceInfo.nextCheckIn}</span>
                )}
                <button
                  type="button"
                  className="rounded-full border border-[var(--border)] px-3 py-2 text-[var(--text)] transition hover:text-[var(--accent)] disabled:opacity-50"
                  onClick={() => {
                    if (!lastActivity) return
                    const payload: ActivityRequest = {
                      ...lastActivity,
                      occurredAt: new Date().toISOString(),
                    }
                    void saveActivity(payload).catch((err) => {
                      console.error(err)
                      setError('Failed to repeat activity')
                      pushToast('Failed to repeat activity', 'error')
                    })
                  }}
                  disabled={!lastActivity}
                >
                  Log last again
                </button>
                <button className="btn-royal rounded-full px-4 py-2 text-sm font-semibold" onClick={handleSubmit}>
                  Save
                </button>
              </div>
            </div>
            {quickCaptureError && <p className="mt-2 text-sm text-[var(--danger)]">{quickCaptureError}</p>}
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <div className="sm:col-span-2">
                <label className="text-sm text-[var(--muted)]">Goal or activity</label>
                <div className="mt-2 grid gap-2">
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
                    value={quickGoalChoice === 'custom' ? 'custom' : String(quickGoalChoice)}
                    onChange={(e) => {
                      const choice = e.target.value
                      if (choice === 'custom') {
                        setQuickGoalChoice('custom')
                        setActivityFilter('')
                        return
                      }
                      const chosenId = Number(choice)
                      setQuickGoalChoice(chosenId)
                      const goal = goals.find((g) => g.id === chosenId)
                      if (goal) {
                        const { type, customLabel } = normalizeActivitySelection(goal.activityType as ActivityType)
                        setForm((prev) => ({
                          ...prev,
                          type,
                          metadata: customLabel ?? prev.metadata,
                          rpgStat: goal.rpgStat ?? prev.rpgStat ?? defaultStatByType[type] ?? 'STR',
                        }))
                        setActivityFilter(goal.name || goal.activityType.replace('_', ' '))
                      }
                    }}
                  >
                    <option value="custom">Custom activity</option>
                    {goalDropdownOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} {opt.detail ? `• ${opt.detail}` : ''}
                      </option>
                    ))}
                  </select>
                  {quickGoalChoice === 'custom' && (
                    <>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
                        placeholder="Search or type activity"
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        ref={activityFilterRef}
                      />
                      {bestActivitySuggestion && activityFilter.trim() && (
                        <button
                          type="button"
                          className="flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--text)] hover:text-[var(--accent)]"
                          onClick={() => {
                            const nextType = bestActivitySuggestion.value
                            setForm((prev) => ({ ...prev, type: nextType, rpgStat: defaultStatByType[nextType] ?? prev.rpgStat ?? 'STR' }))
                            setActivityFilter(bestActivitySuggestion.label)
                          }}
                        >
                          Use goal: {bestActivitySuggestion.label}
                        </button>
                      )}
                    </>
                  )}
                  {selectedGoal && quickGoalChoice !== 'custom' && (
                    <p className="text-xs text-[var(--muted)]">Selected goal: {selectedGoal.name || selectedGoal.activityType.replace('_', ' ')} — {selectedGoal.period.toLowerCase()} target {selectedGoal.targetValue ?? 0}{selectedGoal.unit ? ` ${selectedGoal.unit}` : ''}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-[var(--muted)]">Value</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
                  placeholder={matchingGoalForActivity?.unit ? `e.g. 3 ${matchingGoalForActivity.unit}` : 'e.g. 3'}
                  value={form.value ?? ''}
                  onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : null })}
                />
                {matchingGoalForActivity?.unit && <p className="mt-1 text-[11px] text-[var(--muted)]">Unit: {matchingGoalForActivity.unit}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                  <span>When</span>
                  <select
                    className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-xs"
                    value={logPeriod}
                    onChange={(e) => setLogPeriod(e.target.value as GoalPeriod)}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <input
                  type="datetime-local"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
                  value={form.occurredAt ?? logDate}
                  onChange={(e) => {
                    setForm({ ...form, occurredAt: e.target.value })
                    setLogDate(e.target.value)
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border)] px-3 py-1"
                    onClick={() => {
                      const nowIso = new Date().toISOString().slice(0, 16)
                      setForm({ ...form, occurredAt: nowIso })
                      setLogDate(nowIso)
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border)] px-3 py-1"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() - 1)
                      const iso = d.toISOString().slice(0, 16)
                      setForm({ ...form, occurredAt: iso })
                      setLogDate(iso)
                    }}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border)] px-3 py-1"
                    onClick={() => {
                      setForm({ ...form, occurredAt: '' })
                      setLogDate('')
                    }}
                  >
                    Custom
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-[var(--muted)]">Platform</label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
                  placeholder="github, leetcode, gym"
                  value={form.platform ?? ''}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-[var(--muted)]">Repository / link</label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
                  value={form.repository ?? ''}
                  onChange={(e) => setForm({ ...form, repository: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-[var(--muted)]">Notes</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Summary, links, intensity, focus area"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={autoApplyGoals}
                  onChange={(e) => setAutoApplyGoals(e.target.checked)}
                  className="h-4 w-4"
                  id="auto-apply-goals"
                />
                <label htmlFor="auto-apply-goals">Auto-apply to matching goals</label>
              </div>
            </form>
          </section>

          <LiveActivityFeed items={feed} loading={loading} />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <GoalProgress goals={dashboard?.goals ?? []} loading={loading && !dashboard} />
          <section className="glass-panel rounded-3xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goals</p>
                <h2 className="mt-1 text-xl font-semibold">Goal shortcuts</h2>
              </div>
              <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">Full experience on Goals HQ</span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="holo-card space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                <p className="text-sm font-semibold text-[var(--text)]">Log progress fast</p>
                <p className="text-sm text-[var(--muted)]">Use Quick Capture above; it now lists all your goals and auto-fills types.</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button className="rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-[var(--accent)]" onClick={focusQuickCapture}>
                    Jump to quick capture
                  </button>
                  <button className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--text)]" onClick={() => setCurrentPage('goals')}>
                    Open Goals HQ
                  </button>
                </div>
              </div>
              <div className="holo-card space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                <p className="text-sm font-semibold text-[var(--text)]">Today&apos;s focus</p>
                {goals.slice(0, 3).map((goal) => (
                  <div key={`short-${goal.id}`} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{goal.name || goal.activityType.replace('_', ' ')}</p>
                      <p className="text-[var(--muted)]">Target {goal.targetValue ?? 0}{goal.unit ? ` ${goal.unit}` : ''}</p>
                    </div>
                    <button className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text)]" onClick={() => toggleGoalTick(goal.id)}>
                      Mark today
                    </button>
                  </div>
                ))}
                {goals.length === 0 && <p className="text-sm text-[var(--muted)]">No goals yet. Create one in Goals HQ.</p>}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section id="goals-section" className="glass-panel rounded-3xl p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goal analytics</p>
                <h2 className="mt-1 text-xl font-semibold">Per-goal insights</h2>
              </div>
              <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">Week over week</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(goals.length ? goals : [{ id: -1, name: 'Demo goal', activityType: 'GITHUB_COMMITS', period: 'WEEKLY', targetValue: 10, currentValue: 6 } as Goal]).map((goal) => {
                const current = goal.currentValue ?? 0
                const target = goal.targetValue ?? 0
                const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
                const delta = Math.max(-100, Math.min(100, Math.round(pct - 50)))
                return (
                  <div key={goal.id} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--text)]">{(goal as Goal).name || goal.activityType.replace('_', ' ')}</span>
                      <span className={clsx('text-xs', delta >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                        {delta >= 0 ? '+' : ''}{delta}% vs target
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">Period: {goal.period}{(goal as Goal).customPeriodDays ? ` • Every ${(goal as Goal).customPeriodDays} days` : ''}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--panel)]">
                      <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">{current} / {target}{(goal as Goal).unit ? ` ${(goal as Goal).unit}` : ''} • {pct}%</p>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goal history</p>
            <h2 className="mt-1 text-xl font-semibold">Daily progress log</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {goalHistoryLoading && <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-[var(--muted)]">Loading…</span>}
            <button
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text)] transition hover:text-[var(--accent)] disabled:opacity-60"
              onClick={exportGoalHistory}
              disabled={goalHistoryLoading}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {goalHistoryLoading && goals.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 text-sm text-[var(--muted)]">Loading goal histories…</div>
          )}
          {!goalHistoryLoading && goalHistoryCards.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 text-sm text-[var(--muted)]">Add a goal to start logging progress.</div>
          )}
          {goalHistoryCards.map(({ goal, history }) => {
            const pct = goal.targetValue ? Math.min(100, Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100)) : 0
            const todayLabel = todayKey.slice(5)
            const doneToday = history.some((h) => h.label === todayLabel && h.value > 0)
            const yesterdayLabel = yesterdayKey.slice(5)
            const doneYesterday = history.some((h) => h.label === yesterdayLabel && h.value > 0)
            const average = history.length ? history.reduce((sum, h) => sum + h.value, 0) / history.length : 0
            const { streak, bestStreak, completionRate, missedDays } = (() => {
              let current = 0
              let best = 0
              let positive = 0
              history.forEach((h) => {
                if (h.value > 0) {
                  positive += 1
                  current += 1
                  best = Math.max(best, current)
                } else {
                  current = 0
                }
              })
              const totalDays = history.length || 1
              const completion = Math.round((positive / totalDays) * 100)
              return { streak: current, bestStreak: best, completionRate: completion, missedDays: Math.max(0, totalDays - positive) }
            })()
            const nextMilestone = Math.max(0, (goal.targetValue ?? 0) - (goal.currentValue ?? 0))
            return (
              <section key={`detail-${goal.id}`} className="glass-panel rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goal detail</p>
                    <h3 className="text-lg font-semibold text-[var(--text)]">{goal.name || goal.activityType.replace('_', ' ')}</h3>
                    <p className="text-xs text-[var(--muted)]">{goal.activityType.replace('_', ' ')} • Period: {goal.period}{goal.customPeriodDays ? ` • Every ${goal.customPeriodDays} days` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)] transition hover:text-[var(--accent)]"
                      onClick={() => openBackfill(goal.id)}
                    >
                      Backfill
                    </button>
                    <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">{pct}%</span>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--panel-strong)]">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">{goal.currentValue ?? 0} / {goal.targetValue ?? 0}{goal.unit ? ` ${goal.unit}` : ''}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{doneToday ? 'Today logged' : 'Today pending'}</span>
                  <span>Avg 7d: {average.toFixed(1)} • Streak: {streak}d</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>Completion: {completionRate}% • Missed: {missedDays}</span>
                  <span>Best streak: {bestStreak}d</span>
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">Next milestone: {nextMilestone > 0 ? `${nextMilestone} remaining` : 'Target hit'}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="w-24 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)]"
                    value={goalEntryValues[goal.id] ?? ''}
                    placeholder="Today"
                    onChange={(e) => setGoalEntryValues((prev) => ({ ...prev, [goal.id]: Number(e.target.value) }))}
                  />
                  <button
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs text-white shadow transition hover:shadow-lg disabled:opacity-60"
                    onClick={() => void setTodayValue(goal.id, goalEntryValues[goal.id] ?? 0)}
                    disabled={goalEntryValues[goal.id] === undefined}
                  >
                    Save today
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                  <button
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text)] transition hover:text-[var(--accent)]"
                    onClick={() => void markYesterday(goal.id)}
                    disabled={doneYesterday}
                  >
                    {doneYesterday ? 'Yesterday logged' : 'Mark yesterday'}
                  </button>
                  <button
                    className="text-[var(--muted)] underline-offset-4 transition hover:text-[var(--text)] hover:underline"
                    onClick={() => void applyGoalProgress(goal.id, todayKey, 0, { silent: true })}
                  >
                    Reset today
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-[var(--muted)]">Last 7 days</p>
                  <div className="mt-2">
                    <GoalSparkline data={history} />
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="holo-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Ranked lobby</p>
                <h2 className="mt-1 text-xl font-semibold">Peers & you</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">Demo + live</span>
                {secondaryError && (
                  <button
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)] hover:text-[var(--accent)]"
                    onClick={refreshLiveData}
                    disabled={secondaryLoading}
                  >
                    {secondaryLoading ? 'Refreshing…' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {loading && !leaderboard.length && (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton h-14 border border-[var(--border)] bg-[var(--panel-strong)]" />
                  ))}
                </>
              )}
              {!loading && leaderboard.map((entry) => {
                const podium = entry.rank <= 3
                const glow = entry.rank === 1 ? 'shadow-[0_0_18px_rgba(255,215,0,0.45)] border-yellow-400/60' : entry.rank === 2 ? 'shadow-[0_0_18px_rgba(192,192,192,0.35)] border-slate-200/50' : entry.rank === 3 ? 'shadow-[0_0_18px_rgba(205,127,50,0.35)] border-amber-500/50' : ''
                return (
                  <div
                    key={`${entry.user}-${entry.rank}`}
                    className={clsx('flex items-center justify-between rounded-md border bg-[var(--panel-strong)] px-3 py-2 text-sm glitch-hover', glow || 'border-[var(--border)]')}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--muted)]">#{entry.rank}</span>
                      <div>
                        <p className="font-medium text-[var(--text)]">{entry.user}</p>
                        <p className="text-xs text-[var(--muted)]">{entry.metric}: {entry.value?.toFixed?.(1) ?? entry.value}</p>
                      </div>
                    </div>
                    <Sparkles className={`h-4 w-4 ${podium ? 'text-yellow-300' : 'text-[var(--accent)]'}`} />
                  </div>
                )
              })}
              {!loading && leaderboard.length === 0 && <p className="text-sm text-[var(--muted)]">No leaderboard data yet.</p>}
            </div>
          </section>

          <section className="holo-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Achievements</p>
                <h2 className="mt-1 text-xl font-semibold">Medals & badges</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">Live soon</span>
                {secondaryError && (
                  <button
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)] hover:text-[var(--accent)]"
                    onClick={refreshLiveData}
                    disabled={secondaryLoading}
                  >
                    {secondaryLoading ? 'Refreshing…' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {loading && !achievements.length && (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton h-16 border border-[var(--border)] bg-[var(--panel-strong)]" />
                  ))}
                </>
              )}
              {!loading && achievements.map((ach) => (
                <div key={ach.title} className="badge-shine rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-[var(--text)]">{ach.title}</p>
                      <p className="text-xs text-[var(--muted)]">{ach.description}</p>
                    </div>
                    <span className={clsx('text-xs font-semibold', ach.unlocked ? 'text-[var(--accent-3)]' : 'text-[var(--muted)]')}>{ach.unlocked ? 'Unlocked' : `${Math.round((ach.progress ?? 0) * 100)}%`}</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--panel)]">
                    <div
                      className="hp-bar h-full"
                      style={{ width: `${Math.min(100, Math.round((ach.progress ?? 0) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
              {!loading && achievements.length === 0 && <p className="text-sm text-[var(--muted)]">No achievements yet.</p>}
            </div>
          </section>
        </div>
        {backfillGoalId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-6 shadow-2xl">
              {(() => {
                const goal = goals.find((g) => g.id === backfillGoalId)
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Backfill goal</p>
                        <p className="text-lg font-semibold text-[var(--text)]">{goal?.activityType.replace('_', ' ') ?? 'Goal'}</p>
                      </div>
                      <button className="text-[var(--muted)] hover:text-[var(--accent)]" onClick={closeBackfill}>
                        Close
                      </button>
                    </div>
                    <div className="grid gap-3">
                      <label className="text-sm text-[var(--muted)]">Date</label>
                      <input
                        type="date"
                        value={backfillDate}
                        onChange={(e) => setBackfillDate(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                        max={todayKey}
                      />
                      <label className="text-sm text-[var(--muted)]">Value</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={backfillValue}
                        onChange={(e) => setBackfillValue(Number(e.target.value))}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                      />
                      {backfillError && <p className="text-xs text-[var(--danger)]">{backfillError}</p>}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] hover:text-[var(--accent)]"
                        onClick={closeBackfill}
                        disabled={backfillSaving}
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white shadow-lg transition hover:shadow-xl disabled:opacity-60"
                        onClick={() => void submitBackfill()}
                        disabled={backfillSaving}
                      >
                        {backfillSaving ? 'Saving…' : 'Save backfill'}
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        
        </>
      ) : (
        <div className="mt-10 space-y-8">
          <section className="holo-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goals HQ</p>
                <h2 className="mt-1 text-2xl font-semibold">All objectives, one view</h2>
                <p className="text-sm text-[var(--muted)]">Drill into targets, streaks, and pacing without leaving the page.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--text)] transition hover:text-[var(--accent)]"
                  onClick={() => setCurrentPage('dashboard')}
                >
                  Back to dashboard
                </button>
                <button
                  className="rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
                  onClick={openGoalsWorkspace}
                >
                  Open goals workspace
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs text-[var(--muted)]">Active goals</p>
                <p className="text-2xl font-semibold text-[var(--text)]">{goals.length || '—'}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs text-[var(--muted)]">Avg completion</p>
                <p className="text-2xl font-semibold text-[var(--text)]">
                  {goals.length
                    ? `${Math.round(
                        goals.reduce((sum, g) => sum + Math.min(100, Math.round(((g.currentValue ?? 0) / Math.max(1, g.targetValue ?? 1)) * 100)), 0) / goals.length,
                      )}%`
                    : '—'}
                </p>
              </div>
              <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs text-[var(--muted)]">Best streak</p>
                <p className="text-2xl font-semibold text-[var(--text)]">{goals.length ? Math.max(...goals.map((g) => goalStreaksFor(g.id).streak)) : 0}d</p>
              </div>
              <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs text-[var(--muted)]">Daily reminders</p>
                <p className="text-2xl font-semibold text-[var(--text)]">{reminders.length || '—'}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Goals gallery</p>
                <h3 className="text-xl font-semibold text-[var(--text)]">Progress, pacing, and unlocks</h3>
              </div>
              <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">Realtime synced</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(goals.length ? goals : [{ id: -1, name: 'Demo Goal', activityType: 'GITHUB_COMMITS', period: 'WEEKLY', targetValue: 10, currentValue: 4, unit: 'commits' } as Goal]).map((goal) => {
                const target = goal.targetValue ?? 0
                const current = goal.currentValue ?? 0
                const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
                return (
                  <div key={`goal-card-${goal.id}`} className="holo-card space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">{goal.period}</p>
                        <h4 className="text-lg font-semibold text-[var(--text)]">{goal.name || goal.activityType.replace('_', ' ')}</h4>
                        <p className="text-xs text-[var(--muted)]">Target {target} {goal.unit || ''}</p>
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--panel)]">
                      <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>Current: {current}</span>
                      <span>Needed: {Math.max(0, target - current)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text)] transition hover:text-[var(--accent)]"
                        onClick={() => setGoalEntryValues((prev) => ({ ...prev, [goal.id]: (goalEntryValues[goal.id] ?? goal.targetValue ?? 1) }))}
                      >
                        Set today&apos;s value
                      </button>
                      <button
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text)] transition hover:text-[var(--accent)]"
                        onClick={() => openBackfill(goal.id)}
                      >
                        Backfill
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className="w-24 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)]"
                        value={goalEntryValues[goal.id] ?? ''}
                        placeholder="Today"
                        onChange={(e) => setGoalEntryValues((prev) => ({ ...prev, [goal.id]: Number(e.target.value) }))}
                      />
                      <button
                        className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs text-white shadow transition hover:shadow-lg disabled:opacity-60"
                        onClick={() => void setTodayValue(goal.id, goalEntryValues[goal.id] ?? 0)}
                        disabled={goalEntryValues[goal.id] === undefined}
                      >
                        Save today
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="glass-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Create or update</p>
                <h3 className="text-xl font-semibold text-[var(--text)]">Plan and track smarter</h3>
                <p className="text-sm text-[var(--muted)]">Use goals to automate reminders and pacing. Quick capture will push progress automatically.</p>
              </div>
              <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs text-[var(--muted)]">Auto-updates on save</span>
            </div>
            <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={handleGoalSubmit}>
              <div className="sm:col-span-2">
                <label className="text-sm text-[var(--muted)]">Goal name</label>
                <input
                  type="text"
                  className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 focus:placeholder-transparent ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                  placeholder="e.g. 30 commits sprint"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  maxLength={120}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm text-[var(--muted)]">Activity (type anything)</label>
                <input
                  type="text"
                  className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 focus:placeholder-transparent ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                  placeholder="e.g. Deep Work, Underwater Hockey"
                  value={goalForm.activityInput}
                  onChange={(e) => setGoalForm({ ...goalForm, activityInput: e.target.value })}
                  autoComplete="off"
                  required
                />
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  {activityOptions
                    .filter((opt) => opt.label.toLowerCase().includes(goalForm.activityInput.trim().toLowerCase()) || goalForm.activityInput.trim() === '')
                    .slice(0, 4)
                    .map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[var(--text)] hover:text-[var(--accent)]"
                        onClick={() => setGoalForm({ ...goalForm, activityInput: opt.label, activityType: opt.value })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  {goalForm.activityInput.trim() && (
                    <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1">Create “{goalForm.activityInput.trim()}”</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-[var(--muted)]">Period</label>
                <select
                  className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                  value={goalForm.period}
                  onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value as GoalPeriod })}
                >
                  {['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'].map((p) => (
                    <option key={p} value={p}>
                      {p === 'CUSTOM' ? 'Custom (enter days)' : p}
                    </option>
                  ))}
                </select>
                {goalForm.period === 'CUSTOM' && (
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      className={`w-40 rounded-xl border px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                      placeholder="Days"
                      value={goalForm.customPeriodDays ?? ''}
                      onChange={(e) => setGoalForm({ ...goalForm, customPeriodDays: e.target.value ? Number(e.target.value) : null })}
                    />
                    <span className="text-xs text-[var(--muted)]">e.g. 10 for every 10 days</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                <div>
                  <label className="text-sm text-[var(--muted)]">Target</label>
                  <input
                    type="number"
                    className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                    value={goalForm.targetValue ?? ''}
                    onChange={(e) => setGoalForm({ ...goalForm, targetValue: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--muted)]">Unit</label>
                  <input
                    type="text"
                    className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 focus:placeholder-transparent ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                    placeholder="mins, pages, reps"
                    value={goalForm.unit}
                    onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                    maxLength={32}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-[var(--muted)]">RPG stat</label>
                <select
                  className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                  value={goalForm.rpgStat ?? defaultStatByType[goalForm.activityType]}
                  onChange={(e) => setGoalForm({ ...goalForm, rpgStat: e.target.value as RpgStat })}
                >
                  {(['STR', 'DEX', 'INT', 'WIS', 'CHA', 'VIT'] as RpgStat[]).map((stat) => (
                    <option key={stat} value={stat}>
                      {stat === 'STR' ? 'Strength' : stat === 'DEX' ? 'Dexterity' : stat === 'INT' ? 'Intelligence' : stat === 'WIS' ? 'Wisdom' : stat === 'CHA' ? 'Charisma' : 'Vitality'} ({stat})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-[var(--muted)]">Start date (optional)</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([
                    { key: 'today', label: 'Today', date: todayStr },
                    { key: 'tomorrow', label: 'Tomorrow', date: tomorrowStr },
                    { key: 'custom', label: 'Custom', date: goalForm.startDate },
                  ] as const).map((opt) => (
                    <button
                      type="button"
                      key={opt.key}
                      className={clsx(
                        'rounded-full border px-4 py-2 text-sm transition',
                        startDatePreset === opt.key ? 'border-[var(--accent)] text-[var(--accent)] shadow-[0_10px_30px_-16px_var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)]',
                      )}
                      onClick={() => {
                        setStartDatePreset(opt.key)
                        if (opt.key === 'custom' && !goalForm.startDate) setGoalForm((prev) => ({ ...prev, startDate: '' }))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {startDatePreset === 'custom' ? (
                  <input
                    type="date"
                    className={`mt-3 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                    value={goalForm.startDate}
                    onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                  />
                ) : (
                  <p className="mt-3 text-xs text-[var(--muted)]">Scheduled for {startDatePreset === 'today' ? 'today' : 'tomorrow'} ({goalForm.startDate || (startDatePreset === 'today' ? todayStr : tomorrowStr)})</p>
                )}
              </div>
              <div>
                <label className="text-sm text-[var(--muted)]">End date (optional)</label>
                <input
                  type="date"
                  className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-0 ${darkMode ? 'bg-slate-900/90 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/40' : 'bg-[#FDFBF7] border-amber-900/50 focus:border-emerald-800 focus:ring-emerald-800/30'}`}
                  value={goalForm.endDate}
                  onChange={(e) => setGoalForm({ ...goalForm, endDate: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button type="submit" className="btn-royal btn-shimmer w-full rounded-xl px-4 py-3 text-sm font-semibold">
                  Save goal
                </button>
              </div>
              {goalFormError && <p className="text-sm text-[var(--danger)]">{goalFormError}</p>}
            </form>
          </section>
        </div>
      )}
        <footer className="mt-14 rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)]/92 px-8 py-10 shadow-[0_18px_70px_rgba(0,0,0,0.4)]">
          <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3 text-center md:text-left">
              <p className="text-2xl font-semibold text-[var(--text)]">Built by Vivek Yadav</p>
              <p className="text-sm text-[var(--muted)]">If you like this dashboard, check out more projects and reach out on GitHub.</p>
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                <span className="h-px w-8 bg-[var(--border)]" />
                <span>Stay connected</span>
                <span className="h-px w-8 bg-[var(--border)]" />
              </div>
              <a
                href="https://github.com/Vivek-Ya"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:-translate-y-[1px] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Github className="h-4 w-4" />
                <span>Visit my GitHub</span>
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
