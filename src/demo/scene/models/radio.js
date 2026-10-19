// Dummy radio: a handheld two-way radio shell with a rubber antenna. A prop box, no function.
//
// Origin: centre of the body's footprint, standing upright on y = 0. The face (speaker grille,
// display) looks toward +X; the belt clip is on the back, the push-to-talk bar on the +Z side.
// Parts are authored in a face-on frame (x = width, y = height, z = depth, face at +z) inside
// a child group that is turned to put the face on +X. Millimetres, scaled per geometry.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { polymer, knurl } from '../lib/materials.js'

const MM = 0.001
const W = 60
const H = 115
const D = 35
const HW = W / 2
const HD = D / 2
const ORANGE = 0xf06a12

const metres = (g) => g.scale(MM, MM, MM)
function part(geo, material, name) {
  const m = new THREE.Mesh(metres(geo), material)
  if (name) m.name = name
  return m
}
const rbox = (sx, sy, sz, r, x, y, z, seg = 3) => new RoundedBoxGeometry(sx, sy, sz, seg, r).translate(x, y, z)
const box = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z)
const plain = (g) => {
  const n = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k)
  return n
}

function lathe(profile, segments, x, y, z) {
  const pts = []
  profile.forEach((p, i) => {
    pts.push(new THREE.Vector2(p[0], p[1]))
    if (i > 0 && i < profile.length - 1 && !p[2]) pts.push(new THREE.Vector2(p[0], p[1]))
  })
  return new THREE.LatheGeometry(pts, segments).translate(x, y, z)
}

const SLOT_Y0 = 20
const SLOTS = 9
const SLOT_PITCH = 3.8
const DISPLAY = { w: 34, h: 18, y: 86 }
const PTT = { y: 78, h: 36, d: 9 }

function buildBody(material) {
  const s = new THREE.Shape()
  const r = 9
  s.moveTo(-HW + r, 0)
  s.lineTo(HW - r, 0)
  s.absarc(HW - r, r, r, -Math.PI / 2, 0, false)
  s.lineTo(HW, H - r)
  s.absarc(HW - r, H - r, r, 0, Math.PI / 2, false)
  s.lineTo(-HW + r, H)
  s.absarc(-HW + r, H - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-HW, r)
  s.absarc(-HW + r, r, r, Math.PI, Math.PI * 1.5, false)
  const bevel = 3
  const body = new THREE.ExtrudeGeometry(s, {
    depth: D - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
    curveSegments: 10,
  })
  body.translate(0, 0, -HD + bevel)

  const cuts = []
  // Speaker grille: real slots, shorter toward the top and bottom of the patch.
  for (let i = 0; i < SLOTS; i++) {
    const t = Math.abs(i - (SLOTS - 1) / 2) / ((SLOTS - 1) / 2)
    cuts.push(box(34 - 10 * t * t, 1.5, 5, 0, SLOT_Y0 + i * SLOT_PITCH, HD - 0.6))
  }
  // Display recess.
  cuts.push(box(DISPLAY.w, DISPLAY.h, 3, 0, DISPLAY.y, HD - 0.2))
  // Grip grooves down both sides: the ribbed lower body.
  for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) cuts.push(box(2.4, 1.6, 21, sx * HW, 13 + i * 4.6, 0))
  // Push-to-talk well on the left side as you face the radio (+Z in the world).
  cuts.push(box(3, PTT.h, PTT.d, -HW, PTT.y, 1))
  // Accessory socket well on the other side.
  cuts.push(box(3, 20, 9, HW, 84, 1))
  // Battery door seam and thumb catch on the back.
  cuts.push(box(W - 9, 0.7, 2, 0, 58, -HD))
  cuts.push(box(14, 5, 2.4, 0, 6.5, -HD))

  const ev = new Evaluator()
  ev.attributes = ['position', 'normal', 'uv']
  const A = new Brush(body, material)
  const B = new Brush(mergeGeometries(cuts.map(plain), false), new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.85 }))
  A.updateMatrixWorld()
  B.updateMatrixWorld()
  const res = ev.evaluate(A, B, SUBTRACTION)
  const mesh = new THREE.Mesh(metres(res.geometry), res.material)
  mesh.name = 'body'
  return mesh
}

