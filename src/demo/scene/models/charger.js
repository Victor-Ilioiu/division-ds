// Balance charger: a small desktop LiPo balance charger with its output lead.
//
// Origin: centre of the case's footprint, standing on its feet on y = 0. Front (+X) carries
// the 2S / 3S balance ports and the output lead; the figure-8 mains inlet is at the back.
// The three indicator LEDs are meshes named `led1`..`led3`; `group.userData.setLed(n, on,
// color?)` switches one (n = 1..3). Authored in millimetres, scaled to metres per geometry.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { polymer } from '../lib/materials.js'

const MM = 0.001
const LX = 90
const LZ = 60
const TOP = 35
const FOOT = 1.2
const HX = LX / 2
const PORT_Y = 11.5
const PORTS = [
  { name: 'port2S', pins: 3, z: 16 },
  { name: 'port3S', pins: 4, z: 1.5 },
]
const LEAD_Z = -17
const LED_X = 34
const LED_Z = [10, 0, -10]

function roundedRect(hx, hy, r) {
  const s = new THREE.Shape()
  s.moveTo(-hx + r, -hy)
  s.lineTo(hx - r, -hy)
  s.absarc(hx - r, -hy + r, r, -Math.PI / 2, 0, false)
  s.lineTo(hx, hy - r)
  s.absarc(hx - r, hy - r, r, 0, Math.PI / 2, false)
  s.lineTo(-hx + r, hy)
  s.absarc(-hx + r, hy - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-hx, -hy + r)
  s.absarc(-hx + r, -hy + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/** Extrude a plan-view shape (x, z) upward from y0 to y1. */
function slab(shape, y0, y1, bevel = 0) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: y1 - y0 - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 10,
  })
  geo.translate(0, 0, bevel)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, y0, 0)
  return geo
}

const box = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z)
const plain = (g) => {
  const n = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k)
  return n
}
const metres = (g) => g.scale(MM, MM, MM)
const xhWidth = (pins) => 2.5 * (pins - 1) + 5.1

function figure8() {
  const c = 3.2
  const r = 3.6
  const a = Math.acos(-c / r)
  const s = new THREE.Shape()
  s.absarc(c, 0, r, -a, a, false)
  s.absarc(-c, 0, r, Math.PI - a, Math.PI + a, false)
  return s
}

function buildCase(shellMat) {
  const body = slab(roundedRect(HX, LZ / 2, 8), FOOT, TOP, 1.6)

  const cuts = []
  // Parting line between the two shells.
  const ring = roundedRect(HX + 3, LZ / 2 + 3, 10)
  ring.holes.push(roundedRect(HX - 0.55, LZ / 2 - 0.55, 7.45))
  cuts.push(slab(ring, 18, 18.5))
  // Two banks of vent slots over the transformer end.
  for (const z of [-15, 15]) for (let i = 0; i < 7; i++) cuts.push(box(1.5, 5, 17, -37 + i * 3.4, TOP - 1, z))
  // LED wells.
  for (const z of LED_Z) cuts.push(new THREE.CylinderGeometry(1.9, 1.9, 5, 16).translate(LED_X, TOP - 1, z))
  // Balance sockets.
  for (const p of PORTS) cuts.push(box(8, 5.9, xhWidth(p.pins), HX - 2.5, PORT_Y, p.z))
  // Polarising notch above each socket.
  for (const p of PORTS) cuts.push(box(8, 1.4, 3, HX - 2.5, PORT_Y + 3.2, p.z))
  // Figure-8 mains inlet.
  const inlet = new THREE.ExtrudeGeometry(figure8(), { depth: 10, bevelEnabled: false, curveSegments: 14 })
  inlet.rotateY(Math.PI / 2)
  inlet.translate(-HX - 1, 12, 14)
  cuts.push(inlet)

  const ev = new Evaluator()
  ev.attributes = ['position', 'normal', 'uv']
  const A = new Brush(body, shellMat)
  const B = new Brush(mergeGeometries(cuts.map(plain), false), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.85 }))
  A.updateMatrixWorld()
  B.updateMatrixWorld()
  const res = ev.evaluate(A, B, SUBTRACTION)
  const mesh = new THREE.Mesh(metres(res.geometry), res.material)
  mesh.name = 'case'
  return mesh
}

