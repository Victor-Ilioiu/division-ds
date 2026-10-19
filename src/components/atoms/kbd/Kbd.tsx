import type { HTMLAttributes, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type KbdProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }

/**
 * A keycap legend. Deliberately NOT bevelled: the cut-corner motif is for surfaces and controls,
 * and an 8px cut on a 24px-tall chip eats a third of its height. Hairline border only.
 */
export function Kbd({ className, children, ref, ...rest }: KbdProps) {
  return (
    <kbd
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center align-middle',
        'min-w-[24px] h-[24px] px-1.5',
        'font-mono text-[11px] uppercase tracking-wider',
        'border border-[var(--color-border-hairline-strong)]',
        'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]',
        className
      )}
      {...rest}
    >
      {children}
    </kbd>
  )
}
