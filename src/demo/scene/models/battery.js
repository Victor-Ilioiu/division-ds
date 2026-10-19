// 11.1 V stick LiPo with its wire loom, lying on the floor.
//
// Origin: centre of the bar's footprint, bar resting on y = 0, long axis along X. The loom
// leaves the -X end and curls toward +Z (the camera side). Everything is authored in
// millimetres and scaled to metres when the geometry is created.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { normalMapFromHeight } from '../lib/materials.js'

const MM = 0.001
const L = 128 // bar length (X)
const W = 21 // bar width (Z)
const H = 17 // bar height (Y)
const R = 3.0 // corner radius of the cross-section
const A = W / 2
const B = H / 2
const XE = L / 2
const RE = 2.2 // radius of the shoulder where the wrap rolls over the end
const LIP = 2.6 // how far the wrap folds onto the end face

// Ring topology (kept constant along the bar so stations can be stitched).
const NH = 8 // segments on a horizontal face
const NV = 6 // segments on a vertical face
const NC = 6 // segments per corner arc
const LABEL_J0 = NH / 2 + NC + NV + NC / 2 // middle of the +Z top corner
const LABEL_J1 = LABEL_J0 + NC / 2 + NH + NC / 2 // middle of the -Z top corner
const LABEL_X0 = -57
const LABEL_X1 = 58.5

/** One rounded-rectangle cross-section in (z, y), centred on 0, with outward normals. */
function ringAt(a, b, r) {
  const pts = []
  const line = (z0, y0, z1, y1, n, nz, ny) => {
    for (let i = 0; i < n; i++) {
      const t = i / n
      pts.push([z0 + (z1 - z0) * t, y0 + (y1 - y0) * t, nz, ny])
    }
  }
  const arc = (cz, cy, a0) => {
    for (let i = 0; i < NC; i++) {
      const t = a0 + (i / NC) * (Math.PI / 2)
      pts.push([cz + r * Math.cos(t), cy + r * Math.sin(t), Math.cos(t), Math.sin(t)])
    }
  }
  const az = a - r
  const by = b - r
  line(0, -b, az, -b, NH / 2, 0, -1)
  arc(az, -by, -Math.PI / 2)
  line(a, -by, a, by, NV, 1, 0)
  arc(az, by, 0)
  line(az, b, -az, b, NH, 0, 1)
  arc(-az, by, Math.PI / 2)
  line(-a, by, -a, -by, NV, -1, 0)
  arc(-az, -by, Math.PI)
  line(-az, -b, 0, -b, NH / 2, 0, -1)
  pts.push([...pts[0]])
  return pts
}

const BASE_RING = ringAt(A, B, R)
const N = BASE_RING.length - 1
const ARC = (() => {
  const s = [0]
  for (let j = 1; j <= N; j++) {
    s.push(s[j - 1] + Math.hypot(BASE_RING[j][0] - BASE_RING[j - 1][0], BASE_RING[j][1] - BASE_RING[j - 1][1]))
  }
  return s.map((v) => v / s[N])
})()

// Soft-pack lumps: the cells under the wrap are never perfectly flat. Shared by the body and
// the label so the label rides the surface instead of cutting through it.
const lump = (x, th) => 0.09 * Math.sin(0.09 * x + 1.1) * Math.sin(2 * th + 0.4) + 0.05 * Math.sin(0.21 * x + 3 * th + 2.0)
// Puckers where the wrap shrinks over the end.
const pucker = (th, seed) => 0.5 * Math.sin(9 * th + 0.7 + seed) + 0.3 * Math.sin(17 * th + 2.1 - seed) + 0.2 * Math.sin(5 * th + 4 + seed * 2)

function surfacePoint(ring, j, x, extra) {
  const p = ring[j]
  const th = ARC[j] * Math.PI * 2
  // The underside stays flat: the pack lies on the floor, so nothing may bulge below y = 0.
  const free = THREE.MathUtils.clamp(1 + p[3] * 1.6, 0, 1)
  const d = (lump(x, th) + extra(th)) * free
  return [x, p[1] + B - p[3] * d, p[0] - p[2] * d]
}

