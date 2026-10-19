import { describe, it, expect, vi, afterEach } from 'vitest'

interface LenisMockOptions {
  lerp: number
  smoothWheel: boolean
  syncTouch: boolean
  anchors: boolean
  respectReducedMotion: boolean
  prevent(): boolean
}

interface LenisMockInstance {
  options: LenisMockOptions
  raf: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  isStopped: boolean
  isScrolling: boolean | 'smooth' | 'native'
  stop: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

// Mocked so this test proves the wrapper's own logic (options passed through, the tab-hidden
// pause/resume, dispose's cleanup order) rather than exercising real Lenis internals -- the library's
// own behaviour (its classes, `destroy()`, wheel handling) is read straight from its source and
// recorded in design.md instead of re-verified here.
const { instances } = vi.hoisted(() => {
  const instances: LenisMockInstance[] = []
  return { instances }
})
vi.mock('lenis', () => {
  class LenisMock {
    options: LenisMockOptions
    raf = vi.fn()
    destroy = vi.fn()
    isStopped = false
    isScrolling: boolean | 'smooth' | 'native' = false
    stop = vi.fn(() => {
      this.isStopped = true
    })
    start = vi.fn(() => {
      this.isStopped = false
    })
    constructor(options: LenisMockOptions) {
      this.options = options
      instances.push(this as unknown as LenisMockInstance)
    }
  }
  return { default: LenisMock }
})

import { createSmoothScroll, getActiveLenis } from './smooth-scroll'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  instances.length = 0
  document.documentElement.className = ''
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
})

function stubRaf() {
  const queue: FrameRequestCallback[] = []
  const raf = vi.fn((cb: FrameRequestCallback) => {
    queue.push(cb)
    return queue.length
  })
  const cancel = vi.fn()
  vi.stubGlobal('requestAnimationFrame', raf)
  vi.stubGlobal('cancelAnimationFrame', cancel)
  return { raf, queue, cancel }
}

describe('createSmoothScroll', () => {
  it('constructs Lenis with the settled options: no anchor interception, native touch, its own reduced-motion handling off', () => {
    stubRaf()
    const handle = createSmoothScroll()
    const { prevent, ...rest } = instances[0].options
    // `allowNestedScroll`: a wheel over an element that scrolls the way the gesture goes is the
    // browser's, which is what lets a sideways swipe reach the homepage's sliders.
    expect(rest).toEqual({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      anchors: false,
      respectReducedMotion: false,
      allowNestedScroll: true,
    })
    expect(typeof prevent).toBe('function')
    handle.dispose()
  })

  it('`prevent` tracks data-scroll-locked on <body>, so a wheel inside an open overlay is never intercepted', () => {
    stubRaf()
    const handle = createSmoothScroll()
    const { prevent } = instances[0].options
    expect(prevent()).toBe(false)
    document.body.setAttribute('data-scroll-locked', '')
    expect(prevent()).toBe(true)
    document.body.removeAttribute('data-scroll-locked')
    handle.dispose()
  })

  it('a keydown while easing (isScrolling "smooth") stops and restarts Lenis, to drop a stale target', () => {
    stubRaf()
    const handle = createSmoothScroll()
    const lenis = instances[0]
    lenis.isScrolling = 'smooth'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(lenis.stop).toHaveBeenCalledTimes(1)
    expect(lenis.start).toHaveBeenCalledTimes(1)
    handle.dispose()
  })

  it('a keydown while not easing (native scroll, or already stopped) does nothing', () => {
    stubRaf()
    const handle = createSmoothScroll()
    const lenis = instances[0]
    lenis.isScrolling = 'native'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(lenis.stop).not.toHaveBeenCalled()
    lenis.isScrolling = 'smooth'
    lenis.isStopped = true
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(lenis.stop).not.toHaveBeenCalled()
    handle.dispose()
  })

  it('drives lenis.raf from one rAF loop that pauses while the tab is hidden, and resumes', () => {
    const { raf, queue, cancel } = stubRaf()
    const handle = createSmoothScroll()
    expect(raf.mock.calls.length).toBe(1)

    // Fire the pending tick: it calls lenis.raf and reschedules itself for the next frame.
    queue.shift()!(1)
    expect(instances[0].raf).toHaveBeenCalledWith(1)
    expect(raf.mock.calls.length).toBe(2)

    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(raf.mock.calls.length).toBe(2) // no new tick scheduled while hidden

    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(raf.mock.calls.length).toBe(3) // resumed: a fresh tick scheduled

    handle.dispose()
  })

  it('dispose cancels the loop, removes the visibility and keydown listeners, and destroys the instance', () => {
    const { cancel } = stubRaf()
    const removeDocSpy = vi.spyOn(document, 'removeEventListener')
    const removeWinSpy = vi.spyOn(window, 'removeEventListener')

    const handle = createSmoothScroll()
    handle.dispose()

    expect(cancel).toHaveBeenCalled()
    expect(instances[0].destroy).toHaveBeenCalled()
    expect(removeDocSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(removeWinSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)

    // A keydown after dispose must not still be wired to this (now-destroyed) instance.
    const lenis = instances[0]
    lenis.isScrolling = 'smooth'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(lenis.stop).not.toHaveBeenCalled()

    removeDocSpy.mockRestore()
    removeWinSpy.mockRestore()
  })

  // The mocked Lenis above never touches `<html>` itself (that's real Lenis's own job, read from
  // source and recorded in this module's comments, not re-verified here) -- this stands in for a
  // class Lenis's own `destroy()` was supposed to have already removed, but that a real browser
  // was observed putting back within a few hundred ms of `dispose()` returning.
  // Mutation: drop the whole `setTimeout(...)` block from `dispose()` -- the class below is still
  // there after 450ms, and the final assertion fails.
  it('strips a lenis class left on <html> again, about 450ms after dispose', () => {
    vi.useFakeTimers()
    const handle = createSmoothScroll()
    handle.dispose()
    document.documentElement.classList.add('lenis', 'lenis-scrolling')
    expect(document.documentElement.className).toContain('lenis')
    vi.advanceTimersByTime(450)
    expect(document.documentElement.className).toBe('')
  })

  // Mutation: drop the `instanceCounter === id` guard (strip unconditionally) -- the newer
  // instance's own class is gone after 450ms too, and the final assertion fails.
  it('never strips a class belonging to a newer instance created before the delay elapses', () => {
    vi.useFakeTimers()
    const first = createSmoothScroll()
    first.dispose()
    // A newer instance exists before the first one's own delayed sweep fires -- its class is the
    // one on <html> now, and it must survive that stale timer.
    const second = createSmoothScroll()
    document.documentElement.classList.add('lenis', 'lenis-scrolling')
    vi.advanceTimersByTime(450)
    expect(document.documentElement.className).toContain('lenis')
    second.dispose()
  })

  // Mutation: never set `activeLenis = lenis` in `createSmoothScroll` (or never clear it in
  // `dispose`) -- this returns `undefined` while an instance is running, or a stale, destroyed
  // instance after it stops, either way not what `useScrollResetOnNavigate` needs to call
  // `lenis.scrollTo` on the real, live instance.
  it('exposes the instance currently running, and nothing once it is disposed', () => {
    stubRaf()
    expect(getActiveLenis()).toBeUndefined()
    const handle = createSmoothScroll()
    expect(getActiveLenis()).toBe(handle.lenis)
    handle.dispose()
    expect(getActiveLenis()).toBeUndefined()
  })
})
