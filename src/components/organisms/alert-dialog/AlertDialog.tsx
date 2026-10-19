import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { Dialog as RadixDialog } from 'radix-ui'
import { cn } from '../../../lib/cn'
import { useMergedRefs } from '../../../lib/refs'
import { Button } from '../../atoms/button/Button'
import { Dialog, DialogTrigger } from '../dialog/Dialog'
import { OverlayFrame } from '../dialog/OverlayFrame'

/**
 * A confirmation that interrupts: "Delete this depot?" with Cancel and the action. It is Dialog
 * with three behaviours changed, the same three Radix's own AlertDialog adds on top of its Dialog:
 * the surface is `role="alertdialog"`, a click on the scrim does nothing, and focus opens on Cancel,
 * the least destructive choice, so a stray Enter cannot confirm.
 *
 * Why not Radix's AlertDialog primitive itself: it scopes its own Dialog context, so the Dialog
 * root here (which hands focus back to whatever opened the overlay, trigger or not) and
 * OverlayFrame (portal, scrim, surface, toast outlet) could not see it, and both would have to be
 * forked. Built on Dialog instead, an alert dialog closes, animates and returns focus exactly as
 * every other overlay does.
 *
 * What it adds that a hand-built confirmation always gets wrong: an action whose `onClick` returns
 * a promise keeps the dialog open and the button busy until it settles. Escape and Cancel wait for
 * it too. Resolved, the dialog closes; rejected, it stays open for the caller to show the error.
 *
 * Contrast: every colour sits on the overlay's surface.base and reuses a gated row: the title
 * "text.primary on surface.base", the description "text.secondary on surface.base", the buttons
 * their own component rows, focus rings "focus.ring on surface.base".
 */

type AlertDialogRoot = {
  /** True while the action is working; Cancel, Escape and the toast outlet's Escape wait. */
  busy: boolean
  setBusy: (busy: boolean) => void
  /** Closes past the busy guard: the action calls it once its own work is done. */
  close: () => void
}

const AlertDialogRootContext = createContext<AlertDialogRoot | undefined>(undefined)

/** The content's Cancel, so the content can focus it on open. */
const CancelRefContext = createContext<Ref<HTMLButtonElement> | undefined>(undefined)

export type AlertDialogProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function AlertDialog({ open, defaultOpen = false, onOpenChange, children }: AlertDialogProps) {
  const [internal, setInternal] = useState(defaultOpen)
  const current = open ?? internal
  const [busy, setBusy] = useState(false)
  // Read by the guard, which Radix calls from its own event handlers.
  const busyRef = useRef(false)
  useLayoutEffect(() => {
    busyRef.current = busy
  }, [busy])

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternal(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )

  // Every close Radix or the frame asks for (Escape, Cancel) goes through here.
  const guarded = useCallback(
    (next: boolean) => {
      if (!next && busyRef.current) return
      setOpen(next)
    },
    [setOpen]
  )

  const root = useMemo<AlertDialogRoot>(
    () => ({
      busy,
      setBusy,
      close: () => {
        busyRef.current = false
        setOpen(false)
      },
    }),
    [busy, setOpen]
  )

  return (
    <AlertDialogRootContext.Provider value={root}>
      <Dialog open={current} onOpenChange={guarded}>
        {children}
      </Dialog>
    </AlertDialogRootContext.Provider>
  )
}

/** Dialog's trigger, unchanged: it registers with the root so focus can come back to it. */
export const AlertDialogTrigger = DialogTrigger

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg' } as const

export type AlertDialogContentProps = Omit<
  ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  | 'title'
  | 'role'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'onCloseAutoFocus'
  | 'onPointerDownOutside'
  | 'onInteractOutside'
> & {
  /** Required. The question, as the visible heading and the accessible name. */
  title: string
  /** Required. What happens if they confirm; an alertdialog announces it with the title. */
  description: string
  /** @default 'md' */
  size?: keyof typeof SIZES
  ref?: Ref<HTMLDivElement>
  /** Computed, so each is declared never (design.md, "The hyphenated-key rule"). */
  role?: never
  'aria-labelledby'?: never
  'aria-describedby'?: never
  /** A click outside never dismisses an alert dialog. */
  onPointerDownOutside?: never
  onInteractOutside?: never
}

