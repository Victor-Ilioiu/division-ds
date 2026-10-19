// Mock suppressor, 235 mm long, 40 mm diameter: a fat matt-black tube in two sections with
// rows of drilled dimples, a rounded nose and a narrow knurled collar at the rear.
// Origin at the centre of the rear face, axis +X. The rear 42 mm is a real 23 mm socket that
// slides over the rifle's flash hider. Dimensions below are millimetres (see _suppressor-kit.js).

import * as THREE from 'three'
import { polymerGrain } from '../lib/materials.js'
import { MM, turn, knurled, cylDecal, label, fitText } from './_suppressor-kit.js'

const L = 235
const R = 20 // tube radius
const BORE = 4.5
const SOCKET_R = 11.5
const SOCKET_DEPTH = 42
const COLLAR_R = 15
const COLLAR_LEN = 14

// Dimples: four rows around the tube (left, top, right, bottom), a ring every PITCH mm.
const DIMPLE_R = 2.5
const DIMPLE_DEPTH = 0.85
const CELL = 3.4 // half-size of the square of tube each dimple is cut into
const PITCH = 13
const ROWS = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]
const COL_SEGS = 6
const GAP_SEGS = 10

// The two tube sections, split by the seam groove.
const REAR = { x0: 15.4, x1: 97, rings: [24, 37, 50, 63, 76, 89] }
const FRONT = { x0: 99.6, x1: 222, rings: Array.from({ length: 9 }, (_, i) => 108 + i * PITCH) }

/** Angles shared by the tube and every lathed part: fine across each dimple row, coarse between. */
function thetaList() {
  const w = CELL / R
  const out = []
  for (let k = 0; k < ROWS.length; k++) {
    const c = ROWS[k]
    const next = k + 1 < ROWS.length ? ROWS[k + 1] : ROWS[0] + Math.PI * 2
    for (let i = 0; i < COL_SEGS; i++) out.push({ th: c - w + (2 * w * i) / COL_SEGS, col: k })
    for (let i = 0; i < GAP_SEGS; i++) out.push({ th: c + w + ((next - w - (c + w)) * i) / GAP_SEGS, col: -1 })
  }
  out.push({ th: out[0].th + Math.PI * 2, col: -1 })
  return out
}

/**
 * A tube section with real dimples. The tube is a coarse grid with one square cell left open
 * per dimple; each opening is filled with a fan from the square to a round rim, then a dished
 * recess with its own normals, so the rim is a crisp machined edge.
 */
