// Hexagonal stage with LED underglow. Origin at the centre of the footprint on y = 0.
// The hexagon has vertices on ±X and flat edges facing ±Z (toward the camera and the wall).
//
// From the floor up: a dark base slab, a recessed LED band, a thin bright metal ledge, the
// top plate with a metal rim, and an inset darker deck.

import * as THREE from 'three'
import { anodized, blackSteel } from '../lib/materials.js'

// Deeper than the shared LED_ORANGE: ACES pulls a bright orange toward yellow, and the
// reference's underglow is a red-orange.
const LED_ORANGE = new THREE.Color(1.0, 0.27, 0.055)
const LIGHT_ORANGE = new THREE.Color(1.0, 0.22, 0.04)

const DEG = Math.PI / 180

function hexShape(R) {
  const s = new THREE.Shape()
  for (let k = 0; k < 6; k++) {
    const x = R * Math.cos(k * 60 * DEG)
    const y = R * Math.sin(k * 60 * DEG)
    if (k === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

/** Bevelled hex slab (or ring, with `hole`) spanning y0..y1. `R` is the outer circumradius. */
function hexSlab(R, y0, y1, bevel = 0.003, hole = 0) {
  const shape = hexShape(R)
  if (hole > 0) {
    const h = new THREE.Path()
    for (let k = 5; k >= 0; k--) {
      const x = hole * Math.cos(k * 60 * DEG)
      const y = hole * Math.sin(k * 60 * DEG)
      if (k === 5) h.moveTo(x, y)
      else h.lineTo(x, y)
    }
    h.closePath()
    shape.holes.push(h)
  }
  const h = y1 - y0
  const b = Math.min(bevel, h * 0.45)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h - 2 * b,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 3,
  })
  g.translate(0, 0, b)
  // The shape lies in XY and extrudes along +Z; stand it up so the extrusion is +Y. The
  // mirror in Z this rotation introduces does not matter for a hexagon.
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return g
}

/** Flat hex ring in the XZ plane with a radial colour ramp, for the faked band bounce. */
function glowRing(rIn, rOut, y, up) {
  const pos = []
  const colr = []
  const idx = []
  for (let k = 0; k < 6; k++) {
    const c = Math.cos(k * 60 * DEG)
    const s = Math.sin(k * 60 * DEG)
    pos.push(rIn * c, y, rIn * s, rOut * c, y, rOut * s)
    colr.push(1, 1, 1, 0, 0, 0)
  }
  for (let k = 0; k < 6; k++) {
    const a = k * 2
    const b = ((k + 1) % 6) * 2
    if (up) idx.push(a, b, a + 1, b, b + 1, a + 1)
    else idx.push(a, a + 1, b, b, a + 1, b + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3))
  g.setIndex(idx)
  return g
}

/**
 * @param {object} [options]
 * @param {number} [options.radius=0.625]  circumradius of the base (the stage is 2x this across corners)
 * @param {number} [options.intensity=1]   LED band level
 * @param {boolean} [options.lights=true]  six RectAreaLights around the band; false = emissive only
 */
export function create(options = {}) {
  const { radius = 0.625, intensity = 1, lights = true } = options
  const k = radius / 0.625
  const group = new THREE.Group()
  group.name = 'platform'

  const R = {
    base: 0.625 * k,
    band: 0.548 * k,
    ledge: 0.604 * k,
    plate: 0.578 * k,
    deck: 0.535 * k,
  }
  const Y = { base: 0.042, band: 0.076, ledge: 0.083, plate: 0.132, deck: 0.1335, rim: 0.1352 }

  const dark = anodized({ color: 0x0b0c0e, roughness: 0.42, repeat: 6 })
  const plateMat = anodized({ color: 0x101114, roughness: 0.38, repeat: 6 })
  const metal = blackSteel({ color: 0x9aa1ab, roughness: 0.24 })
  const deckMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1c20,
    roughness: 0.46,
    metalness: 0.25,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
  })
  const insetMat = new THREE.MeshPhysicalMaterial({
    color: 0x24272c,
    roughness: 0.55,
    metalness: 0.2,
    clearcoat: 0.2,
    clearcoatRoughness: 0.45,
  })

  const add = (name, geometry, material) => {
    const m = new THREE.Mesh(geometry, material)
    m.name = name
    group.add(m)
    return m
  }

  add('base', hexSlab(R.base, 0, Y.base, 0.006), dark)
  add('ledge', hexSlab(R.ledge, Y.band, Y.ledge, 0.0025), metal)
  add('plate', hexSlab(R.plate, Y.ledge, Y.plate, 0.004), plateMat)
  // Top: a raised metal rim, a dark deck, a thin metal inlay line and the inner panel.
  add('rim', hexSlab(R.plate - 0.004, Y.plate - 0.002, Y.rim, 0.0012, R.plate - 0.013), metal)
  add('deck', hexSlab(R.plate - 0.012, Y.plate - 0.002, Y.deck, 0.0, 0), deckMat)
  add('inlay', hexSlab(R.deck, Y.deck - 0.001, Y.deck + 0.0012, 0.0005, R.deck - 0.006), metal)
  add('inset', hexSlab(R.deck - 0.006, Y.deck - 0.001, Y.deck + 0.0004, 0.0, 0), insetMat)

  // LED band: an open hex tube recessed under the ledge.
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: LED_ORANGE.clone(), emissiveIntensity: 3, roughness: 0.5 })
  const bandGeo = new THREE.CylinderGeometry(R.band, R.band, Y.band - Y.base, 6, 1, true, Math.PI / 2)
  bandGeo.translate(0, (Y.band + Y.base) / 2, 0)
  const band = add('led-band', bandGeo, bandMat)
  band.userData.shadow = false

  // The band's bounce onto the base's top and the ledge's underside. RectAreaLights cannot
  // light surfaces that sit in their own plane, so this is painted: an additive ring that
  // fades outward.
  const bounceMat = new THREE.MeshBasicMaterial({
    color: LED_ORANGE.clone(),
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
  })
  const bounceLow = add('band-bounce-low', glowRing(R.band, R.base - 0.008, Y.base + 0.0006, true), bounceMat)
  const bounceHigh = add('band-bounce-high', glowRing(R.band, R.ledge - 0.003, Y.band - 0.0006, false), bounceMat)
  bounceLow.userData.shadow = false
  bounceHigh.userData.shadow = false

  // Real light out of the band, one emitter per face, tipped toward the floor.
  const rects = []
  if (lights) {
    const inr = R.band * Math.cos(30 * DEG)
    const yMid = (Y.band + Y.base) / 2
    for (let i = 0; i < 6; i++) {
      const a = (30 + 60 * i) * DEG
      const nx = Math.cos(a)
      const nz = Math.sin(a)
      const l = new THREE.RectAreaLight(LIGHT_ORANGE, 1, R.band, Y.band - Y.base)
      l.name = `band-light-${i}`
      l.position.set(nx * (inr + 0.012), yMid, nz * (inr + 0.012))
      l.lookAt(l.position.x + nx, yMid - 0.62, l.position.z + nz)
      group.add(l)
      rects.push(l)
    }
  }

  const anchor = new THREE.Object3D()
  anchor.name = 'anchor:top'
  anchor.position.set(0, Y.deck + 0.0004, 0)
  group.add(anchor)

  const state = { boost: 1, level: intensity, glow: intensity }
  const BAND = 2.6 // emissive intensity at glow = 1
  const LIGHT = 28 // RectAreaLight intensity (nits) at glow = 1
  function update(t = 0) {
    const breath = 1 + 0.06 * Math.sin(t * 0.9) + 0.025 * Math.sin(t * 2.3 + 1.1)
    const glow = state.level * state.boost * breath
    state.glow = glow
    group.userData.glow = glow
    bandMat.emissiveIntensity = BAND * glow
    bounceMat.color.copy(LED_ORANGE).multiplyScalar(0.13 * glow)
    for (const l of rects) l.intensity = LIGHT * glow
  }
  update(0)

  group.userData.update = update
  /** Brighten the band for an "assemble" moment. 1 = normal. */
  group.userData.setBoost = (v) => {
    state.boost = v
  }
  group.userData.setIntensity = (v) => {
    state.level = v
  }
  group.userData.glow = state.glow
  group.userData.height = Y.deck + 0.0004
  group.userData.radius = R.base
  return group
}

export const viewer = {
  bloom: true,
  bloomParams: { strength: 0.22, radius: 0.4, threshold: 0.9 },
  background: 0x0a0b0d,
  studioLights: true,
  envIntensity: 0.35,
  ground: true,
  exposure: 0.9,
}