function buildBody() {
  const endStations = (sign) => {
    const out = [
      { x: sign * (XE - 2.0), d: RE + LIP },
      { x: sign * (XE - 0.6), d: RE + LIP },
      { x: sign * (XE + 0.05), d: RE + LIP - 0.5 },
      { x: sign * (XE + 0.1), d: RE + 1.0 },
    ]
    for (let k = 5; k >= 1; k--) {
      const phi = (k / 5) * (Math.PI / 2)
      out.push({ x: sign * (XE - RE + RE * Math.sin(phi)), d: RE * (1 - Math.cos(phi)) })
    }
    return out.map((s) => ({ ...s, w: 1, seed: sign }))
  }
  const body = []
  const nBody = 44
  for (let i = 0; i <= nBody; i++) {
    const x = -(XE - RE) + (i / nBody) * 2 * (XE - RE)
    const w = THREE.MathUtils.smoothstep(Math.abs(x), XE - 6, XE - RE) * 0.5
    body.push({ x, d: 0, w, seed: Math.sign(x) || 1 })
  }
  const stations = [...endStations(-1), ...body, ...endStations(1).reverse()]

  const pos = []
  const uv = []
  for (const s of stations) {
    const ring = ringAt(A - s.d, B - s.d, Math.max(R - s.d, 0.6))
    for (let j = 0; j <= N; j++) {
      const p = surfacePoint(ring, j, s.x, (th) => 0.3 * s.w * pucker(th, s.seed))
      pos.push(p[0] * MM, p[1] * MM, p[2] * MM)
      uv.push(THREE.MathUtils.clamp((s.x + XE) / L, 0, 1), ARC[j])
    }
  }
  const idx = []
  const cols = N + 1
  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < N; j++) {
      const a = i * cols + j
      const b = (i + 1) * cols + j
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  // The ring is closed with a duplicated column for the UV seam; weld its normals.
  const n = geo.attributes.normal
  for (let i = 0; i < stations.length; i++) {
    const a = i * cols
    const b = a + N
    const v = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize()
    n.setXYZ(a, v.x, v.y, v.z)
    n.setXYZ(b, v.x, v.y, v.z)
  }
  return geo
}

function buildLabel() {
  const ring = ringAt(A + 0.07, B + 0.07, R + 0.07)
  const nx = 46
  const rows = LABEL_J1 - LABEL_J0
  const s0 = ARC[LABEL_J0]
  const s1 = ARC[LABEL_J1]
  const pos = []
  const uv = []
  for (let i = 0; i <= nx; i++) {
    const x = LABEL_X0 + (i / nx) * (LABEL_X1 - LABEL_X0)
    for (let j = LABEL_J0; j <= LABEL_J1; j++) {
      const p = surfacePoint(ring, j, x, () => 0)
      pos.push(p[0] * MM, p[1] * MM, p[2] * MM)
      uv.push(i / nx, (ARC[j] - s0) / (s1 - s0))
    }
  }
  const idx = []
  const cols = rows + 1
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * cols + j
      const b = (i + 1) * cols + j
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// ---------------------------------------------------------------- textures

function wrapWrinkles() {
  return normalMapFromHeight('battery-shrinkwrap', 1024, (ctx, size, rand) => {
    ctx.lineCap = 'round'
    const soft = (x0, y0, x1, y1, w, v, alpha) => {
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = `rgba(${v},${v},${v},${alpha / (k + 1)})`
        ctx.lineWidth = w * (1 + k * 0.9)
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
      }
    }
    // Long, barely-there flow lines along the bar.
    for (let i = 0; i < 46; i++) {
      const y = rand() * size
      const x = rand() * size * 0.6
      soft(x, y, x + size * (0.25 + rand() * 0.5), y + (rand() - 0.5) * 26, 2 + rand() * 5, rand() < 0.5 ? 92 : 164, 0.16)
    }
    // Tight radiating wrinkles at both ends, where the film had the most to shrink.
    for (let i = 0; i < 150; i++) {
      const left = i % 2 === 0
      const len = 14 + rand() * 82
      const y = rand() * size
      const x0 = left ? rand() * 20 : size - rand() * 20
      const x1 = left ? x0 + len : x0 - len
      soft(x0, y, x1, y + (rand() - 0.5) * 12, 1.2 + rand() * 2.6, rand() < 0.5 ? 52 : 206, 0.5)
    }
    // A few diagonal creases on the faces.
    for (let i = 0; i < 12; i++) {
      const x = rand() * size
      const y = rand() * size
      soft(x, y, x + 50 + rand() * 120, y + (rand() - 0.5) * 80, 1.5 + rand() * 2, rand() < 0.5 ? 84 : 176, 0.22)
    }
    // The overlap seam of the film, on the back (-Z) face.
    const ys = size * 0.74
    soft(0, ys, size, ys, 2.2, 212, 0.75)
    soft(0, ys + 7, size, ys + 7, 2.2, 64, 0.4)
  }, 2.0)
}

