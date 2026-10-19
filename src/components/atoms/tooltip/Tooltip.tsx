import type { ComponentPropsWithoutRef, ReactElement } from 'react'
import { Tooltip as RadixTooltip } from 'radix-ui'
import { cn } from '../../../lib/cn'

/** Mounted once in AppShell, so every tooltip in the app shares one delay and one
 *  "skip the delay while moving between triggers" behaviour — no consumer has to remember it. */
export function TooltipProvider(props: ComponentPropsWithoutRef<typeof RadixTooltip.Provider>) {
  return <RadixTooltip.Provider delayDuration={300} skipDelayDuration={150} {...props} />
}

export type TooltipProps = {
  /** Supplementary text. A tooltip is never the only place this information lives — it does not
   *  appear on touch, and never for a keyboard user who never focuses the trigger. */
  content: string
  /** The trigger. Rendered asChild, so no wrapper element is added to the layout or focus order —
   *  a single focusable element. */
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={2}
          className={cn(
            'z-50 max-w-[260px] px-2.5 py-2',
            // A single object with its own fill, holding nothing focusable and nothing that can
            // be selected, so it takes the cut corner. `bevel-sm` and not a focus wrapper: the
            // panel is never focused (the trigger is), so there is no ring here for clip-path to
            // clip. See design.md, "The focus ring is never clipped".
            'relative bevel-sm bevel-edge [--bevel-edge-color:var(--color-border-hairline-strong)]',
            'border border-[var(--color-border-hairline-strong)]',
            'bg-[var(--color-surface-sunken)] backdrop-blur-md',
            'font-body text-xs text-[var(--color-text-primary)]',
            'anim-tooltip',
            className
          )}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