function dimpledTube({ x0, x1, rings }, TH) {
  const pos = []
  const nor = []
  const uv = []
  const idx = []
  const th0 = TH[0].th
  const vert = (x, th, r, n) => {
    const c = Math.cos(th)
    const s = Math.sin(th)
    pos.push(x, r * c, r * s)
    // n = [axial, radial, tangential]
    const l = Math.hypot(n[0], n[1], n[2])
    nor.push(n[0] / l, (n[1] * c - n[2] * s) / l, (n[1] * s + n[2] * c) / l)
    uv.push((th - th0) / (Math.PI * 2), (x - x0) * MM)
    return pos.length / 3 - 1
  }
  // Wind every triangle to agree with its vertex normals, so no case analysis is needed.
  const tri = (a, b, c) => {
    const p = (i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
    const face = p(b).sub(p(a)).cross(p(c).sub(p(a)))
    const n = new THREE.Vector3(nor[a * 3] + nor[b * 3] + nor[c * 3], nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1], nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2])
    if (face.dot(n) >= 0) idx.push(a, b, c)
    else idx.push(a, c, b)
  }

  // axial stations: section ends plus the two edges of every dimple cell
  const xs = [{ x: x0, ring: -1 }]
  rings.forEach((xr, i) => {
    xs.push({ x: xr - CELL, ring: i }, { x: xr + CELL, ring: -1 })
  })
  xs.push({ x: x1, ring: -1 })

  const nT = TH.length
  const grid = xs.map((sx) => TH.map((t) => vert(sx.x, t.th, R, [0, 1, 0])))
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < nT - 1; j++) {
      if (xs[i].ring >= 0 && TH[j].col >= 0) continue // left open for a dimple
      tri(grid[i][j], grid[i][j + 1], grid[i + 1][j])
      tri(grid[i + 1][j], grid[i][j + 1], grid[i + 1][j + 1])
    }
  }

  const RIM = 24
  const dish = (rho) => DIMPLE_DEPTH * (1 - (rho * rho) / (DIMPLE_R * DIMPLE_R))
  for (const xr of rings) {
    for (let k = 0; k < ROWS.length; k++) {
      const tc = ROWS[k]
      const j0 = TH.findIndex((t) => t.col === k)
      // boundary of the open cell, using the very same x and theta values as the grid
      const B = []
      for (let m = 0; m <= COL_SEGS; m++) {
        const th = TH[j0 + m].th
        for (const x of [xr - CELL, xr + CELL]) B.push({ s: x - xr, t: (th - tc) * R, i: vert(x, th, R, [0, 1, 0]) })
      }
      for (const b of B) b.a = Math.atan2(b.t, b.s)
      B.sort((p, q) => p.a - q.a)
      // rim on the tube surface
      const rim = []
      const rimIn = []
      for (let n = 0; n < RIM; n++) {
        const a = -Math.PI + ((n + 0.5) / RIM) * Math.PI * 2
        const s = DIMPLE_R * Math.cos(a)
        const t = DIMPLE_R * Math.sin(a)
        const th = tc + t / R
        rim.push({ a, i: vert(xr + s, th, R, [0, 1, 0]) })
        const g = (2 * DIMPLE_DEPTH) / (DIMPLE_R * DIMPLE_R)
        rimIn.push(vert(xr + s, th, R, [-g * s, 1, -g * t]))
      }
      // fan between the square and the rim: walk both loops by angle
      let i = 0
      let j = 0
      const nb = B.length
      const angB = (q) => (q < nb ? B[q].a : B[q - nb].a + Math.PI * 2)
      const angR = (q) => (q < RIM ? rim[q].a : rim[q - RIM].a + Math.PI * 2)
      while (i < nb || j < RIM) {
        const bi = B[i % nb].i
        const rj = rim[j % RIM].i
        if (i < nb && (j >= RIM || angB(i + 1) <= angR(j + 1))) {
          tri(bi, B[(i + 1) % nb].i, rj)
          i++
        } else {
          tri(bi, rim[(j + 1) % RIM].i, rj)
          j++
        }
      }
      // the recess: rim, two inner rings, centre
      let prev = rimIn
      for (const f of [0.68, 0.36]) {
        const ring = []
        for (let n = 0; n < RIM; n++) {
          const a = rim[n].a
          const rho = DIMPLE_R * f
          const s = rho * Math.cos(a)
          const t = rho * Math.sin(a)
          const g = (2 * DIMPLE_DEPTH) / (DIMPLE_R * DIMPLE_R)
          ring.push(vert(xr + s, tc + t / R, R - dish(rho), [-g * s, 1, -g * t]))
        }
        for (let n = 0; n < RIM; n++) {
          const m = (n + 1) % RIM
          tri(prev[n], prev[m], ring[n])
          tri(ring[n], prev[m], ring[m])
        }
        prev = ring
      }
      const centre = vert(xr, tc, R - DIMPLE_DEPTH, [0, 1, 0])
      for (let n = 0; n < RIM; n++) tri(prev[n], prev[(n + 1) % RIM], centre)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos.map((v) => v * MM), 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** Matt, lightly bead-blasted black metal: soft broad highlights, no clearcoat glints. */
function blasted({ color = 0x131416, roughness = 0.52 } = {}) {
  const n = polymerGrain().clone()
  n.repeat.set(36, 180) // v is in metres: one tile every 5.5 mm
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.78,
    normalMap: n,
    normalScale: new THREE.Vector2(0.22, 0.22),
  })
}

