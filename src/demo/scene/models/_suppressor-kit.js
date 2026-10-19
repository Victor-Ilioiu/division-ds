// Private helpers shared by suppressor.js, foregrip.js and tac-light.js.
//
// Everything here takes MILLIMETRES and returns geometry in METRES, so the profiles in the
// asset files read like a machinist's drawing.

import * as THREE from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { anodized, knurl } from '../lib/materials.js'

export const MM = 0.001
const rad = THREE.MathUtils.degToRad

export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A run of cylinders with a chamfer on every convex corner.
 * `list` is [[xEnd, radius], ...]; each section runs from the previous xEnd to its own.
 * Returns profile points for `turn`.
 */
export function steps(x0, list, c = 0.5, { start = false, end = false } = {}) {
  const pts = []
  for (let i = 0; i < list.length; i++) {
    const [xe, r] = list[i]
    if (i === 0) {
      if (start) pts.push([x0, r - c], [x0 + c, r])
      else pts.push([x0, r])
    }
    const next = list[i + 1]
    if (!next) {
      if (end) pts.push([xe - c, r], [xe, r - c])
      else pts.push([xe, r])
    } else {
      const r2 = next[1]
      const cc = Math.min(c, Math.abs(r2 - r))
      if (r2 > r) pts.push([xe, r], [xe, r2 - cc], [xe + cc, r2])
      else if (r2 < r) pts.push([xe - cc, r], [xe, r - cc], [xe, r2])
    }
  }
  return pts
}

/**
 * Lathe with machined shading: every profile segment keeps its own normal (so chamfers stay
 * crisp and catch a highlight), smooth only around the circumference. A point given as
 * [x, r, 1] is shaded smooth across its two segments, for domes and reflectors.
 *
 * Profile points are [axial, radius]. Trace the outside with the axial value increasing and
 * bores with it decreasing: the surface normal is always on the left of the direction of travel.
 * UV: u runs once around, v is the arc length along the profile in metres.
 */
export function turn(pts, { segs = 64, axis = 'x', thetas = null } = {}) {
  // `thetas` (radians, first to first + 2*PI) replaces the even angular spacing, so a lathed part
  // can share its ring of vertices with a neighbour that is not evenly divided.
  const TH = thetas ?? Array.from({ length: segs + 1 }, (_, j) => (j / segs) * Math.PI * 2)
  segs = TH.length - 1
  const P = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6)
  const n = P.length - 1
  const segN = []
  for (let i = 0; i < n; i++) {
    const dx = P[i + 1][0] - P[i][0]
    const dr = P[i + 1][1] - P[i][1]
    const l = Math.hypot(dx, dr)
    segN.push([-dr / l, dx / l])
  }
  const avg = (a, b) => {
    const x = a[0] + b[0]
    const y = a[1] + b[1]
    const l = Math.hypot(x, y) || 1
    return [x / l, y / l]
  }
  const pos = []
  const nor = []
  const uv = []
  const idx = []
  let len = 0
  for (let i = 0; i < n; i++) {
    const a = P[i]
    const b = P[i + 1]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    const na = a[2] && i > 0 ? avg(segN[i - 1], segN[i]) : segN[i]
    const nb = b[2] && i < n - 1 ? avg(segN[i], segN[i + 1]) : segN[i]
    const base = pos.length / 3
    for (let j = 0; j <= segs; j++) {
      const th = TH[j]
      const u = (th - TH[0]) / (Math.PI * 2)
      const c = Math.cos(th)
      const s = Math.sin(th)
      pos.push(a[0] * MM, a[1] * c * MM, a[1] * s * MM)
      nor.push(na[0], na[1] * c, na[1] * s)
      uv.push(u, len * MM)
      pos.push(b[0] * MM, b[1] * c * MM, b[1] * s * MM)
      nor.push(nb[0], nb[1] * c, nb[1] * s)
      uv.push(u, (len + l) * MM)
    }
    for (let j = 0; j < segs; j++) {
      const p = base + j * 2
      idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3)
    }
    len += l
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  if (axis === 'y') g.rotateZ(Math.PI / 2)
  if (axis === 'z') g.rotateY(-Math.PI / 2)
  return g
}

