import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'

export type TimelineTone = 'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'

export type TimelineProps = {
  /** Required. Names the list: "Activity on Depot 4". */
  label: string
  /** TimelineItem rows, TimelineGroup sections, or both. */
  children: ReactNode
  className?: string
}

export type TimelineGroupProps = {
  /** A day or a period: "Today", "Yesterday", "Week 41". */
  title: string
  /** The title's heading level, under the page's own outline. @default 3 */
  level?: 2 | 3 | 4
  children: ReactNode
}

export type TimelineItemProps = {
  /** A lucide icon. Decorative: the title says what happened. */
  icon: ReactNode
  /** Colours the marker, with Badge's meanings. Never the only cue: the title says it in words.
   *  @default 'neutral' */
  tone?: TimelineTone
  /** What happened, one line: "Call with Ilse Varga". */
  title: ReactNode
  /** Beside the title: who did it, an outcome Badge. */
  meta?: ReactNode
  /** ISO datetime, for `<time dateTime>`. */
  time: string
  /** What is shown for the time: "09:40", "Mon 12 Oct". */
  timeLabel: string
  /** Body text under the title. */
  children?: ReactNode
  /** More, behind a "Show details" button. */
  details?: ReactNode
}

/**
 * Events in time order down a rail: what happened to a depot, a shipment, an account. An `ol`
 * named by `label` (the order is the information), holding TimelineItem rows directly or inside
 * TimelineGroup sections ("Today", "Yesterday"); both shapes are valid HTML, because a group is
 * itself a list item holding its heading and a nested `ol`.
 *
 * `role="list"` is written out on every `ol`: with the markers removed, Safari drops a list's
 * semantics, and a screen reader stops saying how many events there are.
 *
 * The rail is drawn per item, as Stepper's vertical connector is: a 1px hairline from under each
 * marker to the next, absent after the last item of a list, so the rail stops where the events do
 * and never runs under a marker that sits on a surface the rail cannot know.
 */
export function Timeline({ label, children, className }: TimelineProps) {
  return (
    <ol role="list" aria-label={label} className={cn('flex flex-col list-none m-0 p-0', className)}>
      {children}
    </ol>
  )
}

/**
 * A titled run of events: a day, a week. The title is a mono label with a hairline running to the
 * edge, the same treatment as the docs' section labels, at the heading level the page needs.
 *
 * Title colour: "text.secondary on surface.base" and "alert body and ghost dismiss
 * (text.secondary) on surface.raised (over surface.base)".
 */
export function TimelineGroup({ title, level = 3, children }: TimelineGroupProps) {
  const Heading = `h${level}` as const
  const headingId = useId()
  return (
    <li className="flex flex-col [&:not(:first-child)]:mt-6">
      <div className="flex items-center gap-3 mb-3">
        <Heading
          id={headingId}
          className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]"
        >
          {title}
        </Heading>
        <span aria-hidden="true" className="h-px grow bg-[var(--color-border-hairline)]" />
      </div>
      <ol role="list" aria-labelledby={headingId} className="flex flex-col list-none m-0 p-0">
        {children}
      </ol>
    </li>
  )
}

/** The marker's icon and outline, by tone. A tone's `accent.<tone>.text` is the colour the system
 *  already measures as text and as an icon on both surfaces; neutral is `text.secondary`. */
const TONE: Record<TimelineTone, string> = {
  neutral: 'text-[var(--color-text-secondary)] border-[var(--color-border-hairline-strong)]',
  signal: 'text-[var(--color-accent-signal-text)] border-[var(--color-accent-signal-text)]',
  ok: 'text-[var(--color-accent-ok-text)] border-[var(--color-accent-ok-text)]',
  warning: 'text-[var(--color-accent-warning-text)] border-[var(--color-accent-warning-text)]',
  hostile: 'text-[var(--color-accent-hostile-text)] border-[var(--color-accent-hostile-text)]',
  info: 'text-[var(--color-accent-info-text)] border-[var(--color-accent-info-text)]',
}

const RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * One event. A 28px square marker with the icon in the tone's colour (square, as Stepper's
 * markers are: the avatar is the system's only circle), the title line with its meta, the time on
 * the right in mono, then the body.
 *
 * The time is a `<time dateTime>`, so the machine-readable instant travels with the short label a
 * person reads. `details` sit behind a disclosure button ("Show details", `aria-expanded`,
 * `aria-controls`), not an Accordion: one optional extra per event, not a set of panels. The
 * revealed block arrives with `anim-snap-in`, which reduced motion stops.
 *
 * Contrast rows, by exact name. Title: "text.primary on surface.base" and "text.primary on
 * surface.raised (over surface.base)". Body, time and the disclosure button: "text.secondary on
 * surface.base" and "alert body and ghost dismiss (text.secondary) on surface.raised (over
 * surface.base)". Toned markers: "accent.<tone>.text on surface.base" and "alert icon and border
 * (accent.<tone>.text) on surface.raised (over surface.base)"; the signal tone, "accent.signal.text
 * on surface.base". The neutral marker's outline and the rail are hairlines, decorative and ungated.
 */
export function TimelineItem({
  icon,
  tone = 'neutral',
  title,
  meta,
  time,
  timeLabel,
  children,
  details,
}: TimelineItemProps) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  return (
    <li className="group/item flex gap-3">
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          data-tone={tone}
          className={cn(
            'inline-flex items-center justify-center w-7 h-7 shrink-0 border [&_svg]:w-3.5 [&_svg]:h-3.5',
            TONE[tone]
          )}
        >
          {icon}
        </span>
        <span
          aria-hidden="true"
          data-part="rail"
          className="w-px grow min-h-3 my-1 bg-[var(--color-border-hairline-strong)] group-last/item:hidden"
        />
      </div>
      <div className="min-w-0 grow pt-1 pb-5 group-last/item:pb-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-body text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
          {meta === undefined ? null : (
            <div className="flex flex-wrap items-center gap-2 font-body text-sm text-[var(--color-text-secondary)]">
              {meta}
            </div>
          )}
          <time
            dateTime={time}
            className="ml-auto font-mono text-xs uppercase tracking-[0.12em] tabular-nums text-[var(--color-text-secondary)]"
          >
            {timeLabel}
          </time>
        </div>
        {children === undefined ? null : (
          <div className="mt-1 font-body text-sm text-[var(--color-text-secondary)]">{children}</div>
        )}
        {details === undefined ? null : (
          <>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen(value => !value)}
              className={cn(
                'mt-2 inline-flex items-center gap-1 min-h-6 font-mono text-xs uppercase tracking-[0.12em]',
                'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                RING
              )}
            >
              {open ? 'Hide details' : 'Show details'}
              <ChevronDown
                aria-hidden="true"
                className={cn('w-3.5 h-3.5 transition-transform duration-[var(--duration-fast)] motion-reduce:transition-none', open && 'rotate-180')}
              />
            </button>
            <div
              id={detailsId}
              hidden={!open}
              className="anim-snap-in mt-2 pl-3 border-l border-[var(--color-border-hairline-strong)] font-body text-sm text-[var(--color-text-secondary)]"
            >
              {details}
            </div>
          </>
        )}
      </div>
    </li>
  )
}
