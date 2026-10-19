// Shared by magazine.js and bb-bottle.js: clear / smoked plastic without `transmission`, and
// the loft helpers both shells are built from.
//
// Why not MeshPhysicalMaterial.transmission: the transmission pass samples a copy of the
// OPAQUE scene, so a transmissive bottle seen through a transmissive magazine simply vanishes,
// the pass costs a second full scene render, and thick DoubleSide walls go black on a dark set.
//
// What a clear plastic wall really does to light is two things, and each maps onto a blend
// mode that is order-independent:
//   1. it ABSORBS what is behind it     -> a multiply pass (Beer-Lambert, longer path at
//                                          grazing angles, so edges and ribs go darker)
//   2. it REFLECTS what is in front     -> an additive pass (a black-bodied physical material:
//                                          only speculars, clearcoat and a faint haze add up)
// Multiply commutes with multiply and add with add, so front and back walls need no sorting,
// neither pass writes depth, and anything opaque inside (rounds, BBs) is drawn first and
// simply shows through.

import * as THREE from 'three'

export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Multiply pass. `tint` is the linear transmittance of one wall seen head-on. */
export function tintMaterial({ tint = [0.7, 0.64, 0.52], density = 1, edge = 3, side = THREE.DoubleSide } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: new THREE.Vector3(...tint) },
      uDensity: { value: density },
      uEdge: { value: edge },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalMatrix * normal;
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint;
      uniform float uDensity;
      uniform float uEdge;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float ndv = abs(dot(normalize(vN), normalize(vV)));
        // Path length through a thin wall grows as 1 / cos; capped so silhouettes stay see-through.
        float path = min(1.0 / max(ndv, 0.05), uEdge) * uDensity;
        gl_FragColor = vec4(pow(uTint, vec3(path)), 1.0);
        #include <colorspace_fragment>
      }`,
    side,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.ZeroFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  })
}

/** Additive pass: reflections, highlights and a little scattering haze. */
// `specular` scales the reflections (1 = physically right, about 4 % head-on). `cap` is a soft
// ceiling on what this pass may add, in linear light: a studio softbox or an LED strip mirrored
// in a flat wall is many times brighter than white, and unclamped it wipes out whatever is
// behind the wall. With the ceiling it stays a veil you can still see the contents through.
// Since three r163 `material.envMapIntensity` does nothing for `scene.environment`; do not
// reach for it here.
export function glossMaterial({ haze = 0x0b0a08, roughness = 0.1, ior = 1.5, clearcoat = 0.3, specular = 0.8, cap = 0.3, side = THREE.DoubleSide } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: haze,
    roughness,
    metalness: 0,
    ior,
    specularIntensity: specular,
    clearcoat,
    clearcoatRoughness: 0.04,
    side,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `outgoingLight = outgoingLight / (1.0 + outgoingLight / ${cap.toFixed(3)});
#include <opaque_fragment>`,
    )
  }
  m.customProgramCacheKey = () => `gloss-cap-${cap.toFixed(3)}`
  return m
}

/** Two meshes over one geometry: absorb, then reflect. Returns a Group. */
export function clearShell(geometry, { name = 'shell', tint, gloss, order = 0 } = {}) {
  const group = new THREE.Group()
  group.name = name
  const a = new THREE.Mesh(geometry, tint)
  a.name = `${name}:absorb`
  a.renderOrder = order + 1
  const b = new THREE.Mesh(geometry, gloss)
  b.name = `${name}:gloss`
  b.renderOrder = order + 2
  for (const m of [a, b]) {
    m.userData.shadow = false
    group.add(m)
  }
  return group
}

/** Closed rounded-rectangle loop in the XZ plane, from +X round toward +Z. Constant point count. */
export function roundedRing(hx, hz, r, nc = 6, nx = 8, nz = 4) {
  r = Math.max(Math.min(r, hx, hz), 1e-6)
  const ix = hx - r
  const iz = hz - r
  const centres = [[ix, iz], [-ix, iz], [-ix, -iz], [ix, -iz]]
  const pts = []
  for (let q = 0; q < 4; q++) {
    const [cx, cz] = centres[q]
    for (let k = 0; k <= nc; k++) {
      const a = (q + k / nc) * Math.PI * 0.5
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)])
    }
    const last = pts[pts.length - 1]
    const [ncx, ncz] = centres[(q + 1) % 4]
    const a2 = (q + 1) * Math.PI * 0.5
    const next = [ncx + r * Math.cos(a2), ncz + r * Math.sin(a2)]
    const n = q % 2 === 0 ? nx : nz
    for (let j = 1; j < n; j++) {
      pts.push([last[0] + ((next[0] - last[0]) * j) / n, last[1] + ((next[1] - last[1]) * j) / n])
    }
  }
  return pts
}

/**
 * Skin a stack of closed loops. `rings[k]` is an array of [x, y, z], all the same length.
 * Vertices wrap around, so there is no seam in the normals. With the loops running from +X
 * toward +Z, pass rings top-to-bottom, or set `flip` for bottom-to-top.
 */
export function loft(rings, { flip = false, capStart = false, capEnd = false } = {}) {
  const all = rings.slice()
  const centroid = (ring) => {
    const c = [0, 0, 0]
    for (const p of ring) for (let i = 0; i < 3; i++) c[i] += p[i] / ring.length
    return ring.map(() => c)
  }
  if (capStart) all.unshift(centroid(all[0]))
  if (capEnd) all.push(centroid(all[all.length - 1]))
  const n = all[0].length
  const pos = new Float32Array(all.length * n * 3)
  all.forEach((ring, k) => ring.forEach((p, i) => pos.set(p, (k * n + i) * 3)))
  const idx = []
  for (let k = 0; k < all.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      const a = k * n + i
      const b = k * n + ((i + 1) % n)
      const c = a + n
      const d = b + n
      if (flip) idx.push(a, c, b, b, c, d)
      else idx.push(a, b, c, b, d, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Open grid with UVs. `rows[k]` is an array of { p: [x, y, z], uv: [u, v] }. */
export function stripUV(rows, { flip = false } = {}) {
  const n = rows[0].length
  const pos = []
  const uv = []
  for (const row of rows) for (const v of row) { pos.push(...v.p); uv.push(...v.uv) }
  const idx = []
  for (let k = 0; k < rows.length - 1; k++) {
    for (let i = 0; i < n - 1; i++) {
      const a = k * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      if (flip) idx.push(a, c, b, b, c, d)
      else idx.push(a, b, c, b, d, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
