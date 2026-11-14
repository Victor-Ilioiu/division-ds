import type { HTMLAttributes, Ref } from 'react'
import { Progress as RadixProgress } from 'radix-ui'
import { cn } from '../../../lib/cn'

// The fill is the ONLY conveyance of value when `showValue` is false (its default), so SC
// 1.4.11 measures it against the colour adjacent to it — the track (surface.sunken) — not the
// page. `accent.<tone>.fill` is theme-invariant and fails that pairing in light theme on all
// four tones (as low as 1.17:1); `component.control.progress.fill.<tone>` aliases
// `accent.<tone>.text`, the theme-adaptive step of the same hue, which clears 3:1 in both themes
// on every tone. Dark theme is unchanged visually — dark's `.text` and `.fill` are the same
// primitive stop for every tone.
//
// EXCEPT signal, by Victor's decision on 2026-09-22: it paints `accent.signal.indicator` so the bar is
// the same orange as Slider's range in both themes. In light theme that measures 2.80:1 on the
// track, BELOW SC 1.4.11's 3:1, and this was accepted knowingly over two passing alternatives (a
// dark light-theme track, or keeping the darker `.text` step). The contrast gate records it as a
// named exception rather than measuring a token this file no longer reads. A caller who needs
// the bar to pass in light theme can set `showValue`, which puts the value in text. Radio's
// checked indicator (2026-09-23) took the same exception for the same reason — see Radio.tsx —
// so `component.control.indicator.checked` is unread by any component now, same as this file
// reads no `component.control.progress.fill.signal`.
const TONE_STROKE = {
  signal: 'stroke-[var(--color-accent-signal-indicator)]',
  ok: 'stroke-[var(--component-control-progress-fill-ok)]',
  warning: 'stroke-[var(--component-control-progress-fill-warning)]',
  hostile: 'stroke-[var(--component-control-progress-fill-hostile)]',
} as const

const TONE_FILL = {
  signal: 'bg-[var(--color-accent-signal-indicator)]',
  ok: 'bg-[var(--component-control-progress-fill-ok)]',
  warning: 'bg-[var(--component-control-progress-fill-warning)]',
  hostile: 'bg-[var(--component-control-progress-fill-hostile)]',
} as const

/** Every native div prop is available and lands on the OUTER wrapper, not on the Radix
 *  `Progress.Root` — the accessible name (`aria-label`) and the value attributes
 *  (`aria-valuenow`/`aria-valuemax`) are computed on Root, a different element `rest` never
 *  touches. So unlike Divider's `role` or Avatar's `aria-label`, there is nothing here for a
 *  caller-supplied rest prop to silently outrank: the wrapper only ever computes a merged
 *  `className`, same as Badge/Tag, so no `aria-*` key needs to be typed `never`.
 *
 *  `children` is the one exclusion: `HTMLAttributes` offers it, but this component renders its
 *  own label row and track as JSX children of that wrapper, so a caller's `children` is
 *  silently discarded — reachable, typed, and dead. It is an ordinary key, so the `Omit` does
 *  the rejecting and the declared `never` only makes the error legible; both are shipped,
 *  matching `IconButton`. */
export type ProgressProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Required. Without it the bar announces a number and nothing else. */
  label: string
  /** null means indeterminate — Radix's own convention. */
  value: number | null
  max?: number
  showValue?: boolean
  tone?: keyof typeof TONE_FILL
  /** Opt-in: a value above `max` is shown as it is (e.g. a budget at 112%) instead of clamped
   *  to 100%. The track rescales to span the value, a marker sits where `max` falls, the part
   *  past the marker paints hostile, and the readout shows the real value in hostile; aria-valuetext also says how far over it is. */
  allowOverMax?: boolean
  /** `ring` draws a circular indicator, the readout in its centre and the label beneath it, for a
   *  countdown or session timer. Same value/max contract as the bar; `allowOverMax` does not
   *  apply to it (the value is clamped). It is not a live region: a timer that
   *  ticks every second would talk over the user. Announce milestones (like "Session done") from
   *  your own status message. */
  shape?: 'bar' | 'ring'
  className?: string
  ref?: Ref<HTMLDivElement>
  children?: never
}

