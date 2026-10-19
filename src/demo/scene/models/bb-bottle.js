// 2700-piece BB bottle: clear rounded-square bottle, black ribbed cap, white 6 mm BBs, printed
// label drawn into a canvas (invented neutral branding).
//
// Only the BBs that can be seen are real geometry: the skin of a loose, settled pile (walls,
// shoulder, base, free surface), packed at random rather than on a lattice. Behind it sits an
// opaque core painted with more BBs, so any gap shows more pile, never the far side.
//
// The pile settles under gravity for the pose it is built in: standing, the air gap is in the
// shoulder under the cap; lying, the pile runs level along the bottle with a thin air gap under
// the uppermost wall and fills the shoulder end.
//
// Transparency: see _magazine-clear.js. Multiply pass + additive pass, no transmission.
//
//   create({ weight: '0.25' })   prints that BB weight, in grams, on the label's badge.
//                             Default '0.28'. Viewer switch: ?weight=0.25
//   create({ lying: true })   returns it on its back (label up), resting on y = 0, with the
//                             pile re-settled for that pose. Viewer switch: ?lying=1
//   create({ gloss: 0.8 })   reflection strength of the clear wall, 1 = physically right
//   create({ bbSegments: [w, h] })   BB cap resolution. Default [10, 4] = 70 triangles each, for
//                                    hero distance; pass [16, 6] for a close-up.

import * as THREE from 'three'
import { polymer } from '../lib/materials.js'
import { tintMaterial, glossMaterial, clearShell, roundedRing, loft, stripUV, rng } from './_magazine-clear.js'

const H = 0.031 // half footprint
const R = 0.009 // body corner radius
const BODY_TOP = 0.121
const NECK_R = 0.0165
const CAP_R = 0.0186
const HEIGHT = 0.15
const BB_R = 0.00298
const WALL = 0.0007
const LABEL = { w: 0.05, y0: 0.0045, y1: 0.1205 }

/** Point on a rounded square at arc length s from the middle of the +Z face, heading to +X. */
function rrPoint(h, r, s) {
  const st = h - r
  const arc = (Math.PI * r) / 2
  const per = 8 * st + 4 * arc
  s = ((s % per) + per) % per
  const line = (len, p, d, n) => ({ len, at: (t) => ({ x: p[0] + d[0] * t, z: p[1] + d[1] * t, nx: n[0], nz: n[1] }) })
  const corner = (c, a0) => ({
    len: arc,
    at: (t) => {
      const a = a0 - t / r
      return { x: c[0] + r * Math.cos(a), z: c[1] + r * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) }
    },
  })
  const P = Math.PI
  const segs = [
    line(st, [0, h], [1, 0], [0, 1]),
    corner([st, st], P / 2),
    line(2 * st, [h, st], [0, -1], [1, 0]),
    corner([st, -st], 0),
    line(2 * st, [st, -h], [-1, 0], [0, -1]),
    corner([-st, -st], -P / 2),
    line(2 * st, [-h, -st], [0, 1], [-1, 0]),
    corner([-st, st], -P),
    line(st, [-st, h], [1, 0], [0, 1]),
  ]
  for (const seg of segs) {
    if (s <= seg.len) return seg.at(s)
    s -= seg.len
  }
  return segs[0].at(0)
}
const rrPerimeter = (h, r) => 8 * (h - r) + 2 * Math.PI * r

// ----------------------------------------------------------------------------------- label

function fitFont(ctx, str, weight, family, width, max) {
  ctx.font = `${weight} 100px ${family}`
  const size = Math.min(max, (100 * width) / ctx.measureText(str).width)
  ctx.font = `${weight} ${size}px ${family}`
  return size
}

