import type { ComponentPropsWithoutRef, Ref } from 'react'
import { RadioGroup as RadixRadioGroup } from 'radix-ui'
import { cn } from '../../../lib/cn'
import { disabledObject } from '../../../lib/disabled'

// RadioGroup forwards straight through to Radix's own Root — it does not compute any value of
// its own onto the rendered element (no aria-invalid-style guarantee here: unlike Radio, this
// component reads nothing from its own props to derive an attribute it then spreads `rest`
// after). So there is nothing for a caller-supplied prop in `rest` to silently override, and no
// Omit/`never` pin is needed. See Radio's own comment below for the case where one is.
export type RadioGroupProps = ComponentPropsWithoutRef<typeof RadixRadioGroup.Root> & {
  ref?: Ref<HTMLDivElement>
}

export function RadioGroup({ className, ref, ...rest }: RadioGroupProps) {
  return (
    <RadixRadioGroup.Root ref={ref} className={cn('flex flex-col gap-2', className)} {...rest} />
  )
}

/** Radio computes `aria-invalid` from `invalid` and spreads `{...rest}` after it onto the same
 *  element, so a caller-supplied `aria-invalid` in rest would silently win at runtime (JSX later
 *  attributes override earlier ones), defeating the one thing this prop promises. `aria-invalid`
 *  is hyphenated, so `Omit<>` alone is a no-op — TypeScript's JSX checker never treats an
 *  aria-/data-prefixed attribute as an excess/unknown property — so the key is also redeclared
 *  with type `never`, which TypeScript does enforce. Same precedent as Input's, Textarea's and
 *  Checkbox's `aria-invalid` exclusion. */
export type RadioProps = Omit<ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>, 'aria-invalid'> & {
  invalid?: boolean
  ref?: Ref<HTMLButtonElement>
  'aria-invalid'?: never
}

export function Radio({ invalid, className, ref, ...rest }: RadioProps) {
  return (
    <RadixRadioGroup.Item
      ref={ref}
      aria-invalid={invalid ? true : undefined}
      className={cn(
        // Square, like everything else — the selected marker is a filled inner square, not a dot.
        'relative inline-flex items-center justify-center shrink-0 w-5 h-5',
        // With the cut off (the theme builder's shape), a 20px box takes a third of the radius.
        'rounded-[calc(var(--shape-radius,0px)/3)]',
        // ...but the ::before pseudo-element extends 2px past it on every side, so the actual hit
        // area is 24x24 — SC 2.5.8's floor.
        'before:absolute before:-inset-0.5 before:content-[""]',
        'border bg-[var(--component-control-fill-rest)]',
        // `transition-control`, not `transition-colors`: Tailwind v4's colour transition
        // includes `outline-color`, which made the focus ring animate in from currentColor
        // (near-white) instead of painting the ring token at the instant of focus. See
        // control.css, which also owns the reduced-motion case.
        'transition-control',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        'data-[state=checked]:border-[var(--color-accent-signal-indicator)]',
        // Object half of the one disabled-state rule (src/lib/disabled.ts, design.md): the whole
        // control — checked or not — dims to 50% opacity.
        disabledObject,
        invalid
          ? 'border-[var(--component-control-border-invalid)]'
          : 'border-[var(--component-control-border-selection)] enabled:hover:border-[var(--component-control-border-selection-hover)]',
        className
      )}
      {...rest}
    >
      {/* Bright orange in both themes, by Victor's decision (2026-09-23): the inner square paints
          `accent.signal.indicator` straight, matching the border above and Checkbox's own checked
          fill, instead of the theme-adaptive `component.control.indicator.checked`
          (`accent.signal.text`) it used before. The inner square is the ONLY thing that says
          "selected" (unlike Checkbox, whose whole box flips to the signal fill), so SC 1.4.11
          measures it against the colour adjacent to it — the control's own fill, not the page —
          and `accent.signal.indicator` there measures 2.80:1 in light theme, below the 3:1 floor.
          Accepted knowingly, same as Progress's signal tone; gated at a 2:1 floor instead of
          removed from the gate (see contrast-pairs.mjs). Dark theme is visually unchanged: its
          signal.text and signal.fill are the same primitive stop. `component.control.indicator.
          checked` itself is left in place, unread by any component now. */}
      <RadixRadioGroup.Indicator className="w-2.5 h-2.5 rounded-[calc(var(--shape-radius,0px)/4)] bg-[var(--color-accent-signal-indicator)]" />
    </RadixRadioGroup.Item>
  )
}
