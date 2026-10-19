/**
 * The footer terrain's shape, with no three.js in it: the numbers, the grid, the height field
 * (noise plus swells), the camera's arithmetic, what a dot looks like at a given depth, and a
 * 2D-canvas drawing of one frame.
 *
 * Two things read this file. `scene.ts` (three.js, lazy) takes the numbers and the grid and runs
 * the same field in its vertex shader. `Terrain.tsx` (main chunk) calls `drawStill`, which draws
 * the frame the live scene opens on, so a still is there before any three.js arrives and is all
 * a reader gets under reduced motion or save-data.
 */

import { parseCssColor, type Rgba } from '../../components/atoms/loading-animation/palette'

const FOV_DEG = 38
const HALF_FOV_TAN = Math.tan(((FOV_DEG / 2) * Math.PI) / 180)

export const TERRAIN = {
  /** Vertical field of view of the whole frame. */
  fovDeg: FOV_DEG,
  halfFovTan: HALF_FOV_TAN,
  /** The shortest the frame is ever taken to be, in CSS pixels. A stage at least this tall is
   *  the frame. A shorter one (a phone's) is a window onto the top of a frame this tall, so the
   *  mesh keeps its size on screen and the window shows the distance, not a miniature. */
  frameMin: 300,
  /** The camera's height over the resting plane. Above the highest ground there can be
   *  (`maxHeight`), so no hill ever stands between the camera and the horizon. */
  camY: 3.4,
  /** How far the camera looks down, in radians. Puts the horizon a little above the frame's top
   *  edge: the ground is seen from above and fades out before it gets there, so the last of it
   *  that can be made out is just inside the frame. */
  pitch: 0.38,
  /** Distance between neighbouring points, both ways. */
  spacing: 0.62,
  /** Depth of the nearest row and the number of rows: the plane runs from 2.5 to about 45. */
  near: 2.5,
  rows: 70,
  /** Points per row. Wide enough that the last visible depth (`fogEnd`) fills a canvas six times
   *  as wide as it is tall, so the side edges are never in the frame. The Footer's stage is
   *  between two and five times as wide as tall at any viewport width. */
  cols: 300,
  /** Two layers of simplex noise: broad rolling ground, and a finer ripple on it. Amplitude in
   *  world units, frequency in cycles of the noise lattice per unit. */
  amp1: 1.05,
  freq1: 0.085,
  amp2: 0.3,
  freq2: 0.21,
  /** How fast each layer changes, in noise-field units per second, and how fast the field drifts
   *  toward the viewer, in world units per second. Slow: a broad feature takes about half a
   *  minute to become a different one. */
  speed1: 0.028,
  speed2: 0.05,
  drift: 0.18,
  /** The swells: how many at once, and the ranges each is drawn from. Lifetimes and gaps are in
   *  seconds, the rest in world units. */
  swells: 4,
  swellAmp: [0.7, 1.25],
  swellRadius: [3.5, 7],
  swellLife: [11, 20],
  swellGap: [1, 6],
  swellX: 26,
  swellDepth: [9, 34],
  swellSpeed: 0.25,
  /** A dot's diameter in world units, and the smallest it is drawn, in device pixels. */
  dot: 0.095,
  minPx: 1.4,
  /** Depth of field. Dots at `focus` are sharp; they grow and soften toward `focusNear` (the
   *  foreground) and toward `fogEnd`. `blurNear` and `blurFar` are how many times larger a fully
   *  out-of-focus dot is drawn. */
  focus: 13,
  focusNear: 4.5,
  blurNear: 4.2,
  blurFar: 2.4,
  /** Fog by view depth: full strength up to `fogStart`, gone by `fogEnd`. */
  fogStart: 11,
  fogEnd: 37,
  /** Opacity of a sharp dot and of a line at the focal depth, before fog. */
  dotAlpha: 0.95,
  lineAlpha: 0.3,
  /** Ground in a valley is drawn at this share of a crest's opacity, so hills read as lit. */
  valley: 0.45,
  /** The time the still shows and the live scene starts from, and the swells' seed. Chosen by
   *  eye, and fixed. */
  stillT: 40,
  seed: 20261002,
} as const

/** The highest and lowest the ground can be: both noise layers and every swell at once. */
export const MAX_HEIGHT = TERRAIN.amp1 + TERRAIN.amp2 + TERRAIN.swellAmp[1]

