import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react'
import { Slot } from 'radix-ui'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import { buttonVariants } from '../button/Button'

const SQUARE = {
  sm: 'w-[var(--component-control-height-sm)]',
  md: 'w-[var(--component-control-height-md)]',
  lg: 'w-[var(--component-control-height-lg)]',
} as const

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>

/** Past this the badge reads "99+". The accessible name still says the real number. */
const COUNT_CAP = 99

/** Shared across both asChild variants: Button's variants minus `link` (an icon has no text to
 *  underline) and its sizes minus `xs` (24px is below this control's 32px floor, and SQUARE has
 *  no width for it), no fullWidth, plus the required accessible name and the wrapper's classes. */
type IconButtonSharedProps = {
  variant?: Exclude<ButtonVariant, 'link'> | null
  size?: Exclude<ButtonSize, 'xs'> | null
  /** A number shown in a corner badge: items in a cart, unread notifications. Folded into the
   *  accessible name ("Notifications, 3 unread"). Hidden at 0 unless showZero. */
  count?: number
  /** Formats the spoken half of the name. Defaults to the bare number. */
  countLabel?: (count: number) => string
  /** Show the badge at a count of 0. */
  showZero?: boolean
  /** Required. An icon-only control has no accessible name without it. Becomes aria-label. */
  label: string
  /** Classes for the unclipped focus wrapper, not the button. */
  wrapperClassName?: string
  ref?: Ref<HTMLButtonElement>
  /**
   * Excluded, typed `never` rather than merely omitted. TypeScript's JSX checker never flags an
   * aria- or data-prefixed attribute as excess — even one a component's prop type doesn't
   * declare — so `Omit<ButtonHTMLAttributes<...>, 'aria-label'>` alone lets `aria-label="…"`
   * through with no error (it would still land in `...rest`, spread after `aria-label={label}`,
   * and silently win). Redeclaring the key here with type `never` closes that hole: TypeScript
   * enforces a declared property's type even when the name matches that exemption, so passing a
   * real value is a genuine `TS2322`, not silently accepted.
   */
  'aria-label'?: never
}

/** The native <button> path: every native button prop, including disabled. */
type IconButtonNativeProps = IconButtonSharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
    asChild?: false
    children: ButtonHTMLAttributes<HTMLButtonElement>['children']
  }

/** The asChild path: renders the single child element with the button's classes. A link cannot
 *  be meaningfully disabled (aria-disabled + pointer-events:none leaves it keyboard-operable;
 *  adding tabIndex={-1} to compensate removes the announcement entirely), so `disabled` is typed
 *  `never` here rather than silently ignored at runtime. Passing it with asChild is a compile
 *  error, not a silent no-op. */
type IconButtonAsChildProps = IconButtonSharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled' | 'aria-label'> & {
    asChild: true
    children: ReactElement
    disabled?: never
  }

export type IconButtonProps = IconButtonNativeProps | IconButtonAsChildProps

export function IconButton({
  variant,
  size = 'md',
  label,
  count,
  countLabel = String,
  showZero = false,
  asChild = false,
  className,
  wrapperClassName,
  children,
  disabled,
  type = 'button',
  ref,
  ...rest
}: IconButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const native = !asChild
  // `size = 'md'` above only supplies the runtime default when a caller omits the prop entirely.
  // CVA's VariantProps types `size` as including `null` (it strips `undefined`, not `null`), so
  // the destructured default doesn't narrow the static type — indexing SQUARE directly with
  // `size` still fails `tsc`. This second local narrows `null` away for that index expression.
  const squareSize = size ?? 'md'
  const showCount = count !== undefined && (count > 0 || showZero)
  const name = showCount ? `${label}, ${countLabel(count)}` : label

  return (
    // The bevel clips the button, so the focus ring cannot live on the button. This wrapper is
    // unclipped and draws it with :has(:focus-visible). The component owns it so a consumer cannot
    // forget it, including on the asChild path. See design.md, "The focus ring is never clipped".
    <span className={cn('bevel-focus-wrap', wrapperClassName)}>
      <Comp
        ref={ref}
        {...(native ? { type, disabled } : {})}
        aria-label={name}
        className={cn(
          buttonVariants({ variant, size }),
          'p-0 shrink-0',
          SQUARE[squareSize],
          className
        )}
        {...rest}
      >
        {children}
      </Comp>
      {showCount ? (
        // On the wrapper, not in the button: the bevel's clip-path would slice a badge drawn
        // over the corner. aria-hidden because the name already carries the number. Signal fill
        // with its own ink (never text.primary on a fill); the 2px ring of the page colour keeps
        // it legible where it overlaps a primary button's own signal fill. Square, like every
        // shape here but the avatar.
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -top-2 -right-2 z-10',
            'inline-flex items-center justify-center h-[18px] min-w-[18px] px-1',
            'font-mono text-[11px] font-semibold leading-none tabular-nums',
            'bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)]',
            'shadow-[0_0_0_2px_var(--color-surface-base)]'
          )}
        >
          {count > COUNT_CAP ? `${COUNT_CAP}+` : count}
        </span>
      ) : null}
    </span>
  )
}
