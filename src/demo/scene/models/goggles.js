// Field goggles: full-seal protective goggles, about 185 x 90 x 80 mm, with the elastic strap
// lying in a relaxed loop behind them. Floor item: origin at the centre of the footprint,
// resting on the frame's bottom edge and the strap on y = 0, lens toward +X.
//
// Everything is drawn in "wrap space" first: s runs sideways along the curve of the face,
// y is up, d is depth behind the lens. `wrap` bends that round a vertical cylinder, which is
// what makes the frame curve round the face instead of being a flat plate.
// Dimensions are millimetres (see _suppressor-kit.js).

import * as THREE from 'three'
import { polymer, normalMapFromHeight } from '../lib/materials.js'
import { MM, skin, ribbon, ribbonFrame, sliderGeometry } from './_suppressor-kit.js'

const RW = 120 // radius of the wrap
const AO = 90 // half width of the lens opening, measured along the wrap
const BO = 33 // half height of the lens opening
const YC = 46 // height of the lens centre above the floor
const NO = 3 // squareness of the opening

const sgnPow = (x, p) => Math.sign(x) * Math.pow(Math.abs(x), p)
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function wrap(s, y, d) {
  const phi = s / RW
  const rho = RW - d
  return [rho * Math.cos(phi), y, rho * Math.sin(phi)]
}

/** The lens opening: a rounded rectangle with a notch for the nose. */
function outline(t) {
  const cs = sgnPow(Math.cos(t), 2 / NO)
  const sn = sgnPow(Math.sin(t), 2 / NO)
  const s = AO * cs
  let y = YC + BO * sn
  if (sn < 0) y += 21 * Math.exp(-Math.pow(s / 17, 2)) * -sn
  return [s, y]
}

/** Outline point plus its outward unit normal in the (s, y) plane. */
function outlineFrame(t) {
  const e = 1e-4
  const p = outline(t)
  const a = outline(t - e)
  const b = outline(t + e)
  const ds = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(ds, dy) || 1
  return { s: p[0], y: p[1], ns: dy / l, ny: -ds / l }
}

function sectionCurve(pts) {
  return new THREE.CatmullRomCurve3(pts.map(([e, d]) => new THREE.Vector3(e, d, 0)), true, 'catmullrom', 0.5)
}

// Frame section: e is outward from the opening, d is depth behind the lens.
const FRAME = sectionCurve([
  [-3.6, 1.6], [-1, -1.8], [3, -2], [7.6, 1.6], [10, 9], [10.6, 18], [8.6, 24.5], [3, 26], [-2.6, 24.5], [-4.6, 14], [-4.6, 6],
])
const GASKET = sectionCurve([[-3, 25], [2, 24], [7.6, 25.6], [8.6, 30], [6, 34.4], [1, 35.4], [-3.6, 33.4], [-4.6, 29]])

/** More of the frame's samples go to the outer wall, where the vent slots are cut. */
function frameParam(v) {
  if (v < 0.25) return (v / 0.25) * 0.34
  if (v < 0.7) return 0.34 + ((v - 0.25) / 0.45) * 0.14
  return 0.48 + ((v - 0.7) / 0.3) * 0.52
}

function frame(u, v) {
  const f = outlineFrame(u * Math.PI * 2)
  const c = FRAME.getPoint(frameParam(Math.min(1, Math.max(0, v))))
  let e = c.x
  const d = c.y
  // vent slots: recesses along the top and the bottom of the outer wall
  const onTop = f.ny > 0.8
  const onBottom = f.ny < -0.8 && Math.abs(f.s) > 30
  if ((onTop || onBottom) && e > 5) {
    const k = Math.abs((((f.s % 19) + 19) % 19) - 9.5)
    const along = 1 - smooth(5.6, 6.8, k)
    const across = smooth(8, 9.2, d) * (1 - smooth(16.8, 18, d))
    const edge = smooth(0.8, 0.9, Math.abs(f.ny))
    e -= 2.4 * along * across * edge
  }
  return wrap(f.s + f.ns * e, f.y + f.ny * e, d)
}

function gasket(u, v) {
  const f = outlineFrame(u * Math.PI * 2)
  const c = GASKET.getPoint(Math.min(1, Math.max(0, v)))
  return wrap(f.s + f.ns * c.x, f.y + f.ny * c.x, c.y)
}

function lens(u, v) {
  const f = outlineFrame(u * Math.PI * 2)
  const r = 0.001 + 0.999 * v // never quite reaches the pole, so the normals stay defined
  const cy = YC + 4
  return wrap(r * (f.s - f.ns * 2.6), cy + r * (f.y - f.ny * 2.6 - cy), 0.4)
}

