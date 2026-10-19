import type { ReactNode } from 'react'
import { PackageSearch } from 'lucide-react'
import { cn } from '../../lib/cn'

export type EmptyStateProps = {
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * A quiet placeholder for a filtered-to-nothing list -- an unknown Field notes tag today, an
 * empty Orders table wherever the account section adds one later. No live role of its own:
 * everywhere it is used so far, a page-level `role="status"` already narrates the count that
 * dropped to zero (see Field notes' own persistent "{n} notes" line), so a second announcement
 * on this block would repeat the same event twice. A future caller that mounts this with no such
 * count region of its own should add `role="status"` at that call site rather than here, where
 * it would be a second live region racing every other one just to be safe.
 */
export function EmptyState({ title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 p-10 text-center border border-dashed border-[var(--color-border-hairline)]',
        className
      )}
    >
      <PackageSearch aria-hidden="true" className="w-8 h-8 text-[var(--color-text-muted)]" />
      <h2 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">{title}</h2>
      {children ? (
        <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-[40ch]">{children}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
