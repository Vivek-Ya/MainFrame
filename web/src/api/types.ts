export type ActivityType =
  | 'GITHUB_COMMITS'
  | 'STUDY'
  | 'GYM'
  | 'LINKEDIN_POST'
  | 'DSA'
  | 'CUSTOM'
  | (string & {})

export type RpgStat = 'STR' | 'INT' | 'CHA' | 'VIT' | 'DEX' | 'WIS'

export type GoalPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM'

export type ActivityRequest = {
  type: ActivityType
  rpgStat?: RpgStat | null
  description?: string
  value?: number | null
  metadata?: string | null
  occurredAt?: string | null
  platform?: string | null
  repository?: string | null
  difficulty?: string | null
  timeSpentMinutes?: number | null
  setsCompleted?: number | null
  repsCompleted?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
}

export type ActivityResponse = {
  id: number
  type: ActivityType
  rpgStat?: RpgStat | null
  description: string | null
  value: number | null
  metadata: string | null
  occurredAt: string
  platform?: string | null
  repository?: string | null
  difficulty?: string | null
  timeSpentMinutes?: number | null
  setsCompleted?: number | null
  repsCompleted?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
}

export type DashboardSummary = {
  productivityScore: number
  breakdown: Record<string, number>
  rpgStats: Record<string, number>
  trends: { label: string; points: { period: string; value: number }[] }[]
  streaks: { activityType: string; length: number }[]
  milestones: { activityType: string; message: string }[]
  goals: { id: number; activityType: string; name: string; period: string; currentValue: number | null; targetValue: number | null; progress: number | null; unit?: string | null; customPeriodDays?: number | null; rpgStat?: string | null }[]
}

export type Goal = {
  id: number
  name: string
  activityType: ActivityType
  period: GoalPeriod
  targetValue: number | null
  currentValue: number | null
  unit?: string | null
  customPeriodDays?: number | null
  startDate?: string | null
  endDate?: string | null
  rpgStat?: RpgStat | null
}

export type GoalHistoryEntry = {
  date: string
  value: number
}

export type LeaderboardEntry = {
  user: string
  metric: string
  value: number
  rank: number
}

export type Achievement = {
  title: string
  description: string
  progress: number
  unlocked: boolean
}

export type AuthResponse = {
  token: string
  userId: number
  name: string
  email: string
  roles: string[]
}

export type Profile = {
  id: number
  name: string
  email: string
  themePreference: string | null
  notificationsEnabled: boolean | null
  weeklyEmailEnabled: boolean | null
  timezone: string | null
  trackedActivities: string[] | null
  passwordResetExpiry: string | null
  avatarUrl: string | null
  gender: string | null
}

export type UpdateProfilePayload = {
  name?: string
  themePreference?: string | null
  notificationsEnabled?: boolean | null
  weeklyEmailEnabled?: boolean | null
  timezone?: string | null
  trackedActivities?: string[] | null
  avatarUrl?: string | null
  gender?: string | null
}
