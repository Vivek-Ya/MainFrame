import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

interface UserStatusClusterProps {
  avatarUrl?: string | null
  fallbackAvatar?: string
  secureState?: 'secure' | 'alert'
  progress?: number // 0..1
  darkMode?: boolean
  onClick?: () => void
}

export function UserStatusCluster({
  avatarUrl,
  fallbackAvatar = '/avatars/male.svg',
  secureState = 'secure',
  progress = 0.5,
  darkMode = false,
  onClick,
}: UserStatusClusterProps) {
  const pct = Math.max(0, Math.min(progress, 1))
  const circumference = 2 * Math.PI * 36 // r = 36
  const dash = circumference * pct
  const offset = circumference - dash

  const secureColor = darkMode ? 'rgba(92,244,255,0.9)' : 'rgba(27,77,62,0.9)'
  const alertColor = darkMode ? 'rgba(255,79,110,0.95)' : 'rgba(190,24,24,0.9)'
  const ringBase = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(27,77,62,0.18)'
  const ringGlow = darkMode ? '0 0 18px rgba(92,244,255,0.45)' : '0 0 14px rgba(27,77,62,0.28)'

  const shieldColor = secureState === 'secure' ? secureColor : alertColor
  const pulseClass = secureState === 'secure' ? '' : 'animate-pulse'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center justify-center rounded-full p-1 outline-none"
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      aria-label="Open control center"
    >
      <div className="relative h-16 w-16">
        <svg className="absolute inset-0" viewBox="0 0 80 80" aria-hidden>
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={ringBase}
            strokeWidth="4"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={shieldColor}
            strokeWidth="5"
            strokeDasharray={`${dash} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(${ringGlow})` }}
          />
        </svg>
        <div className="absolute inset-[6px] overflow-hidden rounded-full border border-[var(--border)] bg-[var(--panel-strong)]">
          <img
            src={avatarUrl || fallbackAvatar}
            alt="Profile avatar"
            className="h-full w-full object-cover"
          />
        </div>
        <motion.div
          className={`absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-strong)] shadow-lg ${pulseClass}`}
          style={{
            color: shieldColor,
            boxShadow: `0 0 12px ${shieldColor}`,
          }}
          layout
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
        >
          {secureState === 'secure' ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5" />
          )}
        </motion.div>
      </div>
    </motion.button>
  )
}
