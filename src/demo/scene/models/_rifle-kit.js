// Geometry helpers for rifle.js. Everything here works in MILLIMETRES; `finish()` converts a
// geometry to metres as the last step, so the numbers in rifle.js stay readable.
//
// The side silhouette was traced from spike/assets/rifle1.webp (a private, git-ignored reference photo) (800 x 533 px, flat-on left side).
// Muzzle tip sits at px 48 and the butt plate at px 742, so 694 px = 720 mm: 1.0375 mm/px.
// `P(px, py)` turns a photo pixel into rifle millimetres: origin on the bore axis (py 232)
// above the centre of the magazine well (px 357), +X toward the muzzle, +Y up.

import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

export const S = 720 / 694
export const OX = 357
export const OY = 232
export const X = (px) => (OX - px) * S
export const Y = (py) => (OY - py) * S
export const P = (px, py) => [X(px), Y(py)]

const V2 = THREE.Vector2

/** Polygon [[x, y, r?], ...] in mm -> Vector2[] with every corner that has r filleted by an arc. */
export function roundPts(pts) {
  const n = pts.length
  const out = []
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = pts[i]
    const p = new V2(x, y)
    if (!r) {
      out.push(p)
      continue
    }
    const a = pts[(i + n - 1) % n]
    const b = pts[(i + 1) % n]
    const da = new V2(a[0], a[1]).sub(p)
    const db = new V2(b[0], b[1]).sub(p)
    const la = da.length()
    const lb = db.length()
    da.divideScalar(la)
    db.divideScalar(lb)
    const ang = Math.acos(THREE.MathUtils.clamp(da.dot(db), -1, 1))
    if (ang > Math.PI - 0.03 || ang < 0.03) {
      out.push(p)
      continue
    }
    const d = Math.min(r / Math.tan(ang / 2), la * 0.48, lb * 0.48)
    const rr = d * Math.tan(ang / 2)
    const t1 = p.clone().addScaledVector(da, d)
    const t2 = p.clone().addScaledVector(db, d)
    const c = p.clone().addScaledVector(da.clone().add(db).normalize(), rr / Math.sin(ang / 2))
    const a1 = Math.atan2(t1.y - c.y, t1.x - c.x)
    let delta = Math.atan2(t2.y - c.y, t2.x - c.x) - a1
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    const steps = Math.max(2, Math.ceil(Math.abs(delta) / (Math.PI / 14)))
    for (let k = 0; k <= steps; k++) {
      const t = a1 + (delta * k) / steps
      out.push(new V2(c.x + rr * Math.cos(t), c.y + rr * Math.sin(t)))
    }
  }
  return out
}

/** Shape from mm points. */
export const shapeMM = (pts) => new THREE.Shape(roundPts(pts))
/** Shape from photo pixels [[px, py, r_mm?], ...]. */
export const shapePx = (pts) => shapeMM(pts.map(([px, py, r]) => [X(px), Y(py), r]))
/** Raw polygon in mm from photo pixels, corner radii kept, for offsetPoly(). */
export const rawPx = (pts) => pts.map(([px, py, r]) => [X(px), Y(py), r ?? 0])
export const pathPx = (pts) => new THREE.Path(roundPts(pts.map(([px, py, r]) => [X(px), Y(py), r])))
export const pathMM = (pts) => new THREE.Path(roundPts(pts))

/** Rounded rectangle / stadium, mm, centred on (cx, cy). */
export function rrect(cx, cy, w, h, r) {
  return [
    [cx - w / 2, cy - h / 2, r],
    [cx + w / 2, cy - h / 2, r],
    [cx + w / 2, cy + h / 2, r],
    [cx - w / 2, cy + h / 2, r],
  ]
}

/**
 * Extrude a shape along Z to an exact total thickness, centred on `z`. The bevel is cut INTO the
 * traced outline (bevelOffset = -bevelSize), so the silhouette stays where it was traced and
 * only the faces are inset. `bt` is the bevel depth along Z when it differs from `bevel`.
 */
export function ext(shape, thick, { bevel = 0.8, bt, seg = 2, z = 0 } = {}) {
  const t = bt ?? bevel
  const depth = Math.max(thick - 2 * t, 0.01)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: t,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: seg,
    curveSegments: 8,
  })
  geo.translate(0, 0, z - depth / 2)
  return geo
}

/**
 * Area-weighted, crease-aware vertex normals. ExtrudeGeometry ships flat per-face normals, which
 * makes every bevel read as facets; plain averaging instead bends the big flat faces. Weighting
 * by triangle area keeps flats flat and lets the bevels roll, like a CAD "weighted normal".
 */
