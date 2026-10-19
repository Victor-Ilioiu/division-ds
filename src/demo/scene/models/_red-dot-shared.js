// Private helpers shared by red-dot.js and holo-sight.js.
//
// Both optics are modelled in MILLIMETRES inside a child group that is scaled by 0.001, so the
// numbers below read like a drawing. The group each module returns is still in metres.

import * as THREE from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { normalMapFromHeight } from '../lib/materials.js'

const rad = THREE.MathUtils.degToRad

// ---------------------------------------------------------------------------------- materials

/** Fine pitted height field: bead-blasted aluminium under black anodising. */
function blastNormal() {
  return normalMapFromHeight('optic-bead-blast', 256, (ctx, size, rand) => {
    for (let i = 0; i < 7000; i++) {
      const v = 88 + rand() * 80
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.beginPath()
      ctx.arc(rand() * size, rand() * size, 0.7 + rand() * 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }, 1.5)
}

/**
 * Satin black anodised aluminium. `repeat` is in texture tiles per UV unit: extruded parts carry
 * UVs in millimetres (so 0.125 = one tile per 8 mm), lathed parts carry 0..1 UVs.
 */
export function blackMetal({ repeat = [0.125, 0.125], color = 0x1c1d20, roughness = 0.5, metalness = 0.7, bump = 0.22 } = {}) {
  const n = blastNormal().clone()
  n.repeat.set(repeat[0], repeat[1])
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    normalMap: n,
    normalScale: new THREE.Vector2(bump, bump),
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
  })
}

/** Black-oxide steel for bolts, nuts and screws. */
export function steel({ color = 0x2c2d30, roughness = 0.34 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 1 })
}

/** The unlit inside of a socket or a slot. */
export function shadowBlack() {
  return new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9, metalness: 0 })
}

/** Emissive red for a dot or reticle. Opaque on purpose: it must show through transmissive glass. */
export function reticleRed(intensity = 3) {
  const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false })
  m.color.setRGB(intensity, intensity * 0.035, intensity * 0.02)
  return m
}

// ---------------------------------------------------------------------------------- geometry

/**
 * Lathe a profile of [axial, radius] points (mm). Corners are hard unless the point carries a
 * truthy third element. Walk the outside in the +axial direction, then come back along the
 * inside, so the normals face out of the material.
 */
export function lathe(profile, { axis = 'x', segments = 64 } = {}) {
  const pts = []
  profile.forEach((p, i) => {
    const v = new THREE.Vector2(Math.max(p[1], 0), p[0])
    pts.push(v)
    if (!p[2] && i > 0 && i < profile.length - 1) pts.push(v.clone())
  })
  const g = new THREE.LatheGeometry(pts, segments)
  if (axis === 'x') g.rotateZ(-Math.PI / 2)
  if (axis === 'z') g.rotateX(Math.PI / 2)
  return g
}

/** Extrude shape(s) drawn in XY along Z from z0 to z1, chamfer included in that span. */
export function extrudeZ(shapes, z0, z1, { bevel = 0.5, bevelSegments = 1, curveSegments = 10, crease = 20 } = {}) {
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: z1 - z0 - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments,
    curveSegments,
  })
  g.translate(0, 0, z0 + bevel)
  return crease ? toCreasedNormals(g, rad(crease)) : g
}

/** Extrude a shape drawn in (z, y) along X from x0 to x1. */
export function extrudeX(shapes, x0, x1, opts = {}) {
  const g = extrudeZ(shapes, 0, x1 - x0, { ...opts, crease: 0 })
  g.rotateY(-Math.PI / 2)
  g.translate(x1, 0, 0)
  const crease = opts.crease ?? 20
  return crease ? toCreasedNormals(g, rad(crease)) : g
}

export { toCreasedNormals }

export function polygon(points) {
  const s = new THREE.Shape()
  points.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])))
  s.closePath()
  return s
}

/** Rounded rectangle; r may be one number or [bottomLeft, bottomRight, topRight, topLeft]. */
export function roundRect(x0, y0, x1, y1, r = 1, Ctor = THREE.Shape) {
  const [bl, br, tr, tl] = Array.isArray(r) ? r : [r, r, r, r]
  const s = new Ctor()
  s.moveTo(x0 + bl, y0)
  s.lineTo(x1 - br, y0)
  if (br) s.absarc(x1 - br, y0 + br, br, -Math.PI / 2, 0, false)
  s.lineTo(x1, y1 - tr)
  if (tr) s.absarc(x1 - tr, y1 - tr, tr, 0, Math.PI / 2, false)
  s.lineTo(x0 + tl, y1)
  if (tl) s.absarc(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI, false)
  s.lineTo(x0, y0 + bl)
  if (bl) s.absarc(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5, false)
  return s
}

