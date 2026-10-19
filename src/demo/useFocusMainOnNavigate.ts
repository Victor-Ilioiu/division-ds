import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * A client-side route change replaces the page without a load, so a screen reader hears nothing
 * and keyboard focus stays on the link that was clicked, which may no longer exist. Moving focus
 * to the main landmark restarts reading at the new page's content. Skipped on the first render:
 * a fresh load already starts at the top of the document, and stealing focus then would skip the
 * skip link.
 *
 * Compares against the previous pathname in a ref rather than a "first render" boolean flag:
 * React 19's Strict Mode invokes a freshly mounted effect twice in development (effect, cleanup,
 * effect again) to surface effects that don't clean up after themselves. A boolean flag would be
 * consumed by the first of those two invocations, and the second -- the replay, still on the same
 * initial load -- would then find the flag already spent and steal focus to #main before the user
 * has done anything: a false-positive bug that exists only in dev. Comparing against the previous
 * pathname instead is idempotent across the replay: both invocations see the same "previous equals
 * current" pathname and skip, matching production, where the effect only ever runs once.
 *
 * `preventScroll: true` is load-bearing. `useScrollResetOnNavigate` has already put the page at
 * the top by the time this runs; a plain `focus()` then scrolled the focused landmark into view,
 * which on any page tall enough to scroll meant scrolling PAST the header to `#main`'s own top
 * (scrollY 65 on the docs shell), so every long page opened with its header cut off while a short
 * one, unable to scroll, looked fine. A full page load does not do that: it focuses nothing and
 * shows the top of the document. Focus still moves, for screen readers and the next Tab, without
 * moving the viewport. e2e/navigation.spec.ts pins it.
 */
export function useFocusMainOnNavigate() {
  const { pathname } = useLocation()
  const prev = useRef(pathname)
  useEffect(() => {
    if (prev.current === pathname) return
    prev.current = pathname
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
}
