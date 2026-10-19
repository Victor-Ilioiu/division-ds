import type { ReactNode, Ref } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '../../components/atoms'
import { cn } from '../../lib/cn'

export type ErrorStateProps = {
  title: string
  children?: ReactNode
  onRetry?: () => void
  /** @default 'Try again' */
  retryLabel?: string
  className?: string
  /** The heading's own ref, so a caller that needs to move focus onto it (a boundary fallback
   *  that just mounted, replacing a page that crashed) can do so without reaching past this
   *  component for its DOM node. */
  headingRef?: Ref<HTMLHeadingElement>
  /** `2` for an inline block sitting inside a page that already has its own `<h1>` (every caller
   *  so far); `1` for a caller that *replaces* the whole page (`DemoRouteError`) and so needs to
   *  carry that page's own top-level heading itself.
   *  @default 2 */
  headingLevel?: 1 | 2
  /** `role="alert"` only when set -- earned when the error is the result of something that just
   *  happened *after* the page had already loaded (a request that failed, a retry that failed
   *  again), the exact case Alert's own `live` prop documents role="alert" for. Left `false` (the
   *  default) for an error shown as ordinary page content from the very first render -- an alert
   *  announces a *change*, and there has been none yet for a screen reader user who has not
   *  interacted with anything. A caller whose own focus already moves onto `headingRef` on mount
   *  (`DemoRouteError`) also leaves this `false`: the focus move itself is the announcement, and
   *  turning this on too would be a second, redundant one for the same event.
   *  @default false */
  announce?: boolean
}

/**
 * A caught failure, rendered in place of whatever didn't render.
 */
export function ErrorState({
  title,
  children,
  onRetry,
  retryLabel = 'Try again',
  className,
  headingRef,
  headingLevel = 2,
  announce = false,
}: ErrorStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div
      role={announce ? 'alert' : undefined}
      className={cn('flex flex-col items-center gap-3 p-10 text-center', className)}
    >
      <TriangleAlert aria-hidden="true" className="w-8 h-8 text-[var(--color-accent-hostile-text)]" />
      <Heading
        ref={headingRef}
        tabIndex={-1}
        className={cn(
          'font-display font-semibold text-[var(--color-text-primary)] focus:outline-none',
          headingLevel === 1 ? 'text-2xl' : 'text-lg'
        )}
      >
        {title}
      </Heading>
      {children ? (
        <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-[40ch]">{children}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
