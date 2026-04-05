import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ── Vertex shader — standard pass-through with normals ─────────────────────
const VERT = `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
void main(){
  vec4 mvPos = modelViewMatrix * vec4(position,1.0);
  vNormal   = normalize(normalMatrix * normal);
  vViewDir  = normalize(-mvPos.xyz);
  vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
  gl_Position = projectionMatrix * mvPos;
}
`

// ── Fragment shader — fresnel glow + hover spotlight ──────────────────────
const FRAG = `
uniform vec3  glowColor;
uniform float glowPower;
uniform vec3  hoverPos;
uniform float hoverStrength;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main(){
  // Fresnel: edges facing away from camera glow brightest
  float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), glowPower);

  // Hover spotlight: brighten region near cursor hit-point
  float distToHover = length(vWorldPos - hoverPos);
  float hover = hoverStrength * smoothstep(1.2, 0.0, distToHover);

  vec3 col = glowColor * (fresnel + hover * 0.8);
  float alpha = clamp(fresnel * 1.1 + hover * 0.5, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`

function buildBrainGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 160, 160)
  const pos = geo.attributes.position

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    let z = pos.getZ(i)

    // ── Step 1: Carve the base silhouette into a brain shape ──────────────
    // Frontal lobe bulge (z > 0 = front of brain)
    const frontal  = z > 0 ? 0.14 * z * z : 0
    // Occipital protrusion (z < 0 = back)
    const occip    = z < 0 ? 0.09 * z * z : 0
    // Temporal wings: bulge on sides at mid-height
    const temporal = 0.12 * Math.exp(-3.5 * y * y) * Math.exp(-1.2 * z * z)
    // Flatten and narrow the base
    const base     = y < -0.2 ? 0.20 * Math.pow(y + 0.2, 2) : 0
    // Narrow the top slightly (brain tapers toward vertex)
    const topTaper = y > 0.6 ? 0.08 * Math.pow(y - 0.6, 2) : 0

    const s = 1 + frontal + occip + temporal - base - topTaper
    x *= s; y *= s; z *= s

    // ── Step 2: Spherical coords of shaped point ──────────────────────────
    const nr    = Math.sqrt(x*x + y*y + z*z)
    const theta = Math.atan2(z, x)
    const phi   = Math.acos(Math.max(-1, Math.min(1, y / nr)))

    // ── Step 3: Cortical folds ────────────────────────────────────────────
    let d = 0
    d += 0.062 * Math.sin(7  * theta + 4  * phi + 0.30)
    d += 0.048 * Math.sin(11 * theta - 6  * phi + 1.10)
    d += 0.038 * Math.cos(16 * theta + 8  * phi + 2.40)
    d += 0.028 * Math.sin(22 * theta - 10 * phi + 0.80)
    d += 0.020 * Math.cos(30 * theta + 14 * phi + 3.20)
    d += 0.014 * Math.sin(40 * theta - 18 * phi + 1.70)
    d += 0.009 * Math.cos(52 * theta + 26 * phi + 4.10)
    d *= 0.5 + 0.5 * Math.sin(phi)   // dampen at poles

    // ── Step 4: Interhemispheric fissure (deep midline groove, top only) ──
    const topMask = Math.max(0, y / nr)
    const fissure = -0.16 * Math.exp(-22 * x * x) * topMask

    // ── Step 5: Sylvian (lateral) fissure ────────────────────────────────
    const sylvian = -0.07 * Math.exp(-16 * Math.pow(y + 0.38, 2)) *
                             Math.exp(-3.5 * Math.pow(z - 0.08, 2))

    const r = nr * (1 + d) + fissure + sylvian
    pos.setXYZ(i, (x/nr)*r, (y/nr)*r, (z/nr)*r)
  }

  geo.computeVertexNormals()
  return geo
}