/**
 * A closed-in-u parametric skin. `fn(u, v)` returns [x, y, z] in mm, u and v in 0..1.
 * Normals come from finite differences, so there is no shading seam at u = 0.
 */
export function skin(fn, nu, nv, { skip = null, flip = false } = {}) {
  // `skip(i, j)` leaves a grid cell open (to be filled by a recess patch); `flip` turns the
  // surface inside out when the parametrisation runs the other way round.
  const pos = []
  const nor = []
  const uv = []
  const idx = []
  const e = 1e-4
  const P = (u, v) => new THREE.Vector3(...fn(u, v))
  for (let j = 0; j <= nv; j++) {
    const v = j / nv
    for (let i = 0; i <= nu; i++) {
      const u = i / nu
      const p = P(u, v)
      const du = P(u + e, v).sub(P(u - e, v))
      const dv = P(u, Math.min(1, v + e)).sub(P(u, Math.max(0, v - e)))
      const nn = dv.cross(du).normalize()
      if (flip) nn.negate()
      pos.push(p.x * MM, p.y * MM, p.z * MM)
      nor.push(nn.x, nn.y, nn.z)
      uv.push(u, v)
    }
  }
  const w = nu + 1
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      if (skip && skip(i, j)) continue
      const a = j * w + i
      if (flip) idx.push(a, a + 1, a + w, a + 1, a + w + 1, a + w)
      else idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** Unit normal of a parametric surface `P(u, v)` (mm), same orientation as `skin` gives it. */
export function surfaceNormal(P, u, v, e = 1e-4) {
  const a = new THREE.Vector3(...P(u + e, v)).sub(new THREE.Vector3(...P(u - e, v)))
  const b = new THREE.Vector3(...P(u, v + e)).sub(new THREE.Vector3(...P(u, v - e)))
  return b.cross(a).normalize()
}

/**
 * A raised (or sunken) patch lying on a parametric surface: the rectangle u0..u1 x v0..v1 of
 * `P`, pushed along the surface normal by `height(a, b)` mm, a and b in 0..1 across the patch.
 * UV is (a, b), so a label can be mapped straight onto it.
 */
export function patchOn(P, { u, v, nu = 16, nv = 8, height, flip = false }) {
  const fn = (a, b) => {
    const uu = u[0] + (u[1] - u[0]) * a
    const vv = v[0] + (v[1] - v[0]) * b
    const p = P(uu, vv)
    const n = surfaceNormal(P, uu, vv)
    const h = height(Math.min(1, Math.max(0, a)), Math.min(1, Math.max(0, b)))
    return [p[0] + n.x * h, p[1] + n.y * h, p[2] + n.z * h]
  }
  // the patch may be mirrored in parameter space; keep its faces looking along +normal
  const mirrored = (u[1] - u[0]) * (v[1] - v[0]) < 0
  return skin(fn, nu, nv, { flip: mirrored !== flip })
}

/** A pillow: 1 in the middle, 0 at the border, with a rounded shoulder `soft` (0..0.5) wide. */
export function pillow(a, b, soft = 0.2) {
  const k = (t) => {
    const d = Math.min(t, 1 - t) / soft
    if (d >= 1) return 1
    return Math.sqrt(Math.max(0, 1 - (1 - d) * (1 - d)))
  }
  return k(a) * k(b)
}

/** Frame of a band swept along `curve` (a THREE.Curve in metres): point, tangent, width, face normal. */
export function ribbonFrame(curve, t, up = new THREE.Vector3(0, 1, 0)) {
  const p = curve.getPointAt(t)
  const T = curve.getTangentAt(t).normalize()
  const W = up.clone().addScaledVector(T, -up.dot(T)).normalize()
  const N = new THREE.Vector3().crossVectors(T, W).normalize()
  return { p, T, W, N }
}

/**
 * A flat band swept along a curve (metres): webbing, an elastic strap. The section is a
 * stadium, so the edges are rounded. UV: u is the length along the band in metres, v runs
 * 0..1 around the section (0..0.5 is the +N face).
 */
export function ribbon(curve, { width, thickness, segs = 80, up, t0 = 0, t1 = 1, offset = 0 } = {}) {
  const w = width * MM
  const th = thickness * MM
  const r = th / 2
  const sec = [] // [across, normal-dir, n-across, n-normal]
  const ARC = 4
  const half = w / 2 - r
  sec.push([-half, r, 0, 1], [half, r, 0, 1])
  for (let i = 1; i < ARC; i++) {
    const a = (i / ARC) * Math.PI
    sec.push([half + r * Math.sin(a), r * Math.cos(a), Math.sin(a), Math.cos(a)])
  }
  sec.push([half, -r, 0, -1], [-half, -r, 0, -1])
  for (let i = 1; i < ARC; i++) {
    const a = (i / ARC) * Math.PI
    sec.push([-half - r * Math.sin(a), -r * Math.cos(a), -Math.sin(a), -Math.cos(a)])
  }
  sec.push(sec[0])
  const pos = []
  const nor = []
  const uv = []
  const idx = []
  const total = curve.getLength()
  const m = sec.length
  for (let i = 0; i <= segs; i++) {
    const t = t0 + ((t1 - t0) * i) / segs
    const f = ribbonFrame(curve, t, up)
    for (let k = 0; k < m; k++) {
      const [a, b, na, nb] = sec[k]
      const p = f.p.clone().addScaledVector(f.W, a).addScaledVector(f.N, b + offset * MM)
      const n = f.W.clone().multiplyScalar(na).addScaledVector(f.N, nb)
      pos.push(p.x, p.y, p.z)
      nor.push(n.x, n.y, n.z)
      uv.push(t * total, k / (m - 1))
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < m - 1; k++) {
      const a = i * m + k
      idx.push(a, a + m, a + 1, a + 1, a + m, a + m + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** Stand an object whose own +Y is "out of the surface" on a point (mm) with a given normal. */
export function place(obj, p, n, spin = 0) {
  obj.position.set(p[0] * MM, p[1] * MM, p[2] * MM)
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.clone().normalize())
  if (spin) obj.rotateY(spin)
  return obj
}

/** A closed polygon (mm) with every corner rounded. A point may carry its own radius: [x, y, r]. */
export function filletShape(pts, rDefault = 1) {
  const s = new THREE.Shape()
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const a = pts[(i - 1 + n) % n]
    const b = pts[(i + 1) % n]
    const la = Math.hypot(a[0] - p[0], a[1] - p[1])
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1])
    const d = Math.min(p[2] ?? rDefault, la * 0.45, lb * 0.45)
    const p1 = [p[0] + ((a[0] - p[0]) / la) * d, p[1] + ((a[1] - p[1]) / la) * d]
    const p2 = [p[0] + ((b[0] - p[0]) / lb) * d, p[1] + ((b[1] - p[1]) / lb) * d]
    if (i === 0) s.moveTo(p1[0] * MM, p1[1] * MM)
    else s.lineTo(p1[0] * MM, p1[1] * MM)
    if (d > 1e-4) s.quadraticCurveTo(p[0] * MM, p[1] * MM, p2[0] * MM, p2[1] * MM)
  }
  s.closePath()
  return s
}

/** Points along an arc (mm), degrees, for splicing into a filletShape outline (radius 0). */
export function arcPts(cx, cy, r, a0, a1, n = 32) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n)
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a), 0])
  }
  return out
}

