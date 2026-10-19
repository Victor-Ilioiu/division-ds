import { useEffect, useRef } from 'react'
import { motionAllowed, onReducedMotionChange } from '../fx/core/gate'
import { createSmoothScroll, type SmoothScrollHandle } from '../fx/smooth-scroll'

/** A coarse/touch pointer already scrolls physically -- Lenis fighting it there reads as lag,
 *  not weight, so smooth scroll is fine-pointer only, alongside the `motionAllowed()` gate for
 *  reduced motion and save-data. */
function pointerFine(): boolean {
  return window.matchMedia?.('(pointer: fine)').matches ?? false
}

/**
 * Mounts a single Lenis instance for the Hexline demo shell (DemoLayout), never the docs shell
 * -- the docs shell simply never calls this hook, so it never creates one. Gated the same way
 * every effect is: motion must be allowed (`?fx=force` included, save-data excluded) AND the
 * pointer must be fine. A reduced-motion flip mid-session tears the instance down (and the
 * `lenis` class off `<html>` with it, via Lenis's own `destroy()`) or builds a fresh one, live.
 *
 * Radix's scroll lock (`react-remove-scroll`, under Sheet/Dialog -- CartSheet included) sets
 * `data-scroll-locked` on `<body>` while a modal is open. A MutationObserver on that one
 * attribute calls `lenis.stop()`/`start()`, and `fx/smooth-scroll.ts`'s own `prevent` option
 * backs Lenis off a wheel event entirely for as long as that attribute is present -- between the
 * two, the page behind an open CartSheet neither scrolls nor fights the lock, while a wheel
 * *inside* the sheet's own scrollable list still reaches it natively, unblocked by `stop()`.
 *
 * Scroll position on a route change is not this hook's job any more -- it moved up to
 * `useScrollResetOnNavigate` (called from `RouteFocus` in `App.tsx`, alongside
 * `useFocusMainOnNavigate`) so a docs-to-docs navigation resets too, not only one inside the demo
 * shell this hook alone ever mounts under.
 */
export function useSmoothScroll(): void {
  const handleRef = useRef<SmoothScrollHandle | null>(null)

  useEffect(() => {
    function sync() {
      const wants = motionAllowed() && pointerFine()
      if (wants && !handleRef.current) {
        handleRef.current = createSmoothScroll()
        // A sheet or dialog can already be open the moment this instance is created (a
        // reduced-motion flip back to "allowed" while CartSheet is open, say) -- the
        // scroll-lock effect below only reacts to a CHANGE in `data-scroll-locked`, so a handle
        // born while it is already present needs its own, one-time check.
        if (document.body.hasAttribute('data-scroll-locked')) handleRef.current.lenis.stop()
      } else if (!wants && handleRef.current) {
        handleRef.current.dispose()
        handleRef.current = null
      }
    }
    sync()
    const off = onReducedMotionChange(sync)
    return () => {
      off()
      handleRef.current?.dispose()
      handleRef.current = null
    }
  }, [])

  useEffect(() => {
    const mo = new MutationObserver(() => {
      const lenis = handleRef.current?.lenis
      if (!lenis) return
      if (document.body.hasAttribute('data-scroll-locked')) lenis.stop()
      else lenis.start()
    })
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] })
    return () => mo.disconnect()
  }, [])
}
