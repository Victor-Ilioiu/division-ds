import type { ComponentPropsWithoutRef, Ref } from 'react'
import { Dialog as RadixDialog } from 'radix-ui'
import { cn } from '../../../lib/cn'
import { Dialog, DialogClose, DialogHeading, DialogTrigger } from '../dialog/Dialog'
import { OverlayFrame } from '../dialog/OverlayFrame'

/**
 * A dialog that enters from an edge and runs the full height. The root, trigger and close are the
 * Dialog's own, so a sheet returns focus to whatever opened it exactly as a dialog does.
 *
 * Contrast: identical to Dialog. The sheet paints surface.base, so the title reuses "text.primary on
 * surface.base", the description and close glyph "text.secondary on surface.base", and focus rings
 * "focus.ring on surface.base".
 */
export const Sheet = Dialog
export const SheetTrigger = DialogTrigger
export const SheetClose = DialogClose

export type SheetContentProps = Omit<
  ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  'title' | 'role' | 'aria-labelledby' | 'aria-describedby' | 'onCloseAutoFocus'
> & {
  /** Required. The visible heading, and the sheet's accessible name. */
  title: string
  description?: string
  /** @default 'right' */
  side?: 'left' | 'right'
  /** @default 'Close' */
  closeLabel?: string
  ref?: Ref<HTMLDivElement>
  role?: never
  'aria-labelledby'?: never
  'aria-describedby'?: never
  /** Follows `side`; declared never so a caller cannot contradict it. */
  'data-side'?: never
}

export function SheetContent({
  title,
  description,
  side = 'right',
  closeLabel = 'Close',
  className,
  children,
  ref,
  ...rest
}: SheetContentProps) {
  return (
    <OverlayFrame
      ref={ref}
      closeLabel={closeLabel}
      data-side={side}
      overlayClassName={side === 'right' ? 'justify-end' : 'justify-start'}
      className={cn(
        // 24rem, or the viewport less 2rem at 320px, so a strip of scrim stays tappable.
        'flex flex-col h-full w-[min(24rem,calc(100vw-2rem))]',
        // M1, settling toward the attached edge.
        side === 'right' ? 'border-l origin-right' : 'border-r origin-left',
        className
      )}
      {...rest}
    >
      <DialogHeading title={title} description={description} />
      {/* The scroll container, not the surface: min-h-0 lets this flex item shrink below its
          content's natural height, which is what makes overflow-y-auto scroll instead of
          stretching the surface past the viewport. The title and close button sit outside it, so
          they stay put while only the body scrolls. pt-1 gives a focus ring on the body's first
          focusable child room to draw. */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-[max(0.25rem,var(--reticle-reach))] px-6 pb-6 font-body text-sm text-[var(--color-text-primary)]">
        {children}
      </div>
    </OverlayFrame>
  )
}
