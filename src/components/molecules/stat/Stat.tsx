import type { HTMLAttributes, Ref } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../../lib/cn'

export type StatDelta = {
  /** Already formatted, e.g. "12%". */
  value: string
  direction: 'up' | 'down'
  /** Whether this movement is good. Independent of direction: fewer failed syncs is down AND good. */
  sentiment: 'positive' | 'negative' | 'neutral'
  /** What it is compared with, e.g. "last week". Spoken and shown. */
  period: string
}

export type StatProps = HTMLAttributes<HTMLDivElement> & {
  label: string
  /** Integers are padded; anything else (e.g. "4.2k") is shown as given. */
  value: number | string
  unit?: string
  /** Pad an integer value to this many digits with dimmed, aria-hidden zeros. */
  padTo?: number
  delta?: StatDelta
  ref?: Ref<HTMLDivElement>
}

/** Direction is shown as a shape (an arrow); sentiment is coloured -- on the arrow only -- and
 *  spoken. They are independent props because the two do not always agree: fewer failed syncs is
 *  a `down` delta with a `positive` sentiment. The `sr-only` sentence below states direction,
 *  amount, period AND sentiment together, so a screen-reader user gets the full picture. **For a
 *  sighted user, sentiment currently rests on the arrow's colour alone** -- direction has the
 *  arrow's shape, but nothing shape- or word-codes sentiment independent of hue. Sentiment stays
 *  on the arrow's colour only (accepted by Victor, 2026-09-24); see `BUILD-LOG.md`'s Stat entry
 *  for the two alternatives considered (a visible word, or a second glyph).
 *
 *  The tone colour paints ONLY the arrow glyph, a graphic. `accent.ok.text` / `accent.hostile.text`
 *  are gated at 4.5:1 on `surface.base` by contrast-pairs.mjs's "accent.ok.text on surface.base"
 *  and "accent.hostile.text on surface.base" rows, and at 3:1 (SC 1.4.11's graphic floor) on
 *  `surface.raised` by "alert icon and border (accent.<tone>.text) on surface.raised (over
 *  surface.base)" -- reused rather than duplicated. Neutral's `text.secondary` icon clears both
 *  floors via that token's own 4.5:1 body-text rows ("text.secondary on surface.base" and "alert
 *  body and ghost dismiss (text.secondary) on surface.raised").
 *
 *  The delta's amount and period text is `text.secondary`, NOT the tone colour: the arrow already
 *  carries the sentiment, and a tone colour on the amount would make the least important part of
 *  the delta the loudest. `text.secondary` keeps the amount and the "vs {period}" qualifier one
 *  quiet colour, gated at 4.5:1 on both surfaces by the same two rows named above. */
const SENTIMENT = {
  positive: { className: 'text-[var(--color-accent-ok-text)]', words: 'an improvement' },
  negative: { className: 'text-[var(--color-accent-hostile-text)]', words: 'a decline' },
  neutral: { className: 'text-[var(--color-text-secondary)]', words: 'neither better nor worse' },
} as const

/**
 * One number that matters, and how it has moved. The numerals-as-heroes motif as a component.
 *
 * Semantics are a `dl` pair turned inside out: `label` is a `dt`, `value` a `dd`, so a screen
 * reader hears "Kits dispatched, 18" -- the natural reading order, and also the natural visual
 * one (the label sits above, small and quiet; the value below, at display size).
 *
 * The pad follows Progress and the Overview's own numeral treatment exactly: dimmed zeros in
 * `--color-numeral-pad`, `aria-hidden`, the significant digits in `text.primary`. It is opt-in
 * (`padTo`) because a pad is only honest when the field width is real -- an unbounded value (the
 * Slider readout's reason for having none) would be inventing digits.
 *
 * The label reads `text.secondary`, matching Progress's own small mono readout label -- not
 * `text.label`, which an earlier draft of this component used. `text.label` is dimmed on purpose for
 * reading as a heading over a list rather than another item in it (the sidebar's group names),
 * and measures only 4.00:1 on `surface.raised` in dark theme, below the 4.5:1 body-text floor.
 * Stat has no surface of its own -- it inherits whatever it is dropped onto, and a Stat inside a
 * Panel or a Card (both `surface.raised`) is exactly as valid a use as one loose on the page
 * (`surface.base`, where `text.label` does pass). `text.secondary` is already gated on both
 * surfaces and clears AA with real headroom in both themes, so it works everywhere a Stat can
 * legitimately be placed. Stat's own docs Examples happen to render inside a Panel, which is
 * how this surfaced.
 */
export function Stat({ label, value, unit, padTo, delta, className, ref, ...rest }: StatProps) {
  const digits = String(value)
  const pad =
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && padTo
      ? '0'.repeat(Math.max(0, padTo - digits.length))
      : ''
  const Arrow = delta?.direction === 'down' ? ArrowDownRight : ArrowUpRight

  return (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...rest}>
      <dl className="flex flex-col gap-1">
        <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
          {label}
        </dt>
        <dd className="font-display font-bold text-[2.25rem] leading-none tabular-nums text-[var(--color-text-primary)]">
          {pad ? (
            <span aria-hidden="true" className="text-[var(--color-numeral-pad)]">
              {pad}
            </span>
          ) : null}
          {digits}
          {unit ? (
            <span className="ml-1 font-mono text-sm font-normal text-[var(--color-text-secondary)]">
              {unit}
            </span>
          ) : null}
        </dd>
      </dl>
      {delta ? (
        <p className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-secondary)]">
          <Arrow aria-hidden="true" className={cn('w-3.5 h-3.5 shrink-0', SENTIMENT[delta.sentiment].className)} />
          <span aria-hidden="true">
            {delta.value} vs {delta.period}
          </span>
          <span className="sr-only">
            {delta.direction} {delta.value} from {delta.period}, {SENTIMENT[delta.sentiment].words}
          </span>
        </p>
      ) : null}
    </div>
  )
}