// ---- The grid ----

/** Every point of the resting plane as xyz triples, row by row from the nearest: x across,
 *  y = 0, z = -depth. */
export function gridPositions(): Float32Array {
  const { rows, cols, spacing, near } = TERRAIN
  const out = new Float32Array(rows * cols * 3)
  let o = 0
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      out[o++] = (i - (cols - 1) / 2) * spacing
      out[o++] = 0
      out[o++] = -(near + j * spacing)
    }
  }
  return out
}

/** Index pairs joining every point to its right-hand and its further neighbour: the mesh. The
 *  lines share the points' own vertices, so a dot is exactly on every crossing. */
export function gridLines(): Uint32Array {
  const { rows, cols } = TERRAIN
  const out = new Uint32Array((rows * (cols - 1) + cols * (rows - 1)) * 2)
  let o = 0
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const at = j * cols + i
      if (i < cols - 1) {
        out[o++] = at
        out[o++] = at + 1
      }
      if (j < rows - 1) {
        out[o++] = at
        out[o++] = at + cols
      }
    }
  }
  return out
}

// ---- The noise ----

const mod289 = (x: number) => x - Math.floor(x / 289) * 289
const permute = (x: number) => mod289((x * 34 + 10) * x)

/**
 * 3D simplex noise, about -1 to 1. A line-for-line port of the GLSL in `scene.ts` (Ian McEwan and
 * Stefan Gustavson's `snoise`, MIT licence), so the still is a frame of the same field the shader
 * animates. Change one and you change the other.
 */
export function snoise(x: number, y: number, z: number): number {
  const s = (x + y + z) / 3
  let i = Math.floor(x + s)
  let j = Math.floor(y + s)
  let k = Math.floor(z + s)
  const t = (i + j + k) / 6
  const x0 = x - i + t
  const y0 = y - j + t
  const z0 = z - k + t

  const gx = x0 >= y0 ? 1 : 0
  const gy = y0 >= z0 ? 1 : 0
  const gz = z0 >= x0 ? 1 : 0
  const i1 = [Math.min(gx, 1 - gz), Math.min(gy, 1 - gx), Math.min(gz, 1 - gy)]
  const i2 = [Math.max(gx, 1 - gz), Math.max(gy, 1 - gx), Math.max(gz, 1 - gy)]

  const corners = [
    [x0, y0, z0, 0, 0, 0],
    [x0 - i1[0] + 1 / 6, y0 - i1[1] + 1 / 6, z0 - i1[2] + 1 / 6, i1[0], i1[1], i1[2]],
    [x0 - i2[0] + 1 / 3, y0 - i2[1] + 1 / 3, z0 - i2[2] + 1 / 3, i2[0], i2[1], i2[2]],
    [x0 - 0.5, y0 - 0.5, z0 - 0.5, 1, 1, 1],
  ]

  i = mod289(i)
  j = mod289(j)
  k = mod289(k)

  let sum = 0
  for (const [cx, cy, cz, ox, oy, oz] of corners) {
    const p = permute(permute(permute(k + oz) + j + oy) + i + ox)
    // A gradient from 7 x 7 points over a square, mapped onto an octahedron.
    const jj = p - 49 * Math.floor(p / 49)
    const xi = Math.floor(jj / 7)
    const yi = Math.floor(jj - 7 * xi)
    const hx = xi * (2 / 7) - 13 / 14
    const hy = yi * (2 / 7) - 13 / 14
    const h = 1 - Math.abs(hx) - Math.abs(hy)
    const sh = h <= 0 ? -1 : 0
    let px = hx + (Math.floor(hx) * 2 + 1) * sh
    let py = hy + (Math.floor(hy) * 2 + 1) * sh
    let pz = h
    const norm = 1.79284291400159 - 0.85373472095314 * (px * px + py * py + pz * pz)
    px *= norm
    py *= norm
    pz *= norm
    let m = Math.max(0.5 - (cx * cx + cy * cy + cz * cz), 0)
    m *= m
    sum += m * m * (px * cx + py * cy + pz * cz)
  }
  return 105 * sum
}

export const smoothstep = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

// ---- The swells ----

