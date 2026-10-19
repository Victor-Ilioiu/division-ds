import { Link as RouterLink, useLocation } from 'react-router-dom'
import { linkVariants } from '../../components/atoms'
import { Stat } from '../../components/molecules'
import type { CartLine } from '../../components/organisms/cart/Cart'
import { formatMoney } from '../../lib/money'
import { DEFAULT_PAGE } from '../DefaultPage'

type ConfirmedOrder = {
  orderNumber: string
  email: string
  total: number
  lines: CartLine[]
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.name === 'string' && Number.isFinite(v.unitPrice) && Number.isFinite(v.quantity)
}

/** Router state survives a reload of the same document (history state is part of the browser's
 *  own session history, not this component), but never a direct load or a link followed from
 *  outside -- both land here with `location.state` empty. That is the one thing this reads to
 *  decide which of the two pages below to show; nothing here trusts it beyond its shape. */
function orderFrom(state: unknown): ConfirmedOrder | undefined {
  if (typeof state !== 'object' || state === null) return undefined
  const order = (state as Record<string, unknown>).order
  if (typeof order !== 'object' || order === null) return undefined
  const o = order as Record<string, unknown>
  if (
    typeof o.orderNumber !== 'string' ||
    typeof o.email !== 'string' ||
    !Number.isFinite(o.total) ||
    !Array.isArray(o.lines) ||
    !o.lines.every(isCartLine)
  ) {
    return undefined
  }
  return { orderNumber: o.orderNumber, email: o.email, total: o.total as number, lines: o.lines as CartLine[] }
}

/**
 * Where a placed order lands. Reached only by the navigation `Checkout.tsx` makes right after
 * `placeOrder` resolves, carrying the order in router state. A reload of this page keeps the
 * order (history state survives a reload; only the address bar's own URL does not), and that is
 * accepted rather than treated as a bug. A direct load or a followed link is a different browsing
 * session with no history state to carry, so both show the same "No recent order" page instead of
 * inventing an order that was never placed.
 */
export function Confirmation() {
  const location = useLocation()
  const order = orderFrom(location.state)

  if (!order) {
    return (
      <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-4`}>
        <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">No recent order</h1>
        <p className="font-body text-sm text-[var(--color-text-secondary)]">
          There's no order to show here. This page only shows one right after it's placed.
        </p>
        <p>
          <RouterLink to="/demo/shop" className={linkVariants()}>
            Back to the shop
          </RouterLink>
        </p>
      </div>
    )
  }

  // The lines' own total never has to equal `order.total` -- delivery is chosen on Checkout's own
  // Delivery step and folded into the total there, never carried as its own field. Naming it here
  // as the difference is what keeps the numbers on this page adding up to a reader, rather than a
  // single line and a Total that don't match with nothing shown in between.
  const linesTotal = order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const delivery = order.total - linesTotal
  // Same rule as CheckoutForm's own `priceOf`: standard delivery is free, and this page's own
  // figure should read the same way that chose it, not a bare "€0.00".
  const deliveryLabel = delivery === 0 ? 'Free' : formatMoney(delivery)

  return (
    <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-6`}>
      <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Order placed</h1>
      <div className="flex flex-col gap-6 max-w-md">
        <Stat label="Order number" value={order.orderNumber} />
        <p className="font-body text-sm text-[var(--color-text-secondary)]">
          A confirmation would go to {order.email}. This is a concept store, so nothing was charged and nothing will
          ship.
        </p>
        <ul role="list" className="flex flex-col gap-2 border-t border-[var(--color-border-hairline)] pt-4">
          {order.lines.map((line, index) => (
            <li key={index} className="flex justify-between gap-3 font-body text-sm text-[var(--color-text-primary)]">
              <span>
                {line.name}
                <span className="text-[var(--color-text-secondary)]">
                  <span className="sr-only">, quantity</span>
                  <span aria-hidden="true"> ×</span> {line.quantity}
                </span>
              </span>
              <span className="font-mono tabular-nums">{formatMoney(line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 pt-2 border-t border-[var(--color-border-hairline)] font-mono text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-secondary)]">Delivery</dt>
            <dd className="tabular-nums text-[var(--color-text-primary)]">{deliveryLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-[var(--color-text-primary)]">Total</dt>
            <dd className="tabular-nums font-semibold text-[var(--color-text-primary)]">{formatMoney(order.total)}</dd>
          </div>
        </dl>
        <p>
          <RouterLink to="/demo/shop" className={linkVariants()}>
            Back to the shop
          </RouterLink>
        </p>
      </div>
    </div>
  )
}
