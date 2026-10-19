import { useLayoutEffect, useRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { linkVariants } from '../components/atoms/link/Link'
import { DEMO_HOME } from './routes'
import { ErrorState } from './states/ErrorState'

export type DemoRouteErrorProps = {
  onRetry: () => void
  /** Set when `DemoErrorBoundary` caught a chunk-load failure (its own `CHUNK_LOAD_ERROR`) rather
   *  than an ordinary render throw -- that failure is a fetch for a lazy chunk that never arrived,
   *  not a bug in code that already loaded, so the copy blames the connection instead of
   *  "rendering". @default false */
  connectionIssue?: boolean
}

/**
 * `DemoErrorBoundary`'s fallback: a full page in place of whatever route just crashed, rendered
 * inside the demo chrome (Navbar and Footer sit outside `DemoErrorBoundary`, in `DemoLayout`
 * itself, so they stay mounted through this). Built on the shared `ErrorState` (`headingLevel={1}`,
 * since this fallback *replaces* the page and so needs to carry that page's own top-level heading
 * itself, rather than duplicating its icon/heading/retry markup here) plus one extra action below
 * it, "Go to the store home" -- a link `ErrorState`'s own single-retry shape has no slot for.
 *
 * No `role="alert"`: whatever crashed the page may have been the control that had focus (see
 * StatusError.tsx's own crash button, which throws from a click's own state update), so this
 * focuses `ErrorState`'s own heading on mount instead (via `headingRef`) -- the focus move itself
 * is the announcement to a screen reader, and turning `announce` on as well would be a second,
 * redundant one for the same event.
 *
 * `useLayoutEffect`, not `useEffect`: the crashed control is removed from the DOM in the same
 * commit that mounts this fallback, so `document.activeElement` is briefly `<body>` the instant
 * that commit lands. `useEffect` fires after the browser paints, which left at least one real
 * frame on screen with focus on body before this moved it on -- caught with a real
 * `requestAnimationFrame` sampler in e2e, which a single post-hoc read of `activeElement` never
 * would have. `useLayoutEffect` runs before paint, closing that gap.
 */
export function DemoRouteError({ onRetry, connectionIssue = false }: DemoRouteErrorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="px-gutter py-16">
      <ErrorState title="Something went wrong" headingLevel={1} headingRef={headingRef} onRetry={onRetry}>
        {connectionIssue
          ? "This page couldn't load. Check your connection, then try again."
          : 'This page ran into a problem while rendering. Try again, or go back to the store home.'}
      </ErrorState>
      <p className="text-center">
        <RouterLink to={DEMO_HOME} className={linkVariants()}>
          Go to the store home
        </RouterLink>
      </p>
    </div>
  )
}
