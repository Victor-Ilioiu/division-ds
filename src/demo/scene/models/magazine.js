// Translucent airsoft magazine, loaded with white 6 mm BBs. No cartridge shapes
// anywhere: the inside is a feed chassis (centre web + rails), a packed BB stack on both
// faces of the web, a follower and a spring, on a solid base plate.
//
//   create({ variant: 'smoke' })    default: dark graphite shell, neutral internals
//   create({ variant: 'accent' })   warm amber shell, gold chassis and spring, orange follower,
//                                   orange base-plate line and screws
//   create({ gloss: 0.8 })          reflection strength of the shell, 1 = physically right
//
// In the viewer (which only calls create() with defaults) add ?variant=accent to the URL.
//
// Everything is modelled straight in "mag space" (x front, y up, z width; top at y = +30 mm,
// base at y = -120 mm) and then bent onto a circular arc below the well, so the inserted
// section stays straight and inside 62 x 28 mm, as spike/CONTRACT.md requires.
//
// Transparency: see _magazine-clear.js. Multiply pass + additive pass, no transmission.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { polymer, blackSteel } from '../lib/materials.js'
import { tintMaterial, glossMaterial, clearShell, roundedRing, loft } from './_magazine-clear.js'

const TOP = 0.03
const BOTTOM = -0.12
const BEND_R = 0.8 // metres; gives ~9 mm of forward sweep at the base plate

/** mag space -> bent space. Returns the rotation (about Z) at that height too. */
function bend(x, y) {
  if (y >= 0) return [x, y, 0]
  const a = -y / BEND_R
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [BEND_R * (1 - c) + x * c, -BEND_R * s + x * s, a]
}

function bendGeometry(g) {
  const p = g.attributes.position
  const n = g.attributes.normal
  for (let i = 0; i < p.count; i++) {
    const [x, y, a] = bend(p.getX(i), p.getY(i))
    p.setXY(i, x, y)
    if (n && a !== 0) {
      const nx = n.getX(i)
      const ny = n.getY(i)
      n.setXY(i, nx * Math.cos(a) - ny * Math.sin(a), nx * Math.sin(a) + ny * Math.cos(a))
    }
  }
  p.needsUpdate = true
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}

/** Rigid placement of an object built around its own origin at mag-space (x, y, z). */
function placeBent(obj, x, y, z = 0) {
  const [bx, by, a] = bend(x, y)
  obj.position.set(bx, by, z)
  obj.rotation.z = a
  return obj
}

const plain = (g) => {
  const out = g.index ? g.toNonIndexed() : g
  out.deleteAttribute('uv')
  return out
}

// ---------------------------------------------------------------------------------- shell

function shellGeometry() {
  // [y, halfX, halfZ, corner radius], top to bottom. The first rows are the feed lips: an
  // inner lip edge, the roof, then the rounded shoulder down onto the side walls.
  const rows = [
    [0.0272, 0.0266, 0.0058, 0.002],
    [0.0296, 0.0268, 0.006, 0.0022],
    [0.03, 0.0274, 0.0074, 0.0026],
    [0.03, 0.0283, 0.0118, 0.003],
    [0.0294, 0.0288, 0.0131, 0.0034],
    [0.028, 0.029, 0.0135, 0.0036],
    [0.024, 0.029, 0.0135, 0.0036],
    [0.016, 0.029, 0.0135, 0.0036],
    [0.008, 0.029, 0.0135, 0.0036],
    [0.0012, 0.029, 0.0135, 0.0036],
    [-0.0004, 0.0293, 0.0137, 0.0037], // the stop shoulder under the well
    [-0.0018, 0.03, 0.014, 0.0038],
  ]
  for (let y = -0.008; y > -0.1125; y -= 0.0115) rows.push([y, 0.03, 0.014, 0.0038])
  rows.push([-0.113, 0.03, 0.014, 0.0038])

  const rings = rows.map(([y, hx, hz, r]) =>
    roundedRing(hx, hz, r, 6, 8, 3).map(([x, z]) => {
      // The front third of the top sits 4 mm lower than the rear, as on the real feed tower.
      let yy = y
      if (y > 0.02) yy -= 0.004 * THREE.MathUtils.smoothstep(x, 0.004, 0.016) * ((y - 0.02) / 0.01)
      return [x, yy, z]
    }),
  )
  const g = loft(rings)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const [x, y] = bend(p.getX(i), p.getY(i))
    p.setXY(i, x, y)
  }
  g.computeVertexNormals()
  return g
}

