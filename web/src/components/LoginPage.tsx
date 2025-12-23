import { useState } from 'react'
import { Moon, Sun, Mail, Lock, ArrowRight, ShieldCheck, Sparkles, Github } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import axios from 'axios'
import { API_BASE } from '../api/client'

type Props = {
  darkMode: boolean
  onToggleTheme: () => void
  onLogin: (email: string, password: string) => Promise<void>
  onSignup: (name: string, email: string, password: string) => Promise<void>
  onGoogle: () => void
}

export function LoginPage({ darkMode, onToggleTheme, onLogin, onSignup, onGoogle }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordIssues = () => {
    const issues: string[] = []
    if (!password || password.length < 8) issues.push('At least 8 characters')
    if (!/[A-Za-z]/.test(password)) issues.push('Include a letter')
    if (!/\d/.test(password)) issues.push('Include a number')
    return issues
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Name is required to create your account.')
          return
        }
        const issues = passwordIssues()
        if (issues.length) {
          setError(`Password needs: ${issues.join(', ')}`)
          return
        }
        await onSignup(name, email, password)
      } else {
        await onLogin(email, password)
      }
    } catch (err) {
      console.error(err)
      const fallback = mode === 'signup' ? 'Signup failed. Check inputs or try again.' : 'Login failed. Check your credentials or token settings.'
      if (axios.isAxiosError(err) && err.code === 'ERR_NETWORK') {
        setError(`Cannot reach API at ${API_BASE}. Start the backend or set VITE_API_BASE.`)
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Unauthorized. Verify email/password or reset your password.')
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Forbidden. Your account may be disabled or missing roles.')
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message) || fallback)
      } else if (err instanceof Error && err.message) {
        setError(err.message || fallback)
      } else {
        setError(fallback)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={clsx(darkMode ? 'theme-night' : 'theme-day', 'relative min-h-screen flex items-center justify-center px-6 py-10 text-[var(--text)] transition-colors overflow-hidden')}>
      {/* animated background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.08),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_30%)]" />
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[var(--accent)]/60"
            initial={{ opacity: 0, x: Math.random() * 1200, y: Math.random() * 800 }}
            animate={{
              opacity: [0.1, 0.7, 0.1],
              x: ['0%', '8%', '-4%'],
              y: ['0%', '-6%', '4%'],
              scale: [0.8, 1.2, 0.9],
            }}
            transition={{ duration: 7 + Math.random() * 6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
          />
        ))}
      </div>

      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">Life Data OS</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: 'easeInOut' }}
                >
                  <h1 className="mt-2 text-3xl sm:text-4xl font-semibold">{mode === 'signup' ? 'Create account' : 'Welcome back'}</h1>
                  <p className="mt-2 text-sm text-[var(--muted)]">{mode === 'signup' ? 'Spin up your control room profile.' : 'Sign in to see your live dashboard.'}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <button
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[var(--muted)] shadow-lg backdrop-blur"
              onClick={onToggleTheme}
              aria-label="Toggle theme"
            >
              <div className={clsx('relative flex h-8 w-14 items-center rounded-full px-1 transition-all', darkMode ? 'bg-slate-800' : 'bg-slate-200')}>
                <motion.div
                  layout
                  className={clsx('flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white shadow-lg')}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </motion.div>
              </div>
            </button>
          </div>

          <div className="mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1 text-xs shadow-inner backdrop-blur">
            <button
              type="button"
              className={clsx(
                'rounded-full px-3 py-1 transition-all duration-300',
                mode === 'login'
                  ? darkMode
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-[0_8px_24px_-12px_rgba(34,211,238,0.6)]'
                    : 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-600 text-white shadow-[0_10px_30px_-14px_rgba(27,77,62,0.65)]'
                  : 'text-[var(--muted)]'
              )}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={clsx(
                'rounded-full px-3 py-1 transition-all duration-300',
                mode === 'signup'
                  ? darkMode
                    ? 'bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white shadow-[0_8px_24px_-12px_rgba(168,85,247,0.5)]'
                    : 'bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-500 text-white shadow-[0_10px_30px_-14px_rgba(27,77,62,0.65)]'
                  : 'text-[var(--muted)]'
              )}
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-[var(--danger)]/40 bg-[var(--panel)]/60 p-3 text-xs text-[var(--danger)] shadow-inner" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <motion.form
            layout
            transition={{ layout: { duration: 0.32, ease: 'easeInOut' } }}
            className="mt-6 space-y-5"
            onSubmit={handleSubmit}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {mode === 'signup' && (
                <motion.label
                  key="name"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                  className="block text-sm text-[var(--muted)]"
                >
                  Name
                  <div className="group mt-2 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/5 px-4 py-3 backdrop-blur transition focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.18)]">
                    <Sparkles className="h-4 w-4 text-[var(--muted)] transition group-focus-within:text-[var(--accent)]" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent text-sm text-[var(--text)] outline-none"
                      placeholder="Your name"
                    />
                  </div>
                </motion.label>
              )}
            </AnimatePresence>
            <label className="block text-sm text-[var(--muted)]">
              Email
              <div className="group mt-2 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/5 px-4 py-3 backdrop-blur transition focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.18)]">
                <Mail className="h-4 w-4 text-[var(--muted)] transition group-focus-within:text-[var(--accent)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm text-[var(--text)] outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block text-sm text-[var(--muted)]">
              Password
              <div className="group mt-2 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/5 px-4 py-3 backdrop-blur transition focus-within:border-[var(--accent-2)] focus-within:shadow-[0_0_0_3px_rgba(168,85,247,0.18)]">
                <Lock className="h-4 w-4 text-[var(--muted)] transition group-focus-within:text-[var(--accent-2)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-[var(--text)] outline-none"
                  placeholder="••••••••"
                />
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-[11px] text-[var(--muted)]">At least 8 characters, including a letter and a number.</p>
              )}
            </label>

            <p className="text-[11px] text-[var(--muted)]">
              API target: {API_BASE}/api. Ensure the backend is running there or set VITE_API_BASE.
            </p>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              className={clsx(
                'relative flex w/full items-center justify-center gap-2 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl transition',
                darkMode
                  ? 'bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-400 shadow-[0_10px_40px_-18px_rgba(16,185,129,0.6)]'
                  : 'bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-500 shadow-[0_12px_42px_-18px_rgba(27,77,62,0.7)]',
                loading && 'opacity-70',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${mode}-${loading ? 'loading' : 'ready'}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="relative z-10 drop-shadow"
                >
                  {loading ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in with email'}
                </motion.span>
              </AnimatePresence>
              <motion.span
                className="relative z-10 flex items-center"
                animate={{ x: loading ? 0 : [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight className="h-4 w-4 drop-shadow" />
              </motion.span>
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.35)_70%)] opacity-0 transition hover:opacity-100" />
            </motion.button>

            <motion.button
              type="button"
              onClick={onGoogle}
              whileHover={{ y: -2 }}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm font-medium text-[var(--text)] shadow-lg transition"
            >
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-white/5" />
              <ShieldCheck className="h-4 w-4 text-[var(--accent)] transition group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span className="relative">Continue with Google</span>
            </motion.button>
          </motion.form>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="rounded-3xl border border-white/10 bg-white/8 p-8 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 text-[var(--muted)]">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-xs uppercase tracking-[0.25em]">Preview</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Futuristic control room</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Live productivity, streaks, and goals in a premium dual-mode UI.</p>
          </div>
          <div className="mt-6 grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--panel)] text-[var(--accent)] shadow-inner">
                      <Github className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">GitHub Commits</p>
                      <p className="text-xs text-[var(--muted)]">Streak • 7 days</p>
                    </div>
                  </div>
                  <span className="text-[var(--accent)] text-sm">+12%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
