import { useState } from 'react'
import type { ComponentPropsWithoutRef, Ref } from 'react'
import { Slider as RadixSlider } from 'radix-ui'
import { cn } from '../../../lib/cn'
import { disabledObject } from '../../../lib/disabled'

/** Every native Root prop is available and lands on `RadixSlider.Root` itself. That is safe here
 *  in a way it is NOT for Checkbox/Radio/Switch's Root: this component's own guarantee — the
 *  per-thumb `aria-label`/`aria-valuetext` this file computes (see the Design decisions above) —
 *  is set directly on `RadixSlider.Thumb`, an element `rest` never reaches at all (`rest` only
 *  ever lands on `RadixSlider.Root`, one level up). So there is no path for a caller's rest prop
 *  to silently outrank the per-thumb name or value text.
 *
 *  `Omit<..., 'aria-label' | 'aria-labelledby'>` is kept for documentation/IDE-hinting only — per
 *  commands.md's IconButton lesson, `Omit` alone does not stop a caller passing `aria-label`
 *  through (TypeScript's JSX checker never treats an aria- or data- prefixed prop as excess). That
 *  lesson doesn't need the `'aria-label'?: never` fix here, though: a caller-supplied `aria-label`
 *  landing in `rest` would sit on Root, which renders with no accessible-name semantics of its
 *  own (the `role="slider"` and its name live on each Thumb) — inert, not an override.
 *
 *  Verified against `@radix-ui/react-slider`'s own source (`dist/index.mjs`) 2026-09-21:
 *  `SliderThumbTrigger` computes `role`, the Radix-default `aria-label`, `aria-valuemin`,
 *  `aria-valuenow`, `aria-valuemax`, `aria-orientation`, `data-orientation`, `data-disabled` and
 *  `tabIndex`, THEN spreads `...thumbProps` on top — the same "compute, then spread caller props
 *  over it" ordering also present on Switch/Checkbox/Radio's triggers. The difference is what
 *  `thumbProps` IS on this element: it is only the fixed `aria-label`/`aria-valuetext`/`className`
 *  this component itself passes to `RadixSlider.Thumb` — never the caller's `rest`, which this
 *  component sends to `RadixSlider.Root` instead. So the same Radix-internal spread order that is
 *  a live, un-addressed risk for Switch/Checkbox/Radio's Root (a caller's own `role`/`aria-checked`
 *  in `rest` could there override Radix's computed semantics) has no caller-reachable path into it
 *  on Slider's Thumb. Root-level SliderImpl has the identical shape (`aria-disabled`, then
 *  `...sliderProps`, i.e. this component's `rest`) — that pre-existing, shared risk is unchanged
 *  by this component and not fixed here, same as it was left for Switch.
 *
 *  `children` IS excluded, for a plainer reason than any of the above: `RadixSlider.Root`'s prop
 *  type offers it, but this component renders its own Track/Range/Thumbs as JSX children, so a
 *  caller's `children` is silently discarded — reachable, typed, and dead. It is an ordinary
 *  key, so the `Omit` does the rejecting and the declared `never` only makes the error legible;
 *  both are shipped, matching `IconButton`. */
export type SliderProps = Omit<
  ComponentPropsWithoutRef<typeof RadixSlider.Root>,
  'aria-label' | 'aria-labelledby' | 'children'
> & {
  /** Required. Applied per thumb, so a range slider never has two identically-named controls. */
  label: string
  /** Formats the readout and aria-valuetext together, so spoken and visible values match — in
   *  both controlled and uncontrolled use. See Slider.tsx's function body for how the
   *  uncontrolled case stays live, and BUILD-LOG.md for the fuller writeup. */
  formatValue?: (value: number) => string
  showValue?: boolean
  ref?: Ref<HTMLSpanElement>
  children?: never
}

export function Slider({
  label,
  formatValue,
  showValue = false,
  className,
  value,
  defaultValue,
  onValueChange,
  ref,
  ...rest
}: SliderProps) {
  // `formatValue` feeds `aria-valuetext` (and the readout) from `values` below, which must stay
  // live in BOTH modes, or the announced text goes wrong the moment the DOM value moves without
  // it — a real accessibility defect, not a missing feature. Controlled use gets that for free:
  // `value` is the live prop on every render. Uncontrolled use needs this component to track the
  // value itself, because Radix keeps its own internal position (for its own aria-valuenow) but
  // never hands it back — so `internalValues` mirrors it via `onValueChange`, the same event
  // Radix already fires on every drag and every keyboard step. `internalValues` is only ever the
  // FALLBACK: a supplied `value` prop always wins, and `onValueChange` below still calls the
  // caller's own handler exactly as before — this only adds a listener, it doesn't replace one.
  // (Radix's own `useControllableState` solves this same shape internally; reimplemented locally
  // rather than importing that transitive dependency for a few lines.)
  const [internalValues, setInternalValues] = useState(defaultValue ?? [0])
  const values = value ?? internalValues
  const handleValueChange = (next: number[]) => {
    if (value === undefined) setInternalValues(next)
    onValueChange?.(next)
  }
  const multiple = values.length > 1
  const thumbName = (index: number) =>
    multiple ? `${label}, ${index === 0 ? 'minimum' : 'maximum'}` : label

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
          {label}
        </span>
        {showValue ? (
          // The readout is the hero: 24px display against an 11px mono label, the same treatment
          // Progress's readout takes, because these two are the only atoms in the set that
          // render a numeral at all and design.md names numerals as heroes.
          //
          // No dimmed leading-zero pad here, unlike Progress. Progress's value is bounded (0 to
          // max, printed as a percentage), so a three-digit field is a real fixed width. A
          // Slider's is not: min/max are the caller's, and `formatValue` can return anything at
          // all ("24 kg", "1 / 4"). Padding an unbounded or formatted value would be inventing a
          // width the value does not have. tabular-nums still holds the digits still.
          <span className="font-display text-2xl leading-none tabular-nums text-[var(--color-text-primary)]">
            {values.map(v => (formatValue ? formatValue(v) : String(v))).join(' – ')}
          </span>
        ) : null}
      </div>
      <RadixSlider.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        className={cn('relative flex items-center select-none touch-none w-full h-5', disabledObject)}
        {...rest}
      >
        <RadixSlider.Track className="relative grow h-1 bg-[var(--color-surface-sunken)]">
          <RadixSlider.Range className="absolute h-full bg-[var(--color-accent-signal-indicator)]" />
        </RadixSlider.Track>
        {values.map((v, index) => (
          <RadixSlider.Thumb
            key={index}
            aria-label={thumbName(index)}
            aria-valuetext={formatValue ? formatValue(v) : undefined}
            className={cn(
              // 20px square, painted; a 24px hit area via the ::before below (WCAG 2.2 SC 2.5.8).
              'relative block w-5 h-5 shrink-0 bg-[var(--color-accent-signal-indicator)]',
              'before:absolute before:-inset-0.5 before:content-[""]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
              // The thumb is a Radix `Primitive.span`, which never carries a native `disabled`
              // attribute (only `<button>`/`<input>`/etc. do), so a bare `disabled:` Tailwind
              // variant here would compile to a `:disabled` pseudo-class selector that can never
              // match — dead CSS. Radix does set `data-disabled=""` on this element when the
              // slider is disabled (verified in dist/index.mjs's SliderThumbTrigger); target that.
              'data-[disabled]:cursor-not-allowed'
            )}
          />
        ))}
      </RadixSlider.Root>
    </div>
  )
}
