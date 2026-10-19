import type { ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type SectionHeadingProps = {
  /** The heading's text, and so the name of any section that points `aria-labelledby` at `id`. */
  title: string
  /** Required, with no default: the right level depends on where the heading sits in the page's
   *  outline, which only the page knows. A default would be a guess that reads as a decision. */
  level: 2 | 3 | 4
  /** One or two sentences under the title. */
  description?: ReactNode
  /** A single trailing control, usually a link to the full list ("All replicas"). */
  action?: ReactNode
  /** The section's position in a numbered run, drawn above the title as a two-digit numeral.
   *  Decoration: it is `aria-hidden`, so the heading is named by its title alone. */
  index?: number
  /** Lands on the heading element, not the wrapper, so `<section aria-labelledby={id}>` names the
   *  section by its title. */
  id?: string
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * The heading that opens a section of a page: a title, an optional description and an optional
 * trailing action, under a hairline that marks where the section starts.
 *
 * Two motifs, both already in the system, neither new. The hairline is `border.hairline-strong`,
 * the rule a docs section opens under. The index is "numerals as heroes" at label scale: tabular
 * mono figures with the leading zero dimmed to `numeral.pad` and the significant digit in
 * `accent.signal.text`, the theme-adaptive step, because at this size a numeral is text and the
 * `.fill` step only clears 3:1 on the light page. No cut corner and no crosshair: a heading is
 * neither a single object nor a frame around several.
 *
 * The index sits ABOVE the title, on its own line, and not in front of it (Victor, 2026-10-02).
 * In front, the numeral pushed every numbered title 2.5ch to the right of its own description and
 * of the content under it; above, the title, the description and the section's content share one
 * left edge, and the numeral reads as a label for the section and not as the title's first word.
 * It stays inside the heading element so the two cannot be separated by a wrap or a reorder.
 *
 * A closed prop set, spread onto nothing: the heading's level, id and name are all computed here,
 * so there is no `rest` for a caller's attribute to override them through.
 *
 * `@container` on the root, so the title steps up with the space the heading is given rather than
 * with the viewport, and the action drops under the text when the two no longer fit on one row.
 *
 * Contrast rows, by exact name: title "text.primary on surface.base"; description
 * "text.secondary on surface.base"; index digit "accent.signal.text on surface.base"; index pad
 * "numeral.pad on surface.base (dimmed, banded)". It is drawn on the page surface; on a raised
 * panel the pad's row is "numeral.pad on surface.raised (over surface.base) (dimmed, banded)".
 */
export function SectionHeading({ title, level, description, action, index, id, className, ref }: SectionHeadingProps) {
  const Heading = `h${level}` as const
  const digits = index === undefined ? '' : String(index)
  const pad = '0'.repeat(Math.max(0, 2 - digits.length))
  return (
    <div
      ref={ref}
      className={cn('@container border-t border-[var(--color-border-hairline-strong)] pt-5', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Heading
            id={id}
            className="flex flex-col items-start gap-1.5 font-display text-xl font-semibold uppercase leading-tight tracking-[0.02em] text-[var(--color-text-primary)] @2xl:text-2xl"
          >
            {index === undefined ? null : (
              <span aria-hidden="true" className="font-mono text-sm font-semibold leading-none tabular-nums tracking-normal">
                {pad ? <span className="text-[var(--color-numeral-pad)]">{pad}</span> : null}
                <span className="text-[var(--color-accent-signal-text)]">{digits}</span>
              </span>
            )}
            {/* Its own span: the heading is a column, the numeral on the first line. */}
            <span className="min-w-0 max-w-full [overflow-wrap:anywhere]">{title}</span>
          </Heading>
          {description ? (
            <p className="max-w-[60ch] font-body text-sm text-[var(--color-text-secondary)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
