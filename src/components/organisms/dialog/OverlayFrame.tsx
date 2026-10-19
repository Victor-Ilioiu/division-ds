import { createContext, useContext, useState, type ComponentPropsWithoutRef, type Ref } from 'react'
import { Dialog as RadixDialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useMergedRefs } from '../../../lib/refs'
import { IconButton } from '../../atoms'
import { OverlayToasts } from '../../molecules/toast/Toast'

/**
 * The frame every overlay renders through: the portal, the scrim, the opaque surface and the close
 * button. Dialog, Sheet and CommandPalette add only their placement, size and edges.
 *
 * Contrast: the surface is surface.base, so everything on it reuses the page's gated rows; the close
 * glyph is "text.secondary on surface.base" and its ring "focus.ring on surface.base". The scrim is
 * inert and ungated (see its token description).
 */

/** What a Dialog root hands to the content it opens. */
export type OverlayRoot = {
  /** Hands focus back to whatever opened the overlay. */
  onCloseAutoFocus: (event: Event) => void
  /** Closes the overlay through the root's own open state. */
  close: () => void
  /** Records DialogTrigger's own node (or clears it on unmount), so onCloseAutoFocus can tell a
   *  still-mounted trigger apart from none at all when its recorded opener is gone -- Radix's own
   *  trigger-focus fallback only runs when nothing here already claimed the close. Single-slot,
   *  the same shape as Radix's own private triggerRef: if more than one DialogTrigger opens the
   *  same root, the last one to attach wins, and any one of them unmounting clears the slot
   *  (registerTrigger(null)) rather than falling back to whichever trigger is still mounted. */
  registerTrigger: (node: HTMLElement | null) => void
}

export const OverlayRootContext = createContext<OverlayRoot | undefined>(undefined)

export function useOverlayRoot(): OverlayRoot | undefined {
  return useContext(OverlayRootContext)
}

/** Top-right, and the frame's last child, so it is last in the tab order. Positioned by the div,
 *  not by the IconButton's wrapper: .bevel-focus-wrap sets `position` outside Tailwind's layers. */
export function OverlayCloseButton({ label }: { label: string }) {
  return (
    <div className="absolute top-4 right-4">
      <RadixDialog.Close asChild>
        <IconButton label={label} variant="ghost" size="sm">
          <X aria-hidden="true" className="w-4 h-4" />
        </IconButton>
      </RadixDialog.Close>
    </div>
  )
}

export type OverlayFrameProps = Omit<
  ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  'title' | 'role' | 'aria-labelledby' | 'aria-describedby' | 'onCloseAutoFocus'
> & {
  /** Placement on the scrim layer: how it lays out, pads and scrolls the surface. */
  overlayClassName?: string
  /** Runs after focus has gone back to whatever opened the overlay. */
  onCloseAutoFocus?: (event: Event) => void
  /** Draws a close button with this accessible name. None when omitted. */
  closeLabel?: string
  /** Mounts no toast outlet in the surface, so a toast raised while this overlay is open appears in
   *  the page's corner viewport, above the scrim, and stays there. AlertDialog sets it: its action
   *  usually toasts as the dialog closes, and a toast raised into the surface would show inside the
   *  dialog and then jump to the corner when the dialog left. */
  pageToasts?: boolean
  ref?: Ref<HTMLDivElement>
  /** Radix computes `role="dialog"` and then spreads the caller's props over it. The one override
   *  the frame accepts is AlertDialog's, which is exactly what Radix's own AlertDialog does on top
   *  of its Dialog; every public overlay's content still declares `role` never. */
  role?: 'alertdialog'
  /** Radix computes these and then spreads the caller's props over them, so each is omitted AND
   *  declared never: omission alone does not stop a hyphenated key (design.md, "The
   *  hyphenated-key rule"). */
  'aria-labelledby'?: never
  'aria-describedby'?: never
}

export function OverlayFrame({
  overlayClassName,
  className,
  onCloseAutoFocus,
  onEscapeKeyDown,
  closeLabel,
  pageToasts = false,
  children,
  ref,
  ...rest
}: OverlayFrameProps) {
  const root = useOverlayRoot()
  // The surface node, for the toast outlet's announcement and for asking where focus is.
  const [surface, setSurface] = useState<HTMLDivElement | null>(null)
  const setRefs = useMergedRefs<HTMLDivElement>(setSurface, ref)

  // An Escape that a toast inside this overlay received first. With focus on the surface, it is
  // this overlay's Escape: run the content's own handler, as Radix would, then close. With focus
  // outside it (a Select's listbox portals to the body), leave it to the toast.
  const escapeFromToast = (event: KeyboardEvent) => {
    // The key that commits or navigates an IME composition can dispatch a native Escape under the
    // same name as an ordinary keypress; isComposing catches it where the browser sets it, and
    // keyCode 229 is the legacy signal Safari and older Android/Windows IMEs still use instead.
    // Neither is the overlay's own Escape, and it isn't the toast's either: returning true holds
    // the toast's own preventDefault, so a composing Escape does nothing at all here.
    if (event.isComposing || event.keyCode === 229) return true
    if (!surface?.contains(document.activeElement)) return false
    // No root to close (OverlayFrame used outside Dialog/Sheet, so OverlayRootContext was never
    // provided): there is nothing for this Escape to do here, so leave it to the toast's own
    // default handling rather than claiming it and closing nothing.
    if (!root) return false
    onEscapeKeyDown?.(event)
    if (!event.defaultPrevented) root.close()
    return true
  }

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn('fixed inset-0 z-50 flex bg-[var(--color-surface-scrim)] anim-scrim', overlayClassName)}
      >
        <RadixDialog.Content
          ref={setRefs}
          onCloseAutoFocus={event => {
            root?.onCloseAutoFocus(event)
            onCloseAutoFocus?.(event)
          }}
          onEscapeKeyDown={onEscapeKeyDown}
          className={cn(
            'relative outline-none bg-[var(--color-surface-base)] border-[var(--color-border-hairline-strong)] anim-overlay',
            className
          )}
          {...rest}
        >
          {children}
          {pageToasts ? null : <OverlayToasts container={surface} onEscape={escapeFromToast} />}
          {closeLabel ? <OverlayCloseButton label={closeLabel} /> : null}
        </RadixDialog.Content>
      </RadixDialog.Overlay>
    </RadixDialog.Portal>
  )
}