/** A rib that runs down the magazine: rounded section swept along y, fine enough to bend. */
function verticalRib(cx, cz, halfX, halfZ, y0, y1) {
  const rings = []
  const steps = Math.ceil((y0 - y1) / 0.008)
  const section = roundedRing(halfX, halfZ, Math.min(halfX, halfZ) * 0.55, 3, 1, 1)
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps
    rings.push(section.map(([x, z]) => [cx + x, y, cz + z]))
  }
  return plain(loft(rings, { capStart: true, capEnd: true }))
}

function box(cx, cy, cz, sx, sy, sz, r = 0.0004) {
  const g = new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(r, sx / 2.01, sy / 2.01, sz / 2.01))
  g.translate(cx, cy, cz)
  return plain(g)
}

/** Coupling stud: flange, waist, mushroom head. Axis along +Z (or -Z), base on the side wall. */
function stud(cx, cy, side) {
  const pts = [
    [0.0001, 0.0038],
    [0.0026, 0.0038],
    [0.0037, 0.0035],
    [0.0041, 0.003],
    [0.0041, 0.0024],
    [0.0037, 0.0021],
    [0.003, 0.002],
    [0.003, 0.0012],
    [0.0036, 0.001],
    [0.0052, 0.0009],
    [0.0056, 0.0006],
    [0.0056, -0.0006],
  ].map(([r, h]) => new THREE.Vector2(r, h))
  const g = new THREE.LatheGeometry(pts, 20)
  g.rotateX(side > 0 ? Math.PI / 2 : -Math.PI / 2)
  g.translate(cx, cy, side * 0.014)
  return plain(g)
}

function solidsGeometry() {
  const parts = []
  for (const s of [1, -1]) {
    const z = s * 0.0143
    parts.push(verticalRib(0.0238, z, 0.0016, 0.0008, -0.0035, -0.111)) // front frame rib
    parts.push(verticalRib(-0.0238, z, 0.0016, 0.0008, -0.0035, -0.111)) // rear frame rib
    parts.push(verticalRib(-0.0105, z, 0.0008, 0.0007, -0.006, -0.109)) // feed-channel divider
    parts.push(box(0, -0.0045, z, 0.0508, 0.003, 0.0016)) // top frame rib
    parts.push(box(0, -0.1098, z, 0.0508, 0.003, 0.0016)) // bottom frame rib
    parts.push(box(0.0066, -0.057, z, 0.0312, 0.0016, 0.0014)) // waist rib
    parts.push(stud(0.007, -0.025, s))
    parts.push(stud(0.007, -0.09, s))
    // The lugs that guide a coupled magazine onto the studs.
    parts.push(box(-0.004, -0.025, s * 0.0147, 0.003, 0.012, 0.0024))
    parts.push(box(-0.004, -0.09, s * 0.0147, 0.003, 0.012, 0.0024))
  }
  parts.push(verticalRib(0.0304, 0, 0.0008, 0.0042, -0.004, -0.111)) // front spine
  parts.push(verticalRib(-0.0304, 0, 0.0008, 0.006, -0.004, -0.111)) // rear spine
  parts.push(box(-0.03, 0.012, 0, 0.002, 0.006, 0.012)) // magazine-catch lug, inside the well
  return bendGeometry(mergeGeometries(parts))
}

// --------------------------------------------------------------------------------- insert

const BB_R = 0.002975
const STACK_TOP = 0.0185 // centre of the top BB row, mag space
const FOLLOWER_Y = -0.058 // top face of the follower
const BAND_X = 0.006 // the BB stack sits toward the front, as the feed channel does
const WEB_Z = 0.0012 // half thickness of the chassis web

