import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_HEIGHT,
  SWELL_STRIDE,
  TERRAIN,
  createSwells,
  dotLook,
  drawStill,
  frameHeight,
  gridLines,
  gridPositions,
  heightAt,
  project,
  seeded,
  snoise,
  swellEnvelope,
} from './field'

const T = TERRAIN
const NO_SWELLS = new Float32Array(T.swells * SWELL_STRIDE)
const state = () => new Float32Array(T.swells * SWELL_STRIDE)

describe('the terrain`s grid', () => {
  it('is a regular grid: rows by cols points, flat, evenly spaced and centred', () => {
    const points = gridPositions()
    expect(points).toHaveLength(T.rows * T.cols * 3)
    // "A few thousand to low tens of thousands."
    expect(T.rows * T.cols).toBeGreaterThan(3000)
    expect(T.rows * T.cols).toBeLessThan(30000)
    const at = (row: number, col: number) => {
      const o = (row * T.cols + col) * 3
      return { x: points[o], y: points[o + 1], depth: -points[o + 2] }
    }
    expect(at(0, 0).depth).toBeCloseTo(T.near, 5)
    expect(at(0, 0).x).toBeCloseTo(-at(0, T.cols - 1).x, 4)
    expect(at(0, 1).x - at(0, 0).x).toBeCloseTo(T.spacing, 4)
    expect(at(1, 0).depth - at(0, 0).depth).toBeCloseTo(T.spacing, 4)
    for (let i = 1; i < points.length; i += 3) expect(points[i]).toBe(0)
  })

  // The mesh shares the points' own vertices, which is what puts a dot on every crossing.
  // Mutation: join `at` to `at + 2` in gridLines -> the distance assertion fails.
  it('joins every point to its neighbours and to nothing else', () => {
    const points = gridPositions()
    const lines = gridLines()
    expect(lines).toHaveLength((T.rows * (T.cols - 1) + T.cols * (T.rows - 1)) * 2)
    for (let i = 0; i < lines.length; i += 2) {
      const a = lines[i] * 3
      const b = lines[i + 1] * 3
      expect(lines[i + 1]).toBeLessThan(T.rows * T.cols)
      const distance = Math.hypot(points[a] - points[b], points[a + 2] - points[b + 2])
      expect(Math.abs(distance - T.spacing)).toBeLessThan(1e-4)
    }
  })

  // The side edges are never in the frame: at the last depth anything is drawn, the plane is
  // wider than a frame six times as wide as it is tall.
  it('is wider than the widest frame at the depth the fog ends', () => {
    const halfWidth = ((T.cols - 1) / 2) * T.spacing
    expect(halfWidth).toBeGreaterThan(T.fogEnd * T.halfFovTan * 6)
    // And deeper than the fog: the far edge is never seen either.
    expect(T.near + (T.rows - 1) * T.spacing).toBeGreaterThan(T.fogEnd)
  })
})

