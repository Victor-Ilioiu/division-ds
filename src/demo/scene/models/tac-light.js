// Compact rail light in a ring mount, 110 mm long. Rail-mount convention: origin on the
// rail's top surface, centred on the rail, lens toward +X, body axis 22 mm above the rail.
//
//   group.userData.setOn(true)   emitter and reflector go bright (emissive well above 1)
//   group.getObjectByName('beam') a THREE.SpotLight pointing +X, invisible until the composer
//                                 sets `beam.visible = true`; setOn drives its intensity.
//
// Dimensions are millimetres (see _suppressor-kit.js).

import * as THREE from 'three'
import { polymer, lensGlass } from '../lib/materials.js'
import { MM, steps, turn, turned, knurled, filletShape, arcPts, extrudeX, crossBolt, cylDecal, label, fitText } from './_suppressor-kit.js'

const AXIS_Y = 22

// Only matters with ?bloom=1: keep the glow on the head instead of fogging the frame.
export const viewer = { bloomParams: { strength: 0.45, radius: 0.35, threshold: 1 } }
const SEGS = 72
const WARM = new THREE.Color(1.0, 0.93, 0.8)

/** The crenellated strike bezel: six bevelled teeth standing on the front rim. */
function bezelTeeth() {
  const N = 6
  const half = 19 // half the angular width of one tooth, degrees
  const geos = []
  for (let i = 0; i < N; i++) {
    const mid = (i * 360) / N + 30
    const pts = [...arcPts(0, 0, 16, mid - half, mid + half, 10), ...arcPts(0, 0, 13.9, mid + half, mid - half, 10)]
    // round the four corners of the tooth, keep the arcs sharp
    pts[0][2] = pts[10][2] = pts[11][2] = pts[21][2] = 0.5
    const g = extrudeX(filletShape(pts, 0), 3.2, 0.45, 3)
    geos.push(g)
  }
  return geos
}