/** Hex-packed stack, four wide, on both faces of the chassis web. Returns mag-space [x, y, z]. */
function bbStack() {
  const out = []
  const pitchX = BB_R * 2 + 0.00006
  const pitchY = pitchX * 0.866
  const rows = Math.floor((STACK_TOP - (FOLLOWER_Y + BB_R)) / pitchY)
  const y0 = FOLLOWER_Y + BB_R + 0.0001
  for (const side of [1, -1]) {
    for (let j = 0; j <= rows; j++) {
      const odd = (j + (side > 0 ? 0 : 1)) & 1 // the two faces are out of phase, like a real stagger
      const n = odd ? 3 : 4
      for (let i = 0; i < n; i++) {
        out.push([BAND_X + (i - (n - 1) / 2) * pitchX, y0 + j * pitchY, side * (WEB_Z + BB_R + 0.0001)])
      }
    }
  }
  return out
}

/** Centre web, the two rails that bound the BB stack, and a ladder of ribs on the rear web. */
function chassisGeometry() {
  const half = 2 * (BB_R * 2 + 0.00006) + 0.0012
  const top = STACK_TOP + 0.0025
  const parts = [
    verticalRib(0, 0, 0.0262, WEB_Z, top, FOLLOWER_Y),
    verticalRib(BAND_X + half, 0, 0.001, 0.0088, top, FOLLOWER_Y),
    verticalRib(BAND_X - half, 0, 0.001, 0.0088, top, FOLLOWER_Y),
    verticalRib(-0.0252, 0, 0.001, 0.0088, top - 0.003, FOLLOWER_Y),
  ]
  for (let y = 0.012; y > FOLLOWER_Y + 0.004; y -= 0.0095) {
    for (const s of [1, -1]) parts.push(plain(new THREE.BoxGeometry(0.0156, 0.0016, 0.0048).translate(-0.0164, y, s * 0.0036)))
  }
  return bendGeometry(mergeGeometries(parts))
}

function springGeometry(yTop, yBottom, turns = 6.5) {
  const pts = []
  const n = Math.round(turns * 32)
  const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.45) // squarish coil, like the real one
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = t * turns * Math.PI * 2
    const [x, y] = bend(0.023 * sq(Math.cos(a)), yTop + (yBottom - yTop) * t)
    pts.push(new THREE.Vector3(x, y, 0.0085 * sq(Math.sin(a))))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.00065, 5)
}

function basePlateGeometry(hx, hz, r, yTop, height, bevel) {
  const shape = new THREE.Shape()
  const pts = roundedRing(hx - bevel, hz - bevel, r - bevel, 8, 1, 1)
  pts.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)))
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
  })
  g.rotateX(Math.PI / 2) // extrusion +Z -> -Y
  g.translate(0, yTop - bevel, 0)
  return bendGeometry(g)
}

// ----------------------------------------------------------------------------------- looks

const anodised = (color, roughness = 0.34) =>
  new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, clearcoat: 0.3, clearcoatRoughness: 0.3 })

const LOOKS = {
  smoke: () => ({
    shellTint: [0.2, 0.2, 0.212],
    shellHaze: 0x050506,
    ribTint: [0.6, 0.6, 0.62],
    ribHaze: 0x040405,
    chassis: polymer({ color: 0x232427, roughness: 0.5 }),
    follower: polymer({ color: 0x1a1b1d, roughness: 0.55 }),
    spring: blackSteel({ color: 0x8d9197, roughness: 0.32 }),
    screws: blackSteel({ color: 0x25262a, roughness: 0.35 }),
    accentLine: null,
  }),
  accent: () => ({
    shellTint: [0.4, 0.34, 0.25],
    shellHaze: 0x070605,
    ribTint: [0.74, 0.67, 0.55],
    ribHaze: 0x050403,
    chassis: anodised(0xd89c34, 0.5),
    follower: anodised(0xf06a12, 0.38),
    spring: anodised(0xe6b24a, 0.28),
    screws: anodised(0xf06a12, 0.3),
    accentLine: anodised(0xf06a12, 0.36),
  }),
}

// ---------------------------------------------------------------------------------- build