/** A coin-edge knurled disc along +Z: real grooves, not a normal map. */
export function knurledDisc({ r, z0, z1, teeth = 40, cut = 0.5, duty = 0.55, bevel = 0.3 }) {
  const s = new THREE.Shape()
  const da = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * da
    const stops = [[r, a], [r, a + da * duty], [r - cut, a + da * (duty + 0.12)], [r - cut, a + da * 0.88]]
    stops.forEach(([rr, ang], k) => {
      const x = rr * Math.cos(ang)
      const y = rr * Math.sin(ang)
      if (i === 0 && k === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    })
  }
  s.closePath()
  return extrudeZ(s, z0, z1, { bevel, crease: 0 })
}

/** A round cap along +Z with a coin slot cut across its face. Returns a Group. */
export function slottedCap({ r, z0, z1, slot = 2, depth = 1.2, material, floor }) {
  const g = new THREE.Group()
  const zs = z1 - depth
  g.add(new THREE.Mesh(lathe([[z0, r], [zs, r], [zs, 0]], { axis: 'z', segments: 48 }), floor ?? material))
  const a = Math.asin(slot / 2 / r)
  const d1 = new THREE.Shape()
  d1.absarc(0, 0, r, a, Math.PI - a, false)
  d1.closePath()
  const d2 = new THREE.Shape()
  d2.absarc(0, 0, r, Math.PI + a, Math.PI * 2 - a, false)
  d2.closePath()
  g.add(new THREE.Mesh(extrudeZ([d1, d2], zs, z1, { bevel: Math.min(0.35, depth * 0.4), curveSegments: 28 }), material))
  return g
}

/** Socket-head cap screw along +Z, head from z = 0 to z = h. Returns a Group. */
export function socketScrew({ r = 2.3, h = 1.4, hex = 1.2, material, dark }) {
  const g = new THREE.Group()
  const s = new THREE.Shape()
  s.absarc(0, 0, r, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const x = hex * Math.cos(a)
    const y = hex * Math.sin(a)
    if (i) hole.lineTo(x, y)
    else hole.moveTo(x, y)
  }
  hole.closePath()
  s.holes.push(hole)
  g.add(new THREE.Mesh(extrudeZ(s, 0, h, { bevel: Math.min(0.3, h * 0.25), curveSegments: 24 }), material))
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(hex * 1.05, 6), dark)
  bottom.position.z = h * 0.3
  g.add(bottom)
  return g
}

/**
 * A solid lens on the X axis. The rear face sits at `x`, bulging rearward by sagRear; the front
 * face sits at x + edge, bulging forward by sagFront.
 */
export function lensGeometry({ x, r, edge = 0.8, sagFront = 0, sagRear = 0, steps = 8, segments = 44 }) {
  const arc = (sag, rho) => {
    if (!sag) return 0
    const R = (r * r + sag * sag) / (2 * sag)
    return sag - (R - Math.sqrt(R * R - rho * rho))
  }
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const rho = (r * i) / steps
    pts.push([x - arc(sagRear, rho), rho, i > 0 && i < steps])
  }
  for (let i = steps; i >= 0; i--) {
    const rho = (r * i) / steps
    pts.push([x + edge + arc(sagFront, rho), rho, i > 0 && i < steps])
  }
  return lathe(pts, { axis: 'x', segments })
}

// ---------------------------------------------------------------------------------- lettering

/**
 * Painted lettering: a plane w × h mm facing +Z. `draw(ctx, w, h)` paints WHITE on black in mm
 * units; the canvas becomes the alpha map, so there is no dark fringe around the glyphs.
 */
export function decal(w, h, draw, { color = 0xd6d6d0, ppm = 24, geometry } = {}) {
  const c = document.createElement('canvas')
  c.width = Math.round(w * ppm)
  c.height = Math.round(h * ppm)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.scale(ppm, ppm)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 8
  const mat = new THREE.MeshStandardMaterial({
    color,
    alphaMap: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.75,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  })
  const mesh = new THREE.Mesh(geometry ?? new THREE.PlaneGeometry(w, h), mat)
  mesh.userData.shadow = false
  return mesh
}

export const FONT = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif'
