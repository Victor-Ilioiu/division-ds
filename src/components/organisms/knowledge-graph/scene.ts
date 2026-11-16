/**
 * The WebGL side of KnowledgeGraph, and the only module that imports three.js. The component loads
 * it through a dynamic `import()`, so a page without a graph never downloads the renderer.
 *
 * Layout is a small 3D force simulation run here, not a library: repulsion between every pair
 * (fine up to a few hundred notes), springs along links, and a weak pull toward a per-group anchor
 * so unlinked notes still gather by folder instead of drifting as one cloud.
 *
 * Everything that changes on interaction (colour, size, glow, camera, cursor) eases toward a
 * target each frame with a frame-rate independent factor, so nothing snaps. Under reduced motion
 * the factor is 1: every change lands in one frame, and frames are drawn on demand.
 */

import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, IcosahedronGeometry,
  InstancedMesh, LineBasicMaterial, LineSegments, MeshBasicMaterial, NormalBlending, Object3D, PerspectiveCamera,
  Points, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createLoop } from '../../../fx/core/loop'
import { dprCap } from '../../../fx/core/quality'

export type SceneNode = { id: string; label: string; group: string }
export type SceneLink = { source: string; target: string }
export type ScenePalette = { groups: Record<string, string>; link: string; accent: string; bg: string }

export type GraphOptions = {
  nodes: SceneNode[]
  links: SceneLink[]
  palette: ScenePalette
  animate: boolean
  labelLayer: HTMLElement
  labelClass: string
  /** The custom cursor element; the scene moves it and sets `data-state` (idle, node, drag). */
  cursor: HTMLElement
  /** The callout box and its leader line (an SVG <line>). The scene places them beside the hovered
   *  or active note; the component fills the box. Hidden through `data-visible`. */
  callout: HTMLElement
  leader: SVGLineElement
  /** Live camera readout ("AZ 349.6° · EL 22.8°"), written as text each frame. */
  readout: HTMLElement
  /** Pill labels for each group, placed over its cluster. The component creates them. */
  groupLabels: Map<string, HTMLElement>
  /** A crosshair ring held round the active note, sized to it. Hidden through `data-visible`. */
  marker: HTMLElement
  /** The hub marker at the centre of the map, which every cluster links to. */
  hub: HTMLElement
  onHover(id: string | null): void
  /** A click on a note (id), or on empty space (null, which clears the active note). */
  onSelect(id: string | null): void
  /** A double click on a note: open it. */
  onOpen(id: string): void
}

export type GraphHandle = {
  setHighlight(ids: Set<string> | null): void
  /** Light a note as if hovered, from outside the canvas (a list beside it). */
  setPreview(id: string | null): void
  setPalette(p: ScenePalette): void
  /** Fly the camera to a note and make it the active one. */
  focus(id: string): void
  /** Make a note the active one without moving the camera. */
  select(id: string): void
  /** Clear the active note and fly back to the starting overview. */
  reset(): void
  dispose(): void
}

/** The starting overview the camera returns to on reset. */
const HOME_POS = new Vector3(0, 60, 460)
const HOME_TARGET = new Vector3(0, 0, 0)

const REPEL = 900
const SPRING = 0.04
const SPRING_LEN = 28
const ANCHOR = 0.012
const DAMP = 0.86
/** Nodes keep this many labels on screen when nothing is hovered: the best-linked ones. */
const RESTING_LABELS = 8
/** Glow strength by state. The halo is slim at rest and grows with each step. */
const GLOW = { rest: 0.4, dim: 0.06, lit: 0.55, wave: 0.6, hover: 0.8, active: 0.9 }
/** How fast the active glow travels along links, in typical link lengths per second. The front
 *  moves at one steady speed through the links themselves, not node by node. */
const WAVE_SPEED = 4

/** Ease toward a target at `rate` per second, independent of frame rate. */
const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate)

