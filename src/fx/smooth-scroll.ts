/**
 * A thin Lenis wrapper (design.md's "Demo site and effects"): the exact options this project
 * settled on, and the one rAF loop that drives it, paused while the tab is hidden so a
 * backgrounded tab never spends CPU smoothing a scroll no one can see move.
 *
 * No click handler here, and none in Lenis either (`anchors: false`): the skip link and every
 * in-page `#` link stay completely native. Lenis wraps the native scroll -- it syncs off the
 * browser's own `scroll` event -- rather than intercepting anchor clicks itself.
 *
 * Gating (motion allowed, a fine pointer) and lifecycle (route changes, the scroll-lock
 * MutationObserver) live one level up, in `src/demo/useSmoothScroll.ts`. This module only knows
 * how to stand up and tear down one Lenis instance.
 *
 * **A real Lenis characteristic (`node_modules/lenis/dist/lenis.mjs`'s `Dimensions` class):**
 * `autoResize` (on by default) measures `document.documentElement`'s `scrollHeight` once at
 * construction, then only again through a *debounced* (250ms) `ResizeObserver` on that same
 * element. Every demo page is `React.lazy`, so Lenis is constructed the instant `DemoLayout`
 * mounts -- against whatever height the Suspense fallback happens to have, shorter than the real
 * page that swaps in a moment later. Left alone, `limit` (Lenis's own public getter for the
 * scroll range) stays wrong for up to that 250ms once the real content lands, and a wheel scroll
 * in that window has nothing to scroll into. A second, plain `ResizeObserver` here calls
 * `lenis.dimensions.resize()` itself, with no debounce, so the real height is picked up on
 * whichever paint actually changed it rather than waiting out Lenis's own timer -- the narrower
 * `dimensions.resize()` rather than the public `lenis.resize()`, which also resets
 * `animatedScroll`/`targetScroll` to the current position and would cut a wheel scroll's own
 * easing short on every resize, not just the one that matters here.
 */

import Lenis from 'lenis'

declare global {
  interface Window {
    __lenis?: Lenis
  }
}

/** `lerp: 0.1` matches Lenis's own default (named here anyway, since a future Lenis major could
 *  change its default under this call and this project should not move with it silently);
 *  `syncTouch: false` leaves touch scrolling native, which is already physical; `anchors: false`
 *  is what keeps every `#` link out of Lenis's own click handling entirely.
 *  `respectReducedMotion: false`: `fx/core/gate.ts`'s `motionAllowed()` already owns the
 *  reduced-motion decision one level up (`useSmoothScroll` never even constructs a Lenis
 *  instance once it is false), so Lenis's own, separate reduced-motion handling would only ever
 *  double-check a caller who has already decided -- and `?fx=force` needs the smoothing to
 *  actually show once motion is forced back on, which Lenis's own `respectReducedMotion: true`
 *  default would otherwise flatten `lerp` to `1` for regardless.
 *  `prevent`: Radix's scroll lock (`react-remove-scroll`, under `Sheet`/`Dialog`) sets
 *  `data-scroll-locked` on `<body>` while a modal is open, and already blocks a wheel event
 *  outside the open overlay on its own -- Lenis backing off entirely while that attribute is
 *  present is what lets a wheel *inside* the overlay's own scrollable list still scroll it
 *  natively, rather than Lenis's `stop()` preventing that wheel event outright along with every
 *  other one.
 *  `allowNestedScroll`: a wheel event over an element that can itself scroll in the direction of
 *  the gesture is left to the browser. Without it Lenis takes any wheel event with a vertical
 *  part, and a trackpad swipe sideways always has one: over the homepage's sliders (the Carousel
 *  organism, a native horizontal scroll container) the swipe was swallowed and the track did not
 *  move. A wheel straight down over a slider is still Lenis's, since the track cannot scroll that
 *  way. */
const OPTIONS = {
  lerp: 0.1,
  smoothWheel: true,
  syncTouch: false,
  anchors: false,
  respectReducedMotion: false,
  allowNestedScroll: true,
  prevent: () => document.body.hasAttribute('data-scroll-locked'),
} as const

export interface SmoothScrollHandle {
  lenis: Lenis
  dispose(): void
}

