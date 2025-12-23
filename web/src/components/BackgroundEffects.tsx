import { useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export function BackgroundEffects({ darkMode }: { darkMode: boolean }) {
  const { scrollYProgress } = useScroll()

  // Day mode transforms for layered blobs
  const blobOffsets = [0.12, 0.24, 0.36, 0.5]
  const translateY = blobOffsets.map((o) => useTransform(scrollYProgress, [0, 1], [0, -80 * (o * 2)]))
  const rotate = blobOffsets.map((o) => useTransform(scrollYProgress, [0, 1], [0, 12 * (o * 3)]))
  const scale = blobOffsets.map((o) => useTransform(scrollYProgress, [0, 1], [1, 1 + o * 0.12]))

  // Night mode transforms for grid perspective and particle speed stretch
  const gridDepth = useTransform(scrollYProgress, [0, 1], [0, -160])
  const gridGlow = useTransform(scrollYProgress, [0, 1], [0.25, 0.6])
  const particleDrift = useTransform(scrollYProgress, [0, 1], [0, -240])
  const particleStretch = useTransform(scrollYProgress, [0, 1], [1, 1.8])

  const particles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        size: 6 + ((i * 13) % 8),
        delay: (i * 0.23) % 2,
        opacity: 0.15 + ((i * 7) % 10) / 100,
      })),
    [],
  )

  if (!darkMode) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {blobOffsets.map((offset, idx) => (
          <motion.div
            key={offset}
            className="absolute inset-0"
            style={{
              translateY: translateY[idx],
              rotate: rotate[idx],
              scale: scale[idx],
              opacity: 0.18,
              filter: 'blur(24px)',
              mixBlendMode: 'multiply',
            }}
          >
            <svg
              className="h-full w-full"
              viewBox="0 0 1200 900"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <motion.path
                fill={idx % 2 === 0 ? 'rgba(176,145,96,0.24)' : 'rgba(27,77,62,0.18)'}
                d={blobs[idx % blobs.length]}
                animate={{
                  d: morphs[idx % morphs.length],
                }}
                transition={{ duration: 14 + idx * 3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        className="absolute inset-x-[-10%] bottom-[-35%] h-[70vh]"
        style={{
          translateY: gridDepth,
          opacity: gridGlow,
          filter: 'drop-shadow(0 0 20px rgba(92,244,255,0.35))',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: 'linear-gradient(rgba(92,244,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,63,180,0.18) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            transform: 'perspective(1200px) rotateX(68deg)',
            transformOrigin: '50% 0%',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
      </motion.div>

      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-[1px] bg-[var(--accent)]"
          style={{
            left: p.left,
            bottom: '-10%',
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            translateY: particleDrift,
            scaleY: particleStretch,
            filter: 'drop-shadow(0 0 8px rgba(92,244,255,0.45))',
          }}
          initial={{ y: 0, opacity: p.opacity }}
          animate={{ y: '-120vh', opacity: 0 }}
          transition={{ duration: 12 + p.delay * 2, repeat: Infinity, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

// Champagne / sage inspired guilloche-ish blobs for day mode
const blobs = [
  'M600 50C780 70 1000 170 1080 360C1160 550 1100 820 900 900C700 980 420 930 250 800C80 670 30 460 120 310C210 160 420 30 600 50Z',
  'M620 40C820 80 1030 210 1100 400C1170 590 1110 850 910 920C710 990 430 940 240 790C50 640 10 440 120 280C230 120 420 0 620 40Z',
  'M590 30C770 70 990 190 1060 370C1130 550 1080 800 880 880C680 960 410 910 230 780C50 650 0 450 110 300C220 150 410 -10 590 30Z',
  'M610 60C800 90 1010 210 1080 380C1150 550 1080 800 890 890C700 980 430 940 250 820C70 700 10 500 110 330C210 160 420 30 610 60Z',
]

const morphs = [
  'M580 20C760 60 990 190 1070 370C1150 550 1080 820 880 910C680 1000 410 950 220 820C30 690 -10 470 110 300C230 130 400 -20 580 20Z',
  'M640 30C820 70 1030 220 1100 400C1170 580 1100 830 900 910C700 990 430 930 250 800C70 670 20 450 130 280C240 110 460 -10 640 30Z',
  'M600 40C800 80 1010 210 1080 390C1150 570 1080 830 880 910C680 990 420 940 230 800C40 660 0 450 120 290C240 130 400 0 600 40Z',
  'M620 20C800 60 1000 180 1080 360C1160 540 1100 810 900 900C700 990 430 950 240 820C50 690 10 470 130 300C250 130 440 -20 620 20Z',
]
