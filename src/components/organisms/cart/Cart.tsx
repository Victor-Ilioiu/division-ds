import { useId, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { formatMoney } from '../../../lib/money'
import { useMergedRefs } from '../../../lib/refs'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'
import { IconButton } from '../../atoms'
import { QuantityStepper, useToast } from '../../molecules'

export type CartLine = {
  /** Unique within lines: rows are keyed by it, and callbacks identify lines by it. */
  id: string
  name: string
  href?: string
  /** Size, colour and the like: "Size M · Ember". */
  detail?: string
  /** In the currency's minor unit (cents for EUR). */
  unitPrice: number
  quantity: number
  /** @default 99 */
  maxQuantity?: number
}

export type CartProps = {
  lines: CartLine[]
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  /** Puts a removed line back at `index`. When given, the removal toast offers Undo. */
  onRestore?: (line: CartLine, index: number) => void
  /** @default 'Cart' */
  title?: string
  /** @default 2 */
  headingLevel?: 2 | 3 | 4
  /** @default 'Your cart is empty.' */
  emptyMessage?: string
  /** Under the subtotal, e.g. a checkout button. Hidden while the cart is empty. */
  footer?: ReactNode
  /** @default 'EUR' */
  currency?: string
  /** @default 'en-IE' */
  locale?: string
  /** @default a plain anchor */
  renderLink?: (props: LinkRenderProps) => ReactNode
  className?: string
  ref?: Ref<HTMLElement>
}

type PendingFocus =
  | { kind: 'after-removal'; index: number; count: number }
  | { kind: 'restored'; id: string }

const NAME_LINK =
  'inline-flex items-center min-h-6 hover:underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * The lines someone means to buy: each with a quantity, a line total and Remove, and a subtotal
 * that is announced as it changes. Controlled: the caller owns the lines.
 *
 * Removing a line raises a toast (with Undo when `onRestore` is given) and moves focus to the next
 * line's Remove button, the previous one when the last line went, or the heading once the cart is
 * empty. Focus waits for the caller's change to arrive, and a key or pointer press anywhere in the
 * cart drops that wait: a removal the caller declined never moves focus later, as does an overlay
 * open over the cart.
 *
 * Contrast rows, on surface.base: names and totals "text.primary on surface.base"; details, unit prices, the
 * item count and the Remove glyph "text.secondary on surface.base"; rings "focus.ring on
 * surface.base". On a raised panel: "text.primary on surface.raised (over surface.base)", "alert
 * body and ghost dismiss (text.secondary) on surface.raised (over surface.base)" and "focus ring
 * (focus.ring) on surface.raised (over surface.base)". QuantityStepper brings its own rows.
 */
export function Cart({
  lines,
  onQuantityChange,
  onRemove,
  onRestore,
  title = 'Cart',
  headingLevel = 2,
  emptyMessage = 'Your cart is empty.',
  footer,
  currency,
  locale,
  renderLink = renderAnchor,
  className,
  ref,
}: CartProps) {
  const { toast } = useToast()
  const headingId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const removeButtons = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocus = useRef<PendingFocus | null>(null)
  const section = useRef<HTMLElement>(null)
  const setSection = useMergedRefs<HTMLElement>(section, ref)

  const money = (minorUnits: number) => formatMoney(minorUnits, { currency, locale })
  const items = lines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const Heading = `h${headingLevel}` as const

  useLayoutEffect(() => {
    const wanted = pendingFocus.current
    if (!wanted) return
    // Behind an open overlay (the page a dialog or sheet hides, marked aria-hidden or inert),
    // focus has nowhere to land here: the overlay's focus trap would pull it straight back, or
    // leave it on a node assistive tech cannot see. That happens when a removal toast has moved
    // into an overlay opened after it and Undo is pressed there. Drop the wait; focus stays in
    // the overlay.
    if (section.current?.closest('[aria-hidden="true"], [inert]')) {
      pendingFocus.current = null
      return
    }
    if (wanted.kind === 'after-removal') {
      // Not landed yet (or declined): stay armed until the list shrinks or the person moves on.
      if (lines.length >= wanted.count) return
      pendingFocus.current = null
      if (lines.length === 0) heading.current?.focus()
      else removeButtons.current.get(lines[Math.min(wanted.index, lines.length - 1)].id)?.focus()
    } else {
      // Looked up by id: onRestore is the caller's own code, and the only promise CartProps makes
      // about it is "puts a removed line back at index" -- it is not required to land there (a
      // caller that appends instead, say). Wherever the line ended up, its id finds it.
      if (!lines.some(line => line.id === wanted.id)) return
      pendingFocus.current = null
      removeButtons.current.get(wanted.id)?.focus()
    }
  }, [lines])

  // Any key or pointer press in the cart means the person has moved on from a pending removal. In
  // the capture phase, so a descendant that stops propagation (a caller's renderLink, say) cannot
  // keep a stale wait armed: a capture-phase listener on the section runs before the event ever
  // reaches that descendant, so its own stopPropagation call -- which only blocks the bubble phase
  // back up through here -- is already too late to matter. Every keyboard handler here guards
  // against a composing IME keystroke unless, like this one, it never reads which key fired or
  // acts on it at all -- it only clears `pendingFocus`, and a composing keystroke means the person
  // is doing something in the cart exactly as much as any other one does.
  const moveOn = () => {
    pendingFocus.current = null
  }

  const remove = (line: CartLine, index: number) => {
    pendingFocus.current = { kind: 'after-removal', index, count: lines.length }
    onRemove(line.id)
    toast({
      title: `Removed ${line.name}`,
      action: onRestore
        ? {
            label: 'Undo',
            altText: `Add ${line.name} to the cart again to undo this.`,
            onAction: () => {
              pendingFocus.current = { kind: 'restored', id: line.id }
              onRestore(line, index)
            },
          }
        : undefined,
    })
  }

  return (
    <section
      ref={setSection}
      aria-labelledby={headingId}
      onKeyDownCapture={moveOn}
      onPointerDownCapture={moveOn}
      className={cn('@container flex flex-col gap-4', className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <Heading
          id={headingId}
          ref={heading}
          tabIndex={-1}
          className="font-display font-semibold text-xl text-[var(--color-text-primary)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          {title}
        </Heading>
        {lines.length > 0 ? (
          <p className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
            {items === 1 ? '1 item' : `${items} items`}
          </p>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <p className="font-body text-sm text-[var(--color-text-secondary)]">{emptyMessage}</p>
      ) : (
        <ul role="list" className="flex flex-col border-t border-[var(--color-border-hairline)]">
          {/* Keyed by id, not index: a row holds state (QuantityStepper's half-typed draft, and
              focus). Keyed by index, a caller that removes or reorders lines under a draft would
              hand that draft to whichever line now sits at its position, and blur would commit it
              to the wrong product. CartLine.id is already unique by contract: onRemove and
              onQuantityChange identify lines by it. */}
          {lines.map((line, index) => (
            <li
              key={line.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 py-4 border-b border-[var(--color-border-hairline)] @md:grid-cols-[1fr_auto_6rem_auto]"
            >
              <div className="col-span-2 min-w-0 @md:col-span-1">
                <p className="font-display font-semibold text-[var(--color-text-primary)]">
                  {line.href ? renderLink({ href: line.href, className: NAME_LINK, children: line.name }) : line.name}
                </p>
                {line.detail ? (
                  <p className="font-body text-sm text-[var(--color-text-secondary)]">{line.detail}</p>
                ) : null}
                <p className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
                  {money(line.unitPrice)} each
                </p>
              </div>
              <QuantityStepper
                label={`${line.name} quantity`}
                value={line.quantity}
                min={1}
                max={line.maxQuantity ?? 99}
                inputSize="sm"
                onValueChange={quantity => onQuantityChange(line.id, quantity)}
              />
              <p className="font-mono tabular-nums text-right text-[var(--color-text-primary)]">
                <span className="sr-only">Line total: </span>
                {money(line.unitPrice * line.quantity)}
              </p>
              <IconButton
                ref={node => {
                  if (!node) return
                  removeButtons.current.set(line.id, node)
                  return () => {
                    if (removeButtons.current.get(line.id) === node) removeButtons.current.delete(line.id)
                  }
                }}
                label={`Remove ${line.name}`}
                variant="ghost"
                size="sm"
                onClick={() => remove(line, index)}
              >
                <Trash2 aria-hidden="true" className="w-4 h-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {/* Persistent across every render, whether or not there are lines: a role="status" that
          only ever appears already carrying its subtotal -- mounted fresh the moment Undo
          restores the last line into an empty cart, as this used to do by rendering it only
          inside the non-empty branch -- is not reliably announced by NVDA or JAWS. A live region
          has to already exist for a later change to its text to be picked up as an update.
          Always sr-only, which in this system means `position: absolute`: an out-of-flow element
          takes no place among its siblings, so unlike the div below it never becomes a flex item
          and never adds a gap-4 slot, empty or not. The div below is the sighted duplicate --
          aria-hidden, so the two are never both read -- and it mounts only with lines, exactly
          because it is not the node anything depends on staying put. The same persistent-node
          rule as ProductGrid's status (mounted once, only its text changes) -- the two differ in
          shape: ProductGrid keeps one status node throughout, this one is a permanent sr-only
          node paired with a separate sighted duplicate that mounts and unmounts. */}
      <p role="status" className="sr-only">
        {lines.length > 0 ? (
          <>
            <span>Subtotal</span> <span>{money(subtotal)}</span>
          </>
        ) : null}
      </p>
      {lines.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p
            aria-hidden="true"
            className="flex justify-between font-mono tabular-nums text-[var(--color-text-primary)]"
          >
            <span>Subtotal</span> <span>{money(subtotal)}</span>
          </p>
          <p className="font-body text-xs text-[var(--color-text-secondary)]">Shipping and taxes are added at checkout.</p>
        </div>
      ) : null}
      {footer && lines.length > 0 ? <div className="flex flex-wrap justify-end gap-3">{footer}</div> : null}
    </section>
  )
}
