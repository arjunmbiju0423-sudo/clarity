import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function GlassBrain() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current!
    let w = mount.clientWidth
    let h = mount.clientHeight

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    // ── Scene & Camera ─────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
    camera.position.set(0, 0, 5.2)

    // ── Environment map (needed for glass transmission) ────────────────────
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    envScene.background = new THREE.Color(0x0a0a1a)
    // Add colored lights to the env scene so they refract through the glass
    ;[
      { color: 0x4f46e5, pos: [-5, 3, 3],  intensity: 4 },
      { color: 0x7c3aed, pos: [5, -2, 2],  intensity: 3 },
      { color: 0x06b6d4, pos: [0, 5, -3],  intensity: 2 },
      { color: 0x1e1b4b, pos: [0, -5, 0],  intensity: 1 },
    ].forEach(({ color, pos, intensity }) => {
      const l = new THREE.PointLight(color, intensity, 20)
      l.position.set(...(pos as [number, number, number]))
      envScene.add(l)
    })
    const envTex = pmrem.fromScene(envScene, 0.04).texture
    scene.environment = envTex
    pmrem.dispose()

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1e1b4b, 0.6))

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.2)
    rimLight.position.set(-3, 2, -2)
    scene.add(rimLight)

    const fillLight = new THREE.PointLight(0x4f46e5, 4, 14)
    fillLight.position.set(-3.5, 2.5, 2)
    scene.add(fillLight)

    const accentLight = new THREE.PointLight(0x7c3aed, 3, 12)
    accentLight.position.set(3.5, -1.5, 2.5)
    scene.add(accentLight)

    const topLight = new THREE.PointLight(0x06b6d4, 2, 10)
    topLight.position.set(0, 4, -1)
    scene.add(topLight)

    // ── Brain group (everything moves together) ────────────────────────────
    const brainGroup = new THREE.Group()
    scene.add(brainGroup)

    // Outer glass shell
    const shellGeo = new THREE.IcosahedronGeometry(1.45, 5)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.55, 0.6, 1.0),
      transmission: 0.88,
      roughness: 0.06,
      metalness: 0.0,
      ior: 1.52,
      thickness: 0.6,
      envMapIntensity: 2.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.92,
      side: THREE.FrontSide,
    })
    const shell = new THREE.Mesh(shellGeo, glassMat)
    brainGroup.add(shell)

    // Inner shell for backface reflections
    const innerShellGeo = new THREE.IcosahedronGeometry(1.43, 5)
    const innerShellMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.4, 0.45, 0.9),
      transmission: 0.6,
      roughness: 0.1,
      metalness: 0.0,
      ior: 1.52,
      thickness: 0.3,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
    })
    const innerShell = new THREE.Mesh(innerShellGeo, innerShellMat)
    brainGroup.add(innerShell)

    // Wireframe overlay — subtle neural network lattice
    const wireGeo = new THREE.IcosahedronGeometry(1.47, 2)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const wire = new THREE.Mesh(wireGeo, wireMat)
    brainGroup.add(wire)

    // Outer faint wireframe
    const outerWireGeo = new THREE.IcosahedronGeometry(1.5, 1)
    const outerWireMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    })
    const outerWire = new THREE.Mesh(outerWireGeo, outerWireMat)
    brainGroup.add(outerWire)

    // Core glow sphere
    const coreGeo = new THREE.SphereGeometry(0.72, 32, 32)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      emissive: new THREE.Color(0.25, 0.2, 0.8),
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.35,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    brainGroup.add(core)

    // Secondary inner pulse sphere
    const pulse2Geo = new THREE.SphereGeometry(0.45, 24, 24)
    const pulse2Mat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: new THREE.Color(0.05, 0.5, 0.7),
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.25,
    })
    const pulse2 = new THREE.Mesh(pulse2Geo, pulse2Mat)
    brainGroup.add(pulse2)

    // ── Soft halo ring (additive glow around brain) ────────────────────────
    const haloGeo = new THREE.SphereGeometry(1.65, 32, 32)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4338ca,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    })
    const halo = new THREE.Mesh(haloGeo, haloMat)
    scene.add(halo)

    // ── Neural connection lines on surface ────────────────────────────────
    const lineGroup = new THREE.Group()
    brainGroup.add(lineGroup)

    const surfacePoints: THREE.Vector3[] = []
    for (let i = 0; i < 22; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.44
      surfacePoints.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ))
    }
    for (let i = 0; i < surfacePoints.length; i++) {
      for (let j = i + 1; j < surfacePoints.length; j++) {
        if (surfacePoints[i].distanceTo(surfacePoints[j]) < 1.1) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            surfacePoints[i], surfacePoints[j],
          ])
          const lineMat = new THREE.LineBasicMaterial({
            color: 0x818cf8,
            transparent: true,
            opacity: 0.2,
          })
          lineGroup.add(new THREE.Line(lineGeo, lineMat))
        }
      }
    }

    // ── Surface node dots ──────────────────────────────────────────────────
    surfacePoints.forEach(pt => {
      const dotGeo = new THREE.SphereGeometry(0.025, 8, 8)
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xa5b4fc,
        transparent: true,
        opacity: 0.7,
      })
      const dot = new THREE.Mesh(dotGeo, dotMat)
      dot.position.copy(pt)
      lineGroup.add(dot)
    })

    // ── Orbital particles ──────────────────────────────────────────────────
    const particleCount = 200
    const pPositions = new Float32Array(particleCount * 3)
    const pOpacities = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.9 + Math.random() * 1.6
      pPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pPositions[i * 3 + 2] = r * Math.cos(phi)
      pOpacities[i] = 0.2 + Math.random() * 0.6
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.025,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // ── Animation loop ─────────────────────────────────────────────────────
    let t = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      t += 0.006

      // Primary rotation — slow, elegant
      brainGroup.rotation.y = t * 0.28
      brainGroup.rotation.x = Math.sin(t * 0.18) * 0.12

      // Floating bob
      const bob = Math.sin(t * 0.7) * 0.1
      brainGroup.position.y = bob
      halo.position.y = bob
      particles.position.y = bob * 0.4

      // Particles slow counter-rotate
      particles.rotation.y = -t * 0.06
      particles.rotation.x = Math.sin(t * 0.12) * 0.05

      // Glow pulse
      coreMat.emissiveIntensity = 1.0 + Math.sin(t * 1.8) * 0.4
      pulse2Mat.emissiveIntensity = 1.8 + Math.sin(t * 2.4 + 1) * 0.8
      pulse2Mat.opacity = 0.18 + Math.sin(t * 2.0) * 0.1

      // Halo breathe
      haloMat.opacity = 0.04 + Math.sin(t * 0.9) * 0.025

      // Lights slowly orbit
      fillLight.position.x = Math.cos(t * 0.22) * 3.5
      fillLight.position.z = Math.sin(t * 0.22) * 2.5
      accentLight.position.x = Math.cos(t * 0.22 + Math.PI) * 3.5
      accentLight.position.z = Math.sin(t * 0.22 + Math.PI) * 2.5

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize handler ─────────────────────────────────────────────────────
    const onResize = () => {
      w = mount.clientWidth
      h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="h-full w-full" />
}