function webbingNormal() {
  const tex = normalMapFromHeight(
    'goggles-webbing',
    128,
    (ctx, size) => {
      // lengthwise elastic ribs crossed by a fine weft
      for (let y = 0; y < size; y += 8) {
        ctx.fillStyle = '#b8b8b8'
        ctx.fillRect(0, y + 1, size, 5)
      }
      ctx.fillStyle = 'rgba(60,60,60,0.55)'
      for (let x = 0; x < size; x += 6) ctx.fillRect(x, 0, 2, size)
    },
    2.4,
  ).clone()
  tex.repeat.set(1 / 0.01, 14) // u is metres along the band
  tex.needsUpdate = true
  return tex
}

export function create() {
  const group = new THREE.Group()
  group.name = 'goggles'
  const body = new THREE.Group()
  body.name = 'goggles-body'
  group.add(body)

  const add = (name, geometry, material) => {
    const m = new THREE.Mesh(geometry, material)
    m.name = name
    body.add(m)
    return m
  }

  // soft moulded frame
  const frameMat = polymer({ color: 0x131415, roughness: 0.7 })
  frameMat.normalMap.repeat.set(160, 24)
  frameMat.sheen = 0.25
  frameMat.clearcoat = 0
  frameMat.specularIntensity = 0.6
  add('frame', skin(frame, 280, 40, { flip: true }), frameMat)

  // open-cell foam face gasket
  const foam = polymer({ color: 0x1d1e20, roughness: 0.97 })
  foam.normalMap.repeat.set(60, 6)
  foam.normalScale.set(1.4, 1.4)
  foam.clearcoat = 0
  foam.sheen = 0.5
  foam.specularIntensity = 0.3
  add('face-gasket', skin(gasket, 140, 12, { flip: true }), foam)

  // single wraparound lens: clear, with a faint amber mirror coating
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0xffdcb8,
    roughness: 0.04,
    metalness: 0,
    transmission: 1,
    thickness: 0.002,
    ior: 1.5,
    attenuationColor: new THREE.Color(0xffa24a),
    attenuationDistance: 0.006,
    iridescence: 0.35,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [520, 640],
    specularColor: new THREE.Color(0xff8a2a),
    specularIntensity: 1,
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide,
  })
  const lensMesh = add('lens', skin(lens, 96, 10, { flip: true }), lensMat)
  lensMesh.userData.shadow = false

  // --- elastic strap: leaves both sides of the frame, lies in a loose loop on the floor -------
  const half = [
    [70, YC, 78],
    [52, YC - 1, 91],
    [12, YC - 6, 101],
    [-38, 30, 97],
    [-84, 17, 72],
    [-110, 13.6, 34],
  ]
  const pts = [
    ...half.map(([x, y, z]) => new THREE.Vector3(x * MM, y * MM, z * MM)),
    new THREE.Vector3(-119 * MM, 13.4 * MM, 0),
    ...half.reverse().map(([x, y, z]) => new THREE.Vector3(x * MM, y * MM, -z * MM)),
  ]
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const up = new THREE.Vector3(0, 1, 0)
  const webbing = polymer({ color: 0x15171a, roughness: 0.84 })
  webbing.normalMap = webbingNormal()
  webbing.normalScale.set(0.9, 0.9)
  webbing.clearcoat = 0
  webbing.sheen = 0.15
  webbing.specularIntensity = 0.5
  add('strap', ribbon(curve, { width: 25, thickness: 2, segs: 110, up }), webbing)

  // where the strap enters the frame: a moulded lug on each side
  const hard = polymer({ color: 0x0f1011, roughness: 0.56 })
  hard.specularIntensity = 0.6
  for (const t of [0.035, 0.965]) {
    const f = ribbonFrame(curve, t, up)
    const lug = add(t < 0.5 ? 'strap-lug-right' : 'strap-lug-left', sliderGeometry(16, 31, 5), hard)
    lug.matrixAutoUpdate = false
    lug.matrix.makeBasis(f.T, f.W, f.N).setPosition(f.p)
  }
  // length adjuster on the strap
  {
    const f = ribbonFrame(curve, 0.3, up)
    const slider = add('strap-slider', sliderGeometry(18, 32, 4.4), hard)
    slider.matrixAutoUpdate = false
    slider.matrix.makeBasis(f.T, f.W, f.N).setPosition(f.p)
  }

  // small printed brand on the outside of the strap, on the side the hero camera sees
  const T0 = 0.76
  const T1 = 0.88
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(205, 208, 212, 0.8)'
  ctx.font = '700 70px "Arial Narrow", "Roboto Condensed", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.translate(256, 64)
  ctx.rotate(Math.PI) // the band's own u and v both run against the reading direction here
  ctx.fillText('HEXLINE', 0, -2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const L = curve.getLength()
  tex.repeat.set(1 / ((T1 - T0) * L), 10)
  tex.offset.set(-T0 / (T1 - T0), -5)
  const print = add(
    'strap-print',
    ribbon(curve, { width: 25, thickness: 0.12, segs: 16, up, t0: T0, t1: T1, offset: -1.12 }),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  )
  print.userData.shadow = false

  // rest it on the floor, centred on its footprint
  const box = new THREE.Box3().setFromObject(body)
  body.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
  return group
}
