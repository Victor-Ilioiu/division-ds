// Bump helmet: a high-cut protective shell, about 270 x 230 x 170 mm. Floor item: origin at
// the centre of the footprint, resting on its rim on y = 0, front toward +X.
// The shell is a lofted superellipsoid whose lower edge follows a rim line with the high cut
// over the ears; everything mounted on it is a patch pushed out of the same surface.
// Dimensions are millimetres (see _suppressor-kit.js).

import * as THREE from 'three'
import { polymer, polymerGrain } from '../lib/materials.js'
import { MM, turn, skin, patchOn, pillow, surfaceNormal, place } from './_suppressor-kit.js'

const A = 133 // half length (X)
const C = 113 // half width (Z)
const H = 168 // crown height above the lowest point of the rim
const YE = 68 // height of the widest section
const K = 95 // mm of wall per radian below the widest section
const PLAN = 2.3 // squareness of the plan view
const DOME = 2.4 // squareness of the dome in section
const BMAX = Math.PI / 2 - 0.004
const LINER = 7 // shell + liner thickness
const rad = THREE.MathUtils.degToRad

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Height of the rim above the floor at azimuth psi (0 = front, 90 = over the ear, 180 = nape). */
function rimHeight(psi) {
  let d = THREE.MathUtils.radToDeg(Math.abs(Math.atan2(Math.sin(psi), Math.cos(psi))))
  const keys = [[0, 46], [38, 30], [58, 36], [86, 86], [104, 86], [132, 34], [154, 8], [180, 0]]
  for (let i = 0; i < keys.length - 1; i++) {
    const [d0, h0] = keys[i]
    const [d1, h1] = keys[i + 1]
    if (d <= d1) return h0 + (h1 - h0) * smooth(d0, d1, d)
  }
  return 0
}

const betaOfHeight = (y) => (y < YE ? (y - YE) / K : Math.asin(Math.pow((y - YE) / (H - YE), DOME / 2)))
const rimBeta = (psi) => betaOfHeight(rimHeight(psi))

/** The outer shell at azimuth psi and elevation beta (radians). */
function S(psi, beta) {
  const c = Math.cos(psi)
  const s = Math.sin(psi)
  const k = Math.pow(Math.pow(Math.abs(c), PLAN) + Math.pow(Math.abs(s), PLAN), -1 / PLAN)
  let g = 1
  let y
  if (beta < 0) y = YE + beta * K
  else {
    g = Math.pow(Math.cos(beta), 2 / DOME)
    y = YE + (H - YE) * Math.pow(Math.sin(beta), 2 / DOME)
  }
  return [A * c * k * g, y, C * s * k * g]
}

/** The shell as the loft the mesh uses: u once around, v from the rim to the crown. */
function P(u, v) {
  const psi = u * Math.PI * 2
  const b0 = rimBeta(psi)
  return S(psi, b0 + (BMAX - b0) * Math.min(1, Math.max(0, v)))
}

/** The top of the shell as a height field over (x, z), for anything that sits on the crown. */
function top(x, z) {
  const g = Math.pow(Math.pow(Math.abs(x / A), PLAN) + Math.pow(Math.abs(z / C), PLAN), 1 / PLAN)
  return [x, YE + (H - YE) * Math.pow(Math.max(0, 1 - Math.pow(g, DOME)), 1 / DOME), z]
}

/** A small machine screw standing on +Y: washer, domed head, hex socket. */
function screwGeometry(r) {
  return turn(
    [
      [0, r * 1.45],
      [0.7, r * 1.45],
      [0.9, r * 1.25],
      [0.9, r],
      [1.9, r, 1],
      [2.5, r * 0.8, 1],
      [2.7, r * 0.5],
      [1.5, r * 0.42],
      [1.5, 0],
    ],
    { segs: 20, axis: 'y' },
  )
}

function fuzz() {
  const n = polymerGrain().clone()
  n.repeat.set(7, 5)
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color: 0x0d0e0f,
    roughness: 1,
    metalness: 0,
    normalMap: n,
    normalScale: new THREE.Vector2(1.6, 1.6),
    specularIntensity: 0.3,
    sheen: 0.6,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0x3a3c3f),
  })
}