/**
 * Extrude a shape whose coordinates are (world Z, world Y) along world X, centred on x = 0,
 * `length` mm overall, with a bevel that does not grow the outline.
 */
export function extrudeX(shape, length, bevel = 0.5, curveSegments = 5) {
  const depth = (length - 2 * bevel) * MM
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * MM,
    bevelSize: bevel * MM,
    bevelOffset: -bevel * MM,
    bevelSegments: 2,
    curveSegments,
  })
  g.translate(0, 0, -depth / 2)
  g.rotateY(-Math.PI / 2)
  // ExtrudeGeometry shades every facet flat, which bands a curved outline. Smooth anything
  // shallower than 32 degrees and keep real edges and bevels crisp.
  return toCreasedNormals(g, rad(32))
}

/** Anodised aluminium whose brush marks run around a turned part (the lathe's tool marks). */
export function turned(opts = {}) {
  const m = anodized(opts)
  m.normalMap.repeat.set(1, 70)
  return m
}

/** Diamond knurl for a turned band. `circ` is the band's circumference in mm, `tile` 8 diamonds. */
export function knurled({ circ, tile = 9, color = 0x16171a, metal = true, scale = 1.25 } = {}) {
  const n = knurl().clone()
  n.repeat.set(Math.max(1, Math.round(circ / tile)), 1 / (tile * MM))
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: metal ? 0.46 : 0.72,
    metalness: metal ? 0.85 : 0,
    normalMap: n,
    normalScale: new THREE.Vector2(scale, scale),
    clearcoat: metal ? 0.2 : 0.05,
    clearcoatRoughness: 0.45,
  })
}

