import { useEffect, useRef } from 'react'
import type { NeuralActivation, PersonaKey } from '@/data/lectureData'

interface Props {
  activation: NeuralActivation
  persona: PersonaKey
}

// Region definitions: cx, cy, rx, ry, label, which activation key
// Approximate 2D layout based on HCP parcellation / fsaverage5 surface anatomy
const REGIONS = [
  { key: 'prefrontal',        label: 'Prefrontal',      cx: 200, cy: 82,  rx: 52, ry: 38 },
  { key: 'default_mode',      label: 'Default Mode',    cx: 200, cy: 148, rx: 48, ry: 32 },
  { key: 'language_network',  label: 'Language Net',    cx: 108, cy: 172, rx: 36, ry: 46 },
  { key: 'temporal_parietal', label: 'Temporal-Par.',   cx: 292, cy: 172, rx: 36, ry: 46 },
  { key: 'visual_cortex',     label: 'Visual Cortex',   cx: 200, cy: 248, rx: 44, ry: 30 },
  { key: 'subcortical',       label: 'Subcortical',     cx: 155, cy: 218, rx: 22, ry: 18 },
] as const

function activationColor(v: number, persona: PersonaKey): string {
  // Novice/high confusion → warmer
  // Advanced → cooler blue-violet
  if (persona === 'advanced') {
    const h = 230 - v * 40
    const s = 60 + v * 30
    const l = 25 + v * 35
    return `hsl(${h},${s}%,${l}%)`
  }
  if (persona === 'novice') {
    const h = 260 - v * 80  // violet → red/orange at high activation
    const s = 55 + v * 35
    const l = 20 + v * 42
    return `hsl(${h},${s}%,${l}%)`
  }
  // average
  const h = 250 - v * 60
  const s = 55 + v * 30
  const l = 22 + v * 38
  return `hsl(${h},${s}%,${l}%)`
}

export default function NeuralResponseMap({ activation, persona }: Props) {
  const pulseRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(undefined)
  const activationRef = useRef(activation)
  activationRef.current = activation
  const personaRef = useRef(persona)
  personaRef.current = persona

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    const draw = (ts: number) => {
      rafRef.current = requestAnimationFrame(draw)
      pulseRef.current = ts * 0.001

      ctx.clearRect(0, 0, W, H)

      // Background
      const bg = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, W*0.7)
      bg.addColorStop(0, '#0d0d1a')
      bg.addColorStop(1, '#050510')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Brain outline
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(W/2, H/2 - 10, 145, 155, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(99,102,241,0.18)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // inner division line
      ctx.beginPath()
      ctx.moveTo(W/2, 30)
      ctx.lineTo(W/2, H - 40)
      ctx.strokeStyle = 'rgba(99,102,241,0.10)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()

      const act = activationRef.current
      const pers = personaRef.current

      REGIONS.forEach((r) => {
        const v = act[r.key as keyof NeuralActivation]
        const pulse = 1 + Math.sin(pulseRef.current * 1.8 + v * 6) * 0.06 * v
        const color = activationColor(v, pers)

        // Glow
        const glow = ctx.createRadialGradient(r.cx, r.cy, 0, r.cx, r.cy, r.rx * 1.6 * pulse)
        glow.addColorStop(0, color.replace('hsl', 'hsla').replace(')', `,${0.55 * v})`))
        glow.addColorStop(0.5, color.replace('hsl', 'hsla').replace(')', `,${0.22 * v})`))
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.ellipse(r.cx, r.cy, r.rx * 1.6 * pulse, r.ry * 1.6 * pulse, 0, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.save()
        ctx.globalAlpha = 0.3 + v * 0.55
        ctx.beginPath()
        ctx.ellipse(r.cx, r.cy, r.rx * pulse, r.ry * pulse, 0, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.restore()

        // Label
        if (v > 0.35) {
          ctx.save()
          ctx.globalAlpha = Math.min(1, (v - 0.35) * 3)
          ctx.fillStyle = '#e2e8f0'
          ctx.font = '10px Inter, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(r.label, r.cx, r.cy + r.ry + 13)
          ctx.restore()
        }
      })

      // Connecting lines between active regions
      for (let i = 0; i < REGIONS.length; i++) {
        for (let j = i + 1; j < REGIONS.length; j++) {
          const va = act[REGIONS[i].key as keyof NeuralActivation]
          const vb = act[REGIONS[j].key as keyof NeuralActivation]
          const strength = (va + vb) / 2
          if (strength < 0.45) continue
          const wave = Math.sin(pulseRef.current * 1.2 + i * 0.9) * 0.15
          ctx.save()
          ctx.globalAlpha = (strength - 0.45) * 0.6 + wave * 0.1
          ctx.strokeStyle = activationColor(strength * 0.7, pers)
          ctx.lineWidth = strength * 1.5
          ctx.beginPath()
          ctx.moveTo(REGIONS[i].cx, REGIONS[i].cy)
          ctx.lineTo(REGIONS[j].cx, REGIONS[j].cy)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <div className="relative flex flex-col items-center">
      <canvas ref={canvasRef} width={400} height={320} className="w-full max-w-[400px] rounded-xl" />
    </div>
  )
}