function readout() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 272
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, c.width, c.height)
  const ink = '#ff9a3c'
  ctx.fillStyle = ink
  ctx.strokeStyle = ink
  ctx.font = '700 150px "Courier New", monospace'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('07', 200, 212)
  ctx.font = '700 58px Arial, Helvetica, sans-serif'
  ctx.fillText('CH', 60, 208)
  // Signal bars and a battery outline along the top.
  for (let i = 0; i < 5; i++) ctx.fillRect(60 + i * 20, 78 - i * 9, 12, 12 + i * 9)
  ctx.lineWidth = 6
  ctx.strokeRect(360, 40, 84, 40)
  ctx.fillRect(444, 50, 10, 20)
  ctx.fillRect(368, 48, 46, 24)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function faceMark() {
  const c = document.createElement('canvas')
  c.width = 768
  c.height = 96
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.fillStyle = '#d8d7d1'
  ctx.strokeStyle = '#d8d7d1'
  ctx.lineWidth = 6
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    ctx[k ? 'lineTo' : 'moveTo'](40 + Math.cos(a) * 26, 48 + Math.sin(a) * 26)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.fillRect(37, 34, 7, 28)
  ctx.font = '700 60px Arial, Helvetica, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('HEXLINE', 88, 51)
  ctx.font = '400 40px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#9b9da0'
  ctx.fillText('HX-R1 PROP', 760, 52)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

/** A whip that tapers along a gently leaning curve, with a rounded tip. */
function antennaGeometry(points, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  const tubular = 40
  const radial = 14
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false)
  const pos = geo.attributes.position
  const c = new THREE.Vector3()
  const v = new THREE.Vector3()
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular
    curve.getPointAt(t, c)
    // Straight taper, closing to a dome over the last few percent.
    const tip = t > 0.97 ? Math.sqrt(Math.max(1 - ((t - 0.97) / 0.03) ** 2 * 0.75, 0)) : 1
    const r = (r0 + (r1 - r0) * t) * tip
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c)
      pos.setXYZ(k, v.x, v.y, v.z)
    }
  }
  geo.computeVertexNormals()
  // Close the blunt end with a shallow button.
  const end = curve.getPointAt(1)
  const button = new THREE.SphereGeometry(r1 * 0.5, radial, 6).scale(1, 0.45, 1).translate(end.x, end.y, end.z)
  return mergeGeometries([geo, button], false)
}

