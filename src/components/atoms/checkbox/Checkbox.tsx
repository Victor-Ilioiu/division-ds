import type { ComponentPropsWithoutRef, Ref } from 'react'
import { Checkbox as RadixCheckbox } from 'radix-ui'
import { Check, Minus } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { disabledObject } from '../../../lib/disabled'

/** Checkbox computes `aria-invalid` from `invalid` and spreads `{...rest}` after it onto the
 *  same element, so a caller-supplied `aria-invalid` in rest would silently win at runtime (JSX
 *  later attributes override earlier ones), defeating the one thing this prop promises.
 *  `aria-invalid` is hyphenated, so `Omit<>` alone is a no-op — TypeScript's JSX checker never
 *  treats an aria-/data-prefixed attribute as an excess/unknown property — so the key is also
 *  redeclared with type `never`, which TypeScript does enforce. Same precedent as Input's and
 *  Textarea's `aria-invalid` exclusion.
 *
 *  `defaultChecked` is narrowed from Radix's own `CheckedState` (`boolean | 'indeterminate'`) to
 *  plain `boolean`. Reason, not just rule: the glyph below can only read the `checked` value a
 *  caller itself passed in (see the comment on the glyph branch) — Radix resolves the
 *  uncontrolled case internally via `useControllableState` and publishes the result only as the
 *  `data-state` DOM attribute, which this component's className already keys its fill/border off
 *  of but which the glyph ternary has no way to read back into React state. Widening
 *  `defaultChecked` to allow `'indeterminate'` would let a caller reach a mounted, semantically
 *  mixed checkbox that renders a tick instead of a dash — defeating the SC 1.4.1 guarantee this
 *  component exists to keep. Omit + redeclare is enough here (unlike `aria-invalid`,
 *  `defaultChecked` is camelCase, not aria-/data-prefixed, so it isn't exempt from TypeScript's
 *  excess/wrong-type checking and needs no `never` trick). */
export type CheckboxProps = Omit<
  ComponentPropsWithoutRef<typeof RadixCheckbox.Root>,
  'aria-invalid' | 'defaultChecked'
> & {
  invalid?: boolean
  ref?: Ref<HTMLButtonElement>
  'aria-invalid'?: never
  defaultChecked?: boolean
}

// Radix's own `Checkbox.Indicator` computes its `data-state` from internal context (checked ===
// 'indeterminate' -> "indeterminate", truthy -> "checked", else "unchecked") but does not expose
// that resolved state back to the caller: `CheckboxIndicatorProps` is a plain
// `Primitive.span` prop set (no render-prop/children-as-function), and the hook that reads the
// context (`useCheckboxContext`) is internal — not exported from `@radix-ui/react-checkbox` or
// re-exported from the `radix-ui` unified package (verified against
// node_modules/@radix-ui/react-checkbox/dist/index.mjs, 2026-09-21). The resolved state DOES
// reach the DOM as `data-state` (Radix's `getState(context.checked)`, driven by
// `useControllableState` so it's correct for the uncontrolled case too) — this component's own
// className already reads it for the fill/border. But there is no supported way to read that
// same resolved value back into a JSX branch, only onto the rendered element's attributes. So the
// glyph below reads the SAME `checked` value the caller itself passed in, which only exists for
// the controlled case — and `CheckboxProps` narrows `defaultChecked` to `boolean` (excluding
// `'indeterminate'`) precisely so the uncontrolled indeterminate case this ternary can't handle
// is not offered as a valid prop in the first place, rather than silently rendering the wrong
// glyph. Every indeterminate usage in this design system's docs is controlled anyway (a parent
// computing "some but not all children checked" needs that state from its children regardless).
export function Checkbox({ invalid, className, checked, ref, ...rest }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      ref={ref}
      checked={checked}
      aria-invalid={invalid ? true : undefined}
      className={cn(
        // 20px visual box, without looking like a 24px checkbox...
        'relative inline-flex items-center justify-center shrink-0 w-5 h-5',
        // align-middle: an inline-flex box's default vertical-align (baseline) is defined by its
        // LAST LINE BOX when it has content but by its own bottom edge when empty (CSS2.1
        // 10.8.1). The indicator only mounts when checked/indeterminate, so an unstyled baseline
        // checkbox sits a couple of px lower when unchecked than when checked or indeterminate,
        // in any parent that isn't itself a flex/grid container (a bare table cell, e.g.
        // DataTable's header and row checkbox cells). align-middle centers on the box's own
        // height instead, which content never changes.
        'align-middle',
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
        'data-[state=checked]:bg-[var(--color-accent-signal-fill)]',
        'data-[state=checked]:border-[var(--color-accent-signal-fill)]',
        'data-[state=indeterminate]:bg-[var(--color-accent-signal-fill)]',
        'data-[state=indeterminate]:border-[var(--color-accent-signal-fill)]',
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
      <RadixCheckbox.Indicator className="text-[var(--color-accent-signal-ink)]">
        {checked === 'indeterminate' ? (
          <Minus data-glyph="indeterminate" aria-hidden="true" className="w-3.5 h-3.5" />
        ) : (
          <Check data-glyph="checked" aria-hidden="true" className="w-3.5 h-3.5" />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
}