export function create() {
  const group = new THREE.Group()
  group.name = 'suppressor'

  const TH = thetaList()
  const thetas = TH.map((t) => t.th)
  const metal = blasted()
  const inner = blasted({ color: 0x0d0e10, roughness: 0.7 })
  const boreMat = new THREE.MeshStandardMaterial({ color: 0x060607, roughness: 0.92, metalness: 0.2 })

  const add = (name, geometry, material) => {
    const m = new THREE.Mesh(geometry, material)
    m.name = name
    group.add(m)
    return m
  }
  const lathe = (pts) => turn(pts, { thetas })

  // Rear socket: 23 mm across, 42 mm deep, with a lead-in chamfer. Traced front to back so the
  // wall faces the axis.
  add(
    'socket',
    lathe([[SOCKET_DEPTH, BORE], [SOCKET_DEPTH, SOCKET_R - 0.8], [SOCKET_DEPTH - 0.8, SOCKET_R], [0.8, SOCKET_R], [0, SOCKET_R + 0.8]]),
    inner,
  )

  // Rear face and the narrow knurled collar that meets the barrel.
  add('rear-face', lathe([[0, SOCKET_R + 0.8], [0, COLLAR_R - 0.7], [0.7, COLLAR_R]]), metal)
  const knurlMat = knurled({ circ: 2 * Math.PI * COLLAR_R, tile: 9, color: 0x131416, scale: 1.1 })
  knurlMat.roughness = 0.56
  knurlMat.clearcoat = 0
  add('rear-collar', lathe([[0.7, COLLAR_R], [COLLAR_LEN - 1.6, COLLAR_R]]), knurlMat)

  // Step up from the collar to the tube, with a relief groove and a rounded shoulder.
  const shoulder = []
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2)
    shoulder.push([REAR.x0 - 1.6 * Math.cos(a) , R - 1.6 + 1.6 * Math.sin(a), 1])
  }
  add(
    'rear-step',
    lathe([
      [COLLAR_LEN - 1.6, COLLAR_R],
      [COLLAR_LEN - 1.2, COLLAR_R - 0.5],
      [COLLAR_LEN, COLLAR_R - 0.5],
      [COLLAR_LEN, R - 1.6],
      ...shoulder.slice(1),
    ]),
    metal,
  )
  // turn() only smooths between flagged neighbours; the first arc point above is the sharp
  // foot of the shoulder, which is what a turned radius leaves.

  add('tube-rear', dimpledTube(REAR, TH), metal)

  // The seam between the two sections: a narrow machined groove with chamfered lips.
  add(
    'seam',
    lathe([[REAR.x1, R], [REAR.x1 + 0.5, R - 0.5], [REAR.x1 + 0.5, R - 1.3], [FRONT.x0 - 0.5, R - 1.3], [FRONT.x0 - 0.5, R - 0.5], [FRONT.x0, R]]),
    metal,
  )

  add('tube-front', dimpledTube(FRONT, TH), metal)

  // Rounded nose, the muzzle face and a short crown into the bore.
  const nose = []
  const NX = L - FRONT.x1
  const NR = R - 7.5
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * (Math.PI / 2)
    nose.push([FRONT.x1 + NX * Math.sin(a), 7.5 + NR * Math.cos(a), 1])
  }
  add('nose', lathe([...nose, [L, 5.6], [L - 1, BORE + 0.1], [L - 6, BORE]]), metal)

  // The bore: a dark tube from the crown back to the socket floor.
  const bore = add('bore', lathe([[L - 6, BORE], [SOCKET_DEPTH, BORE]]), boreMat)
  bore.userData.shadow = false
  // A blind baffle a little past the socket, so the bore reads deep and dark from either end
  // instead of showing daylight straight through.
  const stopMat = boreMat.clone()
  stopMat.side = THREE.DoubleSide
  const stop = add('bore-stop', new THREE.CircleGeometry((BORE + 0.2) * MM, 24).rotateY(Math.PI / 2), stopMat)
  stop.position.x = 90 * MM
  stop.userData.shadow = false

  // A small, quiet marking near the rear, between two dimple rows.
  const map = label(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(150, 153, 158, 0.42)'
    fitText(ctx, 'MS-235   ·   6 mm BB', w / 2, h / 2 + 2, w - 40, 84)
  })
  for (const theta of [-45, 45]) {
    const d = cylDecal({ r: R + 0.05, x0: 27, x1: 47, theta, height: 2.5, map })
    d.name = theta < 0 ? 'marking-left' : 'marking-right'
    group.add(d)
  }

  return group
}
