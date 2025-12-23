import React, { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { Shape } from 'canvas-confetti'
import { ArrowRight, Share2, X } from 'lucide-react'

interface CelebrationProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  isDark: boolean
}

const spotlightTransition = { type: 'spring', damping: 20, stiffness: 220, duration: 0.8 }

export const CelebrationOverlay: React.FC<CelebrationProps> = ({
  isOpen,
  onClose,
  title = 'Milestone Unlocked',
  subtitle = 'You have successfully shipped 50 commits this week.',
  isDark,
}) => {
  // Prepare lightweight custom shape for shards in dark mode
  const neonShard: Shape | undefined = useMemo(() => {
    if (!isDark) return undefined
    try {
      return confetti.shapeFromText({ text: '✦' })
    } catch {
      return undefined
    }
  }, [isDark])

  useEffect(() => {
    if (!isOpen) return

    const duration = 3200
    const end = Date.now() + duration

    const goldPalette = ['#C5A059', '#E5E4E2', '#1B4D3E', '#F2F0E9']
    const neonPalette = ['#00F0FF', '#BD00FF', '#FFFFFF']
    const colors = isDark ? neonPalette : goldPalette
    const shapes = isDark ? (neonShard ? [neonShard, 'square'] : ['square']) : ['square', 'circle']

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.9 },
        colors,
        shapes: shapes as any,
        scalar: 1.4,
        drift: 0.9,
        ticks: 320,
        gravity: 0.8,
      })

      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.9 },
        colors,
        shapes: shapes as any,
        scalar: 1.4,
        drift: -0.9,
        ticks: 320,
        gravity: 0.8,
      })

      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [isOpen, isDark, neonShard])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.02, opacity: 0.35 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.22),_transparent_60%)] blur-3xl"
          />

          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={spotlightTransition}
            className={`relative w-full max-w-lg overflow-hidden rounded-3xl border px-8 py-9 text-center shadow-2xl ${
              isDark
                ? 'border-white/10 bg-[rgba(8,12,26,0.92)] shadow-[0_20px_90px_rgba(0,0,0,0.65)]'
                : 'border-white/40 bg-[rgba(253,251,247,0.95)] shadow-[0_24px_80px_rgba(27,77,62,0.18)]'
            }`}
          >
            <div
              className={`absolute inset-0 opacity-45 blur-2xl ${
                isDark
                  ? 'bg-[radial-gradient(circle_at_50%_35%,rgba(0,240,255,0.18),transparent_55%),radial-gradient(circle_at_20%_20%,rgba(189,0,255,0.12),transparent_40%)]'
                  : 'bg-[radial-gradient(circle_at_50%_30%,rgba(197,160,89,0.2),transparent_55%),radial-gradient(circle_at_20%_24%,rgba(27,77,62,0.16),transparent_42%)]'
              }`}
              aria-hidden
            />

            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full blur-3xl ${
                  isDark ? 'bg-[rgba(0,240,255,0.45)]' : 'bg-[rgba(197,160,89,0.45)]'
                }`}
              />
              <div
                className={`relative flex h-full w-full items-center justify-center rounded-full border text-4xl shadow-inner ${
                  isDark
                    ? 'border-cyan-200/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-cyan-200'
                    : 'border-amber-200/60 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 text-amber-800'
                }`}
              >
                🏆
              </div>
            </div>

            <div className="relative space-y-3">
              <h2
                className={`text-3xl leading-tight tracking-tight ${
                  isDark ? 'font-semibold text-white' : 'font-serif text-[#1B4D3E]'
                }`}
              >
                {title}
              </h2>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{subtitle}</p>
            </div>

            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-150 active:scale-95 sm:flex-none sm:min-w-[180px] ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-[0_18px_50px_-14px_rgba(0,240,255,0.55)] hover:brightness-110'
                    : 'bg-[var(--accent)] text-white shadow-[0_18px_50px_-16px_rgba(27,77,62,0.45)] hover:brightness-110'
                }`}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors sm:flex-none sm:min-w-[56px] ${
                  isDark ? 'border-white/20 text-white hover:bg-white/5' : 'border-slate-300 text-slate-800 hover:bg-white'
                }`}
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CelebrationOverlay
