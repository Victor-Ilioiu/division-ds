import type { Ref, TextareaHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import { disabledText } from '../../../lib/disabled'

// Deliberately not sharing inputVariants: its variants are fixed heights, which are exactly wrong
// for a multi-line box. Repeating six class strings is cheaper than a variant that fits neither.
export const textareaVariants = cva(
  cn(
    'block w-full font-body text-sm px-3 py-2 resize-y min-h-[88px]',
    'bg-[var(--component-control-fill-rest)] text-[var(--component-control-text-rest)]',
    'border placeholder:text-[var(--component-control-text-placeholder)]',
    // `transition-control`, not `transition-colors`: Tailwind v4's colour transition
    // includes `outline-color`, which made the focus ring animate in from currentColor
    // (near-white) instead of painting the ring token at the instant of focus. See
    // control.css, which also owns the reduced-motion case.
    'transition-control',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
    disabledText,
    'disabled:bg-[var(--component-control-fill-disabled)] aria-disabled:bg-[var(--component-control-fill-disabled)] data-[disabled]:bg-[var(--component-control-fill-disabled)]',
    'read-only:text-[var(--color-text-secondary)]'
  ),
  {
    variants: {
      invalid: {
        true: 'border-[var(--component-control-border-invalid)]',
        false: cn(
          'border-[var(--component-control-border-rest)]',
          'hover:border-[var(--component-control-border-hover)]'
        ),
      },
    },
    defaultVariants: { invalid: false },
  }
)

/** Textarea computes `aria-invalid` from `invalid` and spreads `{...rest}` after it onto the
 *  same element, so a caller-supplied `aria-invalid` in rest would silently win at runtime (JSX
 *  later attributes override earlier ones), defeating the one thing this prop promises. `invalid`
 *  is the single source of truth for both the visual border and the aria attribute — letting a
 *  caller set `aria-invalid` directly would let visual and semantic state drift apart. `aria-
 *  invalid` is hyphenated, so `Omit<>` alone is a no-op — TypeScript's JSX checker never treats
 *  an aria-/data-prefixed attribute as an excess/unknown property — so the key is also redeclared
 *  with type `never`, which TypeScript does enforce. Same precedent as Input's `aria-invalid`
 *  exclusion (settled one task ago), `IconButton`'s `aria-label` exclusion and `Avatar`'s
 *  `aria-label` exclusion. */
export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'aria-invalid'
> &
  VariantProps<typeof textareaVariants> & {
    ref?: Ref<HTMLTextAreaElement>
    'aria-invalid'?: never
  }

export function Textarea({ invalid, className, rows = 4, ref, ...rest }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid ? true : undefined}
      className={cn(textareaVariants({ invalid }), className)}
      {...rest}
    />
  )
}
