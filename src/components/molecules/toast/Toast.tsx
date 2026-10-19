import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Toast as RadixToast } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { TONES, type Tone } from '../../../lib/tone'
import { IconButton } from '../../atoms'

export type ToastOptions = {
  title: string
  description?: string
  tone?: Tone
  /** ms before it leaves on its own. Default 5000; 8000 for hostile. */
  duration?: number
  /** Radix requires altText: the way to do the same thing for someone who cannot reach the toast
   *  before it leaves. */
  action?: { label: string; altText: string; onAction: () => void }
}

type LiveToast = ToastOptions & { id: string; open: boolean; outlet: string }

type ToastApi = { toast: (options: ToastOptions) => string; dismiss: (id: string) => void }

const ToastContext = createContext<ToastApi | null>(null)

type ToastStore = {
  toasts: LiveToast[]
  dismiss: (id: string) => void
  /** Puts an outlet on top of the stack. Moves every toast still showing into it. The cleanup
   *  takes it off and moves its toasts one level out. Stable for the Toaster's lifetime. */
  register: (outlet: string) => () => void
}

const ToastStoreContext = createContext<ToastStore | null>(null)

/** The page's own outlet: the viewport in the corner of the page, under every overlay. */
const PAGE_OUTLET = 'page'

/** The page outlet's own viewport element. Dialog falls back to it when the element it means to
 *  return focus to is gone -- the opener was a page toast that moved into an overlay and back,
 *  remounting under a new node each time. Focus landing here pauses every page toast's dismiss
 *  timer for as long as it stays (Radix's Viewport pauses on its own wrapper's `focusin`), the
 *  same as hovering the viewport does. An `id`, so it assumes one `Toaster` per page -- two would
 *  collide on it. */
export const PAGE_TOAST_VIEWPORT_ID = 'page-toast-viewport'

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <Toaster>. Mount it once, near the root (AppShell does).')
  return api
}

let counter = 0

/**
 * Mounted once, near the root (AppShell, beside TooltipProvider). Any component below it raises a
 * toast with `useToast().toast`.
 *
 * Where a toast appears is decided when it is raised: in the innermost open overlay (each one
 * mounts an outlet inside its own surface, see OverlayFrame), or in the page's corner viewport when
 * none is open. Inside an overlay the toast is inside its focus trap and outside the page that
 * Radix hides from assistive tech. When an overlay opens, every toast still showing moves into it;
 * when it closes, its toasts move one level out, so a toast raised by the click that closes a
 * dialog still shows.
 *
 * Toasts use Alert's anatomy (icon, sr-only tone word, title, description, action, dismiss) and
 * `TONES`, but on `surface.sunken` rather than `surface.raised` (see the toast rows in
 * scripts/lib/contrast-pairs.mjs), with the tone border on all four sides and no side stripe.
 */