function labelTexture() {
  const w = 2048
  const h = 352
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const INK = '#0b0b0c'
  const PAPER = '#eeede8'
  const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif'
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, w, h)

  const rr = (x, y, ww, hh, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + ww, y, x + ww, y + hh, r)
    ctx.arcTo(x + ww, y + hh, x, y + hh, r)
    ctx.arcTo(x, y + hh, x, y, r)
    ctx.arcTo(x, y, x + ww, y, r)
    ctx.closePath()
  }
  // Text squeezed horizontally: reads as a condensed face without depending on one.
  const text = (str, x, y, px, { weight = 700, squeeze = 0.84, color = PAPER, spacing = 0 } = {}) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(squeeze, 1)
    ctx.font = `${weight} ${px}px ${FONT}`
    ctx.fillStyle = color
    ctx.textBaseline = 'alphabetic'
    if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
    ctx.fillText(str, 0, 0)
    const m = ctx.measureText(str).width * squeeze
    ctx.restore()
    return m
  }

  // Brand panel (invented: a hex mark and a neutral name).
  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.moveTo(34, 62)
  ctx.lineTo(590, 62)
  ctx.lineTo(556, 290)
  ctx.lineTo(34, 290)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 9
  rr(62, 108, 136, 136, 14)
  ctx.stroke()
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    const px = 130 + Math.cos(a) * 42
    const py = 176 + Math.sin(a) * 42
    if (k === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.lineWidth = 11
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.fillRect(123, 152, 14, 48)
  text('HEXLINE', 224, 176, 84, { color: INK, squeeze: 0.8 })
  text('POWER CELLS', 226, 240, 46, { color: INK, squeeze: 0.86, spacing: 4, weight: 700 })

  // Capacity.
  text('1300 mAh', 628, 206, 168, { squeeze: 0.8 })
  text('Li-Po Rechargeable Battery Pack', 632, 252, 31, { weight: 400, squeeze: 0.92 })
  ctx.fillStyle = '#8f9094'
  ctx.fillRect(632, 268, 640, 2)
  text('Charge only with a Li-Po balance charger. Do not puncture, crush, short-circuit or leave unattended while charging.', 632, 292, 17, {
    weight: 400,
    squeeze: 0.9,
    color: '#a9aaad',
  })

  // Voltage and discharge rating.
  ctx.fillStyle = PAPER
  rr(1296, 58, 292, 142, 16)
  ctx.fill()
  text('11.1V', 1318, 178, 138, { color: INK, squeeze: 0.8 })
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 4
  rr(1298, 216, 288, 58, 10)
  ctx.stroke()
  text('20C / 40C', 1352, 261, 44, { squeeze: 0.86 })

  // Marks block: a cell-layout code, an invented inspection mark and two generic disposal
  // pictograms. No conformity mark: this product is invented and conforms to nothing, so it
  // does not print a real scheme's mark.
  const cx = 1626
  ctx.lineWidth = 3
  ctx.strokeStyle = PAPER
  rr(cx, 62, 86, 44, 6)
  ctx.stroke()
  text('3S1P', cx + 10, 96, 30, { squeeze: 0.86 })
  text('QC', cx + 104, 100, 44, { squeeze: 0.95 })
  // Recycling triangle.
  ctx.beginPath()
  ctx.moveTo(cx + 206, 62)
  ctx.lineTo(cx + 232, 106)
  ctx.lineTo(cx + 180, 106)
  ctx.closePath()
  ctx.stroke()
  // Crossed-out bin.
  ctx.strokeRect(cx + 12, 136, 30, 40)
  ctx.beginPath()
  ctx.moveTo(cx + 6, 134)
  ctx.lineTo(cx + 48, 134)
  ctx.moveTo(cx + 2, 124)
  ctx.lineTo(cx + 52, 184)
  ctx.moveTo(cx + 52, 124)
  ctx.lineTo(cx + 2, 184)
  ctx.stroke()
  text('Li-Po', cx + 70, 150, 26, { squeeze: 0.9 })
  text('14.4 Wh', cx + 70, 180, 26, { weight: 400, squeeze: 0.9 })
  text('HX-1113S', cx + 4, 232, 34, { squeeze: 0.86 })
  text('MINI PLUG · AEG', cx + 4, 264, 22, { weight: 400, squeeze: 0.88, color: '#a9aaad' })
  text('LOT 2609-A', cx + 4, 290, 22, { weight: 400, squeeze: 0.88, color: '#a9aaad' })

  // Scan block at the far end: random modules, deliberately not a valid code.
  let s = 20260
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const cell = 15
  const gx = 1888
  const gy = 64
  for (let iy = 0; iy < 15; iy++) {
    for (let ix = 0; ix < 9; ix++) {
      if (rand() < 0.5) {
        ctx.fillStyle = PAPER
        ctx.fillRect(gx + ix * cell, gy + iy * cell, cell, cell)
      }
    }
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

// ---------------------------------------------------------------- wires

const vec = (p) => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM)

/** Offsets a centre path sideways (in the floor plane), so parallel wires share one shape. */
function offsetPath(path, offsets, lift = () => 0) {
  return path.map((p, i) => {
    const a = path[Math.max(i - 1, 0)]
    const b = path[Math.min(i + 1, path.length - 1)]
    const tx = b[0] - a[0]
    const tz = b[2] - a[2]
    const len = Math.hypot(tx, tz) || 1
    const o = offsets[i]
    return [p[0] + (-tz / len) * o, p[1] + lift(i), p[2] + (tx / len) * o]
  })
}

function wireMesh(points, radius, material, tubular, radial, name) {
  const spline = new THREE.CatmullRomCurve3(points.map(vec), false, 'centripetal')
  // A spline through points resting on the floor dips below it between them; hold it up.
  const curve = new (class extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      spline.getPoint(t, target)
      target.y = Math.max(target.y, radius * MM)
      return target
    }
  })()
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubular, radius * MM, radial, false), material)
  mesh.name = name
  return mesh
}