export function AlertDialogContent({
  title,
  description,
  size = 'md',
  className,
  children,
  onOpenAutoFocus,
  ref,
  ...rest
}: AlertDialogContentProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <CancelRefContext.Provider value={cancelRef}>
      <OverlayFrame
        ref={ref}
        role="alertdialog"
        pageToasts
        overlayClassName="overflow-y-auto p-4"
        className={cn('crosshair m-auto w-full flex flex-col border', SIZES[size], className)}
        onOpenAutoFocus={event => {
          onOpenAutoFocus?.(event)
          if (event.defaultPrevented || !cancelRef.current) return
          event.preventDefault()
          cancelRef.current.focus({ preventScroll: true })
        }}
        onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
        {...rest}
      >
        <div className="flex flex-col gap-1.5 p-6">
          <RadixDialog.Title className="font-display font-semibold text-xl leading-snug text-[var(--color-text-primary)]">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description className="font-body text-sm text-[var(--color-text-secondary)]">
            {description}
          </RadixDialog.Description>
        </div>
        <div className="px-6 pb-6 font-body text-sm text-[var(--color-text-primary)]">{children}</div>
      </OverlayFrame>
    </CancelRefContext.Provider>
  )
}

/** The action row: Cancel first, then the action. */
export function AlertDialogFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-3 mt-6', className)} {...rest} />
}

export type AlertDialogCancelProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-busy'> & {
  /** Button computes it; see Button's own aria-busy note. */
  'aria-busy'?: never
  ref?: Ref<HTMLButtonElement>
}

/** Closes without acting, and takes focus on open. Disabled while the action is working: the
 *  busy action beside it says why. */
export function AlertDialogCancel({ children = 'Cancel', disabled, ref, ...rest }: AlertDialogCancelProps) {
  const root = useContext(AlertDialogRootContext)
  const cancelRef = useContext(CancelRefContext)
  const setRefs = useMergedRefs<HTMLButtonElement>(cancelRef, ref)
  return (
    <RadixDialog.Close asChild>
      <Button ref={setRefs} variant="secondary" disabled={disabled || root?.busy} {...rest}>
        {children}
      </Button>
    </RadixDialog.Close>
  )
}

export type AlertDialogActionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'aria-busy'> & {
  /** Computed from loading; see Button's own aria-busy note. */
  'aria-busy'?: never
  /** `hostile` for what cannot be undone; `default` for a consequential but safe confirm.
   *  @default 'hostile' */
  tone?: 'hostile' | 'default'
  /** Runs on confirm. Return a promise to keep the dialog open and the button busy until it
   *  settles; call event.preventDefault() to keep it open without one. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>
  /** Busy from outside (a form you submit yourself). Holds the dialog open like a pending promise. */
  loading?: boolean
  /** Visually hidden text announced while busy. @default 'Working' */
  loadingLabel?: string
  ref?: Ref<HTMLButtonElement>
}

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof (value as Promise<unknown> | undefined)?.then === 'function'

export function AlertDialogAction({
  tone = 'hostile',
  onClick,
  loading = false,
  loadingLabel,
  ref,
  ...rest
}: AlertDialogActionProps) {
  const root = useContext(AlertDialogRootContext)
  const [pending, setPending] = useState(false)
  const busy = loading || pending
  const setBusy = root?.setBusy

  useLayoutEffect(() => {
    setBusy?.(busy)
    return () => setBusy?.(false)
  }, [busy, setBusy])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const result = onClick?.(event)
    if (isPromise(result)) {
      setPending(true)
      result.then(
        () => {
          setPending(false)
          root?.close()
        },
        // Handled here so it is not an unhandled rejection; the caller reports its own error.
        () => setPending(false)
      )
      return
    }
    if (!event.defaultPrevented) root?.close()
  }

  return (
    <Button
      ref={ref}
      variant={tone === 'hostile' ? 'danger' : 'primary'}
      loading={busy}
      loadingLabel={loadingLabel}
      onClick={handleClick}
      {...rest}
    />
  )
}
