import { describe, it, expect, afterEach, vi } from 'vitest'
import { motionAllowed, onReducedMotionChange } from './gate'

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.delete(fn),
  }
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))
  return { mql, listeners }
}

afterEach(() => {
  delete (navigator as { connection?: unknown }).connection
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/')
})

describe('motionAllowed', () => {
  it('is false when reduced-motion matches', () => {
    stubMatchMedia(true)
    expect(motionAllowed()).toBe(false)
  })

  it('is true when reduced-motion matches and ?fx=force is set', () => {
    stubMatchMedia(true)
    window.history.replaceState(null, '', '/?fx=force')
    expect(motionAllowed()).toBe(true)
  })

  it('is false when save-data is on, even with ?fx=force', () => {
    stubMatchMedia(true)
    window.history.replaceState(null, '', '/?fx=force')
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })
    expect(motionAllowed()).toBe(false)
  })
})

describe('onReducedMotionChange', () => {
  it('calls the callback with the new value and removes the listener on cleanup', () => {
    const { listeners } = stubMatchMedia(false)
    const fn = vi.fn()
    const off = onReducedMotionChange(fn)
    expect(listeners.size).toBe(1)

    for (const listener of listeners) listener({ matches: true } as MediaQueryListEvent)
    expect(fn).toHaveBeenCalledWith(true)

    off()
    expect(listeners.size).toBe(0)
  })
})