export function Progress({
  label,
  value,
  max = 100,
  showValue = false,
  tone = 'signal',
  allowOverMax = false,
  shape = 'bar',
  className,
  ref,
  ...rest
}: ProgressProps) {
  // Clamp before doing anything else with `value`. An out-of-range value (e.g. value=150,
  // max=100) fed straight to Radix's Root is treated as invalid: Radix logs its own
  // console.error and falls back to `null`/indeterminate for ITS `aria-valuenow`/`data-state`,
  // while an unclamped `pct` here would still paint the fill past the track (translateX math
  // goes negative-of-negative and the visible fill jumps to the wrong side) and the text readout
  // would print "150%" — three different, disagreeing signals for one bad prop. Clamping once,
  // here, and feeding the SAME clamped value to Radix's `value` keeps the fill, the readout and
  // the announced state in agreement (all read "100% / complete") instead of each independently
  // guessing what an invalid value means.
  // `max` needs the same treatment as `value`, for the same reason. A max of 0 divides by zero
  // and paints `NaN%` with `translateX(-NaN%)` — a bar with no fill, a readout reading "NaN%",
  // and Radix announcing its own fallback: three disagreeing signals again. A negative max is
  // worse, because the arithmetic quietly works out to a full bar. Radix's own Root falls back
  // to 100 for an invalid max; matching that keeps the fill, the readout and the announced value
  // saying the same thing.
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const clampedValue = value === null ? null : Math.min(Math.max(value, 0), safeMax)
  // allowOverMax (issue #4): clamping hides overspending, so a 112% budget read as exactly on
  // budget. When opted in and value > max, the REAL value drives the readout and aria-valuenow;
  // Radix still gets the clamped value (it rejects out-of-range values), and its aria attributes
  // are overridden on Root. The track rescales to span `value`, so the fill stays full and a
  // marker shows where `max` sits; only the overshoot paints hostile. The part up to max keeps
  // its tone on purpose: it says "this much was within the limit, this much is over", which a
  // fully red bar cannot.
  const over = allowOverMax && value !== null && Number.isFinite(value) && value > safeMax
  const realPct = value === null ? null : Math.round((value / safeMax) * 100)
  const pct = over ? realPct : clampedValue === null ? null : Math.round((clampedValue / safeMax) * 100)
  const overBy = over && realPct !== null ? realPct - 100 : 0
  // Where max falls on the rescaled track, as a percentage of its width.
  const markerAt = over ? (safeMax / (value as number)) * 100 : 100

  if (shape === 'ring') {
    const ringPct = clampedValue === null ? null : Math.round((clampedValue / safeMax) * 100)
    return (
      <div className={cn('inline-flex flex-col items-center gap-2', className)} {...rest}>
        <RadixProgress.Root
          ref={ref}
          value={clampedValue}
          max={safeMax}
          aria-label={label}
          className="relative size-24"
        >
          <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className="stroke-[var(--color-surface-sunken)]" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              pathLength={100}
              strokeDasharray={`${ringPct ?? 100} 100`}
              className={cn(
                'transition-[stroke-dasharray] [transition-duration:var(--duration-slow)]',
                '[transition-timing-function:var(--ease-snap)] motion-reduce:transition-none',
                TONE_STROKE[tone],
                value === null && 'animate-pulse motion-reduce:animate-none'
              )}
            />
          </svg>
          {showValue ? (
            <span
              data-part="ring-readout"
              className="absolute inset-0 flex items-center justify-center font-display text-xl tabular-nums text-[var(--color-text-primary)]"
            >
              {ringPct === null ? <span className="text-sm">In progress</span> : `${ringPct}%`}
            </span>
          ) : null}
        </RadixProgress.Root>
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} {...rest}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
          {label}
        </span>
        {showValue ? (
          // M3: the real number is in the DOM from the first render. Any count-up animation is
          // decoration over text that was already correct, so nothing is announced mid-roll.
          //
          // The readout is the hero here, not the label: 24px display against an 11px mono
          // label, where both used to sit at roughly 13px and the number carried no more weight
          // than the word beside it. design.md names "numerals as heroes (tabular figures,
          // dimmed leading zeros)" as a motif and Progress is one of only two atoms that render
          // a numeral at all, so this is where it belongs.
          //
          // The leading zeros are padding, not value. They are `aria-hidden` and rendered as a
          // separate dimmed span, so a screen reader still hears "40%" rather than "zero four
          // zero percent", while the visible readout keeps a constant three-digit width and
          // never reflows the row as the bar advances. That is also what tabular-nums is for;
          // the pad handles the digit COUNT changing, which tabular figures cannot.
          <span
            className={cn(
              'font-display text-2xl leading-none tabular-nums',
              over ? 'text-[var(--color-accent-hostile-text)]' : 'text-[var(--color-text-primary)]'
            )}
          >
            {pct === null ? (
              <span className="text-sm">In progress</span>
            ) : (
              <>
                {pct < 100 ? (
                  <span aria-hidden="true" className="text-[var(--color-numeral-pad)]">
                    {pct < 10 ? '00' : '0'}
                  </span>
                ) : null}
                {`${pct}%`}
              </>
            )}
          </span>
        ) : null}
      </div>
      <RadixProgress.Root
        ref={ref}
        value={clampedValue}
        max={safeMax}
        aria-label={label}
        {...(over
          ? { 'aria-valuenow': value as number, 'aria-valuetext': `${realPct}%, ${overBy}% over`, 'data-over': '' }
          : {})}
        className={cn(
          'relative h-1.5 w-full bg-[var(--color-surface-sunken)]',
          // The fill sits at translateX(0) when over, so nothing can leak; the marker needs to
          // stand proud of the 6px track to read as a limit line, not a seam.
          over ? 'overflow-visible' : 'overflow-hidden'
        )}
      >
        <RadixProgress.Indicator
          className={cn(
            'h-full w-full transition-transform [transition-duration:var(--duration-slow)]',
            '[transition-timing-function:var(--ease-snap)] motion-reduce:transition-none',
            TONE_FILL[tone],
            value === null && 'animate-pulse motion-reduce:animate-none'
          )}
          style={{
            // Determinate: reveal exactly `pct`% of the track by shifting the full-width fill
            // left by the unrevealed remainder.
            // Indeterminate (pct === null): shift by 0 — the fill spans the WHOLE track and only
            // the opacity pulse communicates activity. It deliberately does not settle on any
            // partial fraction (the earlier `pct ?? 40` did, and a static 40%-filled bar reads as
            // "stalled at 40%", contradicting the adjacent "In progress" text). Under
            // prefers-reduced-motion the pulse is disabled and this becomes a plain, static full
            // track — read together with "In progress", that still doesn't claim a completion
            // amount, unlike a static partial fill would.
            transform: `translateX(-${pct === null || over ? 0 : 100 - pct}%)`,
          }}
        />
        {over ? (
          <>
            <span
              aria-hidden="true"
              data-part="overshoot"
              className="absolute inset-y-0 right-0 bg-[var(--component-control-progress-fill-hostile)]"
              style={{ left: `${markerAt}%` }}
            />
            <span
              aria-hidden="true"
              data-part="max-marker"
              className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-[var(--color-text-primary)]"
              style={{ left: `${markerAt}%` }}
            />
          </>
        ) : null}
      </RadixProgress.Root>
    </div>
  )
}
