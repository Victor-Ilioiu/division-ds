import type { HTMLAttributes, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type ScoreBand = 'hostile' | 'warning' | 'ok'

/** Lighthouse's own bands, and its own words for them: 0-49 poor, 50-89 needs improvement, 90-100
 *  good. Exported so a table or a summary sentence beside the rings can band a score the same way. */
export function scoreBand(value: number): ScoreBand {
  if (value >= 90) return 'ok'
  if (value >= 50) return 'warning'
  return 'hostile'
}

const BAND_WORDS: Record<ScoreBand, string> = { hostile: 'poor', warning: 'needs improvement', ok: 'good' }

/** The arc reads the same aliases Progress fills with (`accent.<tone>.text`, the theme-adaptive
 *  step), so a red score ring and a red Progress bar are the same red in both themes. */
const BAND_STROKE: Record<ScoreBand, string> = {
  hostile: 'var(--component-control-progress-fill-hostile)',
  warning: 'var(--component-control-progress-fill-warning)',
  ok: 'var(--component-control-progress-fill-ok)',
}

const SIZES = {
  sm: { svg: 'w-14 h-14', number: 'text-lg', stroke: 9 },
  md: { svg: 'w-24 h-24', number: 'text-3xl', stroke: 7 },
  lg: { svg: 'w-32 h-32', number: 'text-4xl', stroke: 6 },
} as const

export type ScoreRingProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Required. What is scored; the meter's accessible name and the caption under the ring. */
  label: string
  /** 0 to 100. Clamped and rounded: a score is a whole number. */
  value: number
  /** @default 'md' */
  size?: keyof typeof SIZES
  className?: string
  ref?: Ref<HTMLDivElement>
  children?: never
}

/**
 * A 0-100 score as a ring with the number in its centre: Lighthouse's four-score row is the model.
 *
 * It is a `meter`, not a chart: one bounded value, so it needs no Recharts, no table fallback and
 * no lazy loading, and it is an atom beside Progress rather than another ChartPanel kind. The
 * number is always printed, so the band colour is never the only signal (SC 1.4.1); the band is
 * also spoken, in Lighthouse's own words, through aria-valuetext.
 *
 * Shape: the ring is a circle because the owner asked for Lighthouse's radial score, and a
 * circular gauge is what reads as "out of 100" at a glance. It is made tactical rather than soft:
 * butt line caps (never round), and two hairline ticks outside the ring at 50 and 90, the band
 * boundaries, so a reader can see how close a 48 is to the next band without colour.
 *
 * Contrast rows: the arc is `accent.<tone>.text` as a graphic, "alert icon and border
 * (accent.<tone>.text) on surface.raised (over surface.base)" and the base rows; the number is
 * text.primary, the label text.secondary, both on the existing body-text rows. The track and the
 * ticks are decorative (border.hairline, text.muted) and carry no value of their own.
 */
export function ScoreRing({ label, value, size = 'md', className, ref, ...rest }: ScoreRingProps) {
  const score = Math.round(Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100))
  const band = scoreBand(score)
  const { svg, number, stroke } = SIZES[size]
  // Leave 4 units outside the ring for the threshold ticks.
  const radius = 50 - 4 - stroke / 2
  const circumference = 2 * Math.PI * radius
  const tick = (at: number) => {
    const angle = (at / 100) * 2 * Math.PI - Math.PI / 2
    const inner = radius + stroke / 2 + 0.5
    return {
      x1: 50 + inner * Math.cos(angle),
      y1: 50 + inner * Math.sin(angle),
      x2: 50 + 49.5 * Math.cos(angle),
      y2: 50 + 49.5 * Math.sin(angle),
    }
  }

  return (
    <div
      ref={ref}
      role="meter"
      aria-label={label}
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${score} out of 100, ${BAND_WORDS[band]}`}
      data-band={band}
      className={cn('inline-flex flex-col items-center gap-2', className)}
      {...rest}
    >
      <span className="relative inline-grid place-items-center">
        <svg viewBox="0 0 100 100" aria-hidden="true" className={cn(svg, 'block')}>
          <circle cx="50" cy="50" r={radius - stroke / 2} fill={BAND_STROKE[band]} fillOpacity={0.08} />
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-border-hairline)" strokeWidth={stroke} />
          <circle
            data-part="arc"
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={BAND_STROKE[band]}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - score / 100)}
            transform="rotate(-90 50 50)"
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-snap)]"
          />
          {[0, 50, 90].map(at => (
            <line key={at} {...tick(at)} stroke="var(--color-text-muted)" strokeWidth={1.5} />
          ))}
        </svg>
        <span
          className={cn(
            'absolute font-display font-bold leading-none tabular-nums text-[var(--color-text-primary)]',
            number
          )}
        >
          {score}
        </span>
      </span>
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-center text-[var(--color-text-secondary)]">
        {label}
      </span>
    </div>
  )
}
