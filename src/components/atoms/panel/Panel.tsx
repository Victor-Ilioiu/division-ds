import type { HTMLAttributes, Ref } from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../../lib/cn'

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
  /** Inner spacing: none 0, sm 12px, md 20px, lg 32px. */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** base: the page surface. raised: one step up (the default). signal: the brand wash, for the one panel that leads. */
  tone?: 'base' | 'raised' | 'signal'
  /** The crosshair marks at the corners. */
  crosshair?: boolean
  /** Cuts the bottom-right corner, with the border following the cut. */
  cut?: boolean
  /** Hover and focus states for a panel that is one link or button. Use with asChild. */
  interactive?: boolean
  /** Renders the single child element (an a, a router Link, a button) with the panel's classes. */
  asChild?: boolean
}

const PADDING = { none: 'p-0', sm: 'p-3', md: 'p-5', lg: 'p-8' } as const

// The tone is set through `.panel`'s two variables, not bg-/border- utilities: `.panel` is
// unlayered CSS and would outrank them (the same reason Card's docs say to set a border inline).
const TONE = {
  base: '[--panel-bg:var(--color-surface-base)]',
  raised: '[--panel-bg:var(--color-surface-raised)]',
  signal: '[--panel-bg:var(--color-accent-signal-wash)] [--panel-border:var(--color-border-selection)]',
} as const

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * The system's framed surface: `.panel` as a component. Card is a Panel with a title, a body and
 * a footer; reach for Panel when the content has none of those (a feature tile, a demo frame, a
 * link tile).
 *
 * `cut` uses `.panel-cut`, not `.bevel-md`, so the crosshair and a focus outline outside the box
 * survive the clip, and `.bevel-edge` for the border along the diagonal (the bare diagonal was the
 * bug in the hand-rolled homepage tiles). See src/styles/elevation.css.
 */
export function Panel({
  padding = 'md',
  tone = 'raised',
  crosshair = false,
  cut = false,
  interactive = false,
  asChild = false,
  className,
  ref,
  ...rest
}: PanelProps) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      ref={ref}
      className={cn(
        'panel block',
        PADDING[padding],
        TONE[tone],
        crosshair && 'crosshair',
        cut && 'panel-cut bevel-edge',
        interactive && cn('panel-interactive', FOCUS),
        className
      )}
      {...rest}
    />
  )
}