export function weightedNormals(geo, creaseDeg = 50) {
  const g = geo.index ? geo.toNonIndexed() : geo
  const pos = g.attributes.position
  const n = pos.count
  const tris = n / 3
  const fn = new Float32Array(tris * 3)
  const fu = new Float32Array(tris * 3)
  const map = new Map()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const keys = new Array(n)
  for (let f = 0; f < tris; f++) {
    a.fromBufferAttribute(pos, f * 3)
    b.fromBufferAttribute(pos, f * 3 + 1)
    c.fromBufferAttribute(pos, f * 3 + 2)
    b.sub(a)
    c.sub(a)
    b.cross(c)
    fn[f * 3] = b.x
    fn[f * 3 + 1] = b.y
    fn[f * 3 + 2] = b.z
    const l = b.length()
    if (l > 1e-9) {
      fu[f * 3] = b.x / l
      fu[f * 3 + 1] = b.y / l
      fu[f * 3 + 2] = b.z / l
    }
    for (let k = 0; k < 3; k++) {
      const i = f * 3 + k
      const key = `${Math.round(pos.getX(i) * 400)},${Math.round(pos.getY(i) * 400)},${Math.round(pos.getZ(i) * 400)}`
      keys[i] = key
      const list = map.get(key)
      if (list) list.push(f)
      else map.set(key, [f])
    }
  }
  const cosCrease = Math.cos(THREE.MathUtils.degToRad(creaseDeg))
  const normals = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const f = (i / 3) | 0
    const ux = fu[f * 3]
    const uy = fu[f * 3 + 1]
    const uz = fu[f * 3 + 2]
    let x = 0
    let y = 0
    let z = 0
    for (const g2 of map.get(keys[i])) {
      if (fu[g2 * 3] * ux + fu[g2 * 3 + 1] * uy + fu[g2 * 3 + 2] * uz >= cosCrease) {
        x += fn[g2 * 3]
        y += fn[g2 * 3 + 1]
        z += fn[g2 * 3 + 2]
      }
    }
    const l = Math.hypot(x, y, z)
    if (l > 1e-12) {
      normals[i * 3] = x / l
      normals[i * 3 + 1] = y / l
      normals[i * 3 + 2] = z / l
    } else {
      normals[i * 3] = ux
      normals[i * 3 + 1] = uy
      normals[i * 3 + 2] = uz || 1
    }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  return g
}

