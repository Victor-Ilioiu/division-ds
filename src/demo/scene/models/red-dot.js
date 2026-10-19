// Tube red-dot sight (reference photos, private and git-ignored: spike/assets/rifle-scope.webp, rifle1..6.webp).
//
// Origin on the rail's top surface, centred on the rail. +X is the objective (amber lens),
// -X the ocular (flat cover with the small glass), +Y up. Windage knob and the two thumb nuts
// are on +Z, the rifle's right-hand side, as in the photos.
//
// Modelled in millimetres inside `red-dot:mm`, a child group scaled by 0.001.

import * as THREE from 'three'
import {
  blackMetal, steel, shadowBlack, reticleRed,
  lathe, extrudeX, extrudeZ, polygon, knurledDisc, slottedCap, socketScrew, lensGeometry, decal, FONT,
} from './_red-dot-shared.js'

const H = 30 // optical axis above the rail surface

export function create() {
  const group = new THREE.Group()
  group.name = 'red-dot'
  const mm = new THREE.Group()
  mm.name = 'red-dot:mm'
  mm.scale.setScalar(0.001)
  group.add(mm)

  const turned = blackMetal({ repeat: [16, 14] }) // lathed parts, UVs 0..1
  const milled = blackMetal({ repeat: [0.125, 0.125] }) // extruded parts, UVs in mm
  const knob = blackMetal({ repeat: [0.2, 0.2], roughness: 0.44, bump: 0.12 })
  const knobFace = blackMetal({ roughness: 0.44, bump: 0 }) // lathed faces of the knobs: no grain to stretch
  const bolt = steel()
  const dark = shadowBlack()

  const add = (parent, geometry, material, name) => {
    const m = new THREE.Mesh(geometry, material)
    if (name) m.name = name
    parent.add(m)
    return m
  }

  // ------------------------------------------------------------------ tube (hollow, on the axis)
  const tube = new THREE.Group()
  tube.name = 'tube'
  tube.position.y = H
  mm.add(tube)

  // Rear bell: a raised lip at the ocular end, then a long plain barrel.
  add(tube, lathe([
    [-52.5, 18.2], [-52.5, 19.5], [-52.3, 20.25, 1], [-51.75, 20.8, 1], [-50.9, 21, 1], [-46.9, 21, 1], [-46.1, 20.8, 1], [-45.5, 20.3], [-44.2, 20.3], [-43.9, 19.9], [-43.3, 19.9], [-43, 20.3],
    [-16.4, 20.3], [-15.6, 19.5],
    [-15.6, 13.5], [-21, 13.5], [-25, 17.2], [-49.9, 17.2], [-49.9, 18.2], [-52.5, 18.2],
  ], { segments: 60 }), turned, 'bellRear')

  // Front bell: barrel, a step up to the objective ring, two turned grooves, chamfered mouth.
  add(tube, lathe([
    [15.6, 13.5], [15.6, 19.5], [16.4, 20.3], [36.6, 20.3], [37.4, 21],
    [40.2, 21], [40.5, 20.5], [41.1, 20.5], [41.4, 21], [43.2, 21], [43.5, 20.5], [44.1, 20.5], [44.4, 21],
    [51.1, 21, 1], [51.9, 20.75, 1], [52.4, 20.2, 1], [52.5, 19.5],
    [52.5, 18.5], [51.6, 17.8], [44, 17.8], [44, 17], [25, 17], [21, 13.5], [15.6, 13.5],
  ], { segments: 60 }), turned, 'bellFront')

  // Rear cover: a flat plate seated inside the lip, with the small ocular aperture.
  add(tube, lathe([
    [-51.5, 9.3], [-51.5, 17.6], [-51, 18.1], [-49.9, 18.1], [-49.9, 8.5], [-50.8, 8.5], [-51.5, 9.3],
  ], { segments: 48 }), blackMetal({ repeat: [12, 6], roughness: 0.42, bump: 0.1 }), 'rearCover')

  // Objective retaining ring.
  add(tube, lathe([
    [45, 15.9], [45, 17.75], [46.6, 17.75], [46.6, 16.4], [46.1, 15.9], [45, 15.9],
  ], { segments: 48 }), turned, 'lensRing')

  // Lenses. Amber objective: half mirror (the dichroic coat), half transmission.
  const lensFront = add(tube, lensGeometry({ x: 44, r: 17.6, edge: 0.9, sagFront: 1.7 }), new THREE.MeshPhysicalMaterial({
    color: 0xffb030,
    emissive: 0x6a3a06,
    emissiveIntensity: 0.9,
    metalness: 0.78,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 2,
    ior: 1.52,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: 0.5,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [320, 520],
    envMapIntensity: 1.5,
  }), 'lensFront')
  lensFront.userData.shadow = false

  const lensRear = add(tube, lensGeometry({ x: -50.9, r: 8.6, edge: 0.7, sagRear: 0.35 }), new THREE.MeshPhysicalMaterial({
    color: 0xaeb6c0,
    metalness: 0,
    roughness: 0.03,
    transmission: 0.85,
    thickness: 1,
    ior: 1.52,
    clearcoat: 1,
    clearcoatRoughness: 0,
    iridescence: 0.6,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 380],
    specularColor: new THREE.Color(0x9fc4ff),
    specularIntensity: 1,
    envMapIntensity: 1.4,
  }), 'lensRear')
  lensRear.userData.shadow = false

  // The dot: only its rear face exists, so it is seen from the shooter's end and never from
  // the front. Opaque, so it survives the transmission pass of the ocular glass.
  const dotMat = reticleRed(4)
  dotMat.side = THREE.FrontSide
  const dot = add(tube, new THREE.CircleGeometry(0.75, 24).rotateY(-Math.PI / 2), dotMat, 'dot')
  dot.position.x = 43.6
  dot.userData.shadow = false

  // ------------------------------------------------------------------ mid housing (faceted)
  const oct = new THREE.Shape()
  const R = 18 / Math.cos(Math.PI / 8)
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    const p = [R * Math.cos(a), H + R * Math.sin(a)]
    if (i) oct.lineTo(p[0], p[1])
    else oct.moveTo(p[0], p[1])
  }
  oct.closePath()
  const bore = new THREE.Path()
  bore.absarc(0, H, 13.5, 0, Math.PI * 2, true)
  oct.holes.push(bore)
  add(mm, extrudeX(oct, -16, 16, { bevel: 0.8, curveSegments: 48 }), milled, 'body')

  // ------------------------------------------------------------------ brightness turret (top)
  const turret = new THREE.Group()
  turret.name = 'turret'
  mm.add(turret)
  add(turret, lathe([[44, 12], [49.2, 12], [49.6, 11.6], [49.6, 0]], { axis: 'y', segments: 56 }), turned, 'turretBase')
  add(turret, lathe([[49.4, 12.4], [49.8, 12.8], [52.4, 12.8], [52.4, 0]], { axis: 'y', segments: 56 }), turned, 'turretDial')
  const ring = add(turret, knurledDisc({ r: 13.6, z0: 52.4, z1: 59, teeth: 44, cut: 0.6, bevel: 0.35 }), knob, 'turretKnurl')
  ring.rotation.x = -Math.PI / 2
  const cap = slottedCap({ r: 11.9, z0: 58.8, z1: 62, slot: 2.2, depth: 1.3, material: knob, floor: knobFace })
  cap.name = 'turretCap'
  cap.rotation.x = -Math.PI / 2
  cap.rotation.z = Math.PI / 5
  turret.add(cap)

  // Brightness numerals around the dial skirt.
  const band = decal(2 * Math.PI * 12.8, 2.2, (ctx, w, h) => {
    ctx.font = `700 1.7px ${FONT}`
    for (let i = 0; i < 12; i++) ctx.fillText(String(i), ((i + 0.5) * w) / 12, h / 2 + 0.1)
  }, { geometry: new THREE.CylinderGeometry(12.84, 12.84, 2.2, 56, 1, true), ppm: 28 })
  band.name = 'turretNumbers'
  band.position.y = 51
  turret.add(band)

  // Index mark on the fixed base, facing the shooter.
  const index = add(turret, new THREE.BoxGeometry(0.5, 1.6, 0.7), new THREE.MeshStandardMaterial({ color: 0xd6d6d0, roughness: 0.7 }), 'turretIndex')
  index.position.set(-12.05, 48.6, 0)
  index.userData.shadow = false

  // Small lug beside the turret, toward the objective.
  add(mm, extrudeZ(polygon([[12.6, 47], [17.5, 47], [17.5, 50.4], [16.2, 51.6], [12.6, 51.6]]), -3.4, 3.4, { bevel: 0.5 }), milled, 'turretLug')

  // ------------------------------------------------------------------ windage knob (+Z side)
  const windage = new THREE.Group()
  windage.name = 'windage'
  windage.position.set(0, H, 0)
  mm.add(windage)
  add(windage, lathe([[15, 8.8], [20.2, 8.8], [20.7, 8.3], [20.7, 0]], { axis: 'z', segments: 40 }), turned, 'windageBase')
  add(windage, knurledDisc({ r: 7.7, z0: 20.7, z1: 25.6, teeth: 28, cut: 0.55, bevel: 0.3 }), knob, 'windageKnurl')
  const wcap = slottedCap({ r: 6.5, z0: 25.4, z1: 27, slot: 1.6, depth: 0.9, material: knob, floor: knobFace })
  wcap.rotation.z = Math.PI / 2.6
  windage.add(wcap)

  // ------------------------------------------------------------------ integral low mount
  const mount = new THREE.Group()
  mount.name = 'mount'
  mm.add(mount)
  // Saddle between the housing and the rail clamp.
  add(mount, extrudeZ(polygon([[-20, 7.4], [20, 7.4], [15.6, 12.2], [15.6, 15], [-15.6, 15], [-15.6, 12.2]]), -9.5, 9.5, { bevel: 0.6 }), milled, 'mountSaddle')
  // Fixed side: plate over the rail with the left jaw. Shapes are drawn in (z, y).
  add(mount, extrudeX(polygon([
    [-15.5, 6.2], [-13.7, 8], [12.6, 8], [12.6, 0], [-10.9, 0], [-10.9, -6], [-14.3, -6], [-15.5, -4.8],
  ]), -21, 21, { bevel: 0.6 }), milled, 'mountBase')
  // Moving side: the clamp bar the two cross-bolts pull in.
  add(mount, extrudeX(polygon([
    [13, 7], [15.3, 7], [16.5, 5.8], [16.5, -4.8], [15.3, -6], [10.9, -6], [10.9, -0.5], [13, -0.5],
  ]), -21, 21, { bevel: 0.6 }), milled, 'clampBar')

  for (const [i, x] of [-10, 10].entries()) {
    const b = new THREE.Group()
    b.name = `crossBolt${i + 1}`
    b.position.set(x, 1.5, 0)
    mount.add(b)
    // Shaft, lying in a rail slot.
    add(b, lathe([[-16, 2], [25.2, 2], [25.2, 0]], { axis: 'z', segments: 16 }), bolt)
    // Head on the fixed side.
    const head = socketScrew({ r: 3.7, h: 2.4, hex: 1.7, material: bolt, dark })
    head.rotation.y = Math.PI
    head.position.z = -15.4
    b.add(head)
    // Thumb nut on the clamp side: flange, coarse scalloped grip, boss, bolt end.
    add(b, lathe([[16.5, 5.2], [17.4, 5.2], [17.4, 0]], { axis: 'z', segments: 32 }), bolt)
    const nut = add(b, knurledDisc({ r: 6.5, z0: 17.2, z1: 23.6, teeth: 16, cut: 0.9, duty: 0.5, bevel: 0.5 }), knob, `thumbNut${i + 1}`)
    nut.rotation.z = i * 0.21
    add(b, lathe([[23.4, 3.6], [24.5, 3.6], [24.9, 3.2], [24.9, 0]], { axis: 'z', segments: 32 }), knobFace)
    const end = socketScrew({ r: 2.3, h: 1.1, hex: 1.25, material: bolt, dark })
    end.position.z = 24.8
    b.add(end)
  }

  return group
}