function topLabel() {
  const w = 920
  const h = 720
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif'
  const INK = '#e9e8e2'
  const DIM = '#a4a6a8'
  const text = (str, x, y, px, { weight = 700, squeeze = 0.86, color = INK, align = 'left', spacing = 0 } = {}) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(squeeze, 1)
    ctx.font = `${weight} ${px}px ${FONT}`
    ctx.fillStyle = color
    ctx.textAlign = align
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
    ctx.fillText(str, 0, 0)
    ctx.restore()
  }
  ctx.fillStyle = '#16171a'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#5c5f63'
  ctx.lineWidth = 5
  ctx.strokeRect(16, 16, w - 32, h - 32)

  // Brand row.
  ctx.strokeStyle = INK
  ctx.lineWidth = 9
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    ctx[k ? 'lineTo' : 'moveTo'](86 + Math.cos(a) * 34, 104 + Math.sin(a) * 34)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.fillRect(81, 85, 10, 38)
  text('HEXLINE', 142, 130, 76, { spacing: 4 })
  text('BC-3', w - 56, 132, 92, { align: 'right', color: '#ff7a1a' })

  ctx.fillStyle = '#5c5f63'
  ctx.fillRect(52, 172, w - 104, 4)
  text('2S / 3S LiPo', 54, 262, 82, { squeeze: 0.84 })
  text('BALANCE CHARGER', 54, 316, 40, { weight: 400, spacing: 5, color: DIM })

  const rows = [
    ['Input', '100-240 V ~ 50/60 Hz 0.2 A'],
    ['Output', '7.4 V / 11.1 V  ⎓  3 × 800 mA'],
    ['Cells', '2 or 3 in series, Li-Po only'],
  ]
  rows.forEach(([k, v], i) => {
    const y = 392 + i * 52
    text(k, 54, y, 34, { color: DIM, weight: 400 })
    text(v, 210, y, 34)
  })
  text('Never leave a charging battery unattended.', 54, 548, 26, { weight: 400, color: DIM })

  // LED legends, lined up with the wells just beyond the label's front edge.
  ctx.fillStyle = '#5c5f63'
  ctx.fillRect(52, 580, w - 104, 4)
  LED_Z.forEach((z, i) => {
    const x = w / 2 - z * 20
    text(`CELL ${i + 1}`, x, 640, 36, { align: 'center', spacing: 3 })
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.moveTo(x - 12, 664)
    ctx.lineTo(x + 12, 664)
    ctx.lineTo(x, 684)
    ctx.closePath()
    ctx.fill()
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

function frontLegend() {
  const w = 1024
  const h = 96
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#d9d8d2'
  ctx.textAlign = 'center'
  ctx.font = '700 46px Arial, Helvetica, sans-serif'
  // Canvas right is -Z; the strip spans z = +26 .. -26 (52 mm).
  const at = (z) => ((26 - z) / 52) * w
  ctx.fillText('2S · 7.4 V', at(PORTS[0].z), 68)
  ctx.fillText('3S · 11.1 V', at(PORTS[1].z), 68)
  ctx.fillText('OUT', at(LEAD_Z), 68)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

// ---------------------------------------------------------------- lead

const vec = (p) => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM)

function offsetPath(path, offset) {
  return path.map((p, i) => {
    const a = path[Math.max(i - 1, 0)]
    const b = path[Math.min(i + 1, path.length - 1)]
    const tx = b[0] - a[0]
    const tz = b[2] - a[2]
    const len = Math.hypot(tx, tz) || 1
    return [p[0] + (-tz / len) * offset, p[1], p[2] + (tx / len) * offset]
  })
}

function wire(points, radius, material, name) {
  const spline = new THREE.CatmullRomCurve3(points.map(vec), false, 'centripetal')
  // Hold the spline up where it would dip through the floor between resting points.
  const curve = new (class extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      spline.getPoint(t, target)
      target.y = Math.max(target.y, radius * MM)
      return target
    }
  })()
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, radius * MM, 8, false), material)
  mesh.name = name
  return mesh
}