describe('the terrain`s height', () => {
  it('snoise: the same value for the same point, bounded, zero-centred and continuous', () => {
    expect(snoise(0.3, -1.2, 4.5)).toBe(snoise(0.3, -1.2, 4.5))
    let min = Infinity
    let max = -Infinity
    let sum = 0
    let count = 0
    // The starts differ so that no sample has two equal coordinates: on the exact diagonal of a
    // cell the reference algorithm's corner order is a tie, in GLSL as here.
    for (let x = -3.013; x <= 3; x += 0.37) {
      for (let y = -2.971; y <= 3; y += 0.41) {
        for (let z = -3.057; z <= 3; z += 0.43) {
          const v = snoise(x, y, z)
          min = Math.min(min, v)
          max = Math.max(max, v)
          sum += v
          count++
          // A step of a thousandth moves the value by very little: no seams between cells.
          expect(Math.abs(snoise(x + 0.001, y, z) - v)).toBeLessThan(0.02)
        }
      }
    }
    expect(min).toBeGreaterThanOrEqual(-1)
    expect(max).toBeLessThanOrEqual(1)
    expect(min).toBeLessThan(-0.5)
    expect(max).toBeGreaterThan(0.5)
    expect(Math.abs(sum / count)).toBeLessThan(0.05)
  })

  it('is the two noise layers alone when no swell is up, within their amplitudes', () => {
    for (let x = -30.13; x < 30; x += 3.7) {
      for (let depth = 2.51; depth < 45; depth += 2.9) {
        const h = heightAt(x, depth, 12.3, NO_SWELLS)
        expect(h).toBe(heightAt(x, depth, 12.3, NO_SWELLS))
        expect(Math.abs(h)).toBeLessThanOrEqual(T.amp1 + T.amp2)
      }
    }
  })

  // Mutation: drop the swell loop from heightAt -> the centre is no higher than the ground.
  it('a swell raises the ground by its height at its centre and by nothing far from it', () => {
    const swells = state()
    swells.set([4, 20, 1 / (2 * 5 * 5), 0.9])
    const ground = (x: number, depth: number) => heightAt(x, depth, 3, NO_SWELLS)
    expect(heightAt(4, 20, 3, swells) - ground(4, 20)).toBeCloseTo(0.9, 6)
    // One radius out: e^-0.5 of it.
    expect(heightAt(9, 20, 3, swells) - ground(9, 20)).toBeCloseTo(0.9 * Math.exp(-0.5), 6)
    expect(Math.abs(heightAt(4 + 40, 20, 3, swells) - ground(4 + 40, 20))).toBeLessThan(1e-9)
    // A negative one is a valley of the same shape.
    swells[3] = -0.9
    expect(heightAt(4, 20, 3, swells) - ground(4, 20)).toBeCloseTo(-0.9, 6)
  })

  // Slow and continuous: from one frame to the next no point of the ground moves by more than a
  // hundredth of a unit, noise and swells together, across every swell's birth and death.
  // Mutation: replace swellEnvelope with `u < 1 ? 1 : 0` -> a swell appears at full height in
  // one frame and this fails.
  it('never jumps: a minute and a half of frames, and no point moves more than 0.01 in one', () => {
    const swells = createSwells()
    const now = state()
    const dt = 1 / 60
    const samples = [
      [0, 6],
      [-12, 14],
      [9, 22],
      [22, 30],
      [-25, 11],
      [3, 33],
    ]
    let previous: number[] | null = null
    let largest = 0
    for (let frame = 0; frame < 90 * 60; frame++) {
      const t = T.stillT + frame * dt
      swells.at(t, now)
      const heights = samples.map(([x, depth]) => heightAt(x, depth, t, now))
      if (previous) for (let i = 0; i < heights.length; i++) largest = Math.max(largest, Math.abs(heights[i] - previous[i]))
      previous = heights
    }
    expect(largest).toBeGreaterThan(0)
    expect(largest).toBeLessThan(0.01)
  })

  it('stays under the camera: the highest the ground can be is below the camera`s height', () => {
    expect(MAX_HEIGHT).toBe(T.amp1 + T.amp2 + T.swellAmp[1])
    expect(T.camY).toBeGreaterThan(MAX_HEIGHT)
  })
})

