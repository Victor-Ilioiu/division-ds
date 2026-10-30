import { useState } from 'react'
import { Button } from '../../components/atoms/button/Button'
import { EmptyState } from '../states/EmptyState'
import { ErrorState } from '../states/ErrorState'

/** `main.tsx`'s own `onCaughtError` switches on this exact name to downgrade this one
 *  intentional crash's logging -- see that file's own comment. */
const DEMONSTRATION_ERROR_NAME = 'DemonstrationError'

/**
 * `/store/status/error`: a fixed reference for what this shell's error and empty states look
 * like, side by side, never linked from the Navbar. Three demos: an inline `ErrorState` whose
 * retry is wired to a real counter (proving the callback actually runs, not just that the button
 * renders), a plain `EmptyState`, and a button that throws during render -- caught by
 * `DemoErrorBoundary`, not by this page.
 */
export function StatusError() {
  const [retryCount, setRetryCount] = useState(0)
  const [crashed, setCrashed] = useState(false)

  // Throwing from an event handler (a plain `onClick`) never reaches a render-phase error
  // boundary -- React logs it as an unhandled rejection/exception and the tree carries on.
  // Storing the intent to crash in state and throwing from the render body itself, guarded by
  // that state, is what actually gives `DemoErrorBoundary` (mounted in `DemoLayout`, around this
  // whole route) a render-phase throw to catch.
  if (crashed) {
    throw Object.assign(new Error('Demonstration'), { name: DEMONSTRATION_ERROR_NAME })
  }

  return (
    <div className="px-gutter py-12 flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display font-semibold text-3xl text-[var(--color-text-primary)]">Error states</h1>
        <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-[68ch]">
          Three ways a page can fail to show what it meant to: a caught failure shown in place, an
          empty result, and a render that crashes the whole page.
        </p>
      </div>

      <ErrorState title="Couldn't load this section" onRetry={() => setRetryCount(count => count + 1)}>
        {retryCount === 0
          ? 'The request behind this block failed.'
          : `Retried ${retryCount} time${retryCount === 1 ? '' : 's'}. Still no luck in this demo.`}
      </ErrorState>

      <EmptyState title="No results">Nothing matches this filter.</EmptyState>

      <div className="flex flex-col items-center gap-3 p-10 text-center border border-dashed border-[var(--color-border-hairline)]">
        <h2 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">Full-page crash</h2>
        <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-[40ch]">
          Simulates a render error, caught by this route's own error boundary rather than by this
          page.
        </p>
        <Button variant="danger" onClick={() => setCrashed(true)}>
          Show the full-page error
        </Button>
      </div>
    </div>
  )
}
