import type { HTMLAttributes, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type SegmentedMeterTone =
  | 'signal' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'red'

export type SegmentedMeterProps = HTMLAttributes<HTMLDivElement> & {
  /** How many segments are filled. */
  value: number
  /** Total number of segments. */
  max: number
  /** Segments, after the filled ones, that are struck through (not applicable). Default 0. */
  none?: number
  /** Fill colour. `signal` is the accent; the rest are the category fills. Default `signal`. */
  tone?: SegmentedMeterTone
  /** Accessible name, e.g. "Tasks done". Required: a meter without a name is just squares. */
  label: string
  /** Spoken value, e.g. "3 of 5 done". Defaults to "{value} of {max}". */
  valueText?: string
  ref?: Ref<HTMLDivElement>
}

const fill = (tone: SegmentedMeterTone) =>
  tone === 'signal' ? 'var(--color-accent-signal-fill)' : `var(--color-category-${tone}-fill)`

/**
 * A row of small squares: filled, empty, or struck through. Squares are graphics, so empty ones
 * use a `text.muted` outline (gated above 3:1 on every surface); filled ones carry the tone.
 */
export function SegmentedMeter({
  value, max, none = 0, tone = 'signal', label, valueText, className, style, ref, ...rest
}: SegmentedMeterProps) {
  const total = Math.max(0, Math.floor(max))
  const filled = Math.min(total, Math.max(0, Math.floor(value)))
  const struck = Math.min(total - filled, Math.max(0, Math.floor(none)))
  return (
    <div
      ref={ref}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={filled}
      aria-valuetext={valueText ?? `${filled} of ${total}`}
      className={cn('inline-flex items-center gap-[3px]', className)}
      style={{ ...style, ['--meter-fill' as string]: fill(tone) }}
      {...rest}
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i < filled ? 'on' : i < filled + struck ? 'none' : 'off'
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              'relative size-2.5 shrink-0 border',
              state === 'on'
                ? 'border-[var(--meter-fill)] bg-[var(--meter-fill)]'
                : 'border-[var(--color-text-muted)] bg-transparent',
              state === 'none' &&
                "after:absolute after:inset-0 after:content-[''] after:bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--color-text-muted)_calc(50%-0.5px),var(--color-text-muted)_calc(50%+0.5px),transparent_calc(50%+0.5px))]",
            )}
          />
        )
      })}
    </div>
  )
}
