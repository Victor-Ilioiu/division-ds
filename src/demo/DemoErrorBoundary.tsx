import { Component, type ErrorInfo, type ReactNode } from 'react'
import { DemoRouteError } from './DemoRouteError'

export type DemoErrorBoundaryProps = {
  children: ReactNode
  onRetry: () => void
  /** `DemoLayout`'s own `path`. Watched in `componentDidUpdate`, deliberately NOT folded into
   *  this component's React `key` -- see the module doc comment below for why. */
  resetKey: string
}

type DemoErrorBoundaryState = {
  error: Error | null
}

/** Browser dynamic-import failure wording, across the phrasing this matters for: Chrome/Vite
 *  ("Failed to fetch dynamically imported module"), Firefox ("error loading dynamically imported
 *  module"), and Vite's own dev-server wording ("Importing a module script failed"). `React.lazy`
 *  caches the *rejected* promise forever once one of these fires, so calling the same lazy
 *  component again -- an ordinary "Try again" -- resuspends on that same rejection and crashes
 *  again immediately. Only a hard reload fetches a fresh module graph. */
const CHUNK_LOAD_ERROR = /dynamically imported module|importing a module script failed/i

/**
 * `errorElement` does nothing under `<BrowserRouter>` -- it needs a data router, and so do
 * `useRouteError`/`useMatches`. This is a plain class boundary instead, mounted inside
 * `DemoLayout`'s `<main>` around `<Suspense><Outlet/></Suspense>` only, so Navbar and Footer
 * (siblings of `<main>` in `DemoLayout`, not descendants of it) stay mounted and usable through a
 * crash rather than disappearing with the rest of the page.
 *
 * The error lives in this component's own state, captured by `getDerivedStateFromError` -- never
 * `useRouteError()`, which is a data-router hook and would return nothing here.
 *
 * Two different things clear that state, on purpose kept apart rather than merged into one:
 * - **"Try again"** (`DemoRouteError`'s own action, through `handleRetry` below, unless it's a
 *   chunk-load failure -- see `CHUNK_LOAD_ERROR`) bumps `DemoLayout`'s own `resetCount`, which
 *   `DemoLayout` puts on this component's React `key`. Throwing this whole instance away and
 *   growing a fresh one is what actually clears whatever *local* state the crashed page itself
 *   was carrying, not just this boundary's own `state.error` -- clearing that in place, on the
 *   same instance, would leave the same crashed child sitting in the tree, ready to crash again
 *   the moment anything re-rendered it.
 * - **A route change** (`resetKey`, `DemoLayout`'s own `path`) instead clears `state.error` in
 *   `componentDidUpdate`, on the SAME instance -- `resetKey` is a plain prop, never folded into
 *   the `key` itself. An earlier version keyed this component on `${path}:${resetCount}` together,
 *   which also remounts `<Suspense>` on every navigation and briefly blanks `<main>` to its own
 *   "Loading…" fallback even when the destination's lazy chunk is already cached from an earlier
 *   visit -- caught in review against a real browser. Reusing the same boundary instance across an
 *   ordinary navigation keeps `<Suspense>` itself unremounted, so it never re-shows a fallback for
 *   content that was never actually going to make anyone wait.
 */
export class DemoErrorBoundary extends Component<DemoErrorBoundaryProps, DemoErrorBoundaryState> {
  state: DemoErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): DemoErrorBoundaryState {
    return { error }
  }

  componentDidUpdate(prevProps: DemoErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Not console.error: e2e/fixtures.ts fails any test where one fires, and a boundary catching
    // the error it exists to catch is this working as intended, not a bug to surface that way.
    // main.tsx's own `onCaughtError` stays silent for this same error when it's a demonstration
    // crash (see its own comment), so exactly one log reaches the console per crash, not two.
    console.warn(error, info.componentStack)
  }

  handleRetry = () => {
    if (this.state.error && CHUNK_LOAD_ERROR.test(this.state.error.message)) {
      // An ordinary retry would resuspend on the same cached rejection and crash again
      // immediately -- see `CHUNK_LOAD_ERROR`'s own comment. A hard reload is the only thing that
      // actually helps here.
      window.location.reload()
      return
    }
    this.props.onRetry()
  }

  render() {
    if (this.state.error) {
      return (
        <DemoRouteError onRetry={this.handleRetry} connectionIssue={CHUNK_LOAD_ERROR.test(this.state.error.message)} />
      )
    }
    return this.props.children
  }
}
