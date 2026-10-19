// Holographic sight (reference photos, private and git-ignored: spike/assets/rifle-red-dot-scope.webp).
//
// Origin on the rail's top surface, centred on the rail. +X is the front (battery compartment),
// -X the rear (control buttons), +Y up. The big slotted cross-bolt and the lettering are on -Z,
// the rifle's left-hand side, as in the photo.
//
// Modelled in millimetres inside `holo-sight:mm`, a child group scaled by 0.001.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { polymer } from '../lib/materials.js'
import {
  blackMetal, steel, shadowBlack, reticleRed, toCreasedNormals,
  lathe, extrudeX, extrudeZ, polygon, roundRect, slottedCap, socketScrew, decal, FONT,
} from './_red-dot-shared.js'

const W = 25 // half width of the hood
const X_REAR = -47.5
const X_FRONT = 12 // hood front before the buttress shear
const KINK = 33 // height where the window frame ends and the buttress begins
const SLOPE = 0.55 // buttress: mm forward per mm down
const LEAN = 0.12 // window frame: mm rearward per mm up

/** Where the hood's front edge sits at height y. */
const frontAt = (y) => X_FRONT + (y < KINK ? (KINK - y) * SLOPE : -(y - KINK) * LEAN)

export function create() {
  const group = new THREE.Group()
  group.name = 'holo-sight'
  const mm = new THREE.Group()
  mm.name = 'holo-sight:mm'
  mm.scale.setScalar(0.001)
  group.add(mm)

  const milled = blackMetal({ repeat: [0.125, 0.125] })
  const boxed = blackMetal({ repeat: [5, 3], roughness: 0.56, bump: 0.16 })
  const cover = blackMetal({ repeat: [0.125, 0.125], roughness: 0.58, color: 0x1e1f22, bump: 0.3 })
  const rubber = polymer({ color: 0x151617, roughness: 0.8, repeat: 4 })
  const bolt = steel()
  const dark = shadowBlack()

  const add = (parent, geometry, material, name) => {
    const m = new THREE.Mesh(geometry, material)
    if (name) m.name = name
    parent.add(m)
    return m
  }

  // ------------------------------------------------------------------ hood
  // Front view, drawn in (z, y): an outer shell with two openings. The upper one is the sight
  // window, the lower one is the bay that holds the electronics and the battery box. The
  // extrusion is then sheared at the front so the side walls run down-forward as buttresses.
  const shell = new THREE.Shape()
  shell.moveTo(-W + 1.2, 1)
  shell.lineTo(W - 1.2, 1)
  shell.lineTo(W, 2.2)
  shell.lineTo(W, KINK)
  shell.lineTo(W, 53)
  shell.absarc(W - 7, 53, 7, 0, Math.PI / 2, false)
  shell.lineTo(-W + 7, 60)
  shell.absarc(-W + 7, 53, 7, Math.PI / 2, Math.PI, false)
  shell.lineTo(-W, KINK)
  shell.lineTo(-W, 2.2)
  shell.closePath()
  shell.holes.push(roundRect(-20.5, 34, 20.5, 56, 4, THREE.Path))
  shell.holes.push(roundRect(-21.5, 3.5, 21.5, 30.5, 1.2, THREE.Path))

  let hoodGeo = extrudeX(shell, X_REAR, X_FRONT, { bevel: 0.7, curveSegments: 10, crease: 0 })
  const pos = hoodGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    if (x > X_FRONT - 2) pos.setX(i, x - X_FRONT + frontAt(pos.getY(i)))
  }
  hoodGeo = toCreasedNormals(hoodGeo, THREE.MathUtils.degToRad(20))
  add(mm, hoodGeo, milled, 'hood')

  // Electronics housing filling the lower bay; its rear face is the control panel.
  const housing = add(mm, new RoundedBoxGeometry(52.3, 26.6, 42.8, 2, 0.6), boxed, 'housing')
  housing.position.set(-20.15, 17, 0)

  // ------------------------------------------------------------------ windows
  const bezelShape = () => {
    const s = roundRect(-20.6, 33.9, 20.6, 56.1, 4)
    s.holes.push(roundRect(-18.6, 36, 18.6, 54.1, 2.4, THREE.Path))
    return s
  }
  add(mm, extrudeX(bezelShape(), 2.5, 6.5, { bevel: 0.5, curveSegments: 8 }), milled, 'windowBezel')
  add(mm, extrudeX(bezelShape(), -46, -42, { bevel: 0.5, curveSegments: 8 }), milled, 'windowBezelRear')

  const glass = () => new THREE.MeshPhysicalMaterial({
    color: 0xdff2ea,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    thickness: 1.5,
    ior: 1.5,
    attenuationColor: new THREE.Color(0x9fe0c8),
    attenuationDistance: 6,
    clearcoat: 1,
    clearcoatRoughness: 0,
    iridescence: 0.7,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [240, 460],
    specularColor: new THREE.Color(0xb8ffe4),
    specularIntensity: 1,
    envMapIntensity: 1.4,
  })
  const windowFront = add(mm, new THREE.BoxGeometry(1.4, 19.6, 38.6), glass(), 'window')
  windowFront.position.set(4.5, 45.05, 0)
  windowFront.userData.shadow = false
  const windowRear = add(mm, new THREE.BoxGeometry(1.4, 19.6, 38.6), glass(), 'windowRear')
  windowRear.position.set(-44, 45.05, 0)
  windowRear.userData.shadow = false

  // Reticle: a ring, a centre dot and four ticks, carried just behind the front pane. Opaque emissive geometry, so it reads through the transmissive glass from both ends.
  const reticle = new THREE.Group()
  reticle.name = 'reticle'
  reticle.position.set(3.4, 45, 0)
  reticle.rotation.y = -Math.PI / 2
  mm.add(reticle)
  const red = reticleRed(2.2)
  add(reticle, new THREE.RingGeometry(5.7, 6.15, 72), red)
  add(reticle, new THREE.CircleGeometry(0.55, 20), red)
  for (let i = 0; i < 4; i++) {
    const t = add(reticle, new THREE.PlaneGeometry(0.45, 1.5), red)
    const a = (i * Math.PI) / 2
    t.position.set(Math.sin(a) * 6.9, Math.cos(a) * 6.9, 0)
    t.rotation.z = -a
  }
  reticle.traverse((o) => (o.userData.shadow = false))

  // ------------------------------------------------------------------ battery compartment
  // Side profile in (x, y), softly rounded all round, then the latch channel is cut across the
  // top and down the front face.
  const batteryProfile = roundRect(3, 3, 47.5, 27, [1, 8, 6.5, 1.5])
  const evaluator = new Evaluator()
  let battery = new Brush(extrudeZ(batteryProfile, -21.3, 21.3, { bevel: 2.2, bevelSegments: 3, curveSegments: 10 }))
  battery.updateMatrixWorld()
  for (const [sx, sy, cx, cy] of [[30, 6, 36, 28.6], [6, 30, 48.9, 19.6]]) {
    const cut = new Brush(new THREE.BoxGeometry(sx, sy, 3))
    cut.position.set(cx, cy, -9)
    cut.updateMatrixWorld()
    battery = evaluator.evaluate(battery, cut, SUBTRACTION)
    battery.updateMatrixWorld()
  }
  add(mm, battery.geometry, cover, 'battery')

  // Latch lever lying in the front channel.
  const latch = add(mm, new RoundedBoxGeometry(1.6, 12, 2.2, 2, 0.5), bolt, 'batteryLatch')
  latch.position.set(46.4, 14, -9)
  // Hinge lug at the foot of the compartment.
  const lug = add(mm, new RoundedBoxGeometry(6.5, 5, 2.4, 2, 0.6), boxed, 'batteryLug')
  lug.position.set(8, 5.2, -21.6)

  // ------------------------------------------------------------------ rail clamp (under the hood)
  const base = new THREE.Group()
  base.name = 'base'
  mm.add(base)
  add(base, extrudeX(polygon([
    [-12.6, 3], [21, 3], [21, 1], [17.5, -2.2], [17.5, -4.8], [16.3, -6], [10.9, -6], [10.9, 0], [-12.6, 0],
  ]), -44, 26, { bevel: 0.6 }), milled, 'mount')
  add(base, extrudeX(polygon([
    [-13, 2.6], [-13, -0.5], [-10.9, -0.5], [-10.9, -6], [-15.3, -6], [-16.5, -4.8], [-16.5, 2.6],
  ]), -40, 4, { bevel: 0.6 }), milled, 'clampBar')

  // ------------------------------------------------------------------ fasteners
  // Large slotted cross-bolt, low on the left wall.
  const crossBolt = new THREE.Group()
  crossBolt.name = 'crossBolt'
  crossBolt.position.set(-22, 8, 0)
  mm.add(crossBolt)
  const head = new THREE.Group()
  head.rotation.y = Math.PI // local +Z -> world -Z
  head.position.z = -W
  crossBolt.add(head)
  add(head, lathe([[0, 7.3], [0.6, 7.3], [0.6, 0]], { axis: 'z', segments: 40 }), bolt)
  const slotted = slottedCap({ r: 6.4, z0: 0.5, z1: 2.5, slot: 2, depth: 1.1, material: bolt })
  slotted.rotation.z = -0.5
  head.add(slotted)
  add(crossBolt, lathe([[-W + 1, 2.4], [W + 1.9, 2.4], [W + 1.9, 0]], { axis: 'z', segments: 16 }), bolt)
  const hexNut = new THREE.Shape()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    if (i) hexNut.lineTo(5 * Math.cos(a), 5 * Math.sin(a))
    else hexNut.moveTo(5, 0)
  }
  hexNut.closePath()
  const nutHole = new THREE.Path()
  nutHole.absarc(0, 0, 2.38, 0, Math.PI * 2, true)
  hexNut.holes.push(nutHole)
  add(crossBolt, extrudeZ(hexNut, W, W + 1.5, { bevel: 0.35, curveSegments: 20 }), bolt, 'crossBoltNut')

  // Small socket-head screws on both walls.
  const screws = [[-39, 13.5], [15.5, 7], [-39, 46]]
  for (const side of [-1, 1]) {
    for (const [i, [x, y]] of screws.entries()) {
      const s = socketScrew({ r: 2.2, h: 1.3, hex: 1.15, material: bolt, dark })
      s.name = `screw${side < 0 ? 'L' : 'R'}${i + 1}`
      s.position.set(x, y, side * (W - 0.7))
      if (side < 0) s.rotation.y = Math.PI
      s.rotation.z = i * 0.4
      mm.add(s)
    }
  }

  // ------------------------------------------------------------------ rear controls
  const panelX = -46.3
  for (const [i, z] of [-9, 9].entries()) {
    const b = new THREE.Group()
    b.name = i ? 'buttonUp' : 'buttonDown'
    b.position.set(panelX, 15, z)
    b.rotation.y = -Math.PI / 2 // local +Z -> world -X
    mm.add(b)
    add(b, lathe([[0, 5.6], [0.9, 5.6], [0.9, 4.7], [0.2, 4.7]], { axis: 'z', segments: 36 }), milled)
    add(b, lathe([[0, 4.4], [1.5, 4.4], [2.3, 3.6, 1], [2.5, 0]], { axis: 'z', segments: 36 }), rubber)
    const arrow = decal(5, 5, (ctx) => {
      ctx.beginPath()
      if (i) { ctx.moveTo(2.5, 1.2); ctx.lineTo(4, 3.6); ctx.lineTo(1, 3.6) } else { ctx.moveTo(2.5, 3.8); ctx.lineTo(4, 1.4); ctx.lineTo(1, 1.4) }
      ctx.closePath()
      ctx.fill()
    }, { ppm: 32, color: 0xb9b9b4 })
    arrow.position.z = 2.52
    b.add(arrow)
  }
  const panelText = decal(34, 3, (ctx, w, h) => {
    ctx.font = `700 1.9px ${FONT}`
    ctx.fillText('HX-P1   1x HOLO', w / 2, h / 2)
  })
  panelText.name = 'labelRear'
  panelText.rotation.y = -Math.PI / 2
  panelText.position.set(panelX - 0.03, 25, 0)
  mm.add(panelText)

  // ------------------------------------------------------------------ lettering (left wall)
  const sideText = decal(46, 3.6, (ctx, w, h) => {
    ctx.font = `700 2.5px ${FONT}`
    ctx.fillText('CLASS 1 OPTIC  /  MODEL HX-P1', w / 2, h / 2 + 0.1)
  })
  sideText.name = 'labelSide'
  sideText.rotation.y = Math.PI
  sideText.position.set(-19, 22.5, -W - 0.03)
  mm.add(sideText)

  // Invented mark on the battery cover: a reticle glyph over a model code.
  const mark = decal(15, 15, (ctx, w) => {
    const cx = w / 2
    ctx.lineWidth = 0.55
    ctx.beginPath(); ctx.arc(cx, 5, 2.9, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, 5, 0.6, 0, Math.PI * 2); ctx.fill()
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      ctx.beginPath(); ctx.moveTo(cx + dx * 2.2, 5 + dy * 2.2); ctx.lineTo(cx + dx * 4.3, 5 + dy * 4.3); ctx.stroke()
    }
    ctx.font = `700 2.9px ${FONT}`
    ctx.fillText('HX-P1', cx, 11.2)
    ctx.font = `700 1.5px ${FONT}`
    ctx.fillText('OPTIC', cx, 13.7)
  })
  mark.name = 'labelBattery'
  mark.rotation.y = Math.PI
  mark.position.set(30, 15.5, -21.33)
  mm.add(mark)

  return group
}
