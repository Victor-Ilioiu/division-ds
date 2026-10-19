// Knee pads, pair: two hard-cap pads standing side by side, each about 150 x 210 x 80 mm.
// Floor item: origin at the centre of the pair's footprint, resting on y = 0, fronts toward +X.
// `pad-left` and `pad-right` are separate groups, so one can be moved on its own.
// Dimensions are millimetres (see _suppressor-kit.js).

import * as THREE from 'three'
import { polymer, normalMapFromHeight } from '../lib/materials.js'
import { MM, turn, skin, patchOn, surfaceNormal, ribbon, ribbonFrame, filletShape, place } from './_suppressor-kit.js'

const RK = 110 // radius the pad wraps round the knee
const HALF_H = 105
const HALF_W = 82 // half width measured along the wrap
const NB = 3.2 // squareness of the backing outline
const CAP = { w: 56, h: 68, y: 6, n: 2.8 }
const STRAP_Y = [62, -60]

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const sgnPow = (x, p) => Math.sign(x) * Math.pow(Math.abs(x), p)

/** Wrap: s along the curve of the pad, y up, d out of its surface. */
function wrap(s, y, d) {
  const phi = s / RK
  const rho = RK + d
  return [rho * Math.cos(phi) - RK - (y * y) / 1400, y, rho * Math.sin(phi)]
}

const halfWidth = (y) => HALF_W * (1 + 0.05 * (y / HALF_H))
const backingQ = (s, y) => Math.pow(Math.pow(Math.abs(s / halfWidth(y)), NB) + Math.pow(Math.abs(y / HALF_H), NB), 1 / NB)

/** Thickness of the padding in front of the wrap surface: a pillow with quilted channels. */
function frontThickness(s, y, quilted = true) {
  const q = Math.min(1, backingQ(s, y))
  const quilt = quilted ? 1 - 0.17 * (0.5 + 0.5 * Math.cos((2 * Math.PI * y) / 23)) * (1 - Math.pow(q, 4)) : 0.9
  return 15 * Math.sqrt(Math.max(0, 1 - Math.pow(q, 5))) * quilt
}
const backThickness = (s, y) => 5 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.min(1, backingQ(s, y)), 5)))

/** Backing: u round the outline, v from the middle of the front, over the edge, to the middle of the back. */
function backing(u, v) {
  const th = u * Math.PI * 2
  const front = v < 0.5
  const q = 0.004 + 0.996 * (front ? v / 0.5 : (1 - v) / 0.5) // stops short of the pole
  const y = q * HALF_H * sgnPow(Math.sin(th), 2 / NB)
  const s = q * halfWidth(y) * sgnPow(Math.cos(th), 2 / NB)
  return wrap(s, y, front ? frontThickness(s, y) : -backThickness(s, y))
}

/** The hard cap as a height over (s, y): a dome with horizontal grip ribs and a rolled edge. */
function capPoint(s, y) {
  const q = Math.min(1, Math.pow(Math.pow(Math.abs(s / CAP.w), CAP.n) + Math.pow(Math.abs((y - CAP.y) / CAP.h), CAP.n), 1 / CAP.n))
  const rib = 0.5 + 0.5 * Math.cos((2 * Math.PI * (y - CAP.y)) / 17)
  const dome = 3 + 17 * (1 - Math.pow(q, 2.4)) + 1.5 * rib * (1 - smooth(0.4, 0.78, q))
  const edge = smooth(0.86, 1, q)
  return wrap(s, y, frontThickness(s, y, false) - 1 + dome * (1 - edge) - 3.5 * edge)
}

/** The cap mesh runs in rows of constant height, so the ribs fall on the grid and stay clean. */
function cap(u, v) {
  const yn = (1 - 2 * v) * 0.998
  const w = CAP.w * Math.pow(1 - Math.pow(Math.abs(yn), CAP.n), 1 / CAP.n)
  return capPoint((2 * u - 1) * w, CAP.y + CAP.h * yn)
}

/** Woven nylon with two rows of stitching near the edge of the front face. */
function fabricNormal() {
  const tex = normalMapFromHeight(
    'kneepad-fabric',
    1024,
    (ctx, size) => {
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, size, size)
      ctx.lineWidth = 1
      for (let i = 0; i < size; i += 4) {
        ctx.strokeStyle = 'rgba(40,40,40,0.5)'
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke()
        ctx.strokeStyle = 'rgba(200,200,200,0.35)'
        ctx.beginPath(); ctx.moveTo(0, i + 2); ctx.lineTo(size, i + 2); ctx.stroke()
      }
      // canvas y is flipped against v: v = 0.5 * q on the front face
      for (const q of [0.9, 0.84]) {
        const y = size * (1 - 0.5 * q)
        ctx.fillStyle = '#3c3c3c'
        ctx.fillRect(0, y - 2.5, size, 5)
        ctx.fillStyle = '#d6d6d6'
        for (let x = 0; x < size; x += 12) ctx.fillRect(x, y - 1.5, 7, 3)
      }
    },
    2.4,
  ).clone()
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

