import type { ButtonHTMLAttributes, MouseEvent, ReactElement, ReactNode, Ref } from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import { disabledObject } from '../../../lib/disabled'
import { Spinner } from '../spinner/Spinner'

export const buttonVariants = cva(
  cn(
    // `bevel-sm` is not here: every variant but `link` adds it, because a cut corner on a line
    // of underlined text would clip its last glyph. Same class set as before for the other four.
    'inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
    'font-display font-semibold uppercase tracking-wide',
    // Caps sit high in a centred line box. Oxanium's ascent (0.79em) outweighs its descent
    // (0.21em) while its capitals are 0.69em tall with no descender, so the cap-height midpoint
    // is above the line box midpoint and the label read as hugging the top border, worst at xs
    // and sm where the box is tightest. `text-box: trim-both cap alphabetic` would fix it at the
    // root but does not apply to a flex container's anonymous text item, so the correction is
    // an optical padding instead. Measured by scanning the label's ink rows in a screenshot: the
    // pixel gap above the caps was 1.1-1.6px smaller than below at every size.
    'pt-[calc(var(--cap-shift,0px)*2)]',
    // M5 stepped arrival (src/styles/motion.css): the hover state lands in three discrete jumps
    // rather than sliding in, so the control reads as a switching circuit. It owns the property
    // list, the duration, the `:active` press override and the reduced-motion collapse, because
    // that rule is unlayered and would outrank any Tailwind variant written here. The flash-safety
    // argument for why a monotonic staircase needs no WCAG 2.3.1 cap is in that comment too. Do
    // not add `transition-*` utilities back alongside it: they would be silently outranked and the
    // file would then state two different durations.
    'transition-stepped',
    // The focus ring lives on the .bevel-focus-wrap parent, never here: clip-path would clip it.
    'focus:outline-none',
    disabledObject
  ),
  {
    variants: {
      variant: {
        primary: cn(
          'bevel-sm',
          'bg-[var(--component-button-primary-fill)]',
          'text-[var(--component-button-primary-text)]',
          'hover:brightness-110 active:brightness-95'
        ),
        danger: cn(
          'bevel-sm',
          'bg-[var(--component-button-danger-fill)]',
          'text-[var(--component-button-danger-text)]',
          'hover:brightness-110 active:brightness-95'
        ),
        secondary: cn(
          'bevel-sm',
          'bg-transparent text-[var(--component-button-secondary-text)]',
          'border border-[var(--component-button-secondary-border)]',
          // The border stops at the cut without this: clip-path trims the corner off the border
          // box, so the diagonal is the one side with no line on it. See `.bevel-edge`.
          'relative bevel-edge [--bevel-edge-color:var(--component-button-secondary-border)]',
          'hover:bg-[var(--color-surface-raised)]'
        ),
        ghost: cn(
          'bevel-sm',
          'bg-transparent text-[var(--component-button-ghost-text)]',
          'hover:text-[var(--component-button-ghost-text-hover)] hover:bg-[var(--color-surface-raised)]'
        ),
        // A button that reads as a text link: the action belongs in a sentence or beside other
        // text ("Reset filters"), but it does something on this page rather than going somewhere,
        // so it must stay a <button>. The look is Link's signal tone exactly (colour, underline,
        // offset, the thicker underline on hover), and the type drops to the body role. No fill,
        // no bevel, no control height: the compound variant below strips size's height, padding
        // and text step, so it takes the size of the sentence it sits in, as Link does.
        link: cn(
          'bg-transparent text-[var(--color-accent-signal-text)]',
          'font-body font-normal normal-case tracking-normal',
          'underline underline-offset-2 decoration-1 hover:decoration-2'
        ),
      },
      size: {
        // No xs control-height token exists, and this does not invent one: 24px is Tailwind's h-6,
        // the WCAG 2.5.8 minimum target, so xs is the floor rather than a step on the token scale.
        // Padding continues sm's scale one step down.
        // `--cap-shift` is the optical correction for Oxanium's vertical metrics, measured per
        // size (see the note on CAP_CENTRE below). It is applied as top padding of twice the
        // shift, which moves a centred line down by the shift, and undone on the icons.
        xs: 'h-6 px-2 gap-1.5 text-xs [--cap-shift:1px]',
        sm: 'h-[var(--component-control-height-sm)] px-3 text-xs [--cap-shift:1.5px]',
        md: 'h-[var(--component-control-height-md)] px-5 text-sm [--cap-shift:1px]',
        lg: 'h-[var(--component-control-height-lg)] px-7 text-base [--cap-shift:1px]',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    compoundVariants: [
      // Last in cva's output, so `cn()` lets these beat size's height and padding.
      { variant: 'link', class: 'h-auto px-0 pt-0 text-[length:inherit]' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  }
)

/** Shared across both asChild variants: CVA variant props plus the two things that never depend
 *  on whether the rendered element is a <button> or a slotted child. */
type ButtonSharedProps = VariantProps<typeof buttonVariants> & {
  /** Classes for the unclipped focus wrapper, not the button. */
  wrapperClassName?: string
  ref?: Ref<HTMLButtonElement>
  /**
   * Excluded, typed `never` rather than merely omitted. `Button` computes `aria-busy={loading ||
   * undefined}` on the rendered element and then spreads `{...rest}` after it — the same
   * "compute a value, then let rest win" shape that required `IconButton`'s `aria-label`
   * exclusion (see the hyphenated-key rule in design.md). `aria-busy` is hyphenated, so
   * `Omit<ButtonHTMLAttributes<...>, 'aria-busy'>` alone would be a silent no-op — TypeScript's
   * JSX checker never treats an aria-/data-prefixed attribute as excess, even one the prop type
   * doesn't declare. Declaring the key here with type `never` is what actually rejects it:
   * TypeScript enforces a *declared* property's type even under that exemption, so
   * `<Button loading aria-busy="false" />` — aria-disabled, spinning, and announcing "not busy" to
   * assistive tech — is a compile error instead of a silent runtime contradiction.
   */
  'aria-busy'?: never
}

/** The icon box per size: the spinner's own small step at xs and sm, so a loading button's spinner
 *  and the icon it replaces occupy the same footprint. */
const ICON_SIZE = {
  xs: '[&_svg]:w-3.5 [&_svg]:h-3.5',
  sm: '[&_svg]:w-3.5 [&_svg]:h-3.5',
  md: '[&_svg]:w-4 [&_svg]:h-4',
  lg: '[&_svg]:w-5 [&_svg]:h-5',
} as const

/** Undoes the button's cap-centring padding on an icon, so the icon stays geometrically centred
 *  while only the label moves. See the `pt-[calc(var(--cap-shift)*2)]` note in buttonVariants. */
const CAP_CENTRE_UNDO = '-translate-y-[var(--cap-shift,0px)]'

/** The native <button> path: every native button prop, plus loading. */
type ButtonNativeProps = ButtonSharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    asChild?: false
    children?: ButtonHTMLAttributes<HTMLButtonElement>['children']
    /** Marks the control busy: sets aria-busy and aria-disabled, blocks its click (and so its
     *  form's submit), and shows a spinner. It stays focusable, so focus never falls to the
     *  page. */
    loading?: boolean
    /** Visually hidden text announced while loading. */
    loadingLabel?: string
    /** An icon before the label, rendered aria-hidden and sized to the button. Replaced by the
     *  spinner while loading, so the button never shows two leading glyphs. */
    iconStart?: ReactNode
    /** An icon after the label, rendered aria-hidden. Kept while loading. */
    iconEnd?: ReactNode
  }

/** The asChild path: renders the single child element with the button's classes. A link cannot
 *  be meaningfully disabled (aria-disabled + pointer-events:none leaves it keyboard-operable;
 *  adding tabIndex={-1} to compensate removes the announcement entirely) or meaningfully "busy" —
 *  so disabled/loading/loadingLabel are typed `never` here rather than silently ignored at
 *  runtime. Passing any of them with asChild is a compile error, not a silent no-op. */
type ButtonAsChildProps = ButtonSharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled'> & {
    asChild: true
    children: ReactElement
    disabled?: never
    loading?: never
    loadingLabel?: never
    /** Slot takes exactly one child, so there is nowhere to put an icon slot: put the icon
     *  inside the child element instead. Typed away rather than silently dropped. */
    iconStart?: never
    iconEnd?: never
  }

export type ButtonProps = ButtonNativeProps | ButtonAsChildProps

/** A loading button stays focusable, so it cannot drop focus to <body> the moment it starts
 *  working (a clicked or Enter-pressed submit button holds focus). It is aria-disabled instead,
 *  and its click is prevented: that cancels a form submission too, including the one Enter in a
 *  field triggers, and the caller's onClick never runs. */
const WHILE_LOADING = {
  'aria-disabled': true,
  onClick: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
} as const

export function Button({
  variant,
  size,
  fullWidth,
  asChild = false,
  loading = false,
  loadingLabel = 'Working',
  iconStart,
  iconEnd,
  className,
  wrapperClassName,
  children,
  disabled,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const native = !asChild
  const iconClass = cn('inline-flex shrink-0', ICON_SIZE[size ?? 'md'], CAP_CENTRE_UNDO)

  return (
    // The bevel clips the button, so the focus ring cannot live on the button. This wrapper is
    // unclipped and draws it with :has(:focus-visible). The component owns it so a consumer cannot
    // forget it. See design.md, "The focus ring is never clipped".
    // A link-look button skips the reticle: brackets closing on a line of text read as a target
    // lock on a sentence.
    <span
      className={cn(
        'bevel-focus-wrap',
        variant === 'link' && 'no-reticle',
        fullWidth && 'block w-full',
        wrapperClassName
      )}
    >
      <Comp
        ref={ref}
        {...(native ? { type, disabled } : {})}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...rest}
        // After rest, so neither a caller's onClick nor its aria-disabled can re-enable a busy
        // button.
        {...(native && loading ? WHILE_LOADING : {})}
      >
        {native ? (
          <>
            {loading ? (
              <>
                <Spinner size="sm" aria-hidden="true" className={cn('text-current', CAP_CENTRE_UNDO)} />
                <span className="sr-only">{loadingLabel}</span>
              </>
            ) : iconStart ? (
              <span aria-hidden="true" className={iconClass}>
                {iconStart}
              </span>
            ) : null}
            {children}
            {iconEnd ? (
              <span aria-hidden="true" className={iconClass}>
                {iconEnd}
              </span>
            ) : null}
          </>
        ) : (
          // Radix Slot requires exactly one React element child, so asChild never gets the
          // loading spinner/label as extra siblings — it passes its single child through as-is.
          children
        )}
      </Comp>
    </span>
  )
}