describe('the swells', () => {
  it('the envelope is nothing at both ends, everything half way, and flat at both ends', () => {
    expect(swellEnvelope(0)).toBe(0)
    expect(swellEnvelope(1)).toBe(0)
    expect(swellEnvelope(-0.2)).toBe(0)
    expect(swellEnvelope(1.3)).toBe(0)
    expect(swellEnvelope(0.5)).toBeCloseTo(1, 12)
    // Eased in and out: the first and last thousandth of a life move it by almost nothing.
    expect(swellEnvelope(0.001)).toBeLessThan(1e-4)
    expect(swellEnvelope(0.999)).toBeLessThan(1e-4)
    // And it only rises, then only falls.
    for (let u = 0.01; u < 0.5; u += 0.01) expect(swellEnvelope(u)).toBeGreaterThan(swellEnvelope(u - 0.01))
    for (let u = 0.51; u < 1; u += 0.01) expect(swellEnvelope(u)).toBeLessThan(swellEnvelope(u - 0.01))
  })

  it('seeded: the same seed gives the same numbers, between 0 and 1', () => {
    const a = seeded(7)
    const b = seeded(7)
    const c = seeded(8)
    const first = Array.from({ length: 50 }, () => a())
    expect(Array.from({ length: 50 }, () => b())).toEqual(first)
    expect(Array.from({ length: 50 }, () => c())).not.toEqual(first)
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  // Mutation: draw every slot from one shared stream in createSwells -> two slots ending inside
  // one long step start again in slot order, not in time order, and the coarse clock disagrees.
  it('is deterministic under a seed, whatever steps the clock takes', () => {
    const fine = createSwells(42)
    const coarse = createSwells(42)
    const other = createSwells(43)
    const a = state()
    const b = state()
    for (let t = 0; t <= 300; t += 1 / 60) fine.at(t, a)
    for (let t = 0; t <= 300; t += 7.3) coarse.at(t, b)
    fine.at(300, a)
    coarse.at(300, b)
    expect([...b]).toEqual([...a])
    expect([...other.at(300, state())]).not.toEqual([...a])
    // The default seed is the one the still and the live scene share.
    expect([...createSwells().at(T.stillT, state())]).toEqual([...createSwells(T.seed).at(T.stillT, state())])
  })

  it('keeps every swell inside its ranges: height, radius, and a place on the visible ground', () => {
    const swells = createSwells()
    const now = state()
    let seenUp = false
    let seenDown = false
    let seenRest = false
    for (let t = 0; t < 600; t += 0.25) {
      swells.at(t, now)
      for (let o = 0; o < now.length; o += SWELL_STRIDE) {
        const [x, depth, k, height] = now.subarray(o, o + SWELL_STRIDE)
        expect(Math.abs(height)).toBeLessThanOrEqual(T.swellAmp[1])
        const radius = Math.sqrt(1 / (2 * k))
        expect(radius).toBeGreaterThanOrEqual(T.swellRadius[0] - 1e-3)
        expect(radius).toBeLessThanOrEqual(T.swellRadius[1] + 1e-3)
        // Where it was born, plus what it can drift in its longest life.
        const drift = T.swellSpeed * T.swellLife[1]
        expect(Math.abs(x)).toBeLessThanOrEqual(T.swellX + drift)
        expect(depth).toBeGreaterThanOrEqual(T.swellDepth[0] - drift)
        expect(depth).toBeLessThanOrEqual(T.swellDepth[1] + drift)
        if (height > 0.3) seenUp = true
        if (height < -0.3) seenDown = true
        if (height === 0) seenRest = true
      }
    }
    // Hills and valleys, and rests between them.
    expect(seenUp && seenDown && seenRest).toBe(true)
  })
})

describe('the terrain`s camera and its dots', () => {
  it('frameHeight: a tall stage is the frame, a short one is a window onto a frame of the least height', () => {
    expect(frameHeight(520)).toBe(520)
    expect(frameHeight(T.frameMin)).toBe(T.frameMin)
    expect(frameHeight(150)).toBe(T.frameMin)
    // In device pixels at a pixel ratio of 2.
    expect(frameHeight(300, 2)).toBe(T.frameMin * 2)
  })

  it('project: ground further away lands higher in the frame and nearer its centre line', () => {
    const near = project(5, 0, 6, 4)
    const far = project(5, 0, 30, 4)
    expect(far.view).toBeGreaterThan(near.view)
    expect(far.sy).toBeLessThan(near.sy)
    expect(Math.abs(far.sx - 0.5)).toBeLessThan(Math.abs(near.sx - 0.5))
    // Left and right mirror each other.
    expect(project(-5, 0, 6, 4).sx).toBeCloseTo(1 - near.sx, 10)
    // Higher ground lands higher.
    expect(project(5, 1, 6, 4).sy).toBeLessThan(near.sy)
    // The nearest row is below the frame's bottom edge, so the plane's front edge is never seen.
    expect(project(0, 0, T.near, 4).sy).toBeGreaterThan(1)
  })

  // Mutation: remove `fog *` from the alpha in dotLook -> the far dot is as bright as the focal
  // one and the fog assertions fail.
  it('dotLook: sharp at the focal depth, larger and softer and fainter either side, gone at the fog`s end', () => {
    const frame = 400
    const focal = dotLook(T.focus, 0, frame)
    const front = dotLook(T.focusNear, 0, frame)
    const far = dotLook((T.focus + T.fogEnd) / 2, 0, frame)
    const gone = dotLook(T.fogEnd, 0, frame)
    expect(focal.soft).toBeCloseTo(0.25, 10)
    expect(front.soft).toBeCloseTo(1, 10)
    expect(front.size).toBeGreaterThan(focal.size * T.blurNear)
    expect(front.alpha).toBeLessThan(focal.alpha)
    expect(far.soft).toBeGreaterThan(focal.soft)
    expect(far.alpha).toBeLessThan(focal.alpha)
    expect(gone.alpha).toBe(0)
    expect(gone.line).toBe(0)
    // Never under the smallest drawable dot, and never brighter than opaque.
    for (let view = 1; view < 50; view += 0.7) {
      const look = dotLook(view, 0, frame)
      expect(look.size).toBeGreaterThanOrEqual(T.minPx)
      expect(look.alpha).toBeLessThanOrEqual(1)
      expect(look.alpha).toBeGreaterThanOrEqual(0)
      expect(look.line).toBeLessThanOrEqual(T.lineAlpha)
    }
    // A crest is brighter than a valley at the same depth.
    expect(dotLook(T.focus, T.amp1, frame).alpha).toBeGreaterThan(dotLook(T.focus, -T.amp1, frame).alpha)
  })
})

describe('the terrain`s still', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** jsdom has no canvas. This stands in for the 2D context: it records what is drawn. */
  function fakeContext() {
    const calls = { drawImage: [] as number[][], stroke: 0, alpha: [] as number[], operations: [] as string[] }
    let operation = 'source-over'
    const ctx = {
      globalAlpha: 1,
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      get globalCompositeOperation() {
        return operation
      },
      set globalCompositeOperation(value: string) {
        operation = value
        calls.operations.push(value)
      },
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {
        calls.stroke++
      },
      createRadialGradient: () => ({ addColorStop: () => {} }),
      drawImage(_image: unknown, x: number, y: number, w: number, h: number) {
        calls.drawImage.push([x, y, w, h])
        calls.alpha.push(ctx.globalAlpha)
      },
    }
    return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
  }

  const ORANGE = { r: 0.95, g: 0.33, b: 0.06, a: 1 }

  it('draws dots and the lines between them, inside the canvas, adding light on a dark page', () => {
    const { ctx, calls } = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext().ctx as never)
    drawStill(ctx, 1440, 388, 1, { dot: ORANGE, line: ORANGE, additive: true })
    expect(calls.operations[0]).toBe('lighter')
    // Left as it was found, so nothing drawn after it is added by accident.
    expect(calls.operations.at(-1)).toBe('source-over')
    expect(calls.stroke).toBeGreaterThan(20)
    // Thousands of dots, not the whole plane: what the frame cannot show is skipped.
    expect(calls.drawImage.length).toBeGreaterThan(2000)
    expect(calls.drawImage.length).toBeLessThan(T.rows * T.cols)
    for (const alpha of calls.alpha) {
      expect(alpha).toBeGreaterThan(0)
      expect(alpha).toBeLessThanOrEqual(1)
    }
    // Some of them are on the canvas, both halves of it.
    const centres = calls.drawImage.map(([x, y, w, h]) => [x + w / 2, y + h / 2])
    const inside = centres.filter(([x, y]) => x >= 0 && x <= 1440 && y >= 0 && y <= 388)
    expect(inside.length).toBeGreaterThan(1000)
    expect(inside.some(([x]) => x < 200)).toBe(true)
    expect(inside.some(([x]) => x > 1240)).toBe(true)
  })

  it('paints over a light page instead of adding to it', () => {
    const { ctx, calls } = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext().ctx as never)
    drawStill(ctx, 800, 300, 1, { dot: ORANGE, line: ORANGE, additive: false })
    expect(calls.operations).not.toContain('lighter')
    expect(calls.drawImage.length).toBeGreaterThan(1000)
  })

  // The same picture every time: the still is one fixed moment of a seeded surface.
  it('is the same frame on every call', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext().ctx as never)
    const first = fakeContext()
    const second = fakeContext()
    drawStill(first.ctx, 1024, 300, 1, { dot: ORANGE, line: ORANGE, additive: true })
    drawStill(second.ctx, 1024, 300, 1, { dot: ORANGE, line: ORANGE, additive: true })
    expect(second.calls.drawImage).toEqual(first.calls.drawImage)
  })

  it('draws nothing, and throws nothing, on a canvas with no size or where no 2D context exists', () => {
    const empty = fakeContext()
    drawStill(empty.ctx, 0, 0, 1, { dot: ORANGE, line: ORANGE, additive: true })
    expect(empty.calls.drawImage).toHaveLength(0)
    // jsdom as it is: the sprite canvases get no context.
    const bare = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    drawStill(bare.ctx, 640, 300, 1, { dot: ORANGE, line: ORANGE, additive: true })
    expect(bare.calls.drawImage).toHaveLength(0)
  })
})
