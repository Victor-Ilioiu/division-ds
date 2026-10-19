import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLoop } from './loop'

describe('createLoop: a self-stop from inside frame()', () => {
  afterEach(() => vi.unstubAllGlobals())

  // A caller may call `handle.stop()` from inside its own `frame(dt)` callback, while `tick` is
  // mid-execution (the removed scroll-scrub engine's idle stop did, which is how this was found). `stop()`'s own `pause()` cancels the id that is already
  // running -- a no-op -- so the loop only actually halts if `tick` itself checks `wanted`
  // again after `frame()` returns, before scheduling the next frame.
  it('does not reschedule once frame() stops the loop on itself', () => {
    const queue: FrameRequestCallback[] = []
    const raf = vi.fn((cb: FrameRequestCallback) => {
      queue.push(cb)
      return queue.length
    })
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })

    const el = document.createElement('div')
    let ticks = 0
    let handle: ReturnType<typeof createLoop>
    handle = createLoop({
      el,
      frame() {
        ticks++
        if (ticks === 2) handle.stop()
      },
    })
    handle.start()
    expect(queue.length).toBe(1)

    // Tick 1: frame() runs once, doesn't stop itself, the loop reschedules as normal.
    queue.shift()!(performance.now())
    expect(queue.length).toBe(1)

    // Tick 2: frame() calls stop() on itself mid-tick. Must not reschedule.
    queue.shift()!(performance.now())
    expect(ticks).toBe(2)
    expect(queue.length).toBe(0)
    expect(handle.running).toBe(false)
  })
})
