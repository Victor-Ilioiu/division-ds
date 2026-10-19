import { useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cn } from '../../../lib/cn'
import { Tooltip } from '../../atoms/tooltip/Tooltip'

export type StatusTrackerStatus = 'ok' | 'warning' | 'hostile' | 'neutral'

export type StatusTrackerItem = {
  /** Stable key. */
  id: string
  /** ok up or healthy; warning degraded; hostile down or failed; neutral no data. */
  status: StatusTrackerStatus
  /** The period and what happened in it: "12 Oct: 2 alerts, 14 min degraded". */
  label: string
}

export type StatusTrackerProps = {
  /** Required. Names the row: "Uptime, last 30 days". */
  label: string
  /** Oldest first. */
  items: readonly StatusTrackerItem[]
  /** Shown on the right of the label row: "99.2% up". */
  summary?: ReactNode
  /** The word said and shown for each status, before each bar's own label. Defaults: Operational,
   *  Degraded, Down, No data. */
  statusLabels?: Partial<Record<StatusTrackerStatus, string>>
  className?: string
  ref?: Ref<HTMLDivElement>
}

const STATUS_WORDS: Record<StatusTrackerStatus, string> = {
  ok: 'Operational',
  warning: 'Degraded',
  hostile: 'Down',
  neutral: 'No data',
}

/** The bar's fill, by status. Each is a colour the system already gates at 3:1 as a graphic on
 *  both surfaces (SC 1.4.11): `accent.<tone>.text` for the three states, and `border.selection`
 *  (Rating's empty star) for no data, so a quiet day is still a visible bar and not a gap. */
const FILL: Record<StatusTrackerStatus, string> = {
  ok: 'bg-[var(--color-accent-ok-text)]',
  warning: 'bg-[var(--color-accent-warning-text)]',
  hostile: 'bg-[var(--color-accent-hostile-text)]',
  neutral: 'bg-[var(--color-border-selection)]',
}

/** Text of one bar: the status word first, then the caller's label. Shared by the accessible name
 *  and the tooltip, so what is heard and what is seen are the same sentence. */
export function statusTrackerText(item: StatusTrackerItem, words: Record<StatusTrackerStatus, string> = STATUS_WORDS) {
  return `${words[item.status]}. ${item.label}`
}

/**
 * Health over time as a row of thin bars, one per period: thirty days, ninety days, the last
 * hour in minutes. Oldest on the left.
 *
 * **Never colour alone.** Each bar's text is the status word followed by the caller's label
 * ("Degraded. 12 Oct: 2 alerts, 14 min degraded"), and that one string is both the bar's
 * accessible name and the Tooltip shown on hover and on focus. The words are overridable through
 * `statusLabels` for a row that tracks something other than uptime.
 *
 * **Semantics.** A `ul` named by `label`, one `li` per bar, so a screen reader announces "list,
 * 30 items" and the position of each. Inside each `li` the bar is an element with `role="img"`,
 * `aria-roledescription="status bar"` and the text above as its name. An image and not a button,
 * because a bar does nothing when activated; focusable because the keyboard needs a way to reach
 * the tooltip, and a sighted keyboard user has no other way to read one bar.
 *
 * **Keyboard.** One tab stop for the whole row (roving tabindex): Tab lands on the last focused
 * bar, the newest at first; Left and Right move one bar, Home and End go to the ends. Moving
 * focus opens that bar's tooltip, because Radix opens a tooltip on keyboard focus.
 *
 * **Fit.** Bars share the width (`flex-1`, `min-w-0`) with a 1px gap, so ninety bars fit at 320px
 * (about 2px each). The row is 32px tall, the height that keeps a bar a reasonable pointer target
 * however thin it gets.
 *
 * Requires the root `TooltipProvider` (AppShell, DemoLayout).
 */
export function StatusTracker({ label, items, summary, statusLabels, className, ref }: StatusTrackerProps) {
  const words = { ...STATUS_WORDS, ...statusLabels }
  const labelId = useId()
  const [active, setActive] = useState<number | null>(null)
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  // The newest bar holds the tab stop until something else has been focused.
  const current = active === null || active >= items.length ? items.length - 1 : active

  const move = (index: number) => {
    const next = Math.min(Math.max(index, 0), items.length - 1)
    setActive(next)
    bars.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
    const to = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: items.length - 1,
    }[event.key]
    if (to === undefined) return
    event.preventDefault()
    move(to)
  }

  return (
    <div ref={ref} className={cn('flex flex-col gap-2 min-w-0', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span
          id={labelId}
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]"
        >
          {label}
        </span>
        {summary === undefined ? null : (
          <span className="font-mono text-xs tabular-nums text-[var(--color-text-primary)]">{summary}</span>
        )}
      </div>
      <ul role="list" aria-labelledby={labelId} className="flex gap-px h-8 list-none m-0 p-0">
        {items.map((item, index) => {
          const text = statusTrackerText(item, words)
          return (
            <li key={item.id} className="flex flex-1 min-w-0">
              <Tooltip content={text}>
                <span
                  ref={node => {
                    bars.current[index] = node
                  }}
                  role="img"
                  aria-roledescription="status bar"
                  aria-label={text}
                  data-status={item.status}
                  tabIndex={index === current ? 0 : -1}
                  onKeyDown={event => onKeyDown(event, index)}
                  onFocus={() => setActive(index)}
                  className={cn(
                    'block w-full h-full',
                    FILL[item.status],
                    // Hover marks the bar with a hairline outline, never a lighter fill: dimming
                    // the bar would take it under the 3:1 its colour is gated at.
                    'hover:outline-1 hover:outline-offset-1 hover:outline-[var(--color-border-hairline-strong)]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
                  )}
                />
              </Tooltip>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