export function create() {
  const group = new THREE.Group()
  group.name = 'radio'
  const g = new THREE.Group()
  g.name = 'radioShell'
  g.rotation.y = Math.PI / 2 // face (+z here) toward +X
  group.add(g)

  // Extruded UVs are in millimetres: one grain tile every 8 mm.
  const shell = polymer({ color: 0x1a1b1e, roughness: 0.64, repeat: 0.125 })
  const trim = polymer({ color: 0x121315, roughness: 0.7, repeat: 4 })
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0d0d0e, roughness: 0.85, sheen: 0.45, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x2b2d32) })
  const orange = new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9 })

  g.add(buildBody(shell))

  // Speaker cloth behind the slots, and the dark floor of the other wells.
  const cloth = part(box(36, SLOTS * SLOT_PITCH + 2, 0.4, 0, SLOT_Y0 + ((SLOTS - 1) * SLOT_PITCH) / 2, HD - 2.4), dark, 'speakerCloth')
  cloth.userData.shadow = false
  g.add(cloth)

  // Display: a dark window with a faint read-out.
  const screenTex = readout()
  const display = part(
    new THREE.PlaneGeometry(DISPLAY.w - 0.6, DISPLAY.h - 0.6).translate(0, DISPLAY.y, HD - 1.15),
    new THREE.MeshPhysicalMaterial({
      color: 0x050506,
      roughness: 0.45,
      clearcoat: 0.4,
      clearcoatRoughness: 0.45,
      emissive: 0xffffff,
      emissiveMap: screenTex,
      emissiveIntensity: 0.55,
    }),
    'display',
  )
  display.userData.shadow = false
  g.add(display)

  // Brand line under the display.
  const mark = part(
    new THREE.PlaneGeometry(40, 5).translate(0, DISPLAY.y - DISPLAY.h / 2 - 5.2, HD + 0.05),
    new THREE.MeshStandardMaterial({ map: faceMark(), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    'faceMark',
  )
  mark.userData.shadow = false
  g.add(mark)

  // Three rubber keys between the display and the grille.
  const keys = new THREE.Group()
  keys.name = 'keys'
  for (const x of [-13, 0, 13]) keys.add(part(rbox(9.5, 4.6, 2.4, 1.1, x, 62.5, HD + 0.2), rubber, 'key'))
  g.add(keys)

  // Push-to-talk bar: rubber, with the one orange stripe.
  const ptt = new THREE.Group()
  ptt.name = 'ptt'
  ptt.add(part(rbox(3.6, PTT.h - 1.2, PTT.d - 1.2, 1.2, -HW - 0.2, PTT.y, 1), rubber, 'pttBar'))
  for (let i = -3; i <= 3; i++) ptt.add(part(rbox(1.2, 1.3, PTT.d - 3.4, 0.4, -HW - 1.9, PTT.y + i * 3.6, 1), i === 0 ? orange : rubber, i === 0 ? 'pttStripe' : 'pttRib'))
  g.add(ptt)

  // Accessory socket cover on the other side.
  g.add(part(rbox(2.2, 18.8, 7.8, 0.9, HW - 0.3, 84, 1), rubber, 'socketCover'))

  // Top: channel and volume knobs, antenna.
  const kn = knurl().clone()
  kn.repeat.set(12, 1.2)
  kn.needsUpdate = true
  const knobMat = new THREE.MeshPhysicalMaterial({ color: 0x151618, roughness: 0.55, metalness: 0.3, normalMap: kn, normalScale: new THREE.Vector2(0.9, 0.9) })
  const knob = (name, x, z, r, h) => {
    const k = new THREE.Group()
    k.name = name
    k.add(part(lathe([[r + 0.9, 0], [r + 0.9, 1.3], [r - 0.2, 1.6]], 32, x, H, z), name === 'knobChannel' ? orange : trim, `${name}Collar`))
    k.add(part(lathe([[r, 1.6], [r, 1.6 + h - 0.8]], 32, x, H, z), knobMat, `${name}Grip`))
    k.add(part(lathe([[r, 1.6 + h - 0.8], [r - 0.8, 1.6 + h], [0, 1.6 + h]], 32, x, H, z), trim, `${name}Cap`))
    // Pointer line on the cap.
    k.add(part(box(0.9, 0.3, r - 1.2, x, H + 1.6 + h + 0.05, z + (r - 1.2) / 2), orange, `${name}Pointer`))
    return k
  }
  g.add(knob('knobChannel', -17, -1, 6.2, 9))
  g.add(knob('knobVolume', -0.5, -1, 5.2, 7))

  const ax = 18
  const az = -2
  g.add(
    part(
      lathe([[7.6, 0], [7.6, 2.2], [6.6, 3.2], [6.3, 9], [5.6, 10], [0, 10]], 28, ax, H, az),
      trim,
      'antennaBase',
    ),
  )
  const antenna = part(
    antennaGeometry(
      [
        [ax, H + 8, az],
        [ax, H + 40, az],
        [ax + 0.8, H + 85, az - 0.6],
        [ax + 2.6, H + 125, az - 1.8],
        [ax + 5.2, H + 160, az - 3.4],
      ],
      5.0,
      3.3,
    ),
    rubber,
    'antenna',
  )
  g.add(antenna)

  // Belt clip on the back: hinge block, sprung plate, turned-out lip.
  const clip = new THREE.Group()
  clip.name = 'beltClip'
  clip.add(part(rbox(26, 12, 7, 1.6, 0, 99, -HD - 2.6), trim, 'clipHinge'))
  clip.add(part(rbox(22, 60, 2.4, 1.1, 0, 72, -HD - 5.2), trim, 'clipPlate'))
  const lip = rbox(22, 9, 2.4, 1.1, 0, 0, 0)
  lip.rotateX(-0.5)
  lip.translate(0, 39.5, -HD - 7.1)
  clip.add(part(lip, trim, 'clipLip'))
  clip.add(part(rbox(18, 5, 3.4, 1, 0, 47, -HD - 2.2), trim, 'clipPad'))
  g.add(clip)

  return group
}
