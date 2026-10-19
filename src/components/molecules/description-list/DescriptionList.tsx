import type { ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type DescriptionListItem = {
  /** The name of the field: "Serial", "Last seen". Shown as a mono label. */
  term: string
  /** Its value: text, a Badge, a Link. */
  description: ReactNode
}

export type DescriptionListProps = {
  items: readonly DescriptionListItem[]
  /** Columns at full width. Fewer as the container narrows, one below 28rem. @default 1 */
  columns?: 1 | 2 | 3
  className?: string
  ref?: Ref<HTMLDivElement>
}

/** The grid per `columns`, by container width rather than viewport: a list in a side Sheet or a
 *  Card column is narrow on a wide screen, and the breakpoint must follow the space it has. */
const GRID = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @md:grid-cols-2',
  3: 'grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3',
} as const

/**
 * Facts about one thing as term and value pairs: a device's serial and firmware, an order's
 * dates, an account's owner. A real `dl`, each pair wrapped in a `div` (valid HTML since 5.2, and
 * what lets a pair be one grid cell), so a screen reader hears the term with its value.
 *
 * The term is the system's label role (mono, uppercase, 11px, `text.secondary`), the value body
 * text in `text.primary` underneath, and a hairline above each pair, the readout look Stat and
 * Progress already have. The columns collapse with `@container` queries on the root, the way
 * PageHeader and Cart do, so they follow the width the list is given rather than the screen.
 *
 * Contrast rows, by exact name. Term: "text.secondary on surface.base" and "alert body and ghost
 * dismiss (text.secondary) on surface.raised (over surface.base)". Value: "text.primary on
 * surface.base" and "text.primary on surface.raised (over surface.base)". The hairline is
 * decorative and ungated.
 */
export function DescriptionList({ items, columns = 1, className, ref }: DescriptionListProps) {
  return (
    <div ref={ref} className={cn('@container min-w-0', className)}>
      <dl className={cn('grid gap-x-6 m-0', GRID[columns])}>
        {items.map((item, index) => (
          <div
            // Terms repeat across lists but are not expected to repeat inside one; the index keeps
            // a duplicate from colliding.
            key={`${item.term}-${index}`}
            className="flex flex-col gap-1 min-w-0 py-3 border-t border-[var(--color-border-hairline)]"
          >
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
              {item.term}
            </dt>
            <dd className="m-0 font-body text-sm text-[var(--color-text-primary)] break-words">{item.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
