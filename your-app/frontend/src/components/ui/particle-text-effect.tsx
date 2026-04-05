import { useEffect, useRef } from 'react'

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 100
  maxSpeed = 1.0
  maxForce = 0.1
  particleSize = 10
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.01

  move() {
    let proximityMult = 1
    const distance = Math.sqrt(
      Math.pow(this.pos.x - this.target.x, 2) + Math.pow(this.pos.y - this.target.y, 2)
    )
    if (distance < this.closeEnoughTarget) proximityMult = distance / this.closeEnoughTarget

    const towardsTarget = { x: this.target.x - this.pos.x, y: this.target.y - this.pos.y }
    const mag = Math.sqrt(towardsTarget.x ** 2 + towardsTarget.y ** 2)
    if (mag > 0) {
      towardsTarget.x = (towardsTarget.x / mag) * this.maxSpeed * proximityMult
      towardsTarget.y = (towardsTarget.y / mag) * this.maxSpeed * proximityMult
    }

    const steer = { x: towardsTarget.x - this.vel.x, y: towardsTarget.y - this.vel.y }
    const sMag = Math.sqrt(steer.x ** 2 + steer.y ** 2)
    if (sMag > 0) {
      steer.x = (steer.x / sMag) * this.maxForce
      steer.y = (steer.y / sMag) * this.maxForce
    }

    this.acc.x += steer.x
    this.acc.y += steer.y
    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D, drawAsPoints: boolean) {
    if (this.colorWeight < 1.0) this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight)
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight)
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight)

    ctx.fillStyle = `rgb(${r},${g},${b})`
    if (drawAsPoints) {
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2)
    } else {
      ctx.beginPath()
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  kill(width: number, height: number) {
    if (!this.isKilled) {
      const randomPos = generateRandomPos(width / 2, height / 2, (width + height) / 2)
      this.target = randomPos
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      }
      this.targetColor = { r: 0, g: 0, b: 0 }
      this.colorWeight = 0
      this.isKilled = true
    }
  }
}

function generateRandomPos(x: number, y: number, mag: number): Vector2D {
  const rx = Math.random() * 1000
  const ry = Math.random() * 500
  const dir = { x: rx - x, y: ry - y }
  const m = Math.sqrt(dir.x ** 2 + dir.y ** 2)
  if (m > 0) { dir.x = (dir.x / m) * mag; dir.y = (dir.y / m) * mag }
  return { x: x + dir.x, y: y + dir.y }
}

interface ParticleTextEffectProps {
  words?: string[]
  fontSize?: number
  fontFamily?: string
  className?: string
}

export function ParticleTextEffect({
  words = ['CLARITY'],
  fontSize = 140,
  fontFamily = 'bold Inter, Arial, sans-serif',
  className = '',
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(undefined)
  const particlesRef = useRef<Particle[]>([])
  const frameCountRef = useRef(0)
  const wordIndexRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false, isRightClick: false })

  const pixelSteps = 4

  function loadWord(word: string, canvas: HTMLCanvasElement) {
    const offscreen = document.createElement('canvas')
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    const ctx2 = offscreen.getContext('2d')!
    ctx2.fillStyle = 'white'
    ctx2.font = `bold ${fontSize}px ${fontFamily}`
    ctx2.textAlign = 'center'
    ctx2.textBaseline = 'middle'
    ctx2.fillText(word, canvas.width / 2, canvas.height / 2)

    const { data: pixels } = ctx2.getImageData(0, 0, canvas.width, canvas.height)
    const newColor = { r: 220, g: 220, b: 255 }

    const particles = particlesRef.current
    let pIdx = 0
    const coords: number[] = []
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) coords.push(i)
    for (let i = coords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [coords[i], coords[j]] = [coords[j], coords[i]]
    }

    for (const ci of coords) {
      if (pixels[ci + 3] > 0) {
        const x = (ci / 4) % canvas.width
        const y = Math.floor(ci / 4 / canvas.width)
        let p: Particle

        if (pIdx < particles.length) {
          p = particles[pIdx]
          p.isKilled = false
          pIdx++
        } else {
          p = new Particle()
          const rp = generateRandomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2)
          p.pos = { x: rp.x, y: rp.y }
          p.maxSpeed = Math.random() * 6 + 4
          p.maxForce = p.maxSpeed * 0.05
          p.particleSize = Math.random() * 6 + 6
          p.colorBlendRate = Math.random() * 0.0275 + 0.0025
          particles.push(p)
        }

        p.startColor = {
          r: p.startColor.r + (p.targetColor.r - p.startColor.r) * p.colorWeight,
          g: p.startColor.g + (p.targetColor.g - p.startColor.g) * p.colorWeight,
          b: p.startColor.b + (p.targetColor.b - p.startColor.b) * p.colorWeight,
        }
        p.targetColor = newColor
        p.colorWeight = 0
        p.target = { x, y }
      }
    }

    for (let i = pIdx; i < particles.length; i++) particles[i].kill(canvas.width, canvas.height)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 1200
    canvas.height = 400
    loadWord(words[0], canvas)

    const animate = () => {
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'rgba(3,7,18,0.12)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.move()
        p.draw(ctx, true)
        if (p.isKilled && (p.pos.x < 0 || p.pos.x > canvas.width || p.pos.y < 0 || p.pos.y > canvas.height)) {
          particles.splice(i, 1)
        }
      }

      frameCountRef.current++
      if (frameCountRef.current % 280 === 0 && words.length > 1) {
        wordIndexRef.current = (wordIndexRef.current + 1) % words.length
        loadWord(words[wordIndexRef.current], canvas)
      }

      if (mouseRef.current.isPressed && mouseRef.current.isRightClick) {
        particles.forEach(p => {
          const d = Math.sqrt((p.pos.x - mouseRef.current.x) ** 2 + (p.pos.y - mouseRef.current.y) ** 2)
          if (d < 50) p.kill(canvas.width, canvas.height)
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    const onDown = (e: MouseEvent) => {
      mouseRef.current.isPressed = true
      mouseRef.current.isRightClick = e.button === 2
      const r = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - r.left) * (canvas.width / r.width)
      mouseRef.current.y = (e.clientY - r.top) * (canvas.height / r.height)
    }
    const onUp = () => { mouseRef.current.isPressed = false }
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - r.left) * (canvas.width / r.width)
      mouseRef.current.y = (e.clientY - r.top) * (canvas.height / r.height)
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('contextmenu', e => e.preventDefault())

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