const insulation = (color) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.3 })

/** A connector frame: back face centre at `at` (mm), mating direction `dir` in the floor plane. */
function frame(at, dir) {
  const d = new THREE.Vector2(dir[0], dir[1]).normalize()
  const g = new THREE.Group()
  g.position.set(at[0] * MM, 0, at[1] * MM)
  g.rotation.y = Math.atan2(-d.y, d.x)
  // World position (mm) of a point given in the connector's local frame (x forward, z sideways).
  const world = (lx, ly, lz) => [at[0] + d.x * lx - d.y * lz, ly, at[1] + d.y * lx + d.x * lz]
  return { group: g, world }
}

// ---------------------------------------------------------------- connectors

function miniPlug() {
  const g = new THREE.Group()
  const h = 3.1 // half height
  const c = 2.3 // half pitch of the two cells
  const outline = () => {
    const s = new THREE.Shape()
    s.moveTo(-c, -h)
    s.lineTo(c + h - 0.7, -h)
    s.quadraticCurveTo(c + h, -h, c + h, -h + 0.7)
    s.lineTo(c + h, h - 0.7)
    s.quadraticCurveTo(c + h, h, c + h - 0.7, h)
    s.lineTo(-c, h)
    s.absarc(-c, 0, h, Math.PI / 2, Math.PI * 1.5, false)
    return s
  }
  const front = outline()
  const round = new THREE.Path()
  round.absarc(-c, 0, 2.25, 0, Math.PI * 2, true)
  const square = new THREE.Path()
  const q = 2.15
  square.moveTo(c - q, -q)
  square.lineTo(c - q, q)
  square.lineTo(c + q, q)
  square.lineTo(c + q, -q)
  square.closePath()
  front.holes.push(round, square)
  const opts = { bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelOffset: -0.3, bevelSegments: 2, curveSegments: 10 }
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xc3d620,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    sheen: 0.25,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(0xf4ff9a),
    emissive: new THREE.Color(0x4c5a05),
    emissiveIntensity: 0.16, // stands in for the light a translucent nylon housing lets through
  })
  const place = (geo, x0) => {
    geo.rotateY(Math.PI / 2) // extrusion (+Z) becomes the mating direction (+X)
    geo.translate(x0, h, 0)
    geo.scale(MM, MM, MM)
    return geo
  }
  const back = new THREE.Mesh(place(new THREE.ExtrudeGeometry(outline(), { ...opts, depth: 7.4 }), 0.3), mat)
  const shell = new THREE.Mesh(place(new THREE.ExtrudeGeometry(front, { ...opts, depth: 8.4 }), 8.3), mat)
  g.add(back, shell)

  // Latch: a spine along the top and the hook at its front.
  const spine = new THREE.Mesh(new RoundedBoxGeometry(9 * MM, 0.9 * MM, 2.6 * MM, 2, 0.3 * MM), mat)
  spine.position.set(7.2 * MM, (2 * h + 0.35) * MM, 0)
  const hook = new THREE.Mesh(new RoundedBoxGeometry(2.2 * MM, 1.5 * MM, 3.4 * MM, 2, 0.35 * MM), mat)
  hook.position.set(12.4 * MM, (2 * h + 0.6) * MM, 0)
  g.add(spine, hook)

  // Brass contacts down in the two cells.
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc8a550, roughness: 0.3, metalness: 1 })
  for (const z of [-c, c]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.85 * MM, 0.85 * MM, 6 * MM, 10), brass)
    pin.rotation.z = Math.PI / 2
    pin.position.set(11.2 * MM, h * MM, z * MM)
    g.add(pin)
  }
  return { group: g, cells: [c, -c], height: h }
}