/** A small seeded generator (mulberry32): the same seed gives the same numbers, everywhere. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * How much of its height a swell has at `u`, the share of its life gone (0 to 1): nothing at
 * birth, all of it half way, nothing at the end, and no speed at either end. A swell is moved to
 * a new place only between lives, while this is zero, which is why the surface never jumps.
 */
export function swellEnvelope(u: number): number {
  if (u <= 0 || u >= 1) return 0
  const s = Math.sin(Math.PI * u)
  return s * s
}

/** Values per swell in the flat array `Swells.at` fills: x, depth, 1 / (2 radius²), height. */
export const SWELL_STRIDE = 4

export type Swells = {
  /** Writes every swell's state at time `t` (seconds) into `out`, `SWELL_STRIDE` values each.
   *  `t` may only move forward. */
  at(t: number, out: Float32Array): Float32Array
}

type Life = { x: number; depth: number; vx: number; vd: number; k: number; amp: number; born: number; life: number }

/**
 * The swell scheduler: `TERRAIN.swells` slow bumps, each rising and falling once at a random
 * place, drifting a little while it lives, then resting a random moment and starting again
 * somewhere else, up or down. Every slot draws from its own seeded stream, so the state at a
 * given time is the same whatever steps the clock took to get there, and the same on every
 * machine: the still (`stillT`) and the live scene's first frame are one picture.
 */
export function createSwells(seed: number = TERRAIN.seed): Swells {
  const range = (rand: () => number, [from, to]: readonly [number, number]) => from + (to - from) * rand()
  const slots = Array.from({ length: TERRAIN.swells }, (_, index) => {
    const rand = seeded(seed + index * 7919)
    const next = (after: number): Life => {
      const radius = range(rand, TERRAIN.swellRadius)
      const heading = rand() * Math.PI * 2
      return {
        x: (rand() * 2 - 1) * TERRAIN.swellX,
        depth: range(rand, TERRAIN.swellDepth),
        vx: Math.cos(heading) * TERRAIN.swellSpeed,
        vd: Math.sin(heading) * TERRAIN.swellSpeed,
        k: 1 / (2 * radius * radius),
        amp: range(rand, TERRAIN.swellAmp) * (rand() < 0.5 ? -1 : 1),
        born: after + range(rand, TERRAIN.swellGap),
        life: range(rand, TERRAIN.swellLife),
      }
    }
    // Staggered: the first life of each slot starts at a different moment before time zero.
    return { next, current: next(-range(rand, TERRAIN.swellLife)) }
  })

  return {
    at(t, out) {
      slots.forEach((slot, index) => {
        while (t >= slot.current.born + slot.current.life) {
          slot.current = slot.next(slot.current.born + slot.current.life)
        }
        const s = slot.current
        const age = t - s.born
        const o = index * SWELL_STRIDE
        out[o] = s.x + s.vx * age
        out[o + 1] = s.depth + s.vd * age
        out[o + 2] = s.k
        out[o + 3] = s.amp * swellEnvelope(age / s.life)
      })
      return out
    },
  }
}

// ---- The height field ----

/**
 * The ground's height at a point of the plane (`x` across, `depth` away from the camera) at time
 * `t`, given the swells' state at that time. The vertex shader in `scene.ts` is this function,
 * term for term; points and lines both run it, which is what keeps every dot on its crossing.
 */
export function heightAt(x: number, depth: number, t: number, swells: Float32Array): number {
  const flow = depth + t * TERRAIN.drift
  let h =
    TERRAIN.amp1 * snoise(x * TERRAIN.freq1, flow * TERRAIN.freq1, t * TERRAIN.speed1) +
    TERRAIN.amp2 * snoise(x * TERRAIN.freq2 + 17.3, flow * TERRAIN.freq2, t * TERRAIN.speed2 + 5.1)
  for (let o = 0; o < swells.length; o += SWELL_STRIDE) {
    const dx = x - swells[o]
    const dd = depth - swells[o + 1]
    h += swells[o + 3] * Math.exp(-(dx * dx + dd * dd) * swells[o + 2])
  }
  return h
}

// ---- The camera ----

const COS_PITCH = Math.cos(TERRAIN.pitch)
const SIN_PITCH = Math.sin(TERRAIN.pitch)

