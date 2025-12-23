import axios from 'axios'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type {
  ActivityRequest,
  ActivityResponse,
  DashboardSummary,
  Goal,
  LeaderboardEntry,
  Achievement,
  ActivityType,
  GoalPeriod,
  AuthResponse,
  Profile,
  UpdateProfilePayload,
  GoalHistoryEntry,
} from './types'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8080'
const TOKEN_KEY = 'lifedash_token'

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10000,
})

const storedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`
}

let unauthorizedHandler: (() => void) | null = null

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      setToken(null)
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

export function setToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    delete api.defaults.headers.common.Authorization
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard')
  return data
}

export async function loginEmail(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  setToken(data.token)
  return data
}

export async function signupEmail(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/signup', { name, email, password })
  setToken(data.token)
  return data
}

export function startGoogleLogin() {
  window.location.href = `${API_BASE}/oauth2/authorization/google`
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/actuator/health`)
    if (!res.ok) return false
    const body = await res.json()
    return body?.status === 'UP'
  } catch {
    return false
  }
}

export async function fetchActivityFeed(limit = 20): Promise<ActivityResponse[]> {
  const { data } = await api.get<ActivityResponse[]>(`/activities/feed`, { params: { limit } })
  return data
}

export async function createActivity(payload: ActivityRequest): Promise<ActivityResponse> {
  const { data } = await api.post<ActivityResponse>('/activities', payload)
  return data
}

type GoalPayload = {
  name: string
  activityType: ActivityType
  period: GoalPeriod
  targetValue: number
  unit?: string | null
  customPeriodDays?: number | null
  startDate?: string | null
  endDate?: string | null
  rpgStat?: string | null
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data } = await api.get<Goal[]>('/goals')
  return data
}

export async function fetchGoalHistory(goalId: number): Promise<GoalHistoryEntry[]> {
  const { data } = await api.get<GoalHistoryEntry[]>(`/goals/${goalId}/history`)
  return data
}

export async function upsertGoal(payload: GoalPayload): Promise<Goal> {
  const { data } = await api.post<Goal>('/goals', payload)
  return data
}

export async function setGoalProgress(goalId: number, value: number, date?: string): Promise<GoalHistoryEntry> {
  const { data } = await api.post<GoalHistoryEntry>(`/goals/${goalId}/history`, null, {
    params: {
      value,
      ...(date ? { date } : {}),
    },
  })
  return data
}

export async function deleteGoal(id: number): Promise<void> {
  await api.delete(`/goals/${id}`)
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>('/dashboard/leaderboard')
  return data
}

export async function fetchAchievements(): Promise<Achievement[]> {
  const { data } = await api.get<Achievement[]>('/dashboard/achievements')
  return data
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>('/profile')
  return data
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<Profile> {
  const { data } = await api.patch<Profile>('/profile', payload)
  return data
}

export async function uploadAvatar(file: File): Promise<Profile> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<Profile>('/profile/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteAvatar(): Promise<Profile> {
  const { data } = await api.delete<Profile>('/profile/avatar')
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/password/change', { currentPassword, newPassword })
}

export function connectLive(
  onMessage: (activity: ActivityResponse) => void,
  callbacks?: { onConnect?: () => void; onDisconnect?: () => void },
) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
    reconnectDelay: 5000,
    debug: () => {},
  })
  client.onConnect = () => {
    callbacks?.onConnect?.()
    client.subscribe('/topic/activity', (frame) => {
      if (frame.body) {
        try {
          const parsed = JSON.parse(frame.body) as ActivityResponse
          onMessage(parsed)
        } catch (err) {
          console.error('Failed to parse activity message', err)
        }
      }
    })
  }
  client.onStompError = () => callbacks?.onDisconnect?.()
  client.onWebSocketClose = () => callbacks?.onDisconnect?.()
  client.activate()
  return client
}

export { API_BASE }
