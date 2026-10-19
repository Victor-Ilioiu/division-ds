import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getActiveLenis } from '../fx/smooth-scroll'

/**
 * Resets scroll to the top on a route change, called once from `RouteFocus` in `App.tsx` --
 * outside `useSmoothScroll`, which only ever mounts under the Hexline demo shell (DemoLayout),
 * so a docs-to-docs navigation (ButtonDocs to CardDocs, say) previously had nothing resetting it
 * at all. Lenis-aware when the demo shell's own instance is running (`getActiveLenis`,
 * `fx/smooth-scroll.ts`): `lenis.scrollTo(0, { immediate: true })` moves Lenis's own tracked
 * position, not just the browser's native one, so a wheel scroll right after a route change does
 * not fight a stale target Lenis still thinks it owns. A plain `window.scrollTo(0, 0)` otherwise
 * -- every docs route, and any demo route reached before Lenis has had a chance to mount.
 *
 * Keyed on `pathname` alone, never the full location: a query-string-only change (a filter's
 * `?tag=`, Care's `?billing=`, Orders' `?page=`) must not reset the scroll position.
 *
 * A `useLayoutEffect`, not `useEffect`: it has to commit before `useFocusMainOnNavigate`'s own
 * passive effect moves focus, matching what a full page load does -- scroll first, then focus.
 * Skipped on the first render (a fresh load already starts at the top), compared against the
 * previous pathname in a ref rather than a "first render" boolean flag -- the same reasoning
 * `useFocusMainOnNavigate` documents: React 19's Strict Mode invokes a freshly mounted effect
 * twice in development, and a boolean flag would be spent by the first of those two invocations,
 * resetting scroll on the second (the replay, still the same initial load) even though `pathname`
 * never actually changed.
 */
export function useScrollResetOnNavigate() {
  const { pathname } = useLocation()
  const prev = useRef(pathname)
  useLayoutEffect(() => {
    if (prev.current === pathname) return
    prev.current = pathname
    const lenis = getActiveLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [pathname])
}
