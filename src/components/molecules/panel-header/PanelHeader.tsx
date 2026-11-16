import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type PanelHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Panel number shown in a filled signal tag. A number is padded to two digits ("01"). */
  index?: number | string
  /** The panel's title. Shown uppercase and tracked in the display font. */
  title: ReactNode
  /** Right-aligned quiet readout (counts, timestamps, ids). Set in the data font. */
  meta?: ReactNode
  /** Heading level of the title. Default 2. */
  level?: 2 | 3 | 4 | 5 | 6
  ref?: Ref<HTMLDivElement>
}

/**
 * A panel's header bar: a numbered signal tag, a tracked display title and a muted meta
 * slot. The tag's digits are `accent.signal.ink` on `accent.signal.fill` (the primary button's
 * gated pair); the meta reads `text.secondary`, gated on every surface.
 */
export function PanelHeader({ index, title, meta, level = 2, className, ref, ...rest }: PanelHeaderProps) {
  const Heading = `h${level}` as const
  const tag = typeof index === 'number' ? String(index).padStart(2, '0') : index
  return (
    <div ref={ref} className={cn('flex items-center gap-2 min-w-0', className)} {...rest}>
      {tag !== undefined ? (
        <span className="font-data shrink-0 px-1.5 py-0.5 text-[11px] font-semibold leading-none bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)]">
          {tag}
        </span>
      ) : null}
      <Heading className="min-w-0 truncate font-display text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
        {title}
      </Heading>
      {meta !== undefined ? (
        <span className="font-data ml-auto shrink-0 text-xs text-[var(--color-text-secondary)]">{meta}</span>
      ) : null}
    </div>
  )
}