function balancePlug() {
  const g = new THREE.Group()
  const lenX = 7
  const hY = 5.7
  const wZ = 12.4
  const nylon = new THREE.MeshPhysicalMaterial({ color: 0xe9e6dc, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.8 })
  const body = new THREE.Mesh(new RoundedBoxGeometry(lenX * MM, hY * MM, wZ * MM, 3, 0.45 * MM), nylon)
  body.position.set((lenX / 2) * MM, (hY / 2) * MM, 0)
  g.add(body)
  for (let i = 0; i < 4; i++) {
    const z = (i - 1.5) * 2.5
    // Terminal windows on top and the socket openings on the mating face.
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.2 * MM, 0.1 * MM, 1.3 * MM), dark)
    win.position.set(3.2 * MM, (hY + 0.01) * MM, z * MM)
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.1 * MM, 2.2 * MM, 1.3 * MM), dark)
    hole.position.set((lenX + 0.01) * MM, (hY / 2) * MM, z * MM)
    win.userData.shadow = hole.userData.shadow = false
    g.add(win, hole)
  }
  // Polarising ribs on one broad face... on a lying plug they read as two small rails on top.
  for (const z of [-4.4, 4.4]) {
    const rib = new THREE.Mesh(new RoundedBoxGeometry(5 * MM, 0.7 * MM, 0.9 * MM, 1, 0.2 * MM), nylon)
    rib.position.set(4.2 * MM, (hY + 0.3) * MM, z * MM)
    g.add(rib)
  }
  return { group: g, cells: [3.75, 1.25, -1.25, -3.75], height: hY / 2 }
}

// ---------------------------------------------------------------- assembly