function drawLabel(weight) {
  const W = 800
  const HH = 1856
  const c = document.createElement('canvas')
  c.width = W
  c.height = HH
  const x = c.getContext('2d')
  const rand = rng(2700)
  const heavy = '"Arial Black", "Segoe UI Black", Impact, "Helvetica Neue", Arial, sans-serif'
  const sans = '"Segoe UI", "Helvetica Neue", Arial, sans-serif'
  x.textAlign = 'center'
  x.textBaseline = 'alphabetic'

  // Dark upper panel.
  let g = x.createLinearGradient(0, 0, 0, HH)
  g.addColorStop(0, '#26282c')
  g.addColorStop(0.5, '#151618')
  g.addColorStop(1, '#0c0c0e')
  x.fillStyle = g
  x.fillRect(0, 0, W, HH)

  // Abstract graphic where the reference has a photo: a contour map with a range reticle.
  x.save()
  x.beginPath()
  x.rect(0, HH * 0.125, W, HH * 0.5)
  x.clip()
  const cx = W * 0.6
  const cy = HH * 0.3
  g = x.createRadialGradient(cx, cy, 10, cx, cy, W * 0.75)
  g.addColorStop(0, 'rgba(150,156,168,0.42)')
  g.addColorStop(0.5, 'rgba(90,95,104,0.16)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(0, 0, W, HH)
  for (let i = 0; i < 9; i++) {
    // Faceted shards, like a low-poly terrain lit from one side.
    const px = rand() * W
    const py = HH * (0.14 + rand() * 0.34)
    x.beginPath()
    x.moveTo(px, py)
    x.lineTo(px + 120 + rand() * 260, py + (rand() - 0.5) * 220)
    x.lineTo(px + (rand() - 0.3) * 200, py + 120 + rand() * 240)
    x.closePath()
    x.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${0.035 + rand() * 0.06})`
    x.fill()
  }
  for (let i = 0; i < 30; i++) {
    const r = 26 + i * 27
    x.beginPath()
    for (let k = 0; k <= 120; k++) {
      const a = (k / 120) * Math.PI * 2
      const rr = r * (1 + 0.17 * Math.sin(3 * a + i * 0.19) + 0.09 * Math.sin(5 * a - i * 0.37) + 0.045 * Math.sin(9 * a + i))
      const px = cx + rr * Math.cos(a) * 1.12
      const py = cy + rr * Math.sin(a)
      if (k) x.lineTo(px, py)
      else x.moveTo(px, py)
    }
    x.strokeStyle = `rgba(214,220,230,${i % 5 === 0 ? 0.3 : 0.12})`
    x.lineWidth = i % 5 === 0 ? 3 : 1.6
    x.stroke()
  }
  x.strokeStyle = 'rgba(235,238,244,0.55)'
  x.lineWidth = 3
  x.beginPath()
  x.arc(cx, cy, 58, 0, Math.PI * 2)
  x.stroke()
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    x.beginPath()
    x.moveTo(cx + dx * 34, cy + dy * 34)
    x.lineTo(cx + dx * 120, cy + dy * 120)
    x.stroke()
  }
  x.fillStyle = 'rgba(235,238,244,0.8)'
  x.fillRect(cx - 4, cy - 4, 8, 8)
  x.restore()
  g = x.createLinearGradient(0, HH * 0.3, 0, HH * 0.47)
  g.addColorStop(0, 'rgba(14,14,16,0)')
  g.addColorStop(1, 'rgba(14,14,16,0.9)')
  x.fillStyle = g
  x.fillRect(0, HH * 0.3, W, HH * 0.36)

  // Invented brand block: a hexagon mark and a model code.
  const bx = W * 0.27
  const by = HH * 0.078
  x.strokeStyle = '#fff'
  x.lineWidth = 7
  x.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    const px = bx + Math.cos(a) * 58
    const py = by + Math.sin(a) * 58
    if (k) x.lineTo(px, py)
    else x.moveTo(px, py)
  }
  x.closePath()
  x.stroke()
  x.fillStyle = '#fff'
  x.font = `800 44px ${sans}`
  x.fillText('HX', bx, by + 16)
  x.textAlign = 'left'
  x.letterSpacing = '4px'
  x.font = `600 50px ${sans}`
  x.fillText('HEXLINE', bx + 88, by - 4)
  x.font = `900 62px ${heavy}`
  x.letterSpacing = '2px'
  x.fillText('FIELD', bx + 86, by + 56)
  x.textAlign = 'center'

  // Spec line, product line, the block lettering.
  x.letterSpacing = '2px'
  fitFont(x, '5.95MM±0.01MM', 300, sans, W * 0.8, 90)
  x.fillText('5.95MM±0.01MM', W / 2, HH * 0.392)
  x.letterSpacing = '6px'
  fitFont(x, 'PRECISION', 600, sans, W * 0.8, 130)
  x.fillText('PRECISION', W / 2 + 3, HH * 0.452)
  x.letterSpacing = '0px'
  fitFont(x, 'BBS', 900, heavy, W * 0.86, 360)
  x.fillText('BBS', W / 2, HH * 0.598)

  // "2700 pcs." bar.
  x.fillStyle = '#fff'
  x.fillRect(W * 0.07, HH * 0.612, W * 0.86, HH * 0.037)
  x.fillStyle = '#0c0c0e'
  x.font = `900 58px ${heavy}`
  const w1 = x.measureText('2700').width
  x.font = `700 40px ${sans}`
  const w2 = x.measureText('pcs.').width
  const start = W / 2 - (w1 + w2 + 6) / 2
  x.textAlign = 'left'
  x.font = `900 58px ${heavy}`
  x.fillText('2700', start, HH * 0.6415)
  x.font = `700 40px ${sans}`
  x.fillText('pcs.', start + w1 + 6, HH * 0.6415)
  x.textAlign = 'center'
  x.fillStyle = '#fff'
  x.letterSpacing = '9px'
  fitFont(x, 'MATCH GRADE POLYMER', 800, sans, W * 0.84, 60)
  x.fillText('MATCH GRADE POLYMER', W / 2 + 4, HH * 0.683)
  x.letterSpacing = '0px'

  // Yellow band.
  const bandY = HH * 0.885
  x.fillStyle = '#f6b40e'
  x.fillRect(0, bandY, W, HH - bandY)
  x.letterSpacing = '70px'
  x.font = `900 104px ${heavy}`
  x.fillStyle = '#fff'
  x.fillText('CORE', W / 2 + 35, HH * 0.953)
  x.letterSpacing = '30px'
  x.font = `900 56px ${heavy}`
  x.lineWidth = 2.5
  x.strokeStyle = 'rgba(255,255,255,0.95)'
  x.strokeText('SERIES', W / 2 + 15, HH * 0.988)
  x.letterSpacing = '0px'

  // Weight badge: black ring with circular type, magenta disc, the weight (the `weight` option:
  // the store sells this bottle in two weights, and each product's label has to print its own).
  const qx = W / 2
  const qy = HH * 0.8
  x.fillStyle = '#0a0a0b'
  x.beginPath()
  x.arc(qx, qy, 166, 0, Math.PI * 2)
  x.fill()
  x.fillStyle = '#e5007d'
  x.beginPath()
  x.arc(qx, qy, 104, 0, Math.PI * 2)
  x.fill()
  x.fillStyle = '#fff'
  x.font = `500 34px ${sans}`
  const ringText = 'standard • standard • standard • '
  const widths = [...ringText].map((ch) => x.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0)
  let acc = 0
  ;[...ringText].forEach((ch, i) => {
    const a = ((acc + widths[i] / 2) / total) * Math.PI * 2 - Math.PI / 2
    acc += widths[i]
    x.save()
    x.translate(qx + Math.cos(a) * 135, qy + Math.sin(a) * 135)
    x.rotate(a + Math.PI / 2)
    x.fillText(ch, 0, 12)
    x.restore()
  })
  x.font = `900 76px ${heavy}`
  const wn = x.measureText(weight).width
  x.font = `900 50px ${heavy}`
  const wg = x.measureText('G').width
  x.textAlign = 'left'
  x.font = `900 76px ${heavy}`
  x.fillText(weight, qx - (wn + wg) / 2, qy + 27)
  x.font = `900 50px ${heavy}`
  x.fillText('G', qx - (wn + wg) / 2 + wn + 2, qy + 27)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function labelGeometry() {
  const cols = 56
  const rows = []
  for (const [y, v] of [[LABEL.y1, 1], [LABEL.y0, 0]]) {
    const row = []
    for (let i = 0; i <= cols; i++) {
      const u = i / cols
      const p = rrPoint(H, R, (u - 0.5) * LABEL.w)
      row.push({ p: [p.x + p.nx * 0.00015, y, p.z + p.nz * 0.00015], uv: [u, v] })
    }
    rows.push(row)
  }
  // rrPoint walks +Z face toward +X, which is clockwise seen from above: flip for outward faces.
  return stripUV(rows, { flip: true })
}

// ------------------------------------------------------------------------------------- BBs

/** A tile of loosely piled BBs, painted: what shows through any gap between the real ones. */
function coreTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const x = c.getContext('2d')
  x.fillStyle = '#5a5854'
  x.fillRect(0, 0, S, S)
  const rand = rng(41)
  const r = S / 14
  for (let k = 0; k < 150; k++) {
    const px = rand() * S
    const py = rand() * S
    const shade = 0.72 + rand() * 0.28 // deeper balls are darker
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        const cx = px + ox
        const cy = py + oy
        if (cx < -r || cx > S + r || cy < -r || cy > S + r) continue
        const g = x.createRadialGradient(cx - r * 0.2, cy - r * 0.3, r * 0.05, cx, cy, r)
        const v = (n) => Math.round(n * shade)
        g.addColorStop(0, `rgb(${v(236)},${v(234)},${v(228)})`)
        g.addColorStop(0.65, `rgb(${v(196)},${v(193)},${v(186)})`)
        g.addColorStop(1, `rgb(${v(120)},${v(117)},${v(111)})`)
        x.fillStyle = g
        x.beginPath()
        x.arc(cx, cy, r, 0, Math.PI * 2)
        x.fill()
      }
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

// The inside of the bottle the BBs can touch: [y, half size, corner radius], base to neck.
const PROFILE = [
  [0.0036, H, R],
  [BODY_TOP, H, R],
  [0.1234, 0.0307, 0.0093],
  [0.1256, 0.0296, 0.0104],
  [0.1273, 0.0274, 0.012],
  [0.1284, 0.024, 0.0138],
  [0.129, 0.02, 0.0152],
]
const Y_FLOOR = 0.0012 + WALL + BB_R // centre height of a ball resting on the base
const INSET = WALL + BB_R + 0.00015 // wall to ball centre

function profileAt(y) {
  if (y <= PROFILE[0][0]) return [H, R]
  for (let i = 1; i < PROFILE.length; i++) {
    if (y <= PROFILE[i][0]) {
      const a = PROFILE[i - 1]
      const b = PROFILE[i]
      const t = (y - a[0]) / (b[0] - a[0])
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    }
  }
  return null
}

/** Is a ball centre at (x, y, z) inside the bottle, `inset` away from the wall? */
function inside(x, y, z, inset) {
  if (y < Y_FLOOR - 0.0003) return false
  const pr = profileAt(y)
  if (!pr) return false
  const h = pr[0] - inset
  const r = Math.max(pr[1] - inset, 0.0008)
  const ax = Math.abs(x)
  const az = Math.abs(z)
  if (ax > h || az > h) return false
  const ex = Math.max(ax - (h - r), 0)
  const ez = Math.max(az - (h - r), 0)
  return ex * ex + ez * ez <= r * r
}

// Where the loose pile ends. The surface is level but not flat: a slow ripple, a few
// tenths of a ball high, so the line it draws on the wall is slightly uneven.
const ripple = (a, b) => (Math.sin(a * 95 + 1.3) + 0.7 * Math.sin(b * 140 + 0.4) + 0.5 * Math.sin((a + b) * 230 + 2.1)) / 2.2
const SURFACE = {
  // Standing: gravity along -Y, the air gap sits in the shoulder under the cap.
  standing: { axis: 1, level: (x, z) => 0.1166 + ripple(x, z) * 0.0011 },
  // Lying on its back: gravity along the bottle's -Z, a 6.5 mm air gap under the label side.
  lying: { axis: 2, level: (x, y) => H - WALL - 0.0065 - BB_R + ripple(x, y) * 0.001 },
}

/**
 * The visible skin of a settled pile, as [x, y, z, nx, ny, nz] in the bottle's own frame.
 *
 * Random sequential packing, not a lattice: candidates are thrown at every surface a BB can
 * be seen against (walls, shoulder, base, free surface) and kept only if they clear the
 * balls already there, so no rows form. A second pass drops balls half a diameter further
 * in, into the pockets the first pass could not fill, which is what the second layer of a
 * real pile looks like through the wall. Seeded, so every load is identical.
 */
function bbPositions({ lying }) {
  const rand = rng(lying ? 2701 : 2700)
  const surf = lying ? SURFACE.lying : SURFACE.standing
  const D = BB_R * 2
  const levelAt = (x, y, z) => (surf.axis === 1 ? surf.level(x, z) : surf.level(x, y))
  const below = (x, y, z, slack) => (surf.axis === 1 ? y : z) <= levelAt(x, y, z) + slack

  // --- samplers: each returns a ball centre touching a surface, and the outward normal.
  const segs = []
  let wallWeight = 0
  for (let i = 1; i < PROFILE.length; i++) {
    const a = PROFILE[i - 1]
    const b = PROFILE[i]
    const dh = b[1] - a[1]
    const dy = b[0] - a[0]
    const len = Math.hypot(dh, dy)
    const w = len * rrPerimeter((a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    wallWeight += w
    segs.push({ a, b, nh: dy / len, ny: -dh / len, w })
  }
  const wall = () => {
    let pick = rand() * wallWeight
    let seg = segs[0]
    for (const s of segs) {
      seg = s
      if ((pick -= s.w) <= 0) break
    }
    const t = rand()
    const y = seg.a[0] + (seg.b[0] - seg.a[0]) * t
    const h = seg.a[1] + (seg.b[1] - seg.a[1]) * t - INSET * seg.nh
    const r = Math.max(seg.a[2] + (seg.b[2] - seg.a[2]) * t - INSET * seg.nh, 0.001)
    const p = rrPoint(h, r, rand() * rrPerimeter(h, r))
    return [p.x, y - INSET * seg.ny, p.z, p.nx * seg.nh, seg.ny, p.nz * seg.nh]
  }
  const span = H - INSET
  const base = () => [(rand() * 2 - 1) * span, Y_FLOOR, (rand() * 2 - 1) * span, 0, -1, 0]
  const free = () => {
    if (surf.axis === 1) {
      const x = (rand() * 2 - 1) * span
      const z = (rand() * 2 - 1) * span
      return [x, surf.level(x, z), z, 0, 1, 0]
    }
    const x = (rand() * 2 - 1) * span
    const y = Y_FLOOR + rand() * (0.129 - Y_FLOOR)
    return [x, y, surf.level(x, y), 0, 0, 1]
  }
  const baseArea = lying ? 4 * span * span : 0 // a standing bottle never shows its base
  const freeArea = lying ? 2 * span * 0.125 : 4 * span * span
  const total = wallWeight + baseArea + freeArea
  const sample = () => {
    const u = rand() * total
    return u < wallWeight ? wall() : u < wallWeight + baseArea ? base() : free()
  }

  // --- what is never seen.
  const hiddenHalf = LABEL.w / 2 - BB_R * 1.2
  const hidden = (c) => {
    if (lying) return c[5] < -0.9 // the wall it lies on
    return c[5] > 0.9 && Math.abs(c[0]) < hiddenHalf && c[1] > LABEL.y0 + BB_R && c[1] < LABEL.y1 - BB_R
  }

  // --- spatial hash for the clearance test.
  const cell = D
  const grid = new Map()
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  const clear = (x, y, z, min) => {
    const cx = Math.floor(x / cell)
    const cy = Math.floor(y / cell)
    const cz = Math.floor(z / cell)
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          const list = grid.get(`${cx + i},${cy + j},${cz + k}`)
          if (!list) continue
          for (const q of list) {
            const dx = q[0] - x
            const dy = q[1] - y
            const dz = q[2] - z
            if (dx * dx + dy * dy + dz * dz < min * min) return false
          }
        }
      }
    }
    return true
  }
  const out = []
  const put = (c) => {
    const k = key(c[0], c[1], c[2])
    if (!grid.has(k)) grid.set(k, [])
    grid.get(k).push(c)
    out.push(c)
  }

  const pass = (tries, depth, min) => {
    for (let n = 0; n < tries; n++) {
      const c = sample()
      if (hidden(c)) continue
      const d = depth()
      c[0] -= c[3] * d
      c[1] -= c[4] * d
      c[2] -= c[5] * d
      if (!inside(c[0], c[1], c[2], INSET - 0.0003)) continue
      if (!below(c[0], c[1], c[2], 0.0002)) continue
      if (clear(c[0], c[1], c[2], min)) put(c)
    }
  }
  pass(90000, () => rand() * rand() * 0.0004, D * 0.9) // against the wall, shoulder to shoulder
  pass(60000, () => BB_R * (0.55 + rand() * 0.5), D * 0.84) // settled into the pockets behind
  pass(40000, () => D * (0.62 + rand() * 0.22), D * 0.84) // and one more row, glimpsed between those
  return out
}

/** Opaque stand-in for the bulk of the pile, shaped to the same free surface. */
function coreGeometry({ lying }) {
  const inset = INSET + BB_R + 0.0014
  const h = H - inset
  const r = Math.max(R - inset, 0.002)
  const per = rrPerimeter(h, r)
  const cols = 64
  const zMax = lying ? SURFACE.lying.level(0, 0.06) - BB_R - 0.0022 : Infinity
  const K = 1 / 0.05 // planar texture scale for end faces and the flat top: one tile per 50 mm
  // `planar` rings carry position-based UVs, so end faces do not smear toward their centre.
  const ring = (y, v, scale, planar) => {
    const row = []
    for (let i = 0; i <= cols; i++) {
      const p = rrPoint(h, r, (i / cols) * per)
      const x = p.x * scale
      const z = Math.min(p.z * scale, zMax)
      const flatTop = p.z * scale > zMax
      row.push({ p: [x, y, z], uv: planar ? [x * K, z * K] : flatTop ? [x * K, y * K] : [i / cols, v] })
    }
    return row
  }
  const end = (y, v, scale) => [ring(y, v, 0.02 * scale, true), ring(y, v, scale, true)]
  const y0 = Y_FLOOR + BB_R + 0.001
  const rows = lying
    ? [...end(0.1272, 1.1, 0.62), ring(0.1272, 1.1, 0.62), ring(0.1245, 1.07, 0.86), ring(0.121, 1.03, 1), ring(y0, 0, 1), ...end(y0, 0, 1).reverse()]
    : [...end(0.112, 1, 1), ring(0.112, 1, 1), ring(y0, 0, 1), ...end(y0, 0, 1).reverse()]
  return stripUV(rows, { flip: true })
}

// ----------------------------------------------------------------------------- bottle, cap

function bottleGeometry() {
  // [y, half size, corner radius], bottom to top.
  const rows = [
    [0.0019, 0.0004, 0.0004],
    [0.0019, 0.012, 0.006],
    [0.0014, 0.022, 0.008],
    [0.0003, 0.0268, 0.0082],
    [0, 0.0284, 0.0084],
    [0.0004, 0.0298, 0.0087],
    [0.0016, 0.0306, 0.0089],
    [0.0036, H, R],
    [0.04, H, R],
    [0.08, H, R],
    [BODY_TOP, H, R],
    [0.1234, 0.0307, 0.0093],
    [0.1256, 0.0296, 0.0104],
    [0.1273, 0.0274, 0.012],
    [0.1284, 0.024, 0.0138],
    [0.129, 0.02, 0.0152],
    [0.1294, 0.0176, 0.0164],
    [0.13, NECK_R, NECK_R],
    [0.1345, NECK_R, NECK_R],
  ]
  return loft(rows.map(([y, h, r]) => roundedRing(h, h, r, 12, 6, 6).map(([x, z]) => [x, y, z])), { flip: true })
}

function capGeometry() {
  const n = 288
  const ribs = 72
  const ring = (y, r, rib) => {
    const pts = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const k = i % (n / ribs)
      const up = k === 1 || k === 2 ? 1 : k === 0 ? 0.25 : 0.25
      const rr = r + rib * (up - 0.25) * 0.0009
      pts.push([Math.cos(a) * rr, y, Math.sin(a) * rr])
    }
    return pts
  }
  return loft(
    [
      ring(0.1306, CAP_R - 0.0007, 0),
      ring(0.1313, CAP_R, 0.4),
      ring(0.1321, CAP_R, 1),
      ring(0.1474, CAP_R, 1),
      ring(0.1484, CAP_R - 0.0002, 0.5),
      ring(0.1492, CAP_R - 0.001, 0),
      ring(0.1498, CAP_R - 0.0026, 0),
      ring(HEIGHT, CAP_R - 0.005, 0),
    ],
    { flip: true, capStart: true, capEnd: true },
  )
}

// ----------------------------------------------------------------------------------- build

export function create({ lying, weight = '0.28', bbSegments = [10, 4], gloss = 0.8 } = {}) {
  lying = !!lying
  // Only a weight written as grams with two decimals reaches the label. Anything else (a stray
  // value off the workbench viewer's URL) prints the default and not whatever was typed.
  if (!/^0\.\d\d$/.test(String(weight))) weight = '0.28'
  const bottle = new THREE.Group()
  bottle.name = 'bb-bottle'

  // BBs.
  const positions = bbPositions({ lying })
  const bbs = new THREE.InstancedMesh(
    // A cap, not a full sphere: the inward 54 degrees of every BB face the core and are never seen.
    new THREE.SphereGeometry(BB_R, bbSegments[0], bbSegments[1], 0, Math.PI * 2, 0, Math.PI * 0.7),
    new THREE.MeshPhysicalMaterial({ color: 0xbfbdb7, roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.3 }),
    positions.length,
  )
  bbs.name = 'bbs'
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const out = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)
  positions.forEach((p, i) => {
    // Open side toward the core. A ball in the corner by the floor wall would otherwise turn its
    // open side to a camera looking from the side, so lying caps never tip below the horizon.
    out.set(p[3], p[4], lying ? Math.max(p[5], -0.15) : p[5])
    if (out.lengthSq() < 1e-6) out.set(0, 0, 1)
    q.setFromUnitVectors(up, out.normalize())
    m.compose(new THREE.Vector3(p[0], p[1], p[2]), q, one)
    bbs.setMatrixAt(i, m)
  })
  bottle.add(bbs)

  const coreTex = coreTexture()
  coreTex.repeat.set(2.2, 1.4)
  const core = new THREE.Mesh(
    coreGeometry({ lying }),
    new THREE.MeshStandardMaterial({ map: coreTex, color: 0x8c8c8a, roughness: 0.8 }),
  )
  core.name = 'bbs:core'
  bottle.add(core)

  // Label, a hair outside the wall.
  const label = new THREE.Mesh(
    labelGeometry(),
    new THREE.MeshPhysicalMaterial({ map: drawLabel(weight), color: 0xb4b4b4, roughness: 0.62, specularIntensity: 0.5, side: THREE.DoubleSide }),
  )
  label.name = 'label'
  bottle.add(label)

  // Cap, and the neck ring just under it.
  const cap = new THREE.Mesh(capGeometry(), polymer({ color: 0x0e0e10, roughness: 0.42, repeat: 30 }))
  cap.name = 'cap'
  bottle.add(cap)

  // The clear bottle itself, after everything opaque.
  bottle.add(
    clearShell(bottleGeometry(), {
      name: 'bottle',
      tint: tintMaterial({ tint: [0.93, 0.95, 0.955], density: 1, edge: 5 }),
      gloss: glossMaterial({ haze: 0x030303, roughness: 0.06, specular: gloss, clearcoat: gloss * 0.4 }),
      order: 10,
    }),
  )

  bottle.userData.bbCount = positions.length
  if (!lying) return bottle

  const group = new THREE.Group()
  group.name = 'bb-bottle'
  bottle.name = 'bb-bottle:body'
  bottle.rotation.x = -Math.PI / 2 // label up, cap toward -Z
  bottle.position.set(0, H, HEIGHT / 2)
  group.add(bottle)
  return group
}