export function create({ on = false } = {}) {
  const group = new THREE.Group()
  group.name = 'tac-light'

  const alu = turned({ color: 0x17181b, roughness: 0.36 })
  const aluHead = turned({ color: 0x1a1b1f, roughness: 0.32 })
  const mountMat = turned({ color: 0x1c1d21, roughness: 0.42 })
  mountMat.normalMap.repeat.set(60, 60)
  const rubber = polymer({ color: 0x202124, roughness: 0.82, repeat: 30 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.9 })

  // Everything turned lives in `light`, whose X axis is the optical axis.
  const light = new THREE.Group()
  light.name = 'light'
  light.position.y = AXIS_Y * MM
  group.add(light)

  const add = (name, geometry, material, parent = light) => {
    const m = new THREE.Mesh(geometry, material)
    m.name = name
    parent.add(m)
    return m
  }
  const lathe = (pts) => turn(pts, { segs: SEGS })

  // --- tail: rubber button in a shrouded, knurled cap -----------------------------------------
  add(
    'tail-button',
    lathe([[-55, 0], [-54.9, 2.4, 1], [-54.5, 4.4, 1], [-53.7, 6, 1], [-52.6, 6.9, 1], [-51, 7.3]]),
    rubber,
  )
  add(
    'tail-cap',
    lathe([[-51.2, 7.5], [-52.4, 7.9], [-53, 8.5], [-53, 12.4], [-52.3, 13.1], [-50.2, 13.1], [-49.7, 13.6]]),
    alu,
  )
  add('tail-knurl', lathe([[-49.7, 13.6], [-39.3, 13.6]]), knurled({ circ: 2 * Math.PI * 13.6, tile: 8 }))

  // --- body tube ------------------------------------------------------------------------------
  add(
    'body',
    lathe([
      [-39.3, 13.6],
      [-38.7, 13.0],
      [-37, 13.0],
      [-36.6, 12.6],
      [-36.6, 12.1],
      [-35.2, 12.1],
      [-35.2, 12.5],
      [-34.8, 12.9],
      [-32, 12.9],
      [-31.6, 13.3],
    ]),
    alu,
  )
  add('body-knurl', lathe([[-31.6, 13.3], [-15.4, 13.3]]), knurled({ circ: 2 * Math.PI * 13.3, tile: 8 }))
  add(
    'body-front',
    lathe([
      [-15.4, 13.3],
      [-15, 12.9],
      // through the ring mount, then three cooling fins and the flare to the head
      ...steps(-15, [[13.4, 12.9], [15, 13.8], [16.6, 11.7], [18.2, 13.8], [19.8, 11.7], [21.4, 13.8], [23, 11.7]], 0.35),
      [23, 12.4],
      [23.6, 13],
      [25, 13],
      [33.4, 16],
    ]),
    alu,
  )

  // --- head: plain band for the marking, a groove, the bezel ring, then the inside lip ---------
  add(
    'head',
    lathe([
      ...steps(33.4, [[46.6, 16], [47.8, 15.2], [51.8, 16]], 0.4, { end: true }),
      [51.8, 14.4],
      [51.4, 14.0],
      [50.1, 14.0],
      [50.1, 13.1],
      [49.3, 13.1],
    ]),
    aluHead,
  )
  const teeth = bezelTeeth()
  for (const g of teeth) add('bezel-tooth', g, aluHead).position.x = 53.2 * MM

  // --- optics: reflector, emitter, lens -------------------------------------------------------
  const reflectorMat = new THREE.MeshPhysicalMaterial({
    color: 0xe9eaec,
    metalness: 1,
    roughness: 0.1,
    emissive: WARM,
    emissiveIntensity: 0,
  })
  const refl = []
  for (let i = 20; i >= 0; i--) {
    const t = i / 20
    refl.push([36.6 + 11.6 * t * t, 3.6 + 9.6 * t, 1])
  }
  add('reflector', lathe([[49.3, 13.4], [48.2, 13.4], ...refl]), reflectorMat)
  add(
    'emitter-board',
    lathe([[36.6, 3.6], [36.6, 0]]),
    new THREE.MeshStandardMaterial({ color: 0xc9ccc6, roughness: 0.55, metalness: 0.1 }),
  )
  const emitterMat = new THREE.MeshStandardMaterial({
    color: 0xe7cf52, // the phosphor's yellow when it is off
    roughness: 0.5,
    emissive: WARM,
    emissiveIntensity: 0.12,
  })
  const emitter = add('emitter', new THREE.BoxGeometry(0.7 * MM, 2.3 * MM, 2.3 * MM), emitterMat)
  emitter.position.x = 36.9 * MM
  emitter.userData.shadow = false

  const glass = lensGlass({ coating: 0x8f7bff })
  glass.color.set(0xffffff)
  glass.transmission = 0.97
  glass.thickness = 0.001
  glass.iridescenceThicknessRange = [120, 260]
  const lens = add('lens', lathe([[48.5, 0], [48.5, 13.6], [49.5, 13.6], [49.5, 0]]), glass)
  lens.userData.shadow = false

  // --- marking on the head --------------------------------------------------------------------
  const map = label(1024, 384, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(200, 203, 208, 0.92)'
    fitText(ctx, 'TL-600', w / 2, h * 0.34, w - 60, 210, '700 {px}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif')
    fitText(ctx, '600 lm  ·  IPX7', w / 2, h * 0.8, w - 60, 108)
  })
  for (const theta of [-58, 58]) {
    const d = cylDecal({ r: 16.05, x0: 34.6, x1: 46, theta, height: 4.3, map })
    d.name = theta < 0 ? 'marking-left' : 'marking-right'
    light.add(d)
  }

  // --- ring mount: rail clamp, neck, split ring, all one bevelled extrusion --------------------
  const RO = 15.9 // ring outside radius
  const lugH = 4.5 // half-width of the pinch lug on top of the ring
  const aLug = THREE.MathUtils.radToDeg(Math.acos(lugH / RO))
  const zNeck = 9.4
  const aNeck = THREE.MathUtils.radToDeg(Math.atan2(-Math.sqrt(RO * RO - zNeck * zNeck), zNeck))
  const mount = filletShape(
    [
      [-8.6, -6, 0.4],
      [-8.6, -5.2, 0.3],
      [-10.8, -3, 0.3],
      [-10.8, 0, 0.3],
      [11.4, 0, 0.3],
      [11.4, 6.4, 0.8],
      ...arcPts(0, AXIS_Y, RO, aNeck, aLug, 30),
      [lugH, AXIS_Y + 20.3, 0.9],
      [-lugH, AXIS_Y + 20.3, 0.9],
      ...arcPts(0, AXIS_Y, RO, 180 - aLug, 180 - aNeck, 30),
      [-17, 6.2, 1.4],
      [-17, -4.6, 1],
      [-15.6, -6, 0.6],
    ],
    1,
  )
  const hole = new THREE.Path()
  hole.absarc(0, AXIS_Y * MM, 12.8 * MM, 0, Math.PI * 2, true)
  mount.holes.push(hole)
  add('mount', extrudeX(mount, 24, 0.6, 20), mountMat, group)

  const jaw = filletShape(
    [
      [8.6, -6, 0.4],
      [8.6, -5.2, 0.3],
      [10.8, -3, 0.3],
      [10.8, -0.5, 0.3],
      [11.9, -0.5, 0.3],
      [11.9, 5.8, 0.6],
      [14.6, 5.8, 1.2],
      [17, 3.6, 1.2],
      [17, -4.6, 1],
      [15.6, -6, 0.6],
    ],
    1,
  )
  add('mount-jaw', extrudeX(jaw, 18, 0.5), mountMat, group)
  const bolt = crossBolt({ y: 2.9, zHead: -17, zNut: 17, shaftR: 1.9, nutR: 6.6, nutLen: 5, hex: 7 })
  bolt.name = 'mount-bolt'
  group.add(bolt)

  // the slit that lets the ring pinch, and its cap screw
  const slit = add('ring-slit', new THREE.BoxGeometry(24.3 * MM, 6.4 * MM, 1.1 * MM), dark, group)
  slit.position.y = (AXIS_Y + 17.3) * MM
  slit.userData.shadow = false
  const screwY = AXIS_Y + 18.1
  add(
    'ring-screw',
    turn(
      [[lugH, 2.5], [lugH + 2.2, 2.5], [lugH + 2.6, 2.1], [lugH + 2.6, 1.3], [lugH + 0.9, 1.2], [lugH + 0.9, 0]],
      { segs: 24, axis: 'z' },
    ),
    alu,
    group,
  ).position.y = screwY * MM
  add(
    'ring-screw-end',
    turn([[-lugH - 0.9, 0], [-lugH - 0.9, 1.3], [-lugH - 0.5, 1.6], [-lugH, 1.6]], { segs: 24, axis: 'z' }),
    alu,
    group,
  ).position.y = screwY * MM

  // --- light ----------------------------------------------------------------------------------
  const beam = new THREE.SpotLight(WARM, 0, 6, THREE.MathUtils.degToRad(17), 0.55, 1.6)
  beam.name = 'beam'
  beam.position.set(49 * MM, 0, 0)
  beam.target.position.set(1, 0, 0)
  beam.target.name = 'beam-target'
  beam.visible = false
  beam.castShadow = false
  light.add(beam, beam.target)

  const BEAM_INTENSITY = 60
  group.userData.on = false
  group.userData.setOn = (on) => {
    group.userData.on = !!on
    emitterMat.emissiveIntensity = on ? 9 : 0.12
    reflectorMat.emissiveIntensity = on ? 1.15 : 0
    beam.intensity = on ? BEAM_INTENSITY : 0
  }
  group.userData.setOn(false)

  if (on) group.userData.setOn(true)

  return group
}