/** The frame's height for a stage `stagePx` tall, in the same unit (see `TERRAIN.frameMin`).
 *  `unit` is how many of that unit one CSS pixel is: 1, or the pixel ratio for device pixels. */
export const frameHeight = (stagePx: number, unit = 1) => Math.max(stagePx, TERRAIN.frameMin * unit)

/** A point of the ground as the camera sees it: its depth along the view axis, and where it
 *  lands on the frame as shares of the frame's width and height (0,0 is the top left). `aspect`
 *  is the frame's width over its height. */
export function project(x: number, height: number, depth: number, aspect: number) {
  const up = height - TERRAIN.camY
  const view = depth * COS_PITCH - up * SIN_PITCH
  const rise = up * COS_PITCH + depth * SIN_PITCH
  return {
    view,
    sx: 0.5 + x / (view * HALF_FOV_TAN * aspect) / 2,
    sy: 0.5 - rise / (view * HALF_FOV_TAN) / 2,
  }
}

/**
 * What a dot at view depth `view` and height `height` looks like in a frame `heightPx` device
 * pixels tall: its diameter, its opacity, how soft its edge is (0.25 is crisp, 1 is a blur all
 * the way to the centre) and the opacity of the lines that meet at it. The vertex shader in
 * `scene.ts` repeats this arithmetic.
 *
 * This is the depth of field and the fog together. A dot away from the focal depth is drawn
 * larger, softer and fainter by the same factor; past `fogStart` everything fades to nothing,
 * which on a transparent canvas is the page's own background.
 */
export function dotLook(view: number, height: number, heightPx: number) {
  const T = TERRAIN
  const fog = 1 - smoothstep(T.fogStart, T.fogEnd, view)
  const nearBlur = Math.min(1, Math.max(0, (T.focus - view) / (T.focus - T.focusNear)))
  const farBlur = Math.min(1, Math.max(0, (view - T.focus) / (T.fogEnd - T.focus)))
  const grow = 1 + (T.blurNear - 1) * nearBlur * nearBlur + (T.blurFar - 1) * farBlur
  const natural = (T.dot * heightPx) / (2 * HALF_FOV_TAN) / view
  const sharp = Math.max(T.minPx, natural)
  // A dot drawn at the floor size carries less light than its true size would.
  const floor = Math.min(1, natural / T.minPx)
  const lit = T.valley + (1 - T.valley) * smoothstep(-T.amp1, T.amp1, height)
  return {
    size: sharp * grow,
    alpha: (T.dotAlpha * fog * floor * lit) / Math.pow(grow, 1.35),
    soft: 0.25 + 0.75 * Math.max(nearBlur, farBlur * 0.6),
    // Lines crowd together with distance, so they fade faster than the dots do.
    line: T.lineAlpha * fog * fog * lit * (1 - 0.9 * nearBlur),
  }
}

// ---- The colours ----

/** The terrain's colours, and how they are laid on the page. */
export type TerrainPalette = {
  dot: Rgba
  line: Rgba
  /** True on a dark page: dots add their light to it, and overlapping dots glow. On a light page
   *  adding light only reaches white, so there the dots are painted over it instead. */
  additive: boolean
}

/** Rec. 709 luma: a page is "dark" when its surface is darker than mid grey. */
const luma = (c: Rgba) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

/**
 * Reads the tokens in the cascade of `host`, the way the loader's `readPalette` does: a probe
 * element resolves each custom property to the colour the theme gives it. Dots and lines are
 * both `accent.signal.fill`, the lines at a fraction of the dots' opacity. Tried on the light
 * theme and not kept: `accent.signal.text` for the dots, which is darker and reads as brown
 * once a dot is blurred. `surface.base` decides how the colour is laid on, nothing else: the
 * fog fades to transparent, which is whatever the page is.
 */
export function readTerrainPalette(host: Element): TerrainPalette {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  host.appendChild(probe)
  try {
    const read = (token: string): Rgba => {
      probe.style.color = `var(${token})`
      return parseCssColor(getComputedStyle(probe).color) ?? { r: 0.5, g: 0.5, b: 0.5, a: 1 }
    }
    const signal = read('--color-accent-signal-fill')
    return { dot: signal, line: signal, additive: luma(read('--color-surface-base')) < 0.5 }
  } finally {
    probe.remove()
  }
}

// ---- The still ----