function webbingNormal() {
  const tex = normalMapFromHeight(
    'kneepad-webbing',
    128,
    (ctx, size) => {
      for (let y = 0; y < size; y += 8) {
        for (let x = 0; x < size; x += 16) {
          ctx.fillStyle = '#b4b4b4'
          ctx.fillRect(x + ((y / 8) % 2) * 8, y + 1, 7, 6)
        }
      }
    },
    2.2,
  ).clone()
  tex.repeat.set(1 / 0.012, 6) // u is metres along the band
  tex.needsUpdate = true
  return tex
}

function buildPad(name, mats) {
  const pad = new THREE.Group()
  pad.name = name
  const add = (n, geometry, material) => {
    const m = new THREE.Mesh(geometry, material)
    m.name = n
    pad.add(m)
    return m
  }

  add('backing', skin(backing, 60, 32, { flip: true }), mats.fabric)
  add('cap', skin(cap, 64, 64, { flip: true }), mats.hard)

  // four rivets holding the cap to the padding
  const rivet = turn([[0, 5.2], [0.8, 5.2], [1.1, 4.6], [1.6, 4.2, 1], [2.6, 3.2, 1], [3, 1.6, 1], [3.1, 0]], { segs: 20, axis: 'y' })
  for (const [rs, ry] of [[-37, 50], [37, 50], [-37, -40], [37, -40]]) {
    place(add('cap-rivet', rivet, mats.steel), capPoint(rs, ry), surfaceNormal(capPoint, rs, ry))
  }

  // brand mark moulded near the top of the cap
  const mark = add('brand-mark', patchOn(capPoint, { u: [22, -22], v: [51, 61], nu: 12, nv: 4, height: () => 0.12 }), mats.mark)
  mark.userData.shadow = false

  // two elastic straps wrapped round the back, each with a buckle
  STRAP_Y.forEach((y, k) => {
    // the band leaves from under each side edge of the padding and hugs the back
    const sAt = [-80, -75, -52, 0, 52, 75, 80]
    const dAt = [-1.5, -9, -16, -18, -16, -9, -1.5]
    const pts = sAt.map((s, i) => {
      const p = wrap(s, y, dAt[i])
      return new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM)
    })
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    const up = new THREE.Vector3(0, 1, 0)
    add(k === 0 ? 'strap-upper' : 'strap-lower', ribbon(curve, { width: 38, thickness: 2.2, segs: 64, up }), mats.webbing)

    // buckle: a moulded frame with two slots, riding on the strap at the side of the pad
    const shape = filletShape([[-17, -22], [17, -22], [17, 22], [-17, 22]], 4)
    for (const cx of [-8, 8]) {
      shape.holes.push(new THREE.Path(filletShape([[cx - 3.2, -18.5], [cx + 3.2, -18.5], [cx + 3.2, 18.5], [cx - 3.2, 18.5]], 1.5).getPoints(4).reverse()))
    }
    const b = 0.8
    const depth = 5
    const geo = new THREE.ExtrudeGeometry(shape, { depth: (depth - 2 * b) * MM, bevelEnabled: true, bevelThickness: b * MM, bevelSize: b * MM, bevelOffset: -b * MM, bevelSegments: 2, curveSegments: 4 })
    geo.translate(0, 0, (-(depth - 2 * b) / 2) * MM)
    const f = ribbonFrame(curve, 0.8, up)
    const buckle = add(k === 0 ? 'buckle-upper' : 'buckle-lower', geo, mats.hard)
    buckle.matrixAutoUpdate = false
    buckle.matrix.makeBasis(f.T, f.W, f.N).setPosition(f.p)
  })

  return pad
}

export function create() {
  const group = new THREE.Group()
  group.name = 'knee-pads'

  const fabric = polymer({ color: 0x17191a, roughness: 0.86 })
  fabric.normalMap = fabricNormal()
  fabric.normalScale.set(0.8, 0.8)
  fabric.sheen = 0.3
  fabric.clearcoat = 0
  fabric.specularIntensity = 0.6
  const hard = polymer({ color: 0x0f1011, roughness: 0.54 })
  hard.normalMap.repeat.set(90, 60)
  hard.sheen = 0.05
  const webbing = polymer({ color: 0x111213, roughness: 0.82 })
  webbing.normalMap = webbingNormal()
  webbing.normalScale.set(0.9, 0.9)
  webbing.clearcoat = 0
  webbing.specularIntensity = 0.5
  webbing.sheen = 0.15
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x35373a, roughness: 0.5, metalness: 0.85 })

  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(170, 173, 177, 0.55)'
  ctx.font = '700 86px "Arial Narrow", "Roboto Condensed", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('HEXLINE', 256, 68)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mark = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })

  const mats = { fabric, hard, webbing, steel, mark }
  const left = buildPad('pad-left', mats)
  const right = buildPad('pad-right', mats)
  left.position.z = -88 * MM
  right.position.z = 88 * MM
  left.rotation.y = THREE.MathUtils.degToRad(9)
  right.rotation.y = THREE.MathUtils.degToRad(-9)
  group.add(left, right)

  // stand them on the floor, centred on the pair's footprint
  group.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(group)
  for (const p of [left, right]) {
    p.position.x -= (box.min.x + box.max.x) / 2
    p.position.y -= box.min.y
    p.position.z -= (box.min.z + box.max.z) / 2
  }
  return group
}
