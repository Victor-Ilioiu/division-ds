import type { HTMLAttributes, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type KbdProps = HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>
  /** md: 24px, beside text or a menu row. sm: 20px, inside a 32px control (a small Button, a search field). */
  size?: 'md' | 'sm'
  /** Cuts the bottom-right corner, with the border following the cut, so the cap nests in the
   *  corner of a bevelled control. Only for a Kbd that sits inside such a control. */
  cut?: boolean
}

/**
 * A keycap legend. Square by default: the cut-corner motif is for surfaces and controls, and on a
 * cap standing alone in text it reads as a control. `cut` exists for the one case where the cap
 * sits in a bevelled control's corner (the docs search button), so its diagonal runs parallel to
 * the control's. The cut is `.bevel-xs` (5px) at sm and `.bevel-sm` (8px) at md, with
 * `.bevel-edge` drawing the border along the diagonal.
 */
export function Kbd({ className, children, ref, size = 'md', cut = false, ...rest }: KbdProps) {
  return (
    <kbd
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center align-middle',
        size === 'sm' ? 'min-w-[20px] h-[20px] px-1' : 'min-w-[24px] h-[24px] px-1.5',
        'font-mono text-[11px] uppercase tracking-wider',
        'border border-[var(--color-border-hairline-strong)]',
        'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]',
        cut && cn(
          'relative bevel-edge [--bevel-edge-color:var(--color-border-hairline-strong)]',
          size === 'sm' ? 'bevel-xs pr-1.5' : 'bevel-sm pr-2.5'
        ),
        className
      )}
      {...rest}
    >
      {children}
    </kbd>
  )
}
