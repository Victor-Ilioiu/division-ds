import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useMergedRefs } from '../../../lib/refs'
import { IconButton } from '../../atoms'

/**
 * A docked, non-modal side panel: the standard side sheet of Material 3, where Sheet is the modal
 * one. It sits beside the content in the page's own layout and pushes it aside, so the page stays
 * visible, scrollable and usable while the panel is open. That is the difference that matters: an
 * item opened from a board or a list can be read and edited while the board is still in view, and
 * another item can be opened from the board without closing anything first.
 *
 * Non-modal means no scrim, no focus trap and no portal. Focus moves to the panel's heading when it
 * opens, Escape inside the panel closes it, and closing returns focus to whatever opened it, when
 * focus was still in the panel.
 *
 * The leading edge is a resize handle: a vertical `separator` with a value, dragged with a pointer
 * or moved with the arrow keys, so the width is never pointer-only.
 *
 * Below the md breakpoint (768px) there is no room to dock, so it covers the screen instead,
 * edge to edge, like a full-screen Dialog.
 *
 * Contrast: the panel paints surface.base, so the title reuses "text.primary on surface.base", the
 * eyebrow, description and close glyph "text.secondary on surface.base", and focus rings "focus.ring
 * on surface.base". The handle's line at rest is the hairline (decorative, the separator's value is
 * announced); hovered, dragged or focused it is accent.signal.indicator, the board's own
 * drop-indicator colour.
 */

export const SIDE_PANEL_WIDTH = { default: 560, min: 360, max: 960, step: 32 } as const

