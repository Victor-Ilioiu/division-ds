import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import { Dialog as RadixDialog } from 'radix-ui'
import { cn } from '../../../lib/cn'
import { useMergedRefs } from '../../../lib/refs'
import { PAGE_TOAST_VIEWPORT_ID } from '../../molecules/toast/Toast'
import { OverlayFrame, OverlayRootContext, useOverlayRoot, type OverlayRoot } from './OverlayFrame'

/**
 * The overlay root. Dialog, Sheet and CommandPalette all build on it, and render through
 * OverlayFrame.
 *
 * Contrast: every colour here is on surface.base and reuses a gated row: the title "text.primary on
 * surface.base"; the description and the ghost close glyph "text.secondary on surface.base"; focus
 * rings "focus.ring on surface.base". The scrim is inert and ungated (see its token description).
 */

export type DialogProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

/**
 * Owns open state, controlled or not, so it can record whatever holds focus the moment the dialog
 * opens and hand focus back there on close. Radix's own `onCloseAutoFocus` fallback focuses only a
 * `DialogTrigger`, so this also covers a dialog opened by a shortcut, another control, or ordinary
 * state.
 */
export function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [internal, setInternal] = useState(defaultOpen)
  const current = open ?? internal
  const opener = useRef<HTMLElement | null>(null)
  const trigger = useRef<HTMLElement | null>(null)

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternal(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )

  // A layout effect runs before Radix's FocusScope moves focus into the content (that is a passive
  // effect), so the active element here is still whatever opened the dialog.
  useLayoutEffect(() => {
    if (!current) return
    const active = document.activeElement
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null
  }, [current])

  const root = useMemo<OverlayRoot>(
    () => ({
      onCloseAutoFocus: event => {
        const target = opener.current
        opener.current = null
        if (target?.isConnected) {
          target.focus()
          // Claim the close only once the opener actually took focus. A disabled or hidden opener
          // leaves the active element wherever it was, and preventing default anyway would also
          // block Radix's own fallback (focus the DialogTrigger, if this dialog has one) from
          // running in its place.
          if (document.activeElement === target) event.preventDefault()
          return
        }
        // No opener was ever recorded (focus was on <body> when this opened -- a mouse click in
        // WebKit, say): there is nothing of ours to claim, so this is left unprevented and Radix's
        // own fallback runs (focuses the DialogTrigger, if this dialog has one; otherwise a no-op).
        if (!target) return
        // The recorded opener is gone: most often a page toast that was focused when this overlay
        // opened over it and, still showing, moved into the overlay's own outlet and back out
        // again, remounting under a new node each time it did. A live DialogTrigger is still the
        // right place to land (Radix's own fallback handles it, unprevented, exactly as if no
        // opener had ever been recorded); only when there is no trigger to fall back to does
        // nothing land anywhere on its own, so it goes somewhere a person can act from instead --
        // never <body>: the page's toast viewport if one is mounted, else the main landmark.
        if (trigger.current?.isConnected) return
        const fallback = document.getElementById(PAGE_TOAST_VIEWPORT_ID) ?? document.getElementById('main')
        fallback?.focus()
        if (fallback && document.activeElement === fallback) event.preventDefault()
      },
      close: () => setOpen(false),
      registerTrigger: node => {
        trigger.current = node
      },
    }),
    [setOpen]
  )

  return (
    <OverlayRootContext.Provider value={root}>
      <RadixDialog.Root open={current} onOpenChange={setOpen}>
        {children}
      </RadixDialog.Root>
    </OverlayRootContext.Provider>
  )
}

export type DialogTriggerProps = ComponentPropsWithoutRef<typeof RadixDialog.Trigger> & {
  ref?: Ref<HTMLButtonElement>
}

/** Records itself with the nearest Dialog root, so a close whose recorded opener is gone can tell
 *  a still-mounted trigger apart from none at all (see Dialog's onCloseAutoFocus). */
export function DialogTrigger({ ref, ...rest }: DialogTriggerProps) {
  const root = useOverlayRoot()
  // A stable callback (only `root` in its deps), not a fresh inline closure every render: a
  // merged ref's identity has to stay put across renders, or React detaches and reattaches it
  // (and so calls registerTrigger(null) then registerTrigger(node) again) on every one.
  const registerTrigger = useCallback((node: HTMLButtonElement | null) => root?.registerTrigger(node), [root])
  const setRef = useMergedRefs<HTMLButtonElement>(registerTrigger, ref)
  return <RadixDialog.Trigger ref={setRef} {...rest} />
}

export const DialogClose = RadixDialog.Close

/** The visible title (the dialog's accessible name) and optional description. */
export function DialogHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-6 pr-16">
      <RadixDialog.Title className="font-display font-semibold text-xl leading-snug text-[var(--color-text-primary)]">
        {title}
      </RadixDialog.Title>
      {description ? (
        <RadixDialog.Description className="font-body text-sm text-[var(--color-text-secondary)]">
          {description}
        </RadixDialog.Description>
      ) : null}
    </div>
  )
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const

export type DialogContentProps = Omit<
  ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  'title' | 'role' | 'aria-labelledby' | 'aria-describedby' | 'onCloseAutoFocus'
> & {
  /** Required. The visible heading, and the dialog's accessible name. */
  title: string
  /** Shown under the title and wired as the accessible description. */
  description?: string
  /** @default 'md' */
  size?: keyof typeof SIZES
  /** @default 'Close' */
  closeLabel?: string
  ref?: Ref<HTMLDivElement>
  /** Radix computes these three and then spreads the caller's props over them, so each is
   *  omitted AND declared never: omission alone does not stop a hyphenated key (design.md, "The
   *  hyphenated-key rule"). */
  role?: never
  'aria-labelledby'?: never
  'aria-describedby'?: never
}

export function DialogContent({
  title,
  description,
  size = 'md',
  closeLabel = 'Close',
  className,
  children,
  ref,
  ...rest
}: DialogContentProps) {
  return (
    <OverlayFrame
      ref={ref}
      closeLabel={closeLabel}
      // The scrim layer is the scroll container and the surface centres with m-auto, so a dialog
      // taller than the viewport starts at its top instead of overflowing upward out of reach.
      overlayClassName="overflow-y-auto p-4"
      className={cn('crosshair m-auto w-full flex flex-col border', SIZES[size], className)}
      {...rest}
    >
      <DialogHeading title={title} description={description} />
      <div className="px-6 pb-6 font-body text-sm text-[var(--color-text-primary)]">{children}</div>
    </OverlayFrame>
  )
}

/** The action row. Put the safe action first: it is also the first footer stop. */
export function DialogFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-3 mt-6', className)} {...rest} />
}