export function RealisticBrain() {
  const mountRef  = useRef<HTMLDivElement>(null)
  const mouseRef  = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const mount = mountRef.current!
    let w = mount.clientWidth
    let h = mount.clientHeight

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100)
    camera.position.set(0, 0.15, 5.0)

    // ── Geometry ──────────────────────────────────────────────────────────
    const brainGeo = buildBrainGeometry()
    // Wider side-to-side, elongated front-back, slightly compressed top-bottom
    const SCALE: [number, number, number] = [1.45, 1.20, 1.65]

    // ── Inner dark shell (gives depth) ────────────────────────────────────
    const innerMat = new THREE.MeshStandardMaterial({
      color:      new THREE.Color('#020818'),
      emissive:   new THREE.Color('#030d30'),
      emissiveIntensity: 0.6,
      roughness:  1.0,
      metalness:  0.0,
      side: THREE.BackSide,
    })
    const inner = new THREE.Mesh(brainGeo, innerMat)
    inner.scale.set(...SCALE)
    scene.add(inner)

    // ── Fresnel glow shell ────────────────────────────────────────────────
    const glowUniforms = {
      glowColor:     { value: new THREE.Color('#2090ff') },
      glowPower:     { value: 2.4 },
      hoverPos:      { value: new THREE.Vector3(9999, 9999, 9999) },
      hoverStrength: { value: 0.0 },
    }
    const glowMat = new THREE.ShaderMaterial({
      uniforms:     glowUniforms,
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    const glowMesh = new THREE.Mesh(brainGeo, glowMat)
    glowMesh.scale.set(...SCALE)
    scene.add(glowMesh)

    // ── Wireframe overlay (subtle cyan lines) ─────────────────────────────
    const wireGeo = new THREE.WireframeGeometry(
      new THREE.SphereGeometry(1, 28, 28)    // low-res wire on top
    )
    const wireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#1060cc'),
      transparent: true,
      opacity: 0.06,
    })
    const wire = new THREE.LineSegments(wireGeo, wireMat)
    wire.scale.set(...SCALE)
    scene.add(wire)

    // ── Lights ────────────────────────────────────────────────────────────
    // Deep blue core point — gives internal glow
    const core = new THREE.PointLight(0x0055ff, 6, 8)
    core.position.set(0, 0, 0)
    scene.add(core)

    // Bright cyan rim from behind
    const rim = new THREE.PointLight(0x00aaff, 10, 10)
    rim.position.set(0, 1, -5)
    scene.add(rim)

    // Cool top-left fill
    const fill = new THREE.DirectionalLight(0x3399ff, 1.4)
    fill.position.set(-3, 4, 2)
    scene.add(fill)

    // Purple-blue ambient
    scene.add(new THREE.AmbientLight(0x050a2a, 6))

    // ── Raycaster for hover ────────────────────────────────────────────────
    const raycaster  = new THREE.Raycaster()
    const pointer    = new THREE.Vector2()
    let   targetHover = 0

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1
      pointer.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1
      mouseRef.current = { x: pointer.x, y: pointer.y }
    }
    const onMouseEnter = () => { targetHover = 1.5 }
    const onMouseLeave = () => {
      targetHover = 0
      glowUniforms.hoverPos.value.set(9999, 9999, 9999)
    }

    mount.addEventListener('mousemove',  onMouseMove)
    mount.addEventListener('mouseenter', onMouseEnter)
    mount.addEventListener('mouseleave', onMouseLeave)

    // ── Resize ────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      w = mount.clientWidth
      h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(mount)

    // ── Animate ───────────────────────────────────────────────────────────
    let raf: number
    let t   = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.010

      const rot = t
      inner.rotation.y    = rot
      glowMesh.rotation.y = rot
      wire.rotation.y     = rot

      const bob = Math.sin(t * 0.5) * 0.04
      inner.position.y    = bob
      glowMesh.position.y = bob
      wire.position.y     = bob

      // Pulse the glow colour slightly
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.2)
      glowUniforms.glowColor.value.setRGB(0.12 * pulse, 0.55 * pulse, 1.0)

      // Hover raycasting
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObject(glowMesh)
      if (hits.length > 0 && targetHover > 0) {
        glowUniforms.hoverPos.value.copy(hits[0].point)
      }

      // Smooth hover strength
      glowUniforms.hoverStrength.value +=
        (targetHover - glowUniforms.hoverStrength.value) * 0.08

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mount.removeEventListener('mousemove',  onMouseMove)
      mount.removeEventListener('mouseenter', onMouseEnter)
      mount.removeEventListener('mouseleave', onMouseLeave)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="h-full w-full cursor-crosshair" />
}