const css = (c: Rgba, alpha: number) =>
  `rgb(${Math.round(c.r * 255)} ${Math.round(c.g * 255)} ${Math.round(c.b * 255)} / ${alpha.toFixed(4)})`

/** A soft disc in the dot colour, drawn once per softness and stamped for every dot. */
function sprite(color: Rgba, soft: number): HTMLCanvasElement | null {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, css(color, 1))
  gradient.addColorStop(Math.max(0, 1 - soft), css(color, 1))
  gradient.addColorStop(1, css(color, 0))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return canvas
}

const SOFT_STEPS = 6

/**
 * Draws one frame onto a 2D canvas `widthPx` by `heightPx` device pixels, `pixelRatio` of them
 * to a CSS pixel: the surface at `TERRAIN.stillT`, with the swells where the seeded scheduler
 * has them at that moment. The same field, camera, fog and depth of field as the live scene,
 * repeated here in TypeScript.
 */
export function drawStill(
  ctx: CanvasRenderingContext2D,
  widthPx: number,
  heightPx: number,
  pixelRatio: number,
  palette: TerrainPalette
): void {
  const T = TERRAIN
  ctx.clearRect(0, 0, widthPx, heightPx)
  if (widthPx === 0 || heightPx === 0) return
  // The canvas is the top of the frame: all of it, unless the stage is shorter than `frameMin`.
  const framePx = frameHeight(heightPx, pixelRatio)
  const aspect = widthPx / framePx
  const swells = createSwells().at(T.stillT, new Float32Array(T.swells * SWELL_STRIDE))
  ctx.globalCompositeOperation = palette.additive ? 'lighter' : 'source-over'

  const sprites = Array.from({ length: SOFT_STEPS }, (_, step) => sprite(palette.dot, 0.25 + (0.75 * step) / (SOFT_STEPS - 1)))
  if (sprites.some(s => s === null)) return

  type Seen = { px: number; py: number; view: number; h: number } | null
  let previous: Seen[] = []
  const dots: { px: number; py: number; view: number; h: number }[] = []

  // Far rows first, so the foreground is laid over the distance, as the live scene's draw order
  // does not matter (it only ever adds or blends without depth).
  for (let j = T.rows - 1; j >= 0; j--) {
    const depth = T.near + j * T.spacing
    const row: Seen[] = new Array(T.cols).fill(null)
    // Skip what the frame cannot show at this depth: the plane is far wider than the canvas.
    const reach = (depth + MAX_HEIGHT) * HALF_FOV_TAN * aspect * 1.25 + T.spacing * 2
    for (let i = 0; i < T.cols; i++) {
      const x = (i - (T.cols - 1) / 2) * T.spacing
      if (Math.abs(x) > reach) continue
      const h = heightAt(x, depth, T.stillT, swells)
      const p = project(x, h, depth, aspect)
      if (p.view <= 0.1) continue
      row[i] = { px: p.sx * widthPx, py: p.sy * framePx, view: p.view, h }
    }

    const mid = row[Math.floor(T.cols / 2)]
    if (mid) {
      const look = dotLook(mid.view, 0, framePx)
      if (look.line > 0.004) {
        ctx.lineWidth = 1
        ctx.strokeStyle = css(palette.line, look.line)
        ctx.beginPath()
        let pen = false
        for (let i = 0; i < T.cols; i++) {
          const at = row[i]
          if (!at) {
            pen = false
            continue
          }
          if (pen) ctx.lineTo(at.px, at.py)
          else ctx.moveTo(at.px, at.py)
          pen = true
          // The line back to the row behind this one.
          const behind = previous[i]
          if (behind) {
            ctx.moveTo(behind.px, behind.py)
            ctx.lineTo(at.px, at.py)
          }
        }
        ctx.stroke()
      }
    }
    for (const at of row) if (at) dots.push(at)
    previous = row
  }

  for (const at of dots) {
    const look = dotLook(at.view, at.h, framePx)
    if (look.alpha < 0.004) continue
    const step = Math.round(((look.soft - 0.25) / 0.75) * (SOFT_STEPS - 1))
    ctx.globalAlpha = Math.min(1, look.alpha)
    ctx.drawImage(sprites[step]!, at.px - look.size / 2, at.py - look.size / 2, look.size, look.size)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}