export function Toaster({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<LiveToast[]>([])
  // Outlets inside open overlays, innermost last. A ref: which outlet is on top never changes what
  // renders until a toast is raised.
  const outlets = useRef<string[]>([])

  const dismiss = useCallback((id: string) => {
    // Close first so Radix can play its exit, then drop it from the list. A timeout rather than
    // onAnimationEnd: under reduced motion (and in jsdom) no animation runs, the event never
    // fires, and the list would grow for the life of the page.
    setToasts(list => list.map(t => (t.id === id ? { ...t, open: false } : t)))
    window.setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 400)
  }, [])

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${++counter}`
    const outlet = outlets.current.at(-1) ?? PAGE_OUTLET
    setToasts(list => [...list, { ...options, id, open: true, outlet }])
    return id
  }, [])

  const register = useCallback((outlet: string) => {
    outlets.current = [...outlets.current, outlet]
    // Every toast still showing moves in. Outside the innermost open overlay a toast is hidden from
    // assistive tech, outside the focus trap and below the modal pointer-events cutoff: it could be
    // seen and not used. The move remounts it, so Radix announces it again, inside the overlay,
    // and restarts its timer: an Undo carried into a sheet gets its full duration there. A toast
    // already closing stays where it is and finishes leaving.
    setToasts(list =>
      list.some(t => t.open && t.outlet !== outlet) ? list.map(t => (t.open ? { ...t, outlet } : t)) : list
    )
    return () => {
      outlets.current = outlets.current.filter(entry => entry !== outlet)
      const next = outlets.current.at(-1) ?? PAGE_OUTLET
      setToasts(list => list.map(t => (t.outlet === outlet ? { ...t, outlet: next } : t)))
    }
  }, [])

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss])
  const store = useMemo(() => ({ toasts, dismiss, register }), [toasts, dismiss, register])

  return (
    <ToastContext.Provider value={api}>
      <ToastStoreContext.Provider value={store}>
        {children}
        {/* A held Escape auto-repeats as more keydowns with the same key. The first one can close
            a sheet and move this toast's outlet here (register's cleanup, above) in the same
            keypress; a still-held key then keeps firing at the page outlet it just landed in,
            and without this guard that repeat would dismiss the toast the person never aimed at.
            `event.repeat` only ever describes autorepeat, never a second distinct press, so a
            deliberate second Escape (not held) still dismisses normally. */}
        <ToastList outlet={PAGE_OUTLET} viewportId={PAGE_TOAST_VIEWPORT_ID} onEscape={event => event.repeat} />
      </ToastStoreContext.Provider>
    </ToastContext.Provider>
  )
}

/**
 * The outlet an overlay mounts inside its own surface. Renders nothing without a Toaster above it,
 * so an overlay still works on its own.
 */
export function OverlayToasts({
  container,
  onEscape,
}: {
  /** Where Radix puts the toast's announcement: inside the overlay, not the hidden page. */
  container: HTMLElement | null
  /** Called for an Escape that reaches a toast while focus is outside every toast. Returns true
   *  when the overlay took it, and the toast then stays. */
  onEscape: (event: KeyboardEvent) => boolean
}) {
  const register = useContext(ToastStoreContext)?.register
  const outlet = useId()
  // A layout effect, so the outlet is on the stack before any event can raise a toast.
  useLayoutEffect(() => register?.(outlet), [register, outlet])
  return <ToastList outlet={outlet} announcer={container} onEscape={onEscape} />
}

function ToastList({
  outlet,
  announcer,
  onEscape,
  viewportId,
}: {
  outlet: string
  announcer?: HTMLElement | null
  onEscape?: (event: KeyboardEvent) => boolean
  /** Set only on the page outlet's own viewport, so Dialog can find it by id as a focus fallback. */
  viewportId?: string
}) {
  const store = useContext(ToastStoreContext)
  const viewport = useRef<HTMLOListElement>(null)
  if (!store) return null
  return (
    <RadixToast.Provider swipeDirection="right" announcerContainer={announcer ?? undefined}>
      {store.toasts
        .filter(t => t.outlet === outlet)
        .map(t => {
          const tone = t.tone ?? 'info'
          const look = TONES[tone]
          const Icon = look.icon
          // Computed once, so the Radix `type` prop and `data-priority` cannot disagree.
          const type = tone === 'hostile' ? 'foreground' : 'background'
          return (
            <RadixToast.Root
              key={t.id}
              open={t.open}
              onOpenChange={open => {
                if (!open) store.dismiss(t.id)
              }}
              onEscapeKeyDown={
                onEscape
                  ? event => {
                      // Focus inside a toast: this Escape is for that toast, and Radix dismisses it.
                      if (viewport.current?.contains(event.target as Node)) return
                      // Otherwise the overlay decides; when it takes the Escape the toast stays.
                      if (onEscape(event)) event.preventDefault()
                    }
                  : undefined
              }
              type={type}
              data-priority={type}
              duration={t.duration ?? (tone === 'hostile' ? 8000 : 5000)}
              className={cn(
                'flex items-start gap-3 p-4 border bg-[var(--color-surface-sunken)] anim-snap-in pointer-events-auto',
                'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:translate-x-full',
                look.border
              )}
            >
              <Icon aria-hidden="true" className={cn('w-5 h-5 mt-0.5 shrink-0', look.text)} />
              <div className="grow min-w-0">
                <RadixToast.Title className="font-display font-semibold text-[var(--color-text-primary)]">
                  <span className="sr-only">{look.word}: </span>
                  {t.title}
                </RadixToast.Title>
                {t.description ? (
                  <RadixToast.Description className="mt-1 font-body text-sm text-[var(--color-text-secondary)]">
                    {t.description}
                  </RadixToast.Description>
                ) : null}
                {t.action ? (
                  <RadixToast.Action altText={t.action.altText} asChild>
                    <button
                      type="button"
                      onClick={t.action.onAction}
                      // The Breadcrumbs precedent for a 24x24 CSS px target (SC 2.5.8) on a
                      // single line of small type -- inline-flex + min-h-6 gives the hit area
                      // real height without changing how the text itself looks.
                      className="mt-2 inline-flex items-center min-h-6 font-mono text-xs uppercase tracking-[0.12em] underline underline-offset-2 text-[var(--color-accent-signal-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    >
                      {t.action.label}
                    </button>
                  </RadixToast.Action>
                ) : null}
              </div>
              {/* The button is 32px (a 16px glyph centred in it) beside a 24px title line, and the
                  padding is measured to the glyph, not to the button's box. -my-1 (4px each side)
                  keeps the button from stretching the row, so the toast has equal space above and
                  below its first line; -mr-2 (8px, the button's own inset) puts the glyph the same
                  16px from the right edge as the icon is from the left. The margins go on
                  IconButton's wrapperClassName, not the button's own className, so the unclipped
                  focus ring moves with the button rather than hugging its old position. */}
              <RadixToast.Close asChild>
                <IconButton label="Dismiss notification" variant="ghost" size="sm" wrapperClassName="-my-1 -mr-2">
                  <X aria-hidden="true" className="w-4 h-4" />
                </IconButton>
              </RadixToast.Close>
            </RadixToast.Root>
          )
        })}
      {/* z-[60]: above an overlay root's z-50 on the page, and above the surface inside one.
          Each toast carries pointer-events-auto (not the viewport, which would then catch clicks
          across its whole strip): a modal overlay sets pointer-events none on the body. */}
      <RadixToast.Viewport
        ref={viewport}
        id={viewportId}
        className="fixed bottom-0 right-0 z-[60] flex flex-col gap-2 p-4 w-full sm:max-w-[360px] list-none outline-none"
      />
    </RadixToast.Provider>
  )
}
