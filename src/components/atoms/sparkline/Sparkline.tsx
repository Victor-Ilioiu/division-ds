import type { CSSProperties, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type SparklineTone = 'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'

export type SparklineProps = {
  /** Oldest first. */
  values: readonly number[]
  /** Required. The whole chart in one sentence, because the chart is one image to a screen reader:
   *  "Temperature, last hour: 3.1 to 4.2 °C, rising". */
  label: string
  /** The line's colour, with Badge's meanings. @default 'neutral' */
  tone?: SparklineTone
  /** A fixed bottom of the scale. Defaults to the lowest value (or the band's bottom). */
  min?: number
  /** A fixed top of the scale. Defaults to the highest value (or the band's top). */
  max?: number
  /** A range drawn behind the line, such as the safe band of a reading: 2 to 8 °C. */
  band?: { from: number; to: number }
  /** A square on the last value. */
  showLast?: boolean
  /** CSS px. Set `className="w-full"` to stretch to the container instead. @default 96 */
  width?: number
  /** CSS px. @default 24 */
  height?: number
  className?: string
  ref?: Ref<HTMLSpanElement>
}

/** The line, by tone: the tone's `accent.<tone>.text`, the step the system already measures at 3:1
 *  as a graphic on both surfaces; neutral is `text.secondary`. */
const STROKE: Record<SparklineTone, string> = {
  neutral: 'var(--color-text-secondary)',
  signal: 'var(--color-accent-signal-text)',
  ok: 'var(--color-accent-ok-text)',
  warning: 'var(--color-accent-warning-text)',
  hostile: 'var(--color-accent-hostile-text)',
  info: 'var(--color-accent-info-text)',
}

/** Room above and below the line, in viewBox units, so a 1.5px stroke at the extremes is not cut
 *  in half by the edge of the box. */
const INSET = 2

/**
 * A trend in a line, small enough to sit in a table cell or beside a Stat. Plain SVG, no chart
 * library: it has no axes, no tooltip and nothing to interact with, so it costs a few hundred
 * bytes, not Recharts' weight in the chunk every page loads.
 *
 * One `role="img"` named by `label`. The points are not exposed one by one: thirty numbers read
 * aloud are noise, and the sentence the caller writes ("3.1 to 4.2 °C, rising") is the reading a
 * sighted person takes from the shape. That makes `label` required, with no default.
 *
 * The SVG draws in a `width` x `height` viewBox with `preserveAspectRatio="none"`, so `w-full`
 * stretches it to its container; `vector-effect: non-scaling-stroke` keeps the line 1.5px however
 * far it is stretched. The last-value square is an HTML element positioned by percentages instead
 * of an SVG shape, because a shape inside a non-uniformly scaled viewBox would stretch into a
 * rectangle.
 *
 * Edge cases draw something honest rather than nothing: no values is the empty frame and a dashed
 * midline; one value, or a run of equal values, is a flat line (at mid height when the scale has
 * no span of its own). Non-finite values are dropped.
 *
 * Contrast rows, by exact name. Line: "accent.<tone>.text on surface.base" and "alert icon and
 * border (accent.<tone>.text) on surface.raised (over surface.base)" (signal: "badge subtle text
 * (accent.signal.text) on surface.raised (over surface.base)"); neutral: "text.secondary on
 * surface.base" and "alert body and ghost dismiss (text.secondary) on surface.raised (over
 * surface.base)". The band and the empty midline are hairlines, decorative and ungated: the line
 * is the information.
 */
export function Sparkline({
  values,
  label,
  tone = 'neutral',
  min,
  max,
  band,
  showLast = false,
  width = 96,
  height = 24,
  className,
  ref,
}: SparklineProps) {
  const points = values.filter(Number.isFinite)
  const low = min ?? Math.min(...points, ...(band ? [band.from, band.to] : []))
  const high = max ?? Math.max(...points, ...(band ? [band.from, band.to] : []))
  const span = high - low
  const usable = height - INSET * 2
  // A scale with no span (one value, a flat run, or min equal to max) puts everything at mid height.
  const y = (value: number) =>
    !Number.isFinite(span) || span <= 0
      ? height / 2
      : INSET + usable * (1 - (Math.min(Math.max(value, low), high) - low) / span)
  const x = (index: number) => (points.length < 2 ? 0 : (index / (points.length - 1)) * width)
  const line =
    points.length === 1
      ? `0,${y(points[0])} ${width},${y(points[0])}`
      : points.map((value, index) => `${x(index)},${y(value)}`).join(' ')
  const last = points.length > 0 ? { x: points.length === 1 ? width : x(points.length - 1), y: y(points[points.length - 1]) } : null
  const bandTop = band ? y(Math.max(band.from, band.to)) : 0
  const bandBottom = band ? y(Math.min(band.from, band.to)) : 0
  const stroke = STROKE[tone]

  return (
    <span
      ref={ref}
      data-tone={tone}
      // The size travels as two custom properties read by width and height utilities, so a
      // caller's `w-full` replaces the fixed width through tailwind-merge instead of losing to
      // an inline style.
      className={cn(
        'relative inline-block align-middle shrink-0 w-[var(--sparkline-w)] h-[var(--sparkline-h)]',
        className
      )}
      style={{ '--sparkline-w': `${width}px`, '--sparkline-h': `${height}px` } as CSSProperties}
    >
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full h-full overflow-visible"
      >
        {band && Number.isFinite(span) && span > 0 ? (
          <rect
            data-part="band"
            x={0}
            y={bandTop}
            width={width}
            height={Math.max(bandBottom - bandTop, 0)}
            fill="var(--color-border-hairline)"
          />
        ) : null}
        {points.length === 0 ? (
          <line
            data-part="empty"
            x1={0}
            x2={width}
            y1={height / 2}
            y2={height / 2}
            stroke="var(--color-border-hairline-strong)"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <polyline
            data-part="line"
            points={line}
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {showLast && last ? (
        <span
          aria-hidden="true"
          data-part="last"
          className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(last.x / width) * 100}%`, top: `${(last.y / height) * 100}%`, background: stroke }}
        />
      ) : null}
    </span>
  )
}