/** Bumped once per `createSmoothScroll()` call -- the guard a delayed class-strip in `dispose()`
 *  reads to tell whether it is still the most recent instance's own cleanup, or a stale timer
 *  from one already replaced by a newer instance (a reduced-motion flip back to "allowed" twice
 *  in quick succession, say). Never reset: it only ever counts up. */
let instanceCounter = 0

/** The Lenis instance `useScrollResetOnNavigate` (App.tsx's RouteFocus) reaches for when a route
 *  change needs to move the Hexline demo shell's own scroll position without fighting it --
 *  `undefined` outside the demo shell, where no instance is ever created, and on every docs
 *  route, which never calls `createSmoothScroll` at all. */
let activeLenis: Lenis | undefined

export function getActiveLenis(): Lenis | undefined {
  return activeLenis
}

/** Strips every `lenis`/`lenis-*` class Lenis's own `updateClassName` (read from
 *  `node_modules/lenis/dist/lenis.mjs`) can put on `<html>`, the same two conditions that
 *  function itself checks. Lenis's own `destroy()` already does this once, synchronously
 *  (`cleanUpClassName`); this is the second, delayed sweep `dispose()` schedules below. */
function stripLenisClasses() {
  for (const className of Array.from(document.documentElement.classList)) {
    if (className === 'lenis' || className.startsWith('lenis-')) document.documentElement.classList.remove(className)
  }
}

/** Creates a Lenis instance and starts driving it. Callers decide *whether* to call this
 *  (`useSmoothScroll`'s motion/pointer gate); this function only knows how to run one once asked. */
export function createSmoothScroll(): SmoothScrollHandle {
  const lenis = new Lenis(OPTIONS)
  const id = ++instanceCounter
  activeLenis = lenis
  // Dev-only: never ships in a production build. Reading `lenis.limit`/`.isStopped`/`.dimensions`
  // directly from a real browser's console is what this exists for.
  if (import.meta.env.DEV) window.__lenis = lenis

  let raf = 0
  const tick = (time: number) => {
    lenis.raf(time)
    raf = requestAnimationFrame(tick)
  }
  const resume = () => {
    if (raf !== 0) return
    raf = requestAnimationFrame(tick)
  }
  const pause = () => {
    if (raf === 0) return
    cancelAnimationFrame(raf)
    raf = 0
  }
  const onVisibility = () => (document.hidden ? pause() : resume())
  document.addEventListener('visibilitychange', onVisibility)
  resume()

  // See the module comment: closes the gap between a lazy route's real content landing and
  // Lenis's own 250ms-debounced resize noticing it.
  const ro = new ResizeObserver(() => lenis.dimensions.resize())
  ro.observe(document.documentElement)

  // A keyboard-driven scroll (Tab to a control below the fold, End, PageDown) sets
  // `targetScroll`/`animatedScroll` through the native `scroll` event Lenis listens for, but if a
  // wheel gesture is still easing toward an OLDER target when that happens, the next few rAF
  // ticks keep pulling the position back toward that stale target, fighting the keyboard action
  // that just ran. Stopping and immediately restarting resets Lenis's own internal state
  // (`reset()`, read from its source) to the scroll position the keyboard action actually landed
  // on, without touching `isStopped` itself -- it is already `false` here, since this only runs
  // while a smooth (not native, not stopped) scroll is still in flight.
  const onKey = () => {
    if (!lenis.isStopped && lenis.isScrolling === 'smooth') {
      lenis.stop()
      lenis.start()
    }
  }
  window.addEventListener('keydown', onKey, true)

  return {
    lenis,
    dispose() {
      pause()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('keydown', onKey, true)
      ro.disconnect()
      lenis.destroy()
      if (import.meta.env.DEV) delete window.__lenis
      if (activeLenis === lenis) activeLenis = undefined
      // Lenis's own destroy() already strips its class synchronously, but this project has seen
      // `<html>` still carrying one shortly afterward in a real browser -- a docs route reached
      // by following a footer link within a few hundred ms of the demo shell (and this instance)
      // unmounting. A second sweep, delayed past that window, catches it. Guarded against
      // `instanceCounter` moving on: a reduced-motion flip back to "allowed" (or another
      // navigation into the demo shell) before this timer fires means a NEWER instance is now
      // driving `<html>`'s own class, and this stale timer must not strip a class that is no
      // longer this instance's to own.
      setTimeout(() => {
        if (instanceCounter === id) stripLenisClasses()
      }, 450)
    },
  }
}