export type SidePanelProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'aria-labelledby' | 'aria-describedby'> & {
  /** Whether the panel is shown. Closed, it renders nothing. */
  open: boolean
  /** Called with false by the close button and by Escape inside the panel. */
  onOpenChange: (open: boolean) => void
  /** Required. The visible heading (an h2), and the panel's accessible name. */
  title: string
  /** A short line above the title: an item's key, its type, its column. */
  eyebrow?: ReactNode
  /** Shown under the title, and the panel's accessible description. */
  description?: string
  /** Controls in the header, before the close button: Run, an overflow menu. */
  actions?: ReactNode
  /** Pinned under the body, outside the scroll: the Save or Create buttons of a form. */
  footer?: ReactNode
  /** The width in pixels, when your code controls it. Pass it with onWidthChange. */
  width?: number
  /** @default 560 */
  defaultWidth?: number
  /** @default 360 */
  minWidth?: number
  /** @default 960 */
  maxWidth?: number
  /** Called as the width changes, from a drag or the keyboard. Store it to remember the width. */
  onWidthChange?: (width: number) => void
  /** @default 'Resize panel' */
  resizeLabel?: string
  /** @default 'Close' */
  closeLabel?: string
  /** @default true */
  closeOnEscape?: boolean
  /** The h2 by default. Pick the level that carries on the page's outline. */
  headingLevel?: 2 | 3
  ref?: Ref<HTMLElement>
  'aria-labelledby'?: never
  'aria-describedby'?: never
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

export function SidePanel({ open, ...props }: SidePanelProps) {
  if (!open) return null
  return <OpenPanel {...props} />
}

/** The mounted panel. A separate component so the opener is recorded once per open, in a layout
 *  effect that runs before anything inside can take focus, and handed back on unmount. */
function OpenPanel({
  onOpenChange,
  title,
  eyebrow,
  description,
  actions,
  footer,
  width,
  defaultWidth = SIDE_PANEL_WIDTH.default,
  minWidth = SIDE_PANEL_WIDTH.min,
  maxWidth = SIDE_PANEL_WIDTH.max,
  onWidthChange,
  resizeLabel = 'Resize panel',
  closeLabel = 'Close',
  closeOnEscape = true,
  headingLevel = 2,
  className,
  style,
  children,
  onKeyDown,
  ref,
  ...rest
}: Omit<SidePanelProps, 'open'>) {
  const titleId = useId()
  const descriptionId = useId()
  const panel = useRef<HTMLElement | null>(null)
  const heading = useRef<HTMLHeadingElement | null>(null)
  const setRefs = useMergedRefs<HTMLElement>(panel, ref)
  const [internalWidth, setInternalWidth] = useState(() => clamp(defaultWidth, minWidth, maxWidth))
  const current = clamp(width ?? internalWidth, minWidth, maxWidth)
  const drag = useRef<{ x: number; width: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const setWidth = (next: number) => {
    const value = clamp(next, minWidth, maxWidth)
    if (width === undefined) setInternalWidth(value)
    onWidthChange?.(value)
  }

  // Record the opener before focus moves, and give it back on close, but only when focus is still
  // in the panel (or nowhere): a click on another card that swaps the panel's content keeps focus
  // on that card.
  useLayoutEffect(() => {
    const active = document.activeElement
    const opener = active instanceof HTMLElement && active !== document.body ? active : null
    if (!panel.current?.contains(document.activeElement)) heading.current?.focus({ preventScroll: true })
    const node = panel.current
    return () => {
      const now = document.activeElement
      const inside = now === null || now === document.body || Boolean(node?.contains(now))
      if (inside && opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.key !== 'Escape' || !closeOnEscape) return
    // React events bubble through portals: an Escape that closes a Select's listbox or a menu
    // opened from inside the panel is that overlay's, not the panel's.
    if (!(event.target instanceof Node) || !panel.current?.contains(event.target)) return
    if ((event.nativeEvent as KeyboardEvent).isComposing) return
    event.preventDefault()
    onOpenChange(false)
  }

  const onHandleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? SIDE_PANEL_WIDTH.step * 4 : SIDE_PANEL_WIDTH.step
    // The handle is on the panel's left edge, so left widens it, as a drag to the left does.
    const next =
      event.key === 'ArrowLeft' ? current + step
      : event.key === 'ArrowRight' ? current - step
      : event.key === 'Home' ? minWidth
      : event.key === 'End' ? maxWidth
      : null
    if (next === null) return
    event.preventDefault()
    setWidth(next)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.current = { x: event.clientX, width: current }
    setDragging(true)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    setWidth(drag.current.width + (drag.current.x - event.clientX))
  }
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const Heading = headingLevel === 3 ? 'h3' : 'h2'

  return (
    <aside
      {...rest}
      ref={setRefs}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-state="open"
      onKeyDown={onPanelKeyDown}
      style={{ ...style, '--side-panel-width': `${current}px` } as CSSProperties}
      className={cn(
        // Phone: the whole screen, over the page. md and up: docked beside the content, full height
        // of its row, sticky so it stays in view while the page scrolls.
        'fixed inset-0 z-40 flex flex-col bg-[var(--color-surface-base)] anim-snap-in',
        'md:inset-auto md:z-auto md:shrink-0 md:w-[var(--side-panel-width)] md:max-w-full',
        'md:sticky md:top-0 md:self-start md:h-dvh md:border-l md:border-[var(--color-border-hairline-strong)]',
        dragging && 'select-none',
        className
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
        aria-valuenow={current}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuetext={`${current} pixels wide`}
        tabIndex={0}
        onKeyDown={onHandleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-dragging={dragging ? '' : undefined}
        className={cn(
          'group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none md:block',
          'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-focus-ring)]'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors duration-[var(--duration-fast)] motion-reduce:transition-none',
            'group-hover:bg-[var(--color-accent-signal-indicator)] group-focus-visible:bg-[var(--color-accent-signal-indicator)] group-data-[dragging]:bg-[var(--color-accent-signal-indicator)]'
          )}
        />
      </div>
      <header className="flex items-start gap-3 border-b border-[var(--color-border-hairline)] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {eyebrow ? (
            <div className="font-data text-sm text-[var(--color-text-secondary)]">{eyebrow}</div>
          ) : null}
          <Heading
            ref={heading}
            id={titleId}
            tabIndex={-1}
            className="font-display text-xl font-semibold leading-snug text-[var(--color-text-primary)] break-words outline-none"
          >
            {title}
          </Heading>
          {description ? (
            <p id={descriptionId} className="font-body text-sm text-[var(--color-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {actions}
          <IconButton label={closeLabel} variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X aria-hidden="true" className="h-4 w-4" />
          </IconButton>
        </div>
      </header>
      {/* The scroll container. min-h-0 lets it shrink below its content so it scrolls instead of
          stretching the panel; the header and footer stay put. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 font-body text-sm text-[var(--color-text-primary)] sm:px-6">
        {children}
      </div>
      {footer ? (
        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--color-border-hairline)] px-5 py-4 sm:px-6">
          {footer}
        </div>
      ) : null}
    </aside>
  )
}
