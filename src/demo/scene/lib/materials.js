// Shared PBR materials. Everything here is procedural: the grain, the brushed finish and the
// knurl are drawn into canvases at load, so the scene ships no texture files.
//
// Asset modules may import these, or build their own next to their geometry. Do not edit this
// file from an asset module's task; add what you need in your own file instead.

import * as THREE from 'three'

const cache = new Map()

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A tiling height field turned into a normal map. `draw(ctx, size, rand)` paints grey height. */
export function normalMapFromHeight(key, size, draw, strength = 1) {
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  draw(ctx, size, rng(key.length * 7919 + size))
  const src = ctx.getImageData(0, 0, size, size)
  const out = ctx.createImageData(size, size)
  const h = (x, y) => src.data[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength
      const n = new THREE.Vector3(-dx, -dy, 1).normalize()
      const i = (y * size + x) * 4
      out.data[i] = (n.x * 0.5 + 0.5) * 255
      out.data[i + 1] = (n.y * 0.5 + 0.5) * 255
      out.data[i + 2] = (n.z * 0.5 + 0.5) * 255
      out.data[i + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** Fine stipple of injection-moulded, glass-filled polymer. */
export function polymerGrain() {
  return normalMapFromHeight('polymer-grain', 256, (ctx, size, rand) => {
    for (let i = 0; i < 26000; i++) {
      const v = 96 + rand() * 64
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 1.4, 1 + rand() * 1.4)
    }
  }, 2.2)
}

/** Straight brushed lines, for machined and anodised parts. */
export function brushed() {
  return normalMapFromHeight('brushed', 256, (ctx, size, rand) => {
    for (let i = 0; i < 900; i++) {
      const v = 110 + rand() * 40
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(0, rand() * size, size, 0.6 + rand())
    }
  }, 1.4)
}

/** Diamond knurl, for turrets and thumb screws. */
export function knurl() {
  return normalMapFromHeight('knurl', 128, (ctx, size) => {
    ctx.strokeStyle = '#202020'
    ctx.lineWidth = 3
    const step = size / 8
    for (let i = -size; i < size * 2; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, 0); ctx.stroke()
    }
  }, 3)
}

/** Matt black glass-filled polymer: the receiver, handguard, stock, grip. */
export function polymer({ color = 0x17181a, roughness = 0.62, repeat = 60 } = {}) {
  const n = polymerGrain().clone()
  n.repeat.set(repeat, repeat)
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0,
    normalMap: n,
    normalScale: new THREE.Vector2(0.35, 0.35),
    clearcoat: 0.12,
    clearcoatRoughness: 0.6,
    sheen: 0.25,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x3a3d42),
  })
}

/** Phosphated / blued steel: barrel, flash hider, pins, screws. */
export function blackSteel({ color = 0x1b1c1e, roughness = 0.42 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0.9 })
}

/** Black anodised aluminium: optic bodies, rails, suppressor. */
export function anodized({ color = 0x111214, roughness = 0.36, repeat = 12 } = {}) {
  const n = brushed().clone()
  n.repeat.set(repeat, repeat)
  n.needsUpdate = true
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.85,
    normalMap: n,
    normalScale: new THREE.Vector2(0.18, 0.18),
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  })
}

/** Clear or smoked plastic you can see through: magazine body, bottle. */
export function clearPlastic({ color = 0xffffff, tint = 0xffffff, thickness = 0.002, roughness = 0.08, opacity = 1 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0,
    transmission: 1,
    thickness,
    ior: 1.49,
    attenuationColor: new THREE.Color(tint),
    attenuationDistance: 0.02,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  })
}

/** Coated optical glass with a faint coloured reflection. */
export function lensGlass({ coating = 0xff5a1f } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c,
    roughness: 0.02,
    metalness: 0,
    transmission: 0.6,
    thickness: 0.004,
    ior: 1.52,
    iridescence: 1,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [200, 420],
    specularColor: new THREE.Color(coating),
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0,
  })
}

/** The LED orange used across the set. Values above 1 are what the bloom pass picks up. */
export const LED_ORANGE = new THREE.Color(1.0, 0.36, 0.08)

export function led({ intensity = 4 } = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: LED_ORANGE,
    emissiveIntensity: intensity,
    roughness: 0.4,
    toneMapped: true,
  })
}
