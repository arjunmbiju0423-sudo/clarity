import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ParticleTextEffect } from '@/components/ui/particle-text-effect'

interface Props {
  onComplete: () => void
}

export default function ClarityIntro({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 4000)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Particle canvas — fills a fixed region */}
      <div className="relative w-full max-w-4xl px-6" style={{ height: 280 }}>
        <ParticleTextEffect
          words={['CLARITY']}
          fontSize={160}
          fontFamily="Inter, Arial, sans-serif"
        />
      </div>

      {/* Tagline */}
      <motion.p
        className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-400/50"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        Lecture intelligence
      </motion.p>

      {/* Fade-out overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[#030712]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 3.2 }}
      />
    </motion.div>
  )
}