// ---------------------------------------------------------------- assembly

export function create() {
  const group = new THREE.Group()
  group.name = 'charger'

  // Extruded UVs are in millimetres: one grain tile every 8 mm.
  const shellMat = polymer({ color: 0x1b1c1f, roughness: 0.64, repeat: 0.125 })
  group.add(buildCase(shellMat))

  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.85 })
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0e0e0f, roughness: 0.82, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x2c2e33) })
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc9a653, metalness: 1, roughness: 0.38 })
  const nickel = new THREE.MeshPhysicalMaterial({ color: 0xb8bbbf, metalness: 1, roughness: 0.4 })

  // What the vent slots look into.
  const core = new THREE.Mesh(metres(box(LX - 8, 24, LZ - 8, 0, 19, 0)), dark)
  core.name = 'core'
  core.userData.shadow = false
  // (the core sits entirely inside the case; it only shows through the cuts)
  core.scale.set(1, 1, 1)
  group.add(core)

  // Feet.
  const feet = new THREE.InstancedMesh(metres(new THREE.CylinderGeometry(4, 3.6, FOOT + 0.3, 20).translate(0, (FOOT + 0.3) / 2, 0)), rubber, 4)
  feet.name = 'feet'
  const d = new THREE.Object3D()
  ;[[34, 20], [34, -20], [-34, 20], [-34, -20]].forEach(([x, z], i) => {
    d.position.set(x * MM, 0, z * MM)
    d.updateMatrix()
    feet.setMatrixAt(i, d.matrix)
  })
  group.add(feet)

  // Printed top label.
  const labelGeo = new THREE.PlaneGeometry(46, 36)
  labelGeo.rotateX(-Math.PI / 2)
  labelGeo.rotateY(Math.PI / 2)
  labelGeo.translate(9, TOP + 0.04, 0)
  const label = new THREE.Mesh(
    metres(labelGeo),
    new THREE.MeshPhysicalMaterial({ map: topLabel(), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  )
  label.name = 'label'
  label.userData.shadow = false
  group.add(label)

  // Legends over the front ports.
  const legendGeo = new THREE.PlaneGeometry(52, 4.9)
  legendGeo.rotateY(Math.PI / 2)
  legendGeo.translate(HX + 0.04, PORT_Y + 9.4, 0)
  const legend = new THREE.Mesh(
    metres(legendGeo),
    new THREE.MeshStandardMaterial({ map: frontLegend(), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  )
  legend.name = 'frontLegend'
  legend.userData.shadow = false
  group.add(legend)

  // LEDs.
  const leds = []
  const ledGeo = metres(new THREE.SphereGeometry(1.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1))
  LED_Z.forEach((z, i) => {
    const led = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: 0x0d1a10, roughness: 0.35 }))
    led.name = `led${i + 1}`
    led.position.set(LED_X * MM, (TOP - 1.3) * MM, z * MM)
    led.userData.shadow = false
    leds.push(led)
    group.add(led)
  })
  const setLed = (n, on, color = 0x1eff5a) => {
    const m = leds[n - 1]?.material
    if (!m) return
    m.emissive.set(on ? color : 0x0a140c)
    m.emissiveIntensity = on ? 2.4 : 0.25
    m.color.set(on ? 0x0a140c : 0x16301c)
  }
  group.userData.setLed = setLed
  setLed(1, true)
  setLed(2, false)
  setLed(3, false)

  // Header pins down in the balance sockets.
  const pinCount = PORTS.reduce((n, p) => n + p.pins, 0)
  const pins = new THREE.InstancedMesh(metres(new THREE.BoxGeometry(5, 0.64, 0.64)), brass, pinCount)
  pins.name = 'balancePins'
  let k = 0
  for (const p of PORTS) {
    for (let i = 0; i < p.pins; i++) {
      d.position.set((HX - 4.2) * MM, (PORT_Y - 0.6) * MM, (p.z + (i - (p.pins - 1) / 2) * 2.5) * MM)
      d.updateMatrix()
      pins.setMatrixAt(k++, d.matrix)
    }
  }
  group.add(pins)

  // Mains inlet pins.
  for (const dz of [-3.2, 3.2]) {
    const pin = new THREE.Mesh(metres(new THREE.CylinderGeometry(1.15, 1.15, 7, 12).rotateZ(Math.PI / 2).translate(-HX + 5, 12, 14 + dz)), nickel)
    pin.name = 'mainsPin'
    group.add(pin)
  }

  // Output lead: strain relief, twin lead, small two-pin plug.
  const relief = new THREE.LatheGeometry(
    [[0, 0], [3.6, 0], [3.6, 1.6], [3.1, 1.6], [3.1, 2.6], [3.4, 2.6], [3.4, 4], [2.9, 4], [2.9, 5], [3.1, 5], [3.1, 6.4], [2.5, 6.4], [2.4, 9.5], [0, 9.5]].map(
      ([r, y]) => new THREE.Vector2(r, y),
    ),
    20,
  )
  relief.rotateZ(-Math.PI / 2)
  relief.translate(HX - 0.5, PORT_Y, LEAD_Z)
  const boot = new THREE.Mesh(metres(relief), rubber)
  boot.name = 'strainRelief'
  group.add(boot)

  const lead = new THREE.Group()
  lead.name = 'lead'
  group.add(lead)
  const RW = 0.95
  // Plug frame: back face centre and mating direction, in the floor plane.
  const at = [108, -66]
  const dir = new THREE.Vector2(0.22, -0.975).normalize()
  const plug = new THREE.Group()
  plug.name = 'plug'
  plug.position.set(at[0] * MM, 0, at[1] * MM)
  plug.rotation.y = Math.atan2(-dir.y, dir.x)
  const world = (lx, ly, lz) => [at[0] + dir.x * lx - dir.y * lz, ly, at[1] + dir.y * lx + dir.x * lz]
  const red = new THREE.MeshPhysicalMaterial({ color: 0xa3131a, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 })
  const housing = new THREE.Mesh(new RoundedBoxGeometry(12 * MM, 5.2 * MM, 7 * MM, 3, 0.6 * MM), red)
  housing.position.set(6 * MM, 2.6 * MM, 0)
  const latch = new THREE.Mesh(new RoundedBoxGeometry(5 * MM, 0.9 * MM, 3 * MM, 2, 0.3 * MM), red)
  latch.position.set(7.5 * MM, 5.5 * MM, 0)
  plug.add(housing, latch)
  for (const lz of [-1.5, 1.5]) {
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.1 * MM, 2.6 * MM, 2 * MM), dark)
    socket.position.set(12.02 * MM, 2.6 * MM, lz * MM)
    socket.userData.shadow = false
    plug.add(socket)
  }
  lead.add(plug)

  const path = [
    [HX + 6, PORT_Y, LEAD_Z],
    [HX + 13, PORT_Y - 0.4, LEAD_Z],
    [HX + 22, 8, LEAD_Z - 1],
    [HX + 33, 3, LEAD_Z - 4],
    [HX + 44, RW, LEAD_Z - 11],
    [HX + 54, RW, LEAD_Z - 22],
    [HX + 60, RW, LEAD_Z - 35],
  ]
  const insulation = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.35 })
  ;[
    { name: 'leadRed', color: 0x9a0c12, side: 1 },
    { name: 'leadBlack', color: 0x131315, side: -1 },
  ].forEach((wdef) => {
    const pts = offsetPath(path, wdef.side * RW)
    pts.push(world(-5, 2.2, wdef.side * 1.5), world(-1.5, 2.6, wdef.side * 1.5), world(1.5, 2.6, wdef.side * 1.5))
    lead.add(wire(pts, RW, insulation(wdef.color), wdef.name))
  })

  return group
}