export function mountGraph(canvas: HTMLCanvasElement, o: GraphOptions): GraphHandle {
  const host = canvas.parentElement!
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(dprCap())
  renderer.setClearColor(0x000000, 0)
  const scene = new Scene()
  const camera = new PerspectiveCamera(45, 1, 1, 5000)
  camera.position.copy(HOME_POS)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.rotateSpeed = 0.6
  controls.zoomSpeed = 0.7
  controls.autoRotate = o.animate
  controls.autoRotateSpeed = 0.25
  controls.minDistance = 40
  controls.maxDistance = 1200

  const n = o.nodes.length
  const index = new Map(o.nodes.map((node, i) => [node.id, i]))
  const edges = o.links.map((l) => [index.get(l.source), index.get(l.target)] as const).filter((e): e is [number, number] => e[0] !== undefined && e[1] !== undefined)
  const degree = new Array(n).fill(0)
  const neighbours = o.nodes.map(() => new Set<number>())
  for (const [a, b] of edges) { degree[a]++; degree[b]++; neighbours[a].add(b); neighbours[b].add(a) }

  // Groups sit on a ring of anchors; each node starts near its own.
  const groups = [...new Set(o.nodes.map((node) => node.group))]
  const anchors = groups.map((_, i) => {
    const t = (i / groups.length) * Math.PI * 2
    return new Vector3(Math.cos(t) * 110, Math.sin(t * 2) * 30, Math.sin(t) * 110)
  })
  const anchorOf = o.nodes.map((node) => anchors[groups.indexOf(node.group)])
  const pos = o.nodes.map((_, i) => anchorOf[i].clone().add(new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(60)))
  const vel = o.nodes.map(() => new Vector3())
  const radius = degree.map((d) => 2.2 + Math.sqrt(d) * 1.6)

  // Hit spheres: never drawn (material.visible = false), only ray-cast, so a note is easy to hit
  // although what you see is a point of light. The look is the glow layer below.
  const hitMat = new MeshBasicMaterial()
  hitMat.visible = false
  const mesh = new InstancedMesh(new IcosahedronGeometry(1, 1), hitMat, Math.max(n, 1))
  mesh.count = n
  scene.add(mesh)

  const dark = () => new Color(palette.bg).getHSL({ h: 0, s: 0, l: 0 }).l < 0.5

  // Links: additive on a dark stage, so a brighter colour reads as more light, and black is gone.
  const lineGeo = new BufferGeometry()
  // Each link is two segments that meet at a split point, so the wave can fill it part way.
  lineGeo.setAttribute('position', new BufferAttribute(new Float32Array(edges.length * 12), 3))
  lineGeo.setAttribute('color', new BufferAttribute(new Float32Array(edges.length * 12), 3))
  const lineMat = new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false })
  const lines = new LineSegments(lineGeo, lineMat)
  scene.add(lines)

  // Glow: one point sprite per node with a soft radial falloff, sized in world units so it scales
  // with zoom. Drawn after the spheres without writing depth, so the halo shows round each ball.
  const glowGeo = new BufferGeometry()
  glowGeo.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3))
  glowGeo.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3))
  glowGeo.setAttribute('size', new BufferAttribute(new Float32Array(n), 1))
  glowGeo.setAttribute('glow', new BufferAttribute(new Float32Array(n), 1))
  const glowMat = new ShaderMaterial({
    uniforms: { projScale: { value: 1 } },
    vertexShader: `
      attribute float size; attribute float glow; attribute vec3 color;
      uniform float projScale;
      varying vec3 vColor; varying float vGlow;
      void main() {
        vColor = color; vGlow = glow;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (5.5 + glow * 2.5) * projScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vGlow;
      void main() {
        // A star: a small white-hot core inside a coloured halo whose reach is the glow.
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(0.24, 0.0, d);
        float halo = pow(max(1.0 - d, 0.0), 2.4) * vGlow;
        float a = clamp(core * 0.95 + halo, 0.0, 1.0);
        vec3 col = mix(vColor, vec3(1.0), core * 0.55 * min(vGlow * 2.0, 1.0));
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  const glowPoints = new Points(glowGeo, glowMat)
  glowPoints.frustumCulled = false
  scene.add(glowPoints)

  // Dust: faint particles drifting round each cluster, so a folder reads as a small galaxy.
  const DUST_PER_GROUP = 70
  const dustCount = groups.length * DUST_PER_GROUP
  const dustGeo = new BufferGeometry()
  dustGeo.setAttribute('position', new BufferAttribute(new Float32Array(dustCount * 3), 3))
  dustGeo.setAttribute('color', new BufferAttribute(new Float32Array(dustCount * 3), 3))
  dustGeo.setAttribute('size', new BufferAttribute(new Float32Array(dustCount).map(() => 0.5 + Math.random() * 0.9), 1))
  dustGeo.setAttribute('glow', new BufferAttribute(new Float32Array(dustCount).fill(0.55), 1))
  const dustOffset = Array.from({ length: dustCount }, () => {
    const r = 18 + Math.random() * 48
    const t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
    return { r, t, ph, speed: (Math.random() - 0.5) * 0.12 }
  })
  const dust = new Points(dustGeo, glowMat)
  dust.frustumCulled = false
  scene.add(dust)

  const centroid = groups.map(() => new Vector3())


  let palette = o.palette
  function applyBlending() {
    const add = dark()
    lineMat.blending = add ? AdditiveBlending : NormalBlending
    lineMat.opacity = add ? 1 : 0.45
    glowMat.blending = add ? AdditiveBlending : NormalBlending
    lineMat.needsUpdate = true; glowMat.needsUpdate = true
  }
  applyBlending()

  let highlight: Set<string> | null = null
  let hovered = -1
  let preview = -1
  let active = -1
  let activeAt = 0
  let clock = 0
  /** Hops from the active node, through links; -1 = not connected to it. */
  let hops = new Int16Array(n).fill(-1)
  /** Distance from the active node along links, in world units; Infinity = not connected. */
  let dist = new Float32Array(n).fill(Infinity)
  /** Wave speed in world units per second, from the typical link length when the pick is made. */
  let waveSpeed = 1
  function measureHops(from: number) {
    hops = new Int16Array(n).fill(-1)
    dist = new Float32Array(n).fill(Infinity)
    if (from < 0) return
    hops[from] = 0
    const queue = [from]
    while (queue.length) {
      const i = queue.shift()!
      for (const j of neighbours[i]) if (hops[j] < 0) { hops[j] = hops[i] + 1; queue.push(j) }
    }
    // Shortest paths by link length (Dijkstra; the vault is small enough for the simple form).
    dist[from] = 0
    const done = new Uint8Array(n)
    for (;;) {
      let i = -1
      for (let j = 0; j < n; j++) if (!done[j] && dist[j] < Infinity && (i < 0 || dist[j] < dist[i])) i = j
      if (i < 0) break
      done[i] = 1
      for (const j of neighbours[i]) { const d = dist[i] + pos[i].distanceTo(pos[j]); if (d < dist[j]) dist[j] = d }
    }
    const lengths = edges.map(([a, b]) => pos[a].distanceTo(pos[b])).sort((x, y) => x - y)
    waveSpeed = (lengths[lengths.length >> 1] || 40) * WAVE_SPEED
  }

  let alpha = 1
  function step() {
    if (alpha < 0.002) return
    const f = new Vector3()
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        f.subVectors(pos[i], pos[j])
        const d2 = Math.max(f.lengthSq(), 25)
        f.multiplyScalar((REPEL * alpha) / (d2 * Math.sqrt(d2)))
        vel[i].add(f); vel[j].sub(f)
      }
    }
    for (const [a, b] of edges) {
      f.subVectors(pos[b], pos[a])
      const d = f.length() || 1
      f.multiplyScalar(((d - SPRING_LEN) / d) * SPRING * alpha)
      vel[a].add(f); vel[b].sub(f)
    }
    for (let i = 0; i < n; i++) {
      vel[i].add(f.subVectors(anchorOf[i], pos[i]).multiplyScalar(ANCHOR * alpha)).multiplyScalar(DAMP)
      pos[i].add(vel[i])
    }
    alpha *= 0.99
  }

  // Eased per-node state: what is drawn, chasing what the state says it should be.
  const curScale = new Float32Array(n).fill(1)
  const curGlow = new Float32Array(n).fill(GLOW.rest)
  const curCol = new Float32Array(n * 3)
  const curEdge = new Float32Array(edges.length * 6)
  /** Per link, how much the wave colour shows (eased), so it fades out smoothly on deselect. */
  const curWave = new Float32Array(edges.length)
  const c = new Color()
  const bgc = new Color()
  const fade = (hex: string, k: number) => c.set(hex).lerp(bgc.set(palette.bg), k)
  for (let i = 0; i < n; i++) { c.set(palette.groups[o.nodes[i].group] ?? palette.link); curCol.set([c.r, c.g, c.b], i * 3) }

  // Hovering the active note itself must not cut the wave short, so it does not count as focus.
  const focusOf = () => { const f = hovered >= 0 ? hovered : preview; return f === active ? -1 : f }
  /** The wave front: how far along links, in world units, the glow has travelled so far. */
  const waveFront = () => (active < 0 ? -1 : o.animate ? (clock - activeAt) * waveSpeed : Infinity)

  function nodeTarget(i: number) {
    const f = focusOf()
    const own = palette.groups[o.nodes[i].group] ?? palette.link
    const inWave = active >= 0 && dist[i] <= waveFront()
    if (i === active) return { col: c.set(palette.accent), scale: 1.2, glow: GLOW.active }
    if (i === f) return { col: c.set(palette.accent), scale: 1.35, glow: GLOW.hover }
    if (f >= 0) return neighbours[f].has(i) ? { col: c.set(own), scale: 1.1, glow: GLOW.lit } : { col: fade(own, 0.82), scale: 0.9, glow: GLOW.dim }
    if (inWave) return { col: c.set(own), scale: 1.12, glow: GLOW.wave * Math.max(0.45, 1 - hops[i] * 0.12) }
    // Linked notes the wave has not reached yet hold their resting look until the front arrives.
    if (active >= 0 && hops[i] > 0 && !highlight) return { col: c.set(own), scale: 1, glow: GLOW.rest }
    if (active >= 0 && !highlight) return { col: fade(own, 0.6), scale: 0.95, glow: GLOW.dim }
    if (highlight) return highlight.has(o.nodes[i].id) ? { col: c.set(own), scale: 1.1, glow: GLOW.lit } : { col: fade(own, 0.82), scale: 0.9, glow: GLOW.dim }
    return { col: c.set(own), scale: 1, glow: GLOW.rest }
  }

  /** A link's base colour, under any wave. */
  function edgeTarget(end: number, other: number) {
    const f = focusOf()
    const link = c.set(palette.link)
    if (f >= 0) return end === f || other === f ? c.set(palette.accent) : link.multiplyScalar(0.18)
    if (active >= 0) return hops[end] < 0 ? link.multiplyScalar(0.2) : link.multiplyScalar(0.28)
    if (highlight) return highlight.has(o.nodes[end].id) && highlight.has(o.nodes[other].id) ? link.multiplyScalar(0.9) : link.multiplyScalar(0.15)
    return link.multiplyScalar(0.28)
  }

  const dummy = new Object3D()
  function paint(dt: number) {
    const k = o.animate ? ease(dt, 9) : 1
    const gp = glowGeo.getAttribute('position') as BufferAttribute
    const gc = glowGeo.getAttribute('color') as BufferAttribute
    const gs = glowGeo.getAttribute('size') as BufferAttribute
    const gg = glowGeo.getAttribute('glow') as BufferAttribute
    for (let i = 0; i < n; i++) {
      const t = nodeTarget(i)
      curScale[i] += (t.scale - curScale[i]) * k
      curGlow[i] += (t.glow - curGlow[i]) * k
      for (let ch = 0; ch < 3; ch++) curCol[i * 3 + ch] += ([t.col.r, t.col.g, t.col.b][ch] - curCol[i * 3 + ch]) * k
      dummy.position.copy(pos[i])
      dummy.scale.setScalar(radius[i] * curScale[i])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      c.setRGB(curCol[i * 3], curCol[i * 3 + 1], curCol[i * 3 + 2])
      mesh.setColorAt(i, c)
      gp.setXYZ(i, pos[i].x, pos[i].y, pos[i].z)
      gc.setXYZ(i, c.r, c.g, c.b)
      gs.setX(i, radius[i] * curScale[i])
      gg.setX(i, curGlow[i])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    gp.needsUpdate = gc.needsUpdate = gs.needsUpdate = gg.needsUpdate = true
    const p = lineGeo.getAttribute('position') as BufferAttribute
    const col = lineGeo.getAttribute('color') as BufferAttribute
    const front = waveFront()
    const waving = active >= 0 && focusOf() < 0
    const lit = new Color(), base = new Color()
    edges.forEach(([a, b], e) => {
      // Ease the base colour, the same at both ends.
      const t = edgeTarget(a, b), o3 = e * 6
      curEdge[o3] += (t.r - curEdge[o3]) * k
      curEdge[o3 + 1] += (t.g - curEdge[o3 + 1]) * k
      curEdge[o3 + 2] += (t.b - curEdge[o3 + 2]) * k
      base.setRGB(curEdge[o3], curEdge[o3 + 1], curEdge[o3 + 2])
      // The wave: the link fills from its nearer end at the front's steady speed.
      const nearA = dist[a] <= dist[b]
      const n0 = nearA ? a : b, n1 = nearA ? b : a
      const len = Math.max(pos[a].distanceTo(pos[b]), 1e-6)
      const fill = waving && dist[n0] < Infinity ? Math.min(Math.max((front - dist[n0]) / len, 0), 1) : 0
      curWave[e] += ((waving && dist[n0] < Infinity ? 1 : 0) - curWave[e]) * k
      lit.set(palette.accent).multiplyScalar(Math.max(0.35, 1 - Math.max(hops[n0], 0) * 0.18))
      const near = c.copy(base).lerp(lit, curWave[e] * (fill > 0 ? 1 : 0))
      const nr = near.r, ng = near.g, nb = near.b
      // Segment 1: near end to the split; segment 2: split to the far end.
      v.copy(pos[n0]).lerp(pos[n1], fill)
      p.setXYZ(e * 4, pos[n0].x, pos[n0].y, pos[n0].z)
      p.setXYZ(e * 4 + 1, v.x, v.y, v.z)
      p.setXYZ(e * 4 + 2, v.x, v.y, v.z)
      p.setXYZ(e * 4 + 3, pos[n1].x, pos[n1].y, pos[n1].z)
      col.setXYZ(e * 4, nr, ng, nb); col.setXYZ(e * 4 + 1, nr, ng, nb)
      col.setXYZ(e * 4 + 2, base.r, base.g, base.b); col.setXYZ(e * 4 + 3, base.r, base.g, base.b)
    })
    p.needsUpdate = true; col.needsUpdate = true
    lineGeo.computeBoundingSphere()
    mesh.computeBoundingSphere()
    paintClusters(dt)
  }

  function paintClusters(dt: number) {
    for (const v3 of centroid) v3.set(0, 0, 0)
    const counts = new Array(groups.length).fill(0)
    for (let i = 0; i < n; i++) { const g = groups.indexOf(o.nodes[i].group); centroid[g].add(pos[i]); counts[g]++ }
    centroid.forEach((v3, g) => v3.divideScalar(Math.max(counts[g], 1)))
    const f = focusOf()
    const focusGroup = f >= 0 ? o.nodes[f].group : active >= 0 ? o.nodes[active].group : null
    const dp = dustGeo.getAttribute('position') as BufferAttribute
    const dc = dustGeo.getAttribute('color') as BufferAttribute
    for (let d = 0; d < dustCount; d++) {
      const g = Math.floor(d / DUST_PER_GROUP)
      const off = dustOffset[d]
      if (o.animate) off.t += off.speed * dt
      const x = centroid[g].x + off.r * Math.sin(off.ph) * Math.cos(off.t)
      const y = centroid[g].y + off.r * Math.cos(off.ph) * 0.6
      const z = centroid[g].z + off.r * Math.sin(off.ph) * Math.sin(off.t)
      dp.setXYZ(d, x, y, z)
      const own = palette.groups[groups[g]] ?? palette.link
      if (focusGroup && focusGroup !== groups[g]) fade(own, 0.8); else fade(own, 0.25)
      dc.setXYZ(d, c.r, c.g, c.b)
    }
    dp.needsUpdate = dc.needsUpdate = true
  }


  // Labels: HTML spans over the canvas, so they use the DS type and stay crisp. They fade in and
  // out through `data-shown` rather than appearing and vanishing.
  const ranked = degree.map((d, i) => [d, i]).sort((a, b) => b[0] - a[0]).slice(0, RESTING_LABELS).filter(([d]) => d > 0).map(([, i]) => i)
  const spans = new Map<number, HTMLSpanElement>()
  const leaving = new Map<number, number>()
  const v = new Vector3()
  const toScreen = (p: Vector3) => {
    v.copy(p).project(camera)
    return { x: ((v.x + 1) / 2) * host.clientWidth, y: ((1 - v.y) / 2) * host.clientHeight, behind: v.z > 1 }
  }
  function labels() {
    const f = focusOf()
    const base = f >= 0 ? [f, ...neighbours[f]] : highlight ? o.nodes.flatMap((node, i) => highlight!.has(node.id) ? [i] : []).slice(0, 24) : ranked
    const want = new Set<number>(active >= 0 ? [active, ...base] : base)
    for (const [i, span] of spans) {
      if (want.has(i)) { clearTimeout(leaving.get(i)); leaving.delete(i); continue }
      if (leaving.has(i)) continue
      span.dataset.shown = 'false'
      leaving.set(i, window.setTimeout(() => { span.remove(); spans.delete(i); leaving.delete(i) }, o.animate ? 220 : 0))
    }
    for (const i of want) {
      let span = spans.get(i)
      if (!span) {
        span = document.createElement('span')
        span.className = o.labelClass
        span.textContent = o.nodes[i].label
        span.dataset.shown = 'false'
        o.labelLayer.appendChild(span)
        spans.set(i, span)
        const s = span
        requestAnimationFrame(() => { s.dataset.shown = 'true' })
      }
      const s = toScreen(pos[i])
      span.style.visibility = s.behind ? 'hidden' : ''
      span.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, ${radius[i] * curScale[i] + 8}px)`
      span.dataset.active = String(i === f || i === active)
    }
  }

  // Camera fly-to: ease the orbit target and the camera together toward a goal.
  let flyTarget: Vector3 | null = null
  let flyPos: Vector3 | null = null
  function fly(dt: number) {
    if (!flyTarget || !flyPos) return
    const k = o.animate ? ease(dt, 3.2) : 1
    controls.target.lerp(flyTarget, k)
    camera.position.lerp(flyPos, k)
    if (camera.position.distanceTo(flyPos) < 0.5) { flyTarget = flyPos = null }
  }
  // Any drag, zoom or pan hands the camera back at once, so a fly-to never fights the user.
  const stopFly = () => { flyTarget = flyPos = null }
  controls.addEventListener('start', stopFly)

  // Cursor: a reticle that trails the pointer, and snaps round a node, sized to it, on hover.
  const pointer = new Vector2()
  const screenPointer = { x: 0, y: 0, inside: false }
  const cur = { x: 0, y: 0, size: 18 }
  let dragging = false
  function cursor(dt: number) {
    const el = o.cursor
    if (!screenPointer.inside) { el.dataset.visible = 'false'; return }
    el.dataset.visible = 'true'
    // On the active note the orange ring already marks it, so the cursor stays at the pointer.
    const f = hovered === active ? -1 : hovered
    let tx = screenPointer.x, ty = screenPointer.y, ts = dragging ? 12 : 18
    if (f >= 0) {
      const s = toScreen(pos[f])
      v.copy(pos[f]).addScaledVector(camera.up, radius[f] * curScale[f]).project(camera)
      const edgeY = ((1 - v.y) / 2) * host.clientHeight
      tx = s.x; ty = s.y; ts = Math.max(22, Math.abs(s.y - edgeY) * 2 + 14)
    }
    const k = o.animate ? ease(dt, 18) : 1
    cur.x += (tx - cur.x) * k; cur.y += (ty - cur.y) * k; cur.size += (ts - cur.size) * k
    el.style.transform = `translate(${cur.x}px, ${cur.y}px) translate(-50%, -50%)`
    el.style.width = el.style.height = `${cur.size}px`
    el.dataset.state = dragging ? 'drag' : hovered >= 0 ? 'node' : 'idle'
  }

  // Overlay: the callout box beside the hovered (else active) note, cluster pills, hub, camera readout.
  function overlay() {
    const target = hovered >= 0 ? hovered : preview >= 0 ? preview : active
    const box = o.callout
    if (target < 0) { box.dataset.visible = 'false'; o.leader.style.opacity = '0' }
    else {
      const s = toScreen(pos[target])
      const w = host.clientWidth
      const right = s.x < w - 300
      const bx = right ? s.x + 48 : s.x - 48 - box.offsetWidth
      const by = Math.max(8, s.y - 64)
      box.style.transform = `translate(${bx}px, ${by}px)`
      box.dataset.visible = s.behind ? 'false' : 'true'
      o.leader.setAttribute('x1', String(s.x)); o.leader.setAttribute('y1', String(s.y))
      o.leader.setAttribute('x2', String(right ? bx : bx + box.offsetWidth)); o.leader.setAttribute('y2', String(by + 16))
      o.leader.style.opacity = s.behind ? '0' : '1'
    }
    const m = o.marker
    if (active < 0) m.dataset.visible = 'false'
    else {
      const s = toScreen(pos[active])
      v.copy(pos[active]).addScaledVector(camera.up, radius[active] * curScale[active]).project(camera)
      const size = Math.max(26, Math.abs(s.y - ((1 - v.y) / 2) * host.clientHeight) * 2 + 18)
      m.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`
      m.style.width = m.style.height = `${size}px`
      m.dataset.visible = s.behind ? 'false' : 'true'
    }
    groups.forEach((g, i) => {
      const el = o.groupLabels.get(g)
      if (!el) return
      const s = toScreen(v.copy(centroid[i]).addScaledVector(camera.up, 58))
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`
      el.style.visibility = s.behind ? 'hidden' : ''
    })
    const h = toScreen(new Vector3())
    o.hub.style.transform = `translate(${h.x}px, ${h.y}px) translate(-50%, -50%)`
    o.hub.style.visibility = h.behind ? 'hidden' : ''
    const rel = v.copy(camera.position).sub(controls.target)
    const az = ((Math.atan2(rel.x, rel.z) * 180) / Math.PI + 360) % 360
    const el = (Math.asin(rel.y / Math.max(rel.length(), 1e-6)) * 180) / Math.PI
    o.readout.textContent = `AZ ${az.toFixed(1)}° · EL ${el.toFixed(1)}°`
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = host
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
    glowMat.uniforms.projScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360))
  }
  const ro = new ResizeObserver(() => { resize(); kick() })
  ro.observe(host)
  resize()

  const ray = new Raycaster()
  let downAt = { x: 0, y: 0 }
  function pick(e: PointerEvent) {
    const r = canvas.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    return ray.intersectObject(mesh)[0]?.instanceId ?? -1
  }
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    screenPointer.x = e.clientX - r.left; screenPointer.y = e.clientY - r.top; screenPointer.inside = true
    if (!o.animate) { cur.x = screenPointer.x; cur.y = screenPointer.y }
    const hit = dragging ? hovered : pick(e)
    if (hit !== hovered) {
      hovered = hit
      controls.autoRotate = o.animate && hit < 0 && active < 0
      o.onHover(hit >= 0 ? o.nodes[hit].id : null)
    }
    kick()
  }
  const onLeave = () => { screenPointer.inside = false; if (hovered >= 0) { hovered = -1; o.onHover(null) } kick() }
  const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; dragging = true; kick() }
  const onUp = (e: PointerEvent) => {
    dragging = false
    kick()
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) return
    const hit = pick(e)
    // A click on the map selects in place; the camera stays where the user put it.
    if (hit >= 0) { if (hit !== active) setActive(hit); o.onSelect(o.nodes[hit].id) }
    else if (e.target === canvas && active >= 0) { setActive(-1); o.onSelect(null) }
  }
  const onDouble = (e: MouseEvent) => {
    const hit = pick(e as PointerEvent)
    if (hit >= 0) o.onOpen(o.nodes[hit].id)
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  canvas.addEventListener('dblclick', onDouble)

  function frame(dt: number) {
    clock += dt
    fly(dt)
    controls.update()
    paint(dt)
    labels()
    cursor(dt)
    overlay()
    renderer.render(scene, camera)
  }

  const loop = createLoop({ el: host, frame: (dt) => { step(); frame(dt) } })
  /** Under reduced motion, draw one frame per change; with motion the loop is always running. */
  function kick() { if (!o.animate) frame(1) }
  if (o.animate) loop.start()
  else {
    while (alpha >= 0.002) step()
    controls.addEventListener('change', kick)
    kick()
  }

  function setActive(i: number) {
    active = i
    activeAt = clock
    measureHops(i)
    controls.autoRotate = o.animate && i < 0
  }

  return {
    setHighlight(ids) { highlight = ids; kick() },
    setPreview(id) { preview = id === null ? -1 : index.get(id) ?? -1; kick() },
    setPalette(p) { palette = p; applyBlending(); kick() },
    focus(id) {
      const i = index.get(id)
      if (i === undefined) return
      if (i !== active) setActive(i)
      const offset = camera.position.clone().sub(controls.target).setLength(150)
      flyTarget = pos[i].clone()
      flyPos = pos[i].clone().add(offset)
      kick()
    },
    select(id) {
      const i = index.get(id)
      if (i !== undefined && i !== active) { setActive(i); kick() }
    },
    reset() {
      if (active >= 0) setActive(-1)
      flyTarget = HOME_TARGET.clone()
      flyPos = HOME_POS.clone()
      kick()
    },
    dispose() {
      loop.dispose()
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('dblclick', onDouble)
      controls.removeEventListener('start', stopFly)
      controls.dispose()
      for (const t of leaving.values()) clearTimeout(t)
      for (const span of spans.values()) span.remove()
      mesh.geometry.dispose(); hitMat.dispose()
      lineGeo.dispose(); lineMat.dispose()
      glowGeo.dispose(); glowMat.dispose(); dustGeo.dispose()
      renderer.dispose()
    },
  }
}