/** Last step for every mm-built geometry: smooth it and convert to metres. */
export function finish(geo, crease = 50) {
  const g = crease ? weightedNormals(geo, crease) : geo
  g.scale(0.001, 0.001, 0.001)
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

/**
 * Loft along X through rounded-rectangle cross-sections. Station: { x, top, bot, hw, rt, rb }
 * (mm): top/bottom Y, half-width in Z, corner radii top and bottom. Gives a body with a truly
 * rounded section, which an extruded slab with a bevel cannot.
 */
export function loftX(stations, { arc = 6 } = {}) {
  const ring = (s) => {
    const h = s.top - s.bot
    const lim = Math.min(s.hw, h / 2) - 0.02
    const rt = Math.max(0.25, Math.min(s.rt ?? 2, lim))
    const rb = Math.max(0.25, Math.min(s.rb ?? s.rt ?? 2, lim))
    const corners = [
      [s.top - rt, s.hw - rt, rt, 90, 0],
      [s.bot + rb, s.hw - rb, rb, 0, -90],
      [s.bot + rb, -(s.hw - rb), rb, -90, -180],
      [s.top - rt, -(s.hw - rt), rt, 180, 90],
    ]
    const pts = []
    for (const [cy, cz, r, a0, a1] of corners) {
      for (let k = 0; k <= arc; k++) {
        const t = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * k) / arc)
        pts.push([s.x, cy + r * Math.sin(t), cz + r * Math.cos(t)])
      }
    }
    return pts
  }
  const rings = stations.map(ring)
  const m = rings[0].length
  const pos = []
  const uv = []
  const lens = rings.map((r) => {
    const l = [0]
    for (let j = 1; j <= m; j++) {
      const p = r[j % m]
      const q = r[j - 1]
      l.push(l[j - 1] + Math.hypot(p[1] - q[1], p[2] - q[2]))
    }
    return l
  })
  const tri = (p, q, r, up, uq, ur) => {
    pos.push(...p, ...q, ...r)
    uv.push(...up, ...uq, ...ur)
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < m; j++) {
      const j2 = (j + 1) % m
      const a = rings[i][j]
      const b = rings[i][j2]
      const c = rings[i + 1][j2]
      const d = rings[i + 1][j]
      const ua = [a[0], lens[i][j]]
      const ub = [b[0], lens[i][j + 1]]
      const uc = [c[0], lens[i + 1][j + 1]]
      const ud = [d[0], lens[i + 1][j]]
      tri(a, b, c, ua, ub, uc)
      tri(a, c, d, ua, uc, ud)
    }
  }
  const cap = (r, flip) => {
    const cy = r.reduce((s, p) => s + p[1], 0) / m
    const cz = r.reduce((s, p) => s + p[2], 0) / m
    const c = [r[0][0], cy, cz]
    for (let j = 0; j < m; j++) {
      const a = r[j]
      const b = r[(j + 1) % m]
      if (flip) tri(c, b, a, [c[1], c[2]], [b[1], b[2]], [a[1], a[2]])
      else tri(c, a, b, [c[1], c[2]], [a[1], a[2]], [b[1], b[2]])
    }
  }
  cap(rings[0], true)
  cap(rings[rings.length - 1], false)

  // Drop zero-area triangles (coincident rings at a step) and make the winding face outward.
  const clean = []
  const cleanUv = []
  let vol = 0
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i + 3] - pos[i]
    const ay = pos[i + 4] - pos[i + 1]
    const az = pos[i + 5] - pos[i + 2]
    const bx = pos[i + 6] - pos[i]
    const by = pos[i + 7] - pos[i + 1]
    const bz = pos[i + 8] - pos[i + 2]
    const cx = ay * bz - az * by
    const cy = az * bx - ax * bz
    const cz = ax * by - ay * bx
    if (Math.hypot(cx, cy, cz) < 1e-7) continue
    vol += pos[i] * cx + pos[i + 1] * cy + pos[i + 2] * cz
    for (let k = 0; k < 9; k++) clean.push(pos[i + k])
    for (let k = 0; k < 6; k++) cleanUv.push(uv[(i / 3) * 2 + k])
  }
  if (vol < 0) {
    for (let i = 0; i < clean.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = clean[i + 3 + k]
        clean[i + 3 + k] = clean[i + 6 + k]
        clean[i + 6 + k] = t
      }
      const u = (i / 9) * 6
      for (let k = 0; k < 2; k++) {
        const t = cleanUv[u + 2 + k]
        cleanUv[u + 2 + k] = cleanUv[u + 4 + k]
        cleanUv[u + 4 + k] = t
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(clean, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(cleanUv, 2))
  geo.computeVertexNormals()
  return geo
}

/** Revolve a closed profile [[axial, radius], ...] around the X axis. Outer walls run +axial. */
export function latheX(profile, segments = 40) {
  const geo = new THREE.LatheGeometry(profile.map(([ax, r]) => new V2(r, ax)), segments)
  geo.rotateZ(-Math.PI / 2)
  return geo
}

/** A polyline given a constant width: the trigger guard strap, levers. Points in mm. */
export function strokePts(pts, width) {
  const h = width / 2
  const left = []
  const right = []
  for (let i = 0; i < pts.length; i++) {
    const p = new V2(...pts[i])
    const d0 = i > 0 ? p.clone().sub(new V2(...pts[i - 1])).normalize() : null
    const d1 = i < pts.length - 1 ? new V2(...pts[i + 1]).sub(p).normalize() : null
    const d = d0 && d1 ? d0.clone().add(d1).normalize() : d0 ?? d1
    const nrm = new V2(-d.y, d.x)
    const k = d0 && d1 ? 1 / Math.max(0.5, nrm.dot(new V2(-d1.y, d1.x))) : 1
    left.push([p.x + nrm.x * h * k, p.y + nrm.y * h * k])
    right.push([p.x - nrm.x * h * k, p.y - nrm.y * h * k])
  }
  return [...left, ...right.reverse()]
}

const evaluator = new Evaluator()
evaluator.attributes = ['position', 'normal', 'uv']
evaluator.useGroups = false

/** Boolean-subtract one or more cutter geometries (mm) from a body geometry (mm). */
export function cut(body, ...cutters) {
  let a = new Brush(body)
  a.updateMatrixWorld()
  for (const c of cutters) {
    const b = new Brush(c)
    b.updateMatrixWorld()
    a = evaluator.evaluate(a, b, SUBTRACTION)
    a.updateMatrixWorld()
  }
  return a.geometry
}

const evaluatorGroups = new Evaluator()
evaluatorGroups.attributes = ['position', 'normal', 'uv']
evaluatorGroups.useGroups = true

/**
 * Like `cut`, but every cutter brings its own material, which ends up on the faces it carves.
 * Cutters are [geometry, material] pairs. Returns [geometry with groups, material array], so a
 * pocket can be dark inside while the part around it keeps its own finish.
 */
export function cutLined(body, bodyMaterial, cutters) {
  let a = new Brush(body, bodyMaterial)
  a.updateMatrixWorld()
  for (const [geo, mat] of cutters) {
    const b = new Brush(geo, mat)
    b.updateMatrixWorld()
    a = evaluatorGroups.evaluate(a, b, SUBTRACTION)
    a.updateMatrixWorld()
  }
  return [a.geometry, a.material]
}

/**
 * Offset a raw polygon [[x, y, r?], ...] (mm) by `d`: positive shrinks it, negative grows it.
 * Edges are moved in parallel and re-intersected, and each corner radius is corrected so the
 * offset outline stays parallel to the source outline once both are filleted by roundPts().
 */
export function offsetPoly(pts, d) {
  const n = pts.length
  let area = 0
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    area += a[0] * b[1] - b[0] * a[1]
  }
  const ccw = area > 0 ? 1 : -1
  const lines = []
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const l = Math.hypot(ex, ey)
    const nx = (-ey / l) * ccw
    const ny = (ex / l) * ccw
    lines.push({ px: a[0] + nx * d, py: a[1] + ny * d, ex: ex / l, ey: ey / l })
  }
  const out = []
  for (let i = 0; i < n; i++) {
    const l0 = lines[(i + n - 1) % n]
    const l1 = lines[i]
    const den = l0.ex * l1.ey - l0.ey * l1.ex
    let x = l1.px
    let y = l1.py
    if (Math.abs(den) > 1e-6) {
      const t = ((l1.px - l0.px) * l1.ey - (l1.py - l0.py) * l1.ex) / den
      x = l0.px + l0.ex * t
      y = l0.py + l0.ey * t
    }
    const convex = den * ccw > 0
    const r = pts[i][2] ?? 0
    out.push([x, y, r ? Math.max(r + (convex ? -d : d), 0.05) : 0])
  }
  return out
}

