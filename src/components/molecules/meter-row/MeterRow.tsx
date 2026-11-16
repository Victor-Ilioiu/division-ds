import type { ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'
import type { CategoryColor } from '../../atoms/badge/Badge'

export type MeterScale = 'linear' | 'log'

/** Bars use the category TEXT token, not the fill: the fills measure 2.37:1 on surface.base in
 *  light (gray), under the 3:1 graphic floor; every `-text` token passes 3:1 in both themes.
 *  Written out so Tailwind's scanner sees each class. */
const BAR_COLOR: Record<CategoryColor, string> = {
  gray: 'bg-[var(--color-category-gray-text)]',
  brown: 'bg-[var(--color-category-brown-text)]',
  orange: 'bg-[var(--color-category-orange-text)]',
  yellow: 'bg-[var(--color-category-yellow-text)]',
  green: 'bg-[var(--color-category-green-text)]',
  teal: 'bg-[var(--color-category-teal-text)]',
  blue: 'bg-[var(--color-category-blue-text)]',
  purple: 'bg-[var(--color-category-purple-text)]',
  pink: 'bg-[var(--color-category-pink-text)]',
  red: 'bg-[var(--color-category-red-text)]',
}

/** 0..1 share of the track. Log uses log10(v + 1) so 0 maps to 0 and never to -Infinity. */
function meterFraction(value: number, max: number, scale: MeterScale = 'linear'): number {
  if (!(max > 0) || !(value > 0)) return 0
  const f = scale === 'log' ? Math.log10(value + 1) / Math.log10(max + 1) : value / max
  return Math.min(1, Math.max(0, f))
}

export type MeterBarProps = {
  value: number
  max: number
  /** A category colour. Use at most ~5 categories in one view; past that the hues stop reading
   *  as groups. Never signal orange's job: categories say "same group", not "act here".
   *  @default 'gray' */
  color?: CategoryColor
  /** @default 'linear' */
  scale?: MeterScale
  className?: string
}

/** The 2px bar under a MeterRow, a ListItem or a Sidebar item. Decorative (aria-hidden): the
 *  number beside it carries the value. The track is the hairline border token. */
export function MeterBar({ value, max, color = 'gray', scale = 'linear', className }: MeterBarProps) {
  return (
    <span aria-hidden="true" className={cn('block h-0.5 w-full bg-[var(--color-border-hairline)]', className)}>
      <span
        className={cn('block h-full', BAR_COLOR[color])}
        style={{ width: `${meterFraction(value, max, scale) * 100}%` }}
      />
    </span>
  )
}

/** Brightness ladder, never a size change. All three pass 4.5:1 on surface.base in both themes
 *  (text.muted: 5.35:1 dark, 11.44:1 light). */
const STATE_TEXT = {
  active: 'text-[var(--color-text-active)]',
  rest: 'text-[var(--color-text-rest)]',
  pending: 'text-[var(--color-text-pending)]',
} as const

export type MeterRowProps = MeterBarProps & {
  /** Required. The row's name, in the body face. */
  label: ReactNode
  /** The formatted value shown at the right ("12.4K"). @default String(value) */
  display?: ReactNode
  /** Text brightness: active primary, rest secondary, pending muted. @default 'rest' */
  state?: 'active' | 'rest' | 'pending'
  /** Makes the row one link. The label is the link; it stretches over the row. */
  href?: string
  renderLink?: (props: LinkRenderProps) => ReactNode
  /** Makes the row one button. Ignored when `href` is set. */
  onActivate?: () => void
  ref?: Ref<HTMLDivElement>
}

const STRETCHED = cn(
  'text-left outline-none hover:underline underline-offset-2',
  "after:absolute after:inset-0 after:content-['']",
  'focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]'
)

/** Label left, tabular value right (data face), a 2px category bar below. For ranked lists:
 *  top tags, token spend per project. Pair a log-scaled list with a MeterAxis. */
export function MeterRow({
  label,
  value,
  max,
  display,
  scale = 'linear',
  color,
  state = 'rest',
  href,
  renderLink = renderAnchor,
  onActivate,
  className,
  ref,
}: MeterRowProps) {
  let name: ReactNode = label
  if (href !== undefined) name = renderLink({ href, className: STRETCHED, children: label })
  else if (onActivate)
    name = (
      <button type="button" onClick={onActivate} className={STRETCHED}>
        {label}
      </button>
    )
  return (
    <div ref={ref} className={cn('relative flex flex-col gap-1 py-1.5 min-w-0', STATE_TEXT[state], className)}>
      <div className="flex items-baseline justify-between gap-3 min-w-0">
        <span className="min-w-0 truncate font-body text-sm">{name}</span>
        <span className="shrink-0 font-data text-sm">{display ?? String(value)}</span>
      </div>
      <MeterBar value={value} max={max} color={color} scale={scale} />
    </div>
  )
}

function formatTick(n: number) {
  if (n >= 1e9) return `${n / 1e9}B`
  if (n >= 1e6) return `${n / 1e6}M`
  if (n >= 1e3) return `${n / 1e3}K`
  return String(n)
}

export type MeterAxisProps = {
  /** The same max the rows use. */
  max: number
  /** Tick values. @default powers of ten from 1K up to max */
  ticks?: number[]
  /** @default 'log' */
  scale?: MeterScale
  className?: string
}

/** Tick labels (1K / 10K / 100K) under a list of MeterRows, placed on the same scale as the bars.
 *  Decorative: each row states its own value. */
export function MeterAxis({ max, ticks, scale = 'log', className }: MeterAxisProps) {
  const values = ticks ?? (() => {
    const out: number[] = []
    for (let t = 1000; t <= max; t *= 10) out.push(t)
    return out
  })()
  return (
    <div aria-hidden="true" className={cn('relative h-4 font-data text-[11px] text-[var(--color-text-muted)]', className)}>
      {values.map(t => (
        <span
          key={t}
          className="absolute top-0 border-l border-[var(--color-border-hairline-strong)] pl-1"
          style={{ left: `${meterFraction(t, max, scale) * 100}%` }}
        >
          {formatTick(t)}
        </span>
      ))}
    </div>
  )
}
