// Hexagon wall with flickering LED strips. Code only: one InstancedMesh of bevelled hex
// prisms, one InstancedMesh of emissive strips, no lights and no textures.
//
// Module space: wall plane at z = 0 facing +Z, bottom edge at y = 0, centred on x = 0.
//
// How the light works
// - Every LED path ("group") has one intensity, a pure function of time (so `?t=` freezes
//   it). `userData.update` evaluates ~100 groups on the CPU and writes two small instanced
//   attributes: one float per strip, and six floats per tile (the intensity of the strip on
//   each of the tile's six edges, 0 where there is none).
// - The tile shader turns those six numbers into the warm spill: for each lit edge it takes
//   the closest point on that edge segment and shades the fragment as if a small line light
//   sat there (Lambert against the real bevel normal, inverse-square-ish falloff). So the
//   spill follows the flicker exactly and costs no lights.
// - The same loop reads six neighbour height differences and draws the contact shadow a
//   taller neighbour throws from the key light, plus a little occlusion in the gaps.

import * as THREE from 'three'

const SQRT3 = Math.sqrt(3)

function mulberry(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (x) => {
  const s = Math.sin(x * 12.9898 + 4.1414) * 43758.5453
  return s - Math.floor(s)
}

const DEG = Math.PI / 180
const vertAngle = (k) => (30 + 60 * k) * DEG // pointy-top hexagon
const edgeAngle = (i) => 60 * (i + 1) * DEG // outward normal of edge i (between vertex i and i+1)

/** Hex prism, top face at z = 0, rounded bevel, sides running back to z = -depth. */
function tileGeometry(R, bevel, depth, segments = 3) {
  const pos = []
  const nor = []
  const idx = []
  const rTop = R - bevel
  for (let k = 0; k < 6; k++) {
    pos.push(rTop * Math.cos(vertAngle(k)), rTop * Math.sin(vertAngle(k)), 0)
    nor.push(0, 0, 1)
  }
  idx.push(0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5)
  const profile = []
  for (let j = 0; j <= segments; j++) {
    const phi = (j / segments) * Math.PI * 0.5
    profile.push({ r: rTop + bevel * Math.sin(phi), z: -bevel + bevel * Math.cos(phi), nr: Math.sin(phi), nz: Math.cos(phi) })
  }
  profile.push({ r: R, z: -depth, nr: 1, nz: 0 })
  for (let i = 0; i < 6; i++) {
    const mx = Math.cos(edgeAngle(i))
    const my = Math.sin(edgeAngle(i))
    const base = pos.length / 3
    for (const p of profile) {
      for (const e of [i, i + 1]) {
        pos.push(p.r * Math.cos(vertAngle(e)), p.r * Math.sin(vertAngle(e)), p.z)
        nor.push(mx * p.nr, my * p.nr, p.nz)
      }
    }
    for (let j = 0; j < profile.length - 1; j++) {
      const a = base + 2 * j
      const b = a + 1
      const c = a + 2
      const d = a + 3
      idx.push(a, c, d, a, d, b)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}

/** Intensity of one LED group at time t. Pure: no state, so a frozen clock is repeatable. */
function groupIntensity(g, t) {
  const breath = 1 + 0.055 * Math.sin(t * g.w + g.ph) + 0.025 * Math.sin(t * g.w * 2.7 + g.ph * 1.7)
  const steady = g.level * breath
  if (g.type === 0) return steady
  // Tubes that can misbehave are never perfectly still: a faint electrical shimmer.
  const shimmer = 1 + 0.035 * (hash(Math.floor(t * 11) * 0.731 + g.id * 4.4) - 0.5)

  const tt = t + g.off
  const k = Math.floor(tt / g.win)
  const local = tt - k * g.win
  if (hash(k * 17.13 + g.id * 3.71) > g.chance) return steady * shimmer
  const dur = g.minDur + hash(k * 5.41 + g.id * 9.17 + 1.3) * (g.maxDur - g.minDur)
  const start = hash(k * 2.77 + g.id * 6.31 + 7.9) * Math.max(g.win - dur - 1.2, 0.1)
  const u = local - start
  if (u < 0) return steady * shimmer

  if (g.type === 1) {
    // Failing tube: a short burst of irregular steps, mostly "on" with hard dips.
    if (u > dur) return steady * shimmer
    const r = hash(Math.floor(u * g.rate) * 1.618 + g.id * 78.233 + k * 3.3)
    const v = r < 0.3 ? 0.1 : r < 0.5 ? 0.42 : r < 0.9 ? 1.0 : 1.22
    return g.level * v
  }

  // Dropout and re-strike: a flutter on the way out, dark, two or three false starts, then
  // an overshoot that settles.
  if (u < 0.14) return g.level * (hash(Math.floor(u * 50) + g.id * 3.1 + k) > 0.5 ? 0.9 : 0.12)
  if (u < dur) return g.level * 0.025
  const v = u - dur
  if (v < 0.34) return g.level * (hash(Math.floor(v * 26) * 2.3 + g.id * 5.7 + k) > 0.55 ? 1.15 : 0.04)
  if (v < 1.2) return steady * (1 + 0.32 * Math.exp(-(v - 0.34) * 4.5))
  return steady
}

const TILE_VERT_PARS = /* glsl */ `
attribute vec3 aEdgeA;
attribute vec3 aEdgeB;
attribute vec3 aNbrA;
attribute vec3 aNbrB;
attribute vec4 aMisc;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vEdgeA;
varying vec3 vEdgeB;
varying vec3 vNbrA;
varying vec3 vNbrB;
varying vec4 vMisc;
varying vec2 vWall;
`

const TILE_VERT_MAIN = /* glsl */ `
vLocal = position;
vLocalN = normal;
vEdgeA = aEdgeA; vEdgeB = aEdgeB; vNbrA = aNbrA; vNbrB = aNbrB; vMisc = aMisc;
vWall = (instanceMatrix * vec4(position, 1.0)).xy;
`

const TILE_FRAG_PARS = /* glsl */ `
uniform float uRc;
uniform float uInr;
uniform vec3 uKeyDir;
uniform vec3 uLed;
uniform float uSpill;
uniform float uSpillLift;
uniform float uSpillRadius;
uniform float uMaster;
uniform vec3 uBounds;
uniform vec3 uGlowColor;
uniform float uFloorShade;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vEdgeA;
varying vec3 vEdgeB;
varying vec3 vNbrA;
varying vec3 vNbrB;
varying vec4 vMisc;
varying vec2 vWall;
float hexHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`

const TILE_FRAG_COLOR = /* glsl */ `
if (vWall.y < 0.0 || vWall.y > uBounds.y || abs(vWall.x) > uBounds.x) discard;
vec3 hexLed = vec3(0.0);
{
  vec2 hp = vLocal.xy;
  vec3 ln = normalize(vLocalN);
  float E[6] = float[6](vEdgeA.x, vEdgeA.y, vEdgeA.z, vEdgeB.x, vEdgeB.y, vEdgeB.z);
  float H[6] = float[6](vNbrA.x, vNbrA.y, vNbrA.z, vNbrB.x, vNbrB.y, vNbrB.z);
  float keyShadow = 1.0;
  float ao = 1.0;
  float spill = 0.0;
  for (int i = 0; i < 6; i++) {
    float a0 = radians(30.0 + 60.0 * float(i));
    float a1 = a0 + radians(60.0);
    vec2 va = uRc * vec2(cos(a0), sin(a0));
    vec2 vb = uRc * vec2(cos(a1), sin(a1));
    vec2 m = vec2(cos(a0 + radians(30.0)), sin(a0 + radians(30.0)));
    float s = uInr - dot(hp, m); // distance inward from the shared edge
    float dh = H[i];

    // Contact shadow from a taller neighbour on the key-light side.
    float len = max(dh, 0.0) * max(dot(m, uKeyDir.xy), 0.0) / max(uKeyDir.z, 0.25);
    if (len > 0.0006) keyShadow = min(keyShadow, smoothstep(len * 0.45, len * 1.1 + 0.003, s + vLocal.z * 0.5));
    ao *= 1.0 - 0.38 * clamp(dh / 0.03, 0.0, 1.0) * exp(-s / 0.022);

    // Warm spill from the LED strip on this edge.
    float I = E[i];
    if (I > 0.001) {
      vec2 ab = vb - va;
      float tt = clamp(dot(hp - va, ab) / dot(ab, ab), 0.0, 1.0);
      vec2 q = va + ab * tt;
      float zLed = min(0.0, dh) - 0.0035;
      vec3 L = vec3(q - hp, zLed + uSpillLift - vLocal.z);
      float d2 = dot(L, L);
      float ndl = max(dot(ln, L * inversesqrt(d2 + 1e-8)), 0.0);
      // A wide soft wash plus a tight hot line next to the strip.
      float wash = 1.0 / (1.0 + d2 / (uSpillRadius * uSpillRadius));
      float core = 1.0 / (1.0 + d2 / (uSpillRadius * uSpillRadius * 0.045));
      spill += I * (ndl * wash + 0.55 * core * (0.35 + 0.65 * ndl));
    }
  }

  // Fine grain and a slow gradient across the face, so no tile is a flat fill.
  float grain = hexHash(floor(vWall * 900.0) + vMisc.z * 91.0);
  diffuseColor.rgb *= 0.94 + 0.12 * grain;
  diffuseColor.rgb *= 1.0 + 0.16 * dot(hp / uRc, normalize(vec2(-0.75, 0.66)));

  vec3 albedo = diffuseColor.rgb;
  float gap = smoothstep(-0.034, -0.004, vLocal.z); // the trench between tiles goes to black
  float floorShade = mix(uFloorShade, 1.0, smoothstep(0.0, 0.55, vWall.y));
  float edgeShade = 1.0 - 0.55 * smoothstep(uBounds.x * 0.55, uBounds.x, abs(vWall.x));
  // The key is a soft source up and to the left: the wall is a little hotter there.
  edgeShade *= mix(0.82, 1.3, smoothstep(-0.6, 0.6, dot(vec2(-vWall.x / uBounds.y, vWall.y / uBounds.y - 0.3), vec2(0.6, 0.8))));
  diffuseColor.rgb *= mix(0.22, 1.0, keyShadow) * ao * mix(0.1, 1.0, gap) * floorShade * edgeShade;

  hexLed = albedo * uLed * spill * uSpill * uMaster * mix(0.5, 1.0, gap);
  // Whole-face amber tiles.
  float face = smoothstep(-0.006, -0.001, vLocal.z);
  float inset = smoothstep(0.0, 0.03, uInr - max(max(abs(dot(hp, vec2(1.0, 0.0))), abs(dot(hp, vec2(0.5, 0.8660254)))), abs(dot(hp, vec2(-0.5, 0.8660254)))));
  hexLed += uGlowColor * vMisc.y * vEdgeA.x * uMaster * face * (0.78 + 0.22 * inset) * (0.9 + 0.2 * grain);
}
`

const STRIP_VERT = /* glsl */ `
attribute float aI;
varying float vI;
varying vec2 vWall;
varying vec3 vP;
void main() {
  vI = aI;
  vP = position;
  vec4 wp = instanceMatrix * vec4(position, 1.0);
  vWall = wp.xy;
  gl_Position = projectionMatrix * modelViewMatrix * wp;
}
`

const STRIP_FRAG = /* glsl */ `
uniform vec3 uLed;
uniform float uGain;
uniform float uMaster;
uniform vec3 uBounds;
uniform float uHalfWidth;
varying float vI;
varying vec2 vWall;
varying vec3 vP;
void main() {
  if (vWall.y < 0.0 || vWall.y > uBounds.y || abs(vWall.x) > uBounds.x) discard;
  // A hotter, slightly whiter core down the middle of the diffuser; a dying tube goes red.
  float across = 1.0 - smoothstep(0.0, 1.0, abs(vP.y) / uHalfWidth);
  vec3 hot = mix(uLed, vec3(1.0, 0.5, 0.22), 0.3 * across);
  vec3 col = mix(vec3(1.0, 0.2, 0.03), hot, smoothstep(0.0, 0.5, vI));
  gl_FragColor = vec4(col * (0.03 + vI * uGain * (0.7 + 0.3 * across)) * max(uMaster, 0.0), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/**
 * @param {object} [options]
 * @param {number} [options.width=9]      wall width in metres
 * @param {number} [options.height=3.2]   wall height in metres
 * @param {number} [options.cell=0.26]    tile size across flats (also the column pitch)
 * @param {number} [options.seed=7]       layout, shades, LED paths and flicker phases
 * @param {number} [options.gap=0.007]    dark gap between tiles
 * @param {number} [options.density=0.17] LED paths per tile
 * @param {number} [options.relief=0.022] how far tiles are pushed in or out (±)
 * @param {boolean} [options.keyLight=true] add the wall's own cool key light (the set passes false)
 */
export function create(options = {}) {
  const {
    width = 9,
    height = 3.2,
    cell = 0.26,
    seed = 7,
    gap = 0.007,
    density = 0.14,
    relief = 0.022,
    keyLight = true,
    brightness = 1, // multiplies every tile colour; below 1 darkens the whole wall
    variation = 1, // 0 = every tile the same shade, 1 = the full charcoal-to-steel spread
    mute = [], // [[x, y], ...] in wall space: the tile nearest each point loses its LEDs and goes dark
  } = options
  const rand = mulberry(seed * 2654435761)
  const group = new THREE.Group()
  group.name = 'hexwall'

  const Rc = cell / SQRT3 // circumradius of the cell
  const inr = cell / 2
  const rowH = 1.5 * Rc
  const bevel = 0.0055
  const Rt = Rc - gap / SQRT3
  const faceZ = 0.03

  // ---- layout -------------------------------------------------------------------------
  const cols = Math.ceil(width / cell) + 2
  const rows = Math.ceil(height / rowH) + 2
  const y0 = -0.36 * Rc // the bottom row is cut by the floor, like the reference
  const tiles = []
  const tileAt = new Map()
  const tkey = (x, y) => Math.round(x * 2000) + ':' + Math.round(y * 2000)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -width / 2 + (c - 0.5 + (r % 2 ? 0.5 : 0)) * cell
      const y = y0 + r * rowH
      if (x < -width / 2 - inr || x > width / 2 + inr || y > height + Rc) continue
      const dz = (rand() - rand()) * relief
      tiles.push({ x, y, z: faceZ + dz, id: tiles.length })
      tileAt.set(tkey(x, y), tiles.length - 1)
    }
  }
  const neighbour = (t, i) => tileAt.get(tkey(t.x + cell * Math.cos(edgeAngle(i)), t.y + cell * Math.sin(edgeAngle(i))))

  // Edge graph: every shared edge once, with the (tile, edge index) pairs that touch it.
  const edges = new Map()
  const vertexEdges = new Map()
  const vkey = (x, y) => Math.round(x * 1000) + ':' + Math.round(y * 1000)
  tiles.forEach((t, ti) => {
    for (let i = 0; i < 6; i++) {
      const ax = t.x + Rc * Math.cos(vertAngle(i))
      const ay = t.y + Rc * Math.sin(vertAngle(i))
      const bx = t.x + Rc * Math.cos(vertAngle(i + 1))
      const by = t.y + Rc * Math.sin(vertAngle(i + 1))
      const key = vkey((ax + bx) / 2, (ay + by) / 2)
      let e = edges.get(key)
      if (!e) {
        e = { key, ax, ay, bx, by, tiles: [], group: -1 }
        edges.set(key, e)
        for (const vk of [vkey(ax, ay), vkey(bx, by)]) {
          if (!vertexEdges.has(vk)) vertexEdges.set(vk, [])
          vertexEdges.get(vk).push(e)
        }
      }
      e.tiles.push([ti, i])
    }
  })
  const edgeOf = (t, i) => {
    const ax = t.x + Rc * Math.cos(vertAngle(i))
    const ay = t.y + Rc * Math.sin(vertAngle(i))
    const bx = t.x + Rc * Math.cos(vertAngle(i + 1))
    const by = t.y + Rc * Math.sin(vertAngle(i + 1))
    return edges.get(vkey((ax + bx) / 2, (ay + by) / 2))
  }

  // ---- LED paths ----------------------------------------------------------------------
  const groups = []
  const chosen = new Set()
  const order = tiles.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const targetGroups = Math.round(tiles.length * density)
  const glowEvery = 5 // roughly one full outline in five also glows as a whole face
  let outlines = 0
  for (const ti of order) {
    if (groups.length >= targetGroups) break
    const t = tiles[ti]
    if (t.y < -0.02 || t.y > height || Math.abs(t.x) > width / 2) continue
    let touching = 0
    let free = true
    for (let i = 0; i < 6; i++) {
      if (edgeOf(t, i).group !== -1) free = false
      const n = neighbour(t, i)
      if (n !== undefined && chosen.has(n)) touching++
    }
    if (!free) continue
    if (touching > 0 && rand() > 0.3) continue
    if (touching > 1) continue

    const gid = groups.length
    const list = []
    const roll = rand()
    let full = roll < 0.3
    let len = full ? 6 : roll < 0.55 ? 2 : roll < 0.85 ? 3 : 4
    const start = Math.floor(rand() * 6)
    for (let k = 0; k < len; k++) list.push(edgeOf(t, (start + k) % 6))
    // A tail: the path leaves the tile at one end and runs along the neighbours' shared edge.
    if (rand() < (full ? 0.2 : 0.4)) {
      const vi = (start + len) % 6
      let vx = t.x + Rc * Math.cos(vertAngle(vi))
      let vy = t.y + Rc * Math.sin(vertAngle(vi))
      let prev = list[list.length - 1]
      const steps = rand() < 0.3 ? 2 : 1
      for (let sidx = 0; sidx < steps; sidx++) {
        const options2 = (vertexEdges.get(vkey(vx, vy)) ?? []).filter((e) => e.group === -1 && !list.includes(e))
        // Prefer the edge that leaves the tile, not the next one around it.
        const away = options2.filter((e) => !e.tiles.some(([tt]) => tt === ti))
        const pick = (away.length ? away : sidx > 0 ? options2 : [])[0]
        if (!pick) break
        list.push(pick)
        const atA = Math.abs(pick.ax - vx) < 1e-4 && Math.abs(pick.ay - vy) < 1e-4
        vx = atA ? pick.bx : pick.ax
        vy = atA ? pick.by : pick.ay
        prev = pick
      }
      void prev
    }
    for (const e of list) e.group = gid
    chosen.add(ti)

    const kind = rand()
    const g = {
      id: gid,
      edges: list,
      tile: ti,
      full,
      glow: false,
      type: kind < 0.58 ? 0 : kind < 0.87 ? 1 : 2,
      level: 0.78 + rand() * 0.22,
      w: 0.35 + rand() * 0.6,
      ph: rand() * 6.283,
      off: rand() * 40,
      win: 0,
      chance: 0,
      minDur: 0,
      maxDur: 0,
      rate: 14 + rand() * 12,
    }
    if (g.type === 1) Object.assign(g, { win: 4 + rand() * 6, chance: 0.7, minDur: 0.3, maxDur: 1.2 })
    if (g.type === 2) Object.assign(g, { win: 9 + rand() * 10, chance: 0.7, minDur: 0.8, maxDur: 2.8 })
    if (full) {
      if (outlines % glowEvery === 2) {
        g.glow = true
        g.type = 0 // the amber faces hold steady; a whole tile strobing would be the disco
      }
      outlines++
    }
    groups.push(g)
  }

  // Muted tiles: drop the LED path that belongs to the tile (outline, amber face, spill) and
  // remember the tile so it is painted darker than its neighbours.
  const mutedTiles = new Set()
  for (const [mx, my] of mute) {
    let best = -1
    let bestD = Infinity
    tiles.forEach((t, i) => {
      const d = (t.x - mx) ** 2 + (t.y - my) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    if (best < 0) continue
    mutedTiles.add(best)
    for (const g of groups) {
      if (g.tile !== best) continue
      for (const e of g.edges) e.group = -1
      g.edges = []
      g.glow = false
    }
  }

  // ---- tiles --------------------------------------------------------------------------
  const tileGeo = tileGeometry(Rt, bevel, 0.09)
  const n = tiles.length
  const edgeA = new Float32Array(n * 3)
  const edgeB = new Float32Array(n * 3)
  const nbrA = new Float32Array(n * 3)
  const nbrB = new Float32Array(n * 3)
  const misc = new Float32Array(n * 4)
  const uniforms = {
    uRc: { value: Rc },
    uInr: { value: inr },
    uKeyDir: { value: new THREE.Vector3(-0.5, 0.52, 0.69).normalize() },
    uLed: { value: new THREE.Color(1.0, 0.24, 0.045) },
    uSpill: { value: 1.5 },
    uSpillLift: { value: 0.016 },
    uSpillRadius: { value: 0.06 },
    uMaster: { value: 1 },
    uBounds: { value: new THREE.Vector3(width / 2, height, 0) },
    uGlowColor: { value: new THREE.Color(0.34, 0.125, 0.018) },
    uFloorShade: { value: 0.55 },
  }
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.0 })
  tileMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + TILE_VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + TILE_VERT_MAIN)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TILE_FRAG_PARS)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + TILE_FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * vMisc.x, 0.2, 1.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += hexLed;')
      // An area light almost edge-on to a tile can return inf/NaN. One such pixel becomes a
      // white flare once bloom or the floor's blur gets hold of it, so drop it here.
      .replace('#include <opaque_fragment>', 'if (!(dot(outgoingLight, vec3(1.0)) < 1.0e3)) outgoingLight = vec3(0.0);\noutgoingLight = min(outgoingLight, vec3(3.0));\n#include <opaque_fragment>')
  }
  tileMat.customProgramCacheKey = () => 'hexwall-tile-v3'

  const tileMesh = new THREE.InstancedMesh(tileGeo, tileMat, n)
  tileMesh.name = 'tiles'
  tileMesh.userData.shadow = false
  const m4 = new THREE.Matrix4()
  const quat = new THREE.Quaternion()
  const euler = new THREE.Euler()
  const one = new THREE.Vector3(1, 1, 1)
  const p3 = new THREE.Vector3()
  const col = new THREE.Color()
  const charcoal = new THREE.Color().setRGB(0.016, 0.017, 0.02)
  const slate = new THREE.Color().setRGB(0.05, 0.06, 0.071)
  const steel = new THREE.Color().setRGB(0.085, 0.108, 0.128)
  tiles.forEach((t, i) => {
    euler.set((rand() - 0.5) * 0.05, (rand() - 0.5) * 0.05, 0)
    quat.setFromEuler(euler)
    m4.compose(p3.set(t.x, t.y, t.z), quat, one)
    tileMesh.setMatrixAt(i, m4)
    const shade = rand()
    col.copy(charcoal).lerp(slate, Math.pow(shade, 1.4) * variation)
    if (rand() < 0.14) col.lerp(steel, (0.35 + rand() * 0.55) * variation)
    col.multiplyScalar((1 + (rand() - 0.5) * 0.3 * variation) * brightness)
    if (mutedTiles.has(i)) col.multiplyScalar(0.4)
    tileMesh.setColorAt(i, col)
    for (let e = 0; e < 6; e++) {
      const ni = neighbour(t, e)
      const dh = ni === undefined ? 0 : tiles[ni].z - t.z
      ;(e < 3 ? nbrA : nbrB)[i * 3 + (e % 3)] = dh
    }
    misc[i * 4] = 0.8 + rand() * 0.45 // roughness multiplier
    misc[i * 4 + 1] = 0 // amber face
    misc[i * 4 + 2] = rand() // grain seed
    misc[i * 4 + 3] = 0
  })
  for (const g of groups) if (g.glow) misc[g.tile * 4 + 1] = 1
  const attrEdgeA = new THREE.InstancedBufferAttribute(edgeA, 3).setUsage(THREE.DynamicDrawUsage)
  const attrEdgeB = new THREE.InstancedBufferAttribute(edgeB, 3).setUsage(THREE.DynamicDrawUsage)
  tileGeo.setAttribute('aEdgeA', attrEdgeA)
  tileGeo.setAttribute('aEdgeB', attrEdgeB)
  tileGeo.setAttribute('aNbrA', new THREE.InstancedBufferAttribute(nbrA, 3))
  tileGeo.setAttribute('aNbrB', new THREE.InstancedBufferAttribute(nbrB, 3))
  tileGeo.setAttribute('aMisc', new THREE.InstancedBufferAttribute(misc, 4))
  tileMesh.instanceMatrix.needsUpdate = true
  tileMesh.instanceColor.needsUpdate = true
  tileMesh.computeBoundingBox()
  tileMesh.computeBoundingSphere()
  group.add(tileMesh)

  // Back plate: closes the gaps so nothing behind the wall shows through.
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 0.9 }),
  )
  back.name = 'backplate'
  back.position.set(0, height / 2, -0.012)
  back.userData.shadow = false
  group.add(back)

  // ---- strips -------------------------------------------------------------------------
  const stripWidth = Math.max(gap - 0.0015, 0.004)
  const stripList = []
  for (const g of groups) for (const e of g.edges) stripList.push({ e, g })
  const stripGeo = new THREE.BoxGeometry(Rc + stripWidth * 0.6, stripWidth, 0.012)
  const stripI = new Float32Array(stripList.length)
  const attrStripI = new THREE.InstancedBufferAttribute(stripI, 1).setUsage(THREE.DynamicDrawUsage)
  stripGeo.setAttribute('aI', attrStripI)
  const stripUniforms = {
    uLed: { value: new THREE.Color(1.0, 0.27, 0.055) },
    uGain: { value: 2.1 },
    uMaster: uniforms.uMaster,
    uBounds: uniforms.uBounds,
    uHalfWidth: { value: stripWidth / 2 },
  }
  const stripMat = new THREE.ShaderMaterial({ uniforms: stripUniforms, vertexShader: STRIP_VERT, fragmentShader: STRIP_FRAG })
  const stripMesh = new THREE.InstancedMesh(stripGeo, stripMat, stripList.length)
  stripMesh.name = 'led-strips'
  stripMesh.userData.shadow = false
  const zAxis = new THREE.Vector3(0, 0, 1)
  // (tile attribute slot, group) pairs to refresh every frame.
  const links = []
  stripList.forEach(({ e, g }, i) => {
    let z = Infinity
    for (const [ti, ei] of e.tiles) {
      z = Math.min(z, tiles[ti].z)
      links.push(ti * 3 + (ei % 3), ei < 3 ? 0 : 1, g.id)
    }
    quat.setFromAxisAngle(zAxis, Math.atan2(e.by - e.ay, e.bx - e.ax))
    m4.compose(p3.set((e.ax + e.bx) / 2, (e.ay + e.by) / 2, z - 0.0035 - 0.006), quat, one)
    stripMesh.setMatrixAt(i, m4)
  })
  stripMesh.instanceMatrix.needsUpdate = true
  stripMesh.computeBoundingBox()
  stripMesh.computeBoundingSphere()
  group.add(stripMesh)

  // ---- optional key light -------------------------------------------------------------
  if (keyLight) {
    const key = new THREE.DirectionalLight(0xc6d6f5, 2.5)
    key.name = 'wall-key'
    key.position.set(-4.2, height / 2 + 4.4, 5.8)
    key.target.position.set(0, height / 2, 0)
    group.add(key, key.target)
    uniforms.uKeyDir.value.copy(key.position).sub(key.target.position).normalize()
  }

  // ---- animation ----------------------------------------------------------------------
  const level = new Float32Array(groups.length)
  function update(t) {
    for (let i = 0; i < groups.length; i++) level[i] = groupIntensity(groups[i], t)
    for (let i = 0; i < stripList.length; i++) stripI[i] = level[stripList[i].g.id]
    for (let i = 0; i < links.length; i += 3) (links[i + 1] ? edgeB : edgeA)[links[i]] = level[links[i + 2]]
    attrStripI.needsUpdate = true
    attrEdgeA.needsUpdate = true
    attrEdgeB.needsUpdate = true
  }
  update(0)

  group.userData.update = update
  /** Direction TO the key light, in the wall's local space; drives the fake contact shadows. */
  group.userData.setKeyDirection = (v) => uniforms.uKeyDir.value.copy(v).normalize()
  /** Master dimmer for every LED and its spill (1 = normal). */
  group.userData.setIntensity = (k) => (uniforms.uMaster.value = k)
  group.userData.uniforms = uniforms
  group.userData.stripUniforms = stripUniforms
  group.userData.stats = { tiles: n, strips: stripList.length, groups: groups.length }
  group.userData.size = { width, height, cell }
  return group
}

export const viewer = {
  bloom: true,
  bloomParams: { strength: 0.26, radius: 0.2, threshold: 0.6 },
  background: 0x030304,
  studioLights: false,
  envIntensity: 0.1,
  ground: false,
  exposure: 1,
  camera: { position: [0, 1.6, 5.3], target: [0, 1.6, 0], fov: 33 },
}