export function create({ variant, gloss = 0.8 } = {}) {
  if (!LOOKS[variant]) variant = 'smoke'
  const look = LOOKS[variant]()

  const group = new THREE.Group()
  group.name = 'magazine'
  group.userData.variant = variant

  // --- opaque contents first: they are what the shell is there to show.
  const chassis = new THREE.Mesh(chassisGeometry(), look.chassis)
  chassis.name = 'chassis'
  group.add(chassis)

  const stack = bbStack()
  stack.push([0.0205, 0.0252, 0]) // one more waiting in the feed lips
  const bbs = new THREE.InstancedMesh(
    new THREE.SphereGeometry(BB_R, 10, 6),
    new THREE.MeshPhysicalMaterial({ color: 0xe6e5df, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.25 }),
    stack.length,
  )
  bbs.name = 'bbs'
  const dummy = new THREE.Object3D()
  stack.forEach(([x, y, z], i) => {
    placeBent(dummy, x, y, z)
    dummy.updateMatrix()
    bbs.setMatrixAt(i, dummy.matrix)
  })
  group.add(bbs)
  group.userData.bbCount = stack.length

  const follower = new THREE.Group()
  follower.name = 'follower'
  const fBody = new THREE.Mesh(new RoundedBoxGeometry(0.054, 0.011, 0.023, 3, 0.0015), look.follower)
  fBody.position.y = -0.0055
  const fSkirt = new THREE.Mesh(new RoundedBoxGeometry(0.046, 0.005, 0.019, 2, 0.001), look.follower)
  fSkirt.position.y = -0.0125
  follower.add(fBody, fSkirt)
  placeBent(follower, 0, FOLLOWER_Y)
  group.add(follower)

  const spring = new THREE.Mesh(springGeometry(FOLLOWER_Y - 0.015, -0.1105), look.spring)
  spring.name = 'spring'
  group.add(spring)

  // --- base plate: two tiers, opaque.
  const base = new THREE.Group()
  base.name = 'basePlate'
  const plateMat = polymer({ color: 0x151617, roughness: 0.5 })
  base.add(new THREE.Mesh(basePlateGeometry(0.0306, 0.0146, 0.0042, -0.1085, 0.0045, 0.0005), plateMat))
  base.add(new THREE.Mesh(basePlateGeometry(0.032, 0.0158, 0.0048, -0.1125, 0.0075, 0.001), plateMat))
  const tab = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0046, 0.0012, 28), plateMat)
  placeBent(tab, 0.008, BOTTOM - 0.0003)
  base.add(tab)
  if (look.accentLine) {
    const line = new THREE.Mesh(basePlateGeometry(0.0323, 0.0161, 0.005, -0.1148, 0.0013, 0.0003), look.accentLine)
    line.name = 'accentLine'
    base.add(line)
  }
  group.add(base)

  // Screw heads on the side walls, as on the airsoft shell halves.
  const screwG = new THREE.CylinderGeometry(0.0017, 0.0017, 0.0012, 16)
  screwG.rotateX(Math.PI / 2)
  const screws = new THREE.InstancedMesh(screwG, look.screws, 4)
  screws.name = 'screws'
  let k = 0
  for (const s of [1, -1]) {
    for (const [x, y] of [[-0.019, -0.014], [0.019, -0.101]]) {
      placeBent(dummy, x, y, s * 0.0142)
      dummy.updateMatrix()
      screws.setMatrixAt(k++, dummy.matrix)
    }
  }
  group.add(screws)

  // --- the clear parts, drawn after everything opaque.
  const shell = clearShell(shellGeometry(), {
    name: 'shell',
    tint: tintMaterial({ tint: look.shellTint, density: 1, edge: 2.6 }),
    gloss: glossMaterial({ haze: look.shellHaze, roughness: 0.08, specular: gloss, clearcoat: gloss * 0.4 }),
    order: 0,
  })
  group.add(shell)
  const ribs = clearShell(solidsGeometry(), {
    name: 'ribs',
    tint: tintMaterial({ tint: look.ribTint, density: 1, edge: 2.2 }),
    gloss: glossMaterial({ haze: look.ribHaze, roughness: 0.14, specular: gloss, clearcoat: gloss * 0.4, side: THREE.FrontSide }),
    order: 2,
  })
  group.add(ribs)

  return group
}

export const dimensions = { top: TOP, bottom: BOTTOM, insertX: 0.062, insertZ: 0.027 }