/** A transparent canvas to draw markings on. `draw(ctx, w, h)`. */
export function label(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Fit one line of text into a box by shrinking the font. */
export function fitText(ctx, text, x, y, maxWidth, px, font = '600 {px}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif') {
  let size = px
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (;;) {
    ctx.font = font.replace('{px}', size)
    if (ctx.measureText(text).width <= maxWidth || size <= 8) break
    size -= 1
  }
  ctx.fillText(text, x, y)
}

/**
 * A marking wrapped on a cylinder whose axis is X. `theta` is the centre of the patch in
 * degrees from +Y toward +Z (so -90 is the rifle's left side); the text always reads upright
 * and left to right for a viewer looking at that side.
 */
export function cylDecal({ r, x0, x1, theta, height, map, segs = 14 }) {
  const th0 = rad(theta)
  const half = height / 2 / r
  const up = th0 > 0 ? -1 : 1
  const fwd = th0 > 0
  const pos = []
  const nor = []
  const uv = []
  const idx = []
  for (let j = 0; j <= segs; j++) {
    const v = j / segs
    const th = th0 + up * (v - 0.5) * 2 * half
    const c = Math.cos(th)
    const s = Math.sin(th)
    for (let i = 0; i <= 1; i++) {
      const x = fwd ? (i ? x1 : x0) : i ? x0 : x1
      pos.push(x * MM, r * c * MM, r * s * MM)
      nor.push(0, c, s)
      uv.push(i, v)
    }
  }
  for (let j = 0; j < segs; j++) {
    const a = j * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  const m = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    roughness: 0.62,
    metalness: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const mesh = new THREE.Mesh(g, m)
  mesh.userData.shadow = false
  return mesh
}

/**
 * The cross-bolt of a rail clamp, along Z: hex head and washer on -Z, knurled thumb nut on +Z.
 * `zHead` and `zNut` are the outer faces of the clamp the hardware sits on (mm).
 */
export function crossBolt({ x = 0, y, zHead, zNut, shaftR = 2.2, nutR = 7.6, nutLen = 5.5, hex = 8 }) {
  const g = new THREE.Group()
  g.name = 'cross-bolt'
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, roughness: 0.34, metalness: 0.9 })

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR * MM, shaftR * MM, (zNut - zHead) * MM, 20).rotateX(Math.PI / 2),
    steel,
  )
  shaft.position.z = ((zNut + zHead) / 2) * MM
  shaft.name = 'bolt-shaft'
  g.add(shaft)

  const washer = new THREE.Mesh(
    turn([[zHead - 0.9, 0], [zHead - 0.9, hex * 0.62], [zHead - 0.5, hex * 0.62 + 0.4], [zHead, hex * 0.62 + 0.4]], { segs: 32, axis: 'z' }),
    steel,
  )
  washer.name = 'bolt-washer'
  g.add(washer)

  const R = hex / 2 / Math.cos(Math.PI / 6)
  const hexShape = filletShape(Array.from({ length: 6 }, (_, i) => [R * Math.cos((i * Math.PI) / 3), R * Math.sin((i * Math.PI) / 3)]), 0.5)
  const hb = 0.45
  const hd = 3.2
  const hexGeo = new THREE.ExtrudeGeometry(hexShape, {
    depth: (hd - 2 * hb) * MM,
    bevelEnabled: true,
    bevelThickness: hb * MM,
    bevelSize: hb * MM,
    bevelOffset: -hb * MM,
    bevelSegments: 2,
    curveSegments: 3,
  })
  hexGeo.translate(0, 0, (zHead - 0.9 - hd + hb) * MM)
  const head = new THREE.Mesh(hexGeo, steel)
  head.name = 'bolt-head'
  g.add(head)

  const z = zNut
  const flange = new THREE.Mesh(
    turn(
      [[z, nutR - 1.6], [z + 1, nutR - 1.6], [z + 1, nutR - 0.5], [z + 1.5, nutR]],
      { segs: 40, axis: 'z' },
    ),
    steel,
  )
  flange.name = 'thumb-nut-flange'
  const wheel = new THREE.Mesh(
    turn([[z + 1.5, nutR], [z + 1.5 + nutLen, nutR]], { segs: 40, axis: 'z' }),
    knurled({ circ: 2 * Math.PI * nutR, tile: 8, color: 0x1c1d21, scale: 1.5 }),
  )
  wheel.name = 'thumb-nut'
  const e = z + 1.5 + nutLen
  const face = new THREE.Mesh(
    turn(
      [[e, nutR], [e + 0.5, nutR - 0.5], [e + 0.5, 4.6], [e - 0.4, 4.0], [e - 0.4, shaftR], [e + 1.4, shaftR], [e + 1.8, shaftR - 0.4], [e + 1.8, 0]],
      { segs: 40, axis: 'z' },
    ),
    steel,
  )
  face.name = 'thumb-nut-face'
  g.add(flange, wheel, face)

  g.position.set(x * MM, y * MM, 0)
  return g
}

/**
 * A strap slider: a flat moulded frame with two slots, lying in its own XY plane (X along the
 * strap, Y across it), centred, `depth` mm thick along Z. Position it with a ribbonFrame.
 */
export function sliderGeometry(len, width, depth = 4, bevel = 0.7) {
  const shape = filletShape([[-len / 2, -width / 2], [len / 2, -width / 2], [len / 2, width / 2], [-len / 2, width / 2]], 3)
  const sw = len * 0.19
  for (const cx of [-len * 0.23, len * 0.23]) {
    const hole = filletShape([[cx - sw / 2, -width / 2 + 3.2], [cx + sw / 2, -width / 2 + 3.2], [cx + sw / 2, width / 2 - 3.2], [cx - sw / 2, width / 2 - 3.2]], 1.2)
    shape.holes.push(new THREE.Path(hole.getPoints(4).reverse()))
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: (depth - 2 * bevel) * MM,
    bevelEnabled: true,
    bevelThickness: bevel * MM,
    bevelSize: bevel * MM,
    bevelOffset: -bevel * MM,
    bevelSegments: 2,
    curveSegments: 4,
  })
  g.translate(0, 0, (-(depth - 2 * bevel) / 2) * MM)
  return g
}