/**
 * Picatinny-style rail section, mm. Runs along X, centred on x = 0, TOP SURFACE at y = 0 and
 * the body growing toward -Y, so it can be dropped onto an anchor. A true dovetail: 15.6 mm
 * flat top, 45-degree flanks out to 21.2 mm at 2.8 mm down, back in to a 16.4 mm neck at 5.2 mm
 * down (what a clamp hooks under), then the neck to the mounting face at 9.4 mm. Flat-topped
 * teeth on a 10 mm pitch with 5.2 mm slots 3 mm deep. `pads` adds solid end blocks for screws.
 */
export function picatinny(length, teeth, { bevel = 0.35, pads = false, height = 9.4 } = {}) {
  const H = height
  const base = new THREE.Shape(
    [
      [-8.2, -H],
      [8.2, -H],
      [8.2, -5.2],
      [10.6, -3],
      [-10.6, -3],
      [-8.2, -5.2],
    ].map(([a, b]) => new V2(a, b)),
  )
  const tooth = new THREE.Shape(
    [
      [-10.6, -3.2],
      [10.6, -3.2],
      [10.6, -2.8],
      [7.8, 0],
      [-7.8, 0],
      [-10.6, -2.8],
    ].map(([a, b]) => new V2(a, b)),
  )
  const parts = []
  const b = ext(base, length, { bevel, seg: 2 })
  b.rotateY(Math.PI / 2)
  parts.push(b)
  for (let k = 0; k < teeth; k++) {
    const t = ext(tooth, 4.8, { bevel, seg: 2 })
    t.rotateY(Math.PI / 2)
    t.translate((k - (teeth - 1) / 2) * 10, 0, 0)
    parts.push(t)
  }
  if (pads) {
    const span = (teeth - 1) * 10 + 4.8
    const len = (length - span) / 2 - 5.2
    for (const side of [-1, 1]) {
      const t = ext(tooth, len, { bevel, seg: 2 })
      t.rotateY(Math.PI / 2)
      t.translate(side * (length / 2 - len / 2), 0, 0)
      parts.push(t)
    }
  }
  return parts
}
