import { afterEach, describe, expect, it, vi } from 'vitest'
import { playSquash, SQUASH_FRAMES, squashKeyframes } from './squash'

/**
 * jsdom has no Web Animations API and no layout, so what the squash looks like is held in a real
 * browser (e2e/switch.spec.ts). What can be held here is the shape of the data and the three
 * decisions `playSquash` makes: which edge it scales about, when it does nothing, and that a
 * second flip replaces the first.
 */

function bodyWithAnimate() {
  const body = document.createElement('span')
  const started: { cancel: ReturnType<typeof vi.fn> }[] = []
  const animate = vi.fn(() => {
    const animation = { cancel: vi.fn() }
    started.push(animation)
    return animation
  })
  // A CSS transition on the same element, as `getAnimations()` would report it.
  const transition = { cancel: vi.fn() }
  Object.assign(body, { animate, getAnimations: () => [transition, ...started] })
  return { body, animate, started, transition }
}

function reducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced && query.includes('reduce') }))
}

afterEach(() => vi.unstubAllGlobals())

describe('the squash frames', () => {
  it('run in order and end on the thumb’s own shape', () => {
    const offsets = SQUASH_FRAMES.map(frame => frame.offset)
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
    expect(SQUASH_FRAMES.at(-1)).toEqual({ offset: 1, x: 1, y: 1 })
  })

  it('have no frame at the start, so the animation begins from wherever the body is', () => {
    expect(SQUASH_FRAMES[0].offset).toBeGreaterThan(0)
  })

  it('stretch first, then squash', () => {
    expect(SQUASH_FRAMES[0].x).toBeGreaterThan(1)
    expect(SQUASH_FRAMES[1].x).toBeLessThan(1)
  })

  it('never scale both axes the same way: longer is thinner, shorter is taller', () => {
    for (const { x, y } of SQUASH_FRAMES.slice(0, -1)) {
      expect(Math.sign(x - 1)).toBe(-Math.sign(y - 1))
    }
  })

  it('keep the area within a tenth of the thumb’s own, so it reads as one object changing shape', () => {
    for (const { x, y } of SQUASH_FRAMES) expect(Math.abs(x * y - 1)).toBeLessThan(0.1)
  })

  it('stay inside the track: a 16px thumb with 2px of room inside the border above and below', () => {
    for (const { y } of SQUASH_FRAMES) expect((16 * y - 16) / 2).toBeLessThan(2)
  })

  // "Too bouncy" was the review of the first version, which overshot the other way after the
  // squash and came back twice. One give: after the squash the only frame left is the rest shape.
  it('give once and do not rebound', () => {
    expect(SQUASH_FRAMES).toHaveLength(3)
    for (const { x, y } of SQUASH_FRAMES) {
      expect(Math.abs(x - 1)).toBeLessThan(0.11)
      expect(Math.abs(y - 1)).toBeLessThan(0.051)
    }
  })

  it('become keyframes that ease between one another', () => {
    const keyframes = squashKeyframes()
    expect(keyframes).toHaveLength(SQUASH_FRAMES.length)
    expect(keyframes[0]).toEqual({ offset: 0.45, transform: 'scale(1.1, 0.96)', easing: 'ease-in-out' })
  })
})

describe('playSquash', () => {
  it('scales about the leading edge: the right when turning on, the left when turning off', () => {
    reducedMotion(false)
    const { body, animate } = bodyWithAnimate()
    playSquash(body, true)
    expect(body.style.transformOrigin).toBe('100% 50%')
    playSquash(body, false)
    expect(body.style.transformOrigin).toBe('0% 50%')
    expect(animate).toHaveBeenCalledTimes(2)
    expect(animate).toHaveBeenLastCalledWith(squashKeyframes(), { duration: 320 })
  })

  it('cancels its own squash that is still running before starting another', () => {
    reducedMotion(false)
    const { body, started } = bodyWithAnimate()
    playSquash(body, true)
    expect(started[0].cancel).not.toHaveBeenCalled()
    playSquash(body, false)
    expect(started[0].cancel).toHaveBeenCalledTimes(1)
    expect(started[1].cancel).not.toHaveBeenCalled()
  })

  // The body also fades its colour, as a CSS transition, and that has already started when the
  // squash is asked for. Cancelling everything on the element stopped the fade on its first frame.
  it('leaves the element’s other animations alone', () => {
    reducedMotion(false)
    const { body, transition } = bodyWithAnimate()
    playSquash(body, true)
    playSquash(body, false)
    expect(transition.cancel).not.toHaveBeenCalled()
  })

  it('does nothing under reduced motion', () => {
    reducedMotion(true)
    const { body, animate } = bodyWithAnimate()
    playSquash(body, true)
    expect(animate).not.toHaveBeenCalled()
    expect(body.style.transformOrigin).toBe('')
  })

  it('does nothing without a body, or where the Web Animations API is missing', () => {
    reducedMotion(false)
    expect(() => playSquash(null, true)).not.toThrow()
    expect(() => playSquash(document.createElement('span'), true)).not.toThrow()
  })
})