export function create() {
  const group = new THREE.Group()
  group.name = 'helmet'
  const body = new THREE.Group()
  body.name = 'helmet-body'
  group.add(body)

  const shellMat = polymer({ color: 0x1b1d1b, roughness: 0.68 })
  shellMat.sheen = 0.08
  shellMat.clearcoat = 0
  shellMat.normalMap.repeat.set(230, 130)
  // Matt paint: under a bright studio a rough dielectric still mirrors 4% of the ceiling and
  // reads grey, so the dark parts carry half the usual specular.
  shellMat.specularIntensity = 0.5
  const black = polymer({ color: 0x0e0f10, roughness: 0.58, repeat: 12 })
  black.sheen = 0.08
  black.specularIntensity = 0.5
  const trimMat = polymer({ color: 0x0c0d0e, roughness: 0.74, repeat: 40 })
  trimMat.sheen = 0.1
  trimMat.specularIntensity = 0.5
  const linerMat = new THREE.MeshStandardMaterial({ color: 0x0e0f10, roughness: 0.95, side: THREE.DoubleSide })
  const foam = polymer({ color: 0x1c1d1f, roughness: 0.95, repeat: 6 })
  foam.normalScale.set(1.2, 1.2)
  foam.side = THREE.DoubleSide
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x060607, roughness: 0.95 })
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x2b2d30, roughness: 0.5, metalness: 0.85 })
  const loop = fuzz()

  const add = (name, geometry, material) => {
    const m = new THREE.Mesh(geometry, material)
    m.name = name
    body.add(m)
    return m
  }

  // --- vents: a row of six slots along the top, three ahead of the crown and three behind ----
  const NU = 112
  const NV = 56
  const vents = []
  for (const psiC of [0, Math.PI]) {
    for (const bDeg of [46, 55, 64]) {
      const r = A * Math.pow(Math.cos(rad(bDeg)), 2 / DOME)
      const hw = 17 / r
      const b0 = rimBeta(psiC)
      const vOf = (b) => (rad(b) - b0) / (BMAX - b0)
      const i0 = Math.round(((psiC - hw) / (Math.PI * 2)) * NU)
      const i1 = Math.round(((psiC + hw) / (Math.PI * 2)) * NU)
      const j0 = Math.round(vOf(bDeg - 2.4) * NV)
      const j1 = Math.max(j0 + 2, Math.round(vOf(bDeg + 2.4) * NV))
      vents.push({ i0, i1, j0, j1 })
    }
  }
  const inVent = (i, j) => vents.some((q) => j >= q.j0 && j < q.j1 && ((i >= q.i0 && i < q.i1) || (i - NU >= q.i0 && i - NU < q.i1)))

  add('shell', skin(P, NU, NV, { skip: inVent }), shellMat)
  vents.forEach((q) => {
    add(
      'vent',
      patchOn(P, { u: [q.i0 / NU, q.i1 / NU], v: [q.j0 / NV, q.j1 / NV], nu: 18, nv: 8, height: (a, b) => -4.5 * pillow(a, b, 0.22) }),
      ventMat,
    )
  })

  // --- liner and pads, seen from below --------------------------------------------------------
  add(
    'liner',
    skin((u, v) => {
      const p = P(u, v)
      const n = surfaceNormal(P, u, Math.min(0.999, Math.max(0.001, v)))
      return [p[0] - n.x * LINER, p[1] - n.y * LINER, p[2] - n.z * LINER]
    }, 60, 30),
    linerMat,
  )
  const pad = (name, surf, u, v) =>
    add(name, patchOn(surf, { u, v, nu: 14, nv: 12, height: (a, b) => -(LINER - 1) - 11 * pillow(a, b, 0.3) }), foam)
  pad('pad-front', S, [rad(-32), rad(32)], [rad(4), rad(40)])
  pad('pad-back', S, [rad(148), rad(212)], [rad(-6), rad(40)])
  pad('pad-left', S, [rad(-122), rad(-58)], [rad(20), rad(52)])
  pad('pad-right', S, [rad(58), rad(122)], [rad(20), rad(52)])
  pad('pad-crown', (u, v) => top(-48 + 96 * u, -42 + 84 * v), [0, 1], [0, 1])

  // --- edge trim all the way round the rim ----------------------------------------------------
  const rimPts = []
  for (let i = 0; i < 180; i++) {
    const u = i / 180
    const p = P(u, 0)
    const n = surfaceNormal(P, u, 0.002)
    rimPts.push(new THREE.Vector3((p[0] - n.x * 3.4) * MM, p[1] * MM, (p[2] - n.z * 3.4) * MM))
  }
  const rimCurve = new THREE.CatmullRomCurve3(rimPts, true)
  add('edge-trim', new THREE.TubeGeometry(rimCurve, 200, 4.7 * MM, 8, true), trimMat)

  // --- hook-and-loop patches: crown and both sides --------------------------------------------
  const raised = (h, soft) => (a, b) => -0.5 + (h + 0.5) * pillow(a, b, soft)
  add('loop-patch-top', patchOn((u, v) => top(-40 + 80 * u, -34 + 68 * v), { u: [0, 1], v: [0, 1], nu: 20, nv: 18, height: raised(1.7, 0.06) }), loop)
  for (const side of [-1, 1]) {
    add(
      side < 0 ? 'loop-patch-left' : 'loop-patch-right',
      patchOn(S, { u: [rad(side * 58), rad(side * 122)], v: [rad(29), rad(49)], nu: 28, nv: 10, height: raised(1.7, 0.06) }),
      loop,
    )
  }

  // --- side accessory rails: a slotted bar over each ear arch ---------------------------------
  const railHeight = (a, b) => {
    let h = -0.5 + 7.5 * pillow(a, b, 0.14)
    for (let k = 0; k < 5; k++) {
      const ca = 0.14 + 0.18 * k
      const m = (1 - smooth(0.05, 0.065, Math.abs(a - ca))) * (1 - smooth(0.2, 0.26, Math.abs(b - 0.5)))
      h -= 4.2 * m
    }
    return h
  }
  for (const side of [-1, 1]) {
    add(
      side < 0 ? 'rail-left' : 'rail-right',
      patchOn(S, { u: [rad(side * 54), rad(side * 126)], v: [rad(12.5), rad(23)], nu: 70, nv: 12, height: railHeight }),
      black,
    )
  }

  // --- front accessory shroud: a mounting plate with a recessed centre and four screws --------
  const shU = [rad(-13.5), rad(13.5)]
  const shV = [rad(-7), rad(15)]
  const shroudHeight = (a, b) => {
    let h = -0.5 + 5.5 * pillow(a, b, 0.1)
    const m = (1 - smooth(0.2, 0.24, Math.abs(a - 0.5))) * (1 - smooth(0.2, 0.25, Math.abs(b - 0.46)))
    return h - 2.4 * m
  }
  add('shroud', patchOn(S, { u: shU, v: shV, nu: 30, nv: 28, height: shroudHeight }), black)
  const smallScrew = screwGeometry(2.3)
  for (const a of [0.13, 0.87]) {
    for (const b of [0.12, 0.88]) {
      const psi = shU[0] + (shU[1] - shU[0]) * a
      const beta = shV[0] + (shV[1] - shV[0]) * b
      const p = S(psi, beta)
      const n = surfaceNormal(S, psi, beta)
      const m = add('shroud-screw', smallScrew, steel)
      place(m, [p[0] + n.x * 4.6, p[1] + n.y * 4.6, p[2] + n.z * 4.6], n)
    }
  }

  // --- four retention screws ------------------------------------------------------------------
  const bigScrew = screwGeometry(4)
  for (const [psiD, bD] of [[38, -9], [-38, -9], [143, -22], [-143, -22]]) {
    const p = S(rad(psiD), rad(bD))
    const n = surfaceNormal(S, rad(psiD), rad(bD))
    place(add('retention-screw', bigScrew, steel), [p[0] - n.x * 0.2, p[1] - n.y * 0.2, p[2] - n.z * 0.2], n)
  }

  // --- small brand mark at the back ------------------------------------------------------------
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(190, 193, 196, 0.5)'
  ctx.font = '700 84px "Arial Narrow", "Roboto Condensed", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(256, 68)
  ctx.scale(-1, 1) // the patch runs right to left when seen from behind
  ctx.fillText('HEXLINE', 0, 0)
  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mark = add(
    'brand-mark',
    patchOn(S, { u: [rad(166), rad(194)], v: [rad(8), rad(16)], nu: 16, nv: 4, height: () => 0.15 }),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  )
  mark.userData.shadow = false

  // rest it on the floor, centred on its footprint
  const box = new THREE.Box3().setFromObject(body)
  body.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
  return group
}