export function create() {
  const group = new THREE.Group()
  group.name = 'battery'

  const wrapMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d0d0f,
    roughness: 0.3,
    metalness: 0,
    normalMap: wrapWrinkles(),
    normalScale: new THREE.Vector2(0.55, 0.55),
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    side: THREE.DoubleSide, // the folded lip shows its inside face
  })
  const body = new THREE.Mesh(buildBody(), wrapMat)
  body.name = 'pack'
  group.add(body)

  const label = new THREE.Mesh(
    buildLabel(),
    new THREE.MeshPhysicalMaterial({
      map: labelTexture(),
      roughness: 0.44,
      metalness: 0,
      clearcoat: 0.0,
      clearcoatRoughness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  )
  label.name = 'label'
  label.userData.shadow = false
  group.add(label)

  // What you see through the open ends: the cell stack's end pad, set back inside the wrap.
  const padShape = new THREE.Shape()
  const pa = A - RE - LIP + 0.5
  const pb = B - RE - LIP + 0.5
  padShape.moveTo(-pa, -pb)
  padShape.lineTo(pa, -pb)
  padShape.lineTo(pa, pb)
  padShape.lineTo(-pa, pb)
  padShape.closePath()
  const padMat = new THREE.MeshStandardMaterial({ color: 0x242426, roughness: 0.9, side: THREE.DoubleSide })
  for (const sign of [-1, 1]) {
    const geo = new THREE.ShapeGeometry(padShape)
    geo.rotateY(Math.PI / 2)
    geo.translate(sign * (XE - 1.6), B, 0)
    geo.scale(MM, MM, MM)
    const pad = new THREE.Mesh(geo, padMat)
    pad.name = sign < 0 ? 'endPadRear' : 'endPadFront'
    group.add(pad)
  }

  // ---- main leads: red and black, about 110 mm, to a small two-pin connector.
  const loom = new THREE.Group()
  loom.name = 'loom'
  group.add(loom)

  const RM = 1.3 // main lead radius
  const tam = miniPlug()
  const tf = frame([-133.5, 63.5], [-0.41, 0.91])
  tf.group.add(tam.group)
  tf.group.name = 'connector'
  loom.add(tf.group)

  const mainPath = [
    [-63.4, 10.3, -1.7],
    [-68.5, 10.25, -1.7],
    [-78, 7.6, -1.0],
    [-90, 3.1, 2.5],
    [-102, RM, 10],
    [-113, RM, 22],
    [-121, RM, 36],
    [-126.5, RM + 0.25, 49],
  ]
  const mains = [
    { name: 'leadRed', color: 0xb30d13, side: 1, sep: [1.5, 1.5, 1.6, 2.0, 2.5, 2.1, 1.7, 2.0], lift: [0, 0, 0.5, 0.4, 0, 0, 0, 0] },
    { name: 'leadBlack', color: 0x131315, side: -1, sep: [1.5, 1.5, 1.6, 2.2, 2.3, 1.6, 1.9, 2.1], lift: [0, 0, 0, 0, 0, 0, 0, 0] },
  ]
  mains.forEach((m, k) => {
    const pts = offsetPath(mainPath, m.sep.map((s) => s * m.side), (i) => m.lift[i])
    pts.push(tf.world(-5, tam.height - 0.5, tam.cells[k]), tf.world(-1.5, tam.height, tam.cells[k]), tf.world(2, tam.height, tam.cells[k]))
    loom.add(wireMesh(pts, RM, insulation(m.color), 110, 10, m.name))
  })

  // ---- balance lead: four thin wires to a white JST-XH style plug.
  const RB = 0.55
  const plug = balancePlug()
  const pf = frame([-73, 41.5], [0.27, 0.96])
  pf.group.add(plug.group)
  pf.group.name = 'balancePlug'
  loom.add(pf.group)

  const balPath = [
    [-63.4, 6.3, 3.3],
    [-67, 6.25, 3.4],
    [-72, 4.3, 6.5],
    [-76.5, 1.7, 13],
    [-78, RB + 0.05, 22],
    [-76.6, RB + 0.2, 31],
  ]
  const balColors = [0xb30d13, 0xd9a80c, 0xd9a80c, 0x131315]
  balColors.forEach((color, k) => {
    const o = 1.5 - k // -1.5 .. 1.5 across the ribbon
    const spread = [1.15, 1.15, 1.2, 1.25, 1.3, 1.7]
    const pts = offsetPath(balPath, spread.map((s) => o * s), (i) => (i >= 3 ? ((k * 7 + i * 3) % 4) * 0.06 : 0))
    pts.push(pf.world(-4.5, plug.height - 0.7, plug.cells[k] * 0.86), pf.world(-1.2, plug.height, plug.cells[k]), pf.world(1.5, plug.height, plug.cells[k]))
    loom.add(wireMesh(pts, RB, insulation(color), 56, 6, `balance${k + 1}`))
  })

  return group
}
