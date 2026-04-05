import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, Brain, Zap, Users, BarChart3, ChevronRight,
  AlertTriangle, Clock, Layers, Play,
} from 'lucide-react'
import { RealisticBrain } from '@/components/ui/realistic-brain'

interface Props { onStart: () => void }

// ─── Animated counter ────────────────────────────────────────────────────────
function CountUp({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  useEffect(() => {
    if (!inView) return
    let start: number | null = null
    const dur = 1400
    const step = (ts: number) => {
      if (!start) start = ts
      const prog = Math.min((ts - start) / dur, 1)
      const ease = 1 - Math.pow(1 - prog, 3)
      setVal(parseFloat((ease * to).toFixed(decimals)))
      if (prog < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, to, decimals])

  return <span ref={ref}>{decimals > 0 ? val.toFixed(decimals) : Math.round(val)}{suffix}</span>
}

// ─── Section fade-in wrapper ──────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Problem card data ────────────────────────────────────────────────────────
const PROBLEM_CARDS = [
  {
    icon: <Clock className="h-5 w-5" />,
    color: '#f97316',
    number: '01',
    title: 'The Attention Cliff',
    hook: 'Engagement collapses around minute 8.',
    bullets: [
      'Students check out — not because it gets harder',
      'Nothing signals that what\'s coming matters',
      '40% of the room is gone before the key insight',
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    color: '#818cf8',
    number: '02',
    title: 'The Persona Gap',
    hook: 'Same lecture. Completely different experience.',
    bullets: [
      'Novice: 90% capacity spent parsing syntax',
      'Advanced: coasting, drifting, disengaged',
      'One explanation can\'t unlock and bore simultaneously',
    ],
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: '#ef4444',
    number: '03',
    title: 'The Feedback Desert',
    hook: 'Professors find out after the exam.',
    bullets: [
      'Confusion compounds for weeks undetected',
      'By the time it\'s visible — 3 topics too late',
      'No signal between lecture and assessment',
    ],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    color: '#06b6d4',
    number: '04',
    title: 'The Chain Rule Moment',
    hook: 'Every subject has one concept that breaks everything downstream.',
    bullets: [
      'Rarely the hardest-sounding concept',
      'Where abstraction and intuition first diverge',
      'Formula clicks. The "why" disappears.',
    ],
  },
]

// ─── Tech card data ───────────────────────────────────────────────────────────
const TECH_CARDS = [
  {
    tag: 'Meta FAIR · 2024',
    color: '#818cf8',
    border: 'border-indigo-500/30',
    glow: 'bg-indigo-500/8',
    title: 'TRIBE v2',
    subtitle: 'Neural activation from video, audio + text',
    bullets: ['Video · Audio · Text — all three at once', '20,484 cortical vertices at 1Hz', '6 functional brain networks mapped', 'Pre-trained on 7,000+ hrs of fMRI data'],
  },
  {
    tag: 'Monte Carlo · 500 trials/segment',
    color: '#06b6d4',
    border: 'border-cyan-500/30',
    glow: 'bg-cyan-500/8',
    title: 'MiroFish Engine',
    subtitle: 'Simulates how each learner type responds',
    bullets: ['3 personas: novice · average · advanced', 'Traits: working memory, stress, language efficiency', 'Feeds live TRIBE signals per segment', 'Outputs: confusion risk · engagement · comprehension'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage({ onStart }: Props) {
  const heroRef = useRef(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(heroScroll, [0, 0.6], [1, 0])
  const heroY = useTransform(heroScroll, [0, 0.6], [0, -40])

  return (
    <div className="relative overflow-x-hidden bg-[#030712] text-white">

      {/* ── Global ambient gradients ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[700px] w-[700px] rounded-full bg-indigo-600/8 blur-[140px]" />
        <div className="absolute -bottom-60 -left-40 h-[600px] w-[600px] rounded-full bg-violet-700/6 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-900/10 blur-[80px]" />
      </div>

      {/* ══════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════ */}
      <nav className="relative z-30 flex items-center justify-between px-8 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/25 ring-1 ring-indigo-500/40">
            <Brain className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white">Catapult</span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          {['Product', 'Research', 'Pricing'].map(link => (
            <button key={link} className="text-sm text-gray-500 transition-colors hover:text-gray-200">{link}</button>
          ))}
        </div>
        <button
          onClick={onStart}
          className="hidden items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 transition-all hover:border-indigo-400/50 hover:bg-indigo-500/20 md:flex"
        >
          Get Early Access <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>

      {/* ══════════════════════════════════════════════
          SECTION 1 — HERO (full-screen centered)
      ══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative z-10 flex min-h-[calc(100vh-76px)] flex-col items-center justify-center overflow-visible px-6">
        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="flex w-full flex-col items-center">

          {/* CLARITY wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-2 select-none text-center font-thin tracking-[0.45em] text-white"
            style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)', letterSpacing: '0.45em' }}
          >
            CLARITY
          </motion.h1>

          {/* Slogan */}
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mb-0 text-center text-sm font-light tracking-[0.18em] uppercase"
            style={{ color: '#5b8fff' }}
          >
            See exactly where learning breaks
          </motion.p>

          {/* Brain — unconstrained, bleeds naturally */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full overflow-visible"
            style={{ height: 'clamp(380px, 62vh, 680px)' }}
          >
            {/* Glow — larger than container so it bleeds out */}
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: '140%', height: '140%' }}>
              <div className="h-full w-full rounded-full blur-[110px]"
                style={{ background: 'radial-gradient(ellipse, rgba(20,70,210,0.28) 0%, transparent 65%)' }} />
            </div>
            <RealisticBrain />
          </motion.div>

          {/* CTAs — pulled up, no top margin competing with brain */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="-mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-7 py-3 text-sm font-semibold text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/8">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/10">
                <Play className="h-2.5 w-2.5 fill-current" />
              </span>
              Watch Demo
            </button>
          </motion.div>

        </motion.div>

        {/* Scroll hint — bottom-right corner, out of the way */}
        <motion.div
          animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-6 right-8 flex flex-col items-center gap-1 text-gray-700"
        >
          <div className="h-6 w-px bg-gradient-to-b from-gray-600 to-transparent" />
          <p className="text-[8px] uppercase tracking-[0.25em]">Scroll</p>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 2 — THE PROBLEM: STATS
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-white/5 px-8 py-28 md:px-12 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="mb-4 text-center text-5xl font-black uppercase tracking-tight md:text-6xl" style={{ color: '#ff4444' }}>
              The Attention Crisis
            </h2>
            <p className="mx-auto mb-16 max-w-xl text-center text-lg font-medium text-white">
              Lectures are built for delivery — not for how the brain learns. Nobody finds out until it's too late.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                stat: <><CountUp to={8} />–<CountUp to={12} /> <span className="text-3xl">min</span></>,
                color: '#f97316',
                label: 'Average time before engagement drops',
                sub: 'Cognitive load research, Sweller et al.',
              },
              {
                stat: <><CountUp to={76} />%</>,
                color: '#ef4444',
                label: 'Of lecture content is forgotten within 24 hours',
                sub: 'Ebbinghaus forgetting curve',
              },
              {
                stat: <CountUp to={3} suffix="wks" />,
                color: '#a78bfa',
                label: 'Average lag before professors get feedback',
                sub: 'Traditional assessment cycle',
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div
                  className="rounded-2xl border bg-white/3 p-8 text-center backdrop-blur-sm"
                  style={{ borderColor: item.color + '25', boxShadow: `0 0 40px ${item.color}08` }}
                >
                  <p className="mb-3 text-5xl font-black tabular-nums" style={{ color: item.color }}>
                    {item.stat}
                  </p>
                  <p className="mb-1 text-sm font-semibold text-gray-200">{item.label}</p>
                  <p className="text-xs text-gray-600">{item.sub}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3 — STICKY PROBLEM CARDS
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-white/5">
          <div className="mx-auto max-w-5xl px-8 md:px-12">

            {/* Section title */}
            <FadeIn className="mb-10 text-center">
              <h2 className="text-5xl font-black uppercase tracking-tight md:text-6xl" style={{ color: '#ff4444' }}>
                Four Root Causes
              </h2>
            </FadeIn>

            {/* 2×2 grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {PROBLEM_CARDS.map((card, i) => (
                <FadeIn key={card.number} delay={i * 0.1}>
                  <div
                    className="flex h-full flex-col rounded-2xl border bg-[#07090f] p-6"
                    style={{ borderColor: card.color + '25', boxShadow: `0 0 40px ${card.color}06` }}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: card.color + '18', color: card.color, border: `1px solid ${card.color}35` }}
                      >
                        {card.icon}
                      </div>
                      <span className="text-xl font-black tabular-nums" style={{ color: card.color + '35' }}>
                        {card.number}
                      </span>
                    </div>
                    <h3 className="mb-1.5 text-lg font-bold text-white">{card.title}</h3>
                    <p className="mb-4 text-sm font-semibold" style={{ color: card.color }}>{card.hook}</p>
                    <ul className="mt-auto space-y-2">
                      {card.bullets.map(b => (
                        <li key={b} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: card.color }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>

          </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 4 — TECHNOLOGY
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-white/5 px-8 py-28 md:px-12 lg:px-20">
        {/* Glow backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[900px] rounded-full bg-indigo-900/15 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="mb-5 text-center text-5xl font-black uppercase tracking-tight md:text-6xl" style={{ color: '#ff4444' }}>
              Integrated Advanced Technologies
            </h2>
            <p className="mx-auto mb-16 max-w-xl text-center text-lg font-medium text-white">
              Two frontier AI models. One coherent picture of how every student experiences your lecture.
            </p>
          </FadeIn>

          <div className="space-y-6">
            {TECH_CARDS.map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.12}>
                <div
                  className={`rounded-3xl border-2 ${card.border} bg-[#06080f] p-10 md:p-14`}
                  style={{ boxShadow: `0 0 100px ${card.color}18, 0 0 30px ${card.color}08` }}
                >
                  {/* Top row */}
                  <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span
                        className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
                        style={{ background: card.color + '20', color: card.color }}
                      >
                        {card.tag}
                      </span>
                      <h3 className="text-5xl font-black text-white md:text-6xl">{card.title}</h3>
                    </div>
                    <p className="max-w-xs text-right text-base font-semibold leading-snug" style={{ color: card.color }}>
                      {card.subtitle}
                    </p>
                  </div>
                  {/* Divider */}
                  <div className="mb-8 h-px w-full" style={{ background: `linear-gradient(to right, ${card.color}40, transparent)` }} />
                  {/* Bullets grid */}
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {card.bullets.map(b => (
                      <li key={b} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: card.color }} />
                        <span className="text-base font-medium text-gray-100">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW TO USE — big clear steps
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-white/5 px-8 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-14 text-center">
            <h2 className="text-5xl font-black uppercase tracking-tight text-white md:text-6xl">
              How It Works
            </h2>
            <p className="mt-3 text-base font-medium text-gray-400">Three steps. Under a minute.</p>
          </FadeIn>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                n: '01',
                color: '#5b8fff',
                icon: <Zap className="h-7 w-7" />,
                title: 'Upload your lecture',
                body: 'Drop any mp4 or mov file. No account needed. Works with any lecture topic.',
              },
              {
                n: '02',
                color: '#a78bfa',
                icon: <Brain className="h-7 w-7" />,
                title: 'AI analysis runs',
                body: 'TRIBE v2 maps neural activation second-by-second. MiroFish simulates how novice, average, and advanced learners experience each moment.',
              },
              {
                n: '03',
                color: '#34d399',
                icon: <BarChart3 className="h-7 w-7" />,
                title: 'Explore the results',
                body: 'Scrub the timeline, switch personas, click any segment to see exactly what broke and what to fix.',
              },
            ].map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.12}>
                <div
                  className="flex h-full flex-col rounded-2xl border bg-[#07090f] p-8"
                  style={{ borderColor: step.color + '30', boxShadow: `0 0 40px ${step.color}08` }}
                >
                  {/* Number + icon row */}
                  <div className="mb-6 flex items-center justify-between">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ background: step.color + '18', color: step.color, border: `1px solid ${step.color}35` }}
                    >
                      {step.icon}
                    </div>
                    <span
                      className="text-5xl font-black tabular-nums"
                      style={{ color: step.color + '25' }}
                    >
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{step.title}</h3>
                  <p className="text-base leading-relaxed text-gray-300">{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Arrow connector — visual flow */}
          <FadeIn delay={0.3} className="mt-8 flex items-center justify-center gap-3">
            {['Upload', 'Analyze', 'Explore'].map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-600">{label}</span>
                {i < 2 && <ArrowRight className="h-4 w-4 text-gray-700" />}
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-white/5 px-8 py-28 text-center md:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[300px] w-[700px] rounded-full bg-indigo-600/10 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-2xl">
          <FadeIn>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/8 px-3.5 py-1.5 text-xs font-medium text-indigo-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
              Free to try · no account required
            </div>
            <h2 className="mb-5 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Ready to see your lecture<br />
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa)' }}>
                through a student's brain?
              </span>
            </h2>
            <p className="mb-10 text-lg text-gray-500">Upload a clip and get your first analysis in under a minute.</p>
            <button
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40"
            >
              Get Started — it's free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-8 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600/20 ring-1 ring-indigo-500/30">
              <Brain className="h-3 w-3 text-indigo-400" />
            </div>
            <span className="text-xs font-medium text-gray-600">Catapult</span>
          </div>
          <p className="text-xs text-gray-700">Built on TRIBE v2 (Meta FAIR) · MiroFish persona simulation</p>
          <p className="text-xs text-gray-700">© 2025 Catapult</p>
        </div>
      </footer>

    </div>
  )
}
