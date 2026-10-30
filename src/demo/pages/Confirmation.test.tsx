import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { Confirmation } from './Confirmation'

const ORDER = {
  orderNumber: 'HX-100231',
  email: 'rae@hexline.test',
  total: 8100,
  lines: [
    { id: 'bump-helmet:S/M:black', name: 'Bump helmet', detail: 'Size S/M · Black', unitPrice: 6900, quantity: 1 },
  ],
}

function renderWithState(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/store/checkout/confirmation', state }]}>
      <Confirmation />
    </MemoryRouter>
  )
}

describe('Confirmation', () => {
  // The order's own lines (€69.00) don't add up to its total (€81.00) on their own -- the
  // €12.00 difference is the delivery chosen on Checkout's own Delivery step, which Confirmation
  // never receives as its own field. Asserting the Delivery row is what proves the numbers on this
  // page actually reconcile, not just that a Total renders.
  // Mutation: change the Delivery row's amount in Confirmation.tsx from `order.total - linesTotal`
  // to `order.total` -> this shows €81.00 twice (Delivery and Total), and the €12.00 assertion
  // below fails.
  it('with an order in state, shows the order number, the email line, the lines, delivery and the total', () => {
    renderWithState({ order: ORDER })
    expect(screen.getByRole('heading', { level: 1, name: 'Order placed' })).toBeInTheDocument()
    expect(screen.getByText('HX-100231')).toBeInTheDocument()
    expect(screen.getByText(/A confirmation would go to rae@hexline\.test/)).toBeInTheDocument()
    expect(screen.getByText(/nothing was charged and nothing will/)).toBeInTheDocument()
    expect(screen.getByText('Bump helmet')).toBeInTheDocument()
    expect(screen.getByText('€69.00')).toBeInTheDocument()
    expect(screen.getByText('Delivery')).toBeInTheDocument()
    expect(screen.getByText('€12.00')).toBeInTheDocument()
    expect(screen.getByText('€81.00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the shop' })).toHaveAttribute('href', '/store/shop')
  })

  // Standard delivery is free, and this page's own figure should read the way Checkout's own
  // `priceOf` does, not a bare "€0.00" -- the same rule, on the page that confirms the choice.
  // Mutation: change `deliveryLabel` in Confirmation.tsx to always `formatMoney(delivery)`, never
  // "Free" -> the assertion below finds "€0.00" instead.
  it('shows Free for the delivery row when the order carries no delivery cost', () => {
    renderWithState({ order: { ...ORDER, total: 6900 } })
    expect(screen.getByText('Delivery').nextElementSibling).toHaveTextContent('Free')
  })

  // Mutation: delete the `if (typeof state !== 'object' || state === null) return undefined` guard
  // from `orderFrom` in Confirmation.tsx -> `location.state` is `null` on a direct load, so the
  // very next line throws reading `.order` off `null` (`Cannot read properties of null (reading
  // 'order')`) instead of rendering the heading below.
  it('with no state (a direct load), shows "No recent order" instead', () => {
    renderWithState(undefined)
    expect(screen.getByRole('heading', { level: 1, name: 'No recent order' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Order placed' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the shop' })).toHaveAttribute('href', '/store/shop')
  })

  // Mutation: change `orderFrom` to accept `state.order` with no shape check at all (drop every
  // `typeof`/`Array.isArray` guard) -> a malformed or tampered state (a hand-edited sessionStorage
  // entry replayed through history, say) renders whatever garbage it holds instead of falling
  // back to "No recent order".
  it('a malformed order in state is treated the same as no order at all', () => {
    renderWithState({ order: { orderNumber: 'HX-100231' } })
    expect(screen.getByRole('heading', { level: 1, name: 'No recent order' })).toBeInTheDocument()
  })

  // An order with every OTHER field valid, isolating the `lines` check on its own -- the
  // malformed-order test above is missing several fields at once and would pass even if only the
  // `lines` guard were dropped, so it proves nothing about that guard specifically.
  // Mutation: drop the `!Array.isArray(o.lines)` check from `orderFrom` in Confirmation.tsx -> the
  // string `'x'` fails `.lines.every(isCartLine)` a line further down with a thrown TypeError
  // (`'x'.every is not a function`) instead of falling back to "No recent order".
  it('an order whose lines are not an array is treated the same as no order at all', () => {
    renderWithState({ order: { ...ORDER, lines: 'x' } })
    expect(screen.getByRole('heading', { level: 1, name: 'No recent order' })).toBeInTheDocument()
  })

  it('is axe clean with an order', async () => {
    const { container } = renderWithState({ order: ORDER })
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('is axe clean with no recent order', async () => {
    const { container } = renderWithState(undefined)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
