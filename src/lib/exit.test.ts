import { afterEach, describe, expect, it, vi } from 'vitest'
import { exitAlert, exitTag, slideIntoPlace } from './exit'

/** A stand-in for Element.animate that records the call and lets the test finish it. */
function stubAnimate() {
  const calls: { keyframes: Keyframe[]; animation: { onfinish: (() => void) | null; cancel: () => void } }[] = []
  const animate = vi.fn((keyframes: Keyframe[]) => {
    const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() }
    calls.push({ keyframes, animation })
    return animation
  })
  ;(HTMLElement.prototype as unknown as { animate: unknown }).animate = animate
  return calls
}

afterEach(() => {
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate
  vi.unstubAllGlobals()
})

describe('exit helpers', () => {
  it('finish at once where nothing can animate (jsdom has no Element.animate)', () => {
    const done = vi.fn()
    exitTag(document.createElement('span'), done)
    exitAlert(document.createElement('div'), done)
    expect(done).toHaveBeenCalledTimes(2)
  })

  it('finish at once under reduced motion, even where animate exists', () => {
    const calls = stubAnimate()
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
    const done = vi.fn()
    exitTag(document.createElement('span'), done)
    expect(done).toHaveBeenCalledOnce()
    expect(calls).toHaveLength(0)
  })

  it('a tag reports done only when its fade finishes', () => {
    const calls = stubAnimate()
    const done = vi.fn()
    const parent = document.createElement('div')
    const tag = document.createElement('span')
    parent.append(tag)
    exitTag(tag, done)
    expect(done).not.toHaveBeenCalled()
    expect(calls[0].keyframes.at(-1)).toMatchObject({ opacity: 0 })
    calls[0].animation.onfinish?.()
    expect(done).toHaveBeenCalledOnce()
  })

  it('an alert fades, then collapses, then reports done', () => {
    const calls = stubAnimate()
    const done = vi.fn()
    exitAlert(document.createElement('div'), done)
    calls[0].animation.onfinish?.()
    expect(done).not.toHaveBeenCalled()
    expect(calls[1].keyframes.at(-1)).toMatchObject({ height: '0px' })
    calls[1].animation.onfinish?.()
    expect(done).toHaveBeenCalledOnce()
  })

  it('a sibling that did not move does not slide', () => {
    const calls = stubAnimate()
    const parent = document.createElement('div')
    const leaving = document.createElement('span')
    const staying = document.createElement('span')
    parent.append(leaving, staying)
    exitTag(leaving, () => leaving.remove())
    calls[0].animation.onfinish?.()
    // jsdom has no layout: every offset is 0 before and after, so there is nothing to slide.
    slideIntoPlace(staying)
    expect(calls).toHaveLength(1)
  })
})
