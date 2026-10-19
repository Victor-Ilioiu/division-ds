import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../test/axe'
import { Toaster } from '../components/molecules/toast/Toast'
import { CartSheet } from './CartSheet'
import { findProduct } from './store/catalog'
import { CartProvider, useCart } from './store/cart'

const HELMET = findProduct('bump-helmet')!

/** Stands in for a product page's "Add to cart": the same store call, minus the page around it. */
function AddButton() {
  const { add } = useCart()
  return (
    <button type="button" onClick={() => add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 })}>
      Add to cart
    </button>
  )
}

function Harness() {
  return (
    <MemoryRouter>
      <Toaster>
        <CartProvider>
          <AddButton />
          <CartSheet />
        </CartProvider>
      </Toaster>
    </MemoryRouter>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

const cartButton = (name: string) => screen.getByRole('button', { name })

describe('CartSheet', () => {
  it("names the cart button by its item count, singular and plural, and updates it as lines are added", async () => {
    render(<Harness />)
    expect(cartButton('Cart, 0 items')).toBeInTheDocument()
    await userEvent.click(cartButton('Add to cart'))
    expect(cartButton('Cart, 1 item')).toBeInTheDocument()
    // Same variant again: the store merges it into the existing line, so the count is a sum of
    // quantities, not a count of lines.
    await userEvent.click(cartButton('Add to cart'))
    expect(cartButton('Cart, 2 items')).toBeInTheDocument()
  })

  it('shows a visible, aria-hidden count badge only once the cart holds a line', async () => {
    render(<Harness />)
    expect(screen.queryByText('1')).toBeNull()
    await userEvent.click(cartButton('Add to cart'))
    const badge = screen.getByText('1')
    expect(badge).toHaveAttribute('aria-hidden', 'true')
    expect(badge.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('opens a Sheet titled Cart holding the Items cart, with the added line', async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    await userEvent.click(cartButton('Cart, 1 item'))
    const sheet = await screen.findByRole('dialog', { name: 'Cart' })
    expect(within(sheet).getByRole('heading', { level: 2, name: 'Cart' })).toBeInTheDocument()
    expect(within(sheet).getByRole('heading', { level: 3, name: 'Items' })).toBeInTheDocument()
    expect(within(sheet).getByText('Bump helmet')).toBeInTheDocument()
  })

  it('leaves focus inside the sheet after removing the last line, with Undo still reachable there', async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    await userEvent.click(cartButton('Cart, 1 item'))
    const sheet = await screen.findByRole('dialog', { name: 'Cart' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove Bump helmet' }))
    expect(within(sheet).getByRole('heading', { level: 3, name: 'Items' })).toHaveFocus()
    expect(within(sheet).getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('closes the sheet when the View cart footer link is chosen', async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    await userEvent.click(cartButton('Cart, 1 item'))
    await screen.findByRole('dialog', { name: 'Cart' })
    await userEvent.click(screen.getByRole('link', { name: 'View cart' }))
    expect(screen.queryByRole('dialog', { name: 'Cart' })).toBeNull()
  })

  it('closes the sheet when the Checkout footer link is chosen', async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    await userEvent.click(cartButton('Cart, 1 item'))
    await screen.findByRole('dialog', { name: 'Cart' })
    await userEvent.click(screen.getByRole('link', { name: 'Checkout' }))
    expect(screen.queryByRole('dialog', { name: 'Cart' })).toBeNull()
  })

  // The two footer links close the sheet themselves (an explicit `onClick`, above); a line's own
  // product link is Cart's own `renderLink`, never a control CartSheet owns directly, so this is
  // the pathname-change effect's own case to prove: any navigation closes the sheet, not only the
  // two it can see coming.
  // Mutation: remove the `useEffect(() => setOpen(false), [pathname])` effect from CartSheet.tsx.
  it("closes the sheet, without dropping focus to body, after a line's own product link is followed", async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    await userEvent.click(cartButton('Cart, 1 item'))
    const sheet = await screen.findByRole('dialog', { name: 'Cart' })
    await userEvent.click(within(sheet).getByRole('link', { name: 'Bump helmet' }))
    expect(screen.queryByRole('dialog', { name: 'Cart' })).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
  })

  it('keeps focus in the sheet after Undo puts a removed line back', async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    await userEvent.click(cartButton('Cart, 1 item'))
    const sheet = await screen.findByRole('dialog', { name: 'Cart' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove Bump helmet' }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Undo' }))
    await screen.findByRole('button', { name: 'Remove Bump helmet' })
    expect(sheet.contains(document.activeElement)).toBe(true)
  })

  // Two separate checks, not one: Radix marks everything outside an open Dialog's own portal
  // aria-hidden while it's open, which would silently exempt the trigger and its count Badge
  // from axe entirely once the sheet is open. The closed-state check is what actually holds the
  // Badge itself to account.
  it('is axe clean with a visible count badge, sheet closed', async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    expect(await axeClean(document.body)).toHaveNoViolations()
  })

  it('is axe clean with the sheet open and a line showing', async () => {
    render(<Harness />)
    await userEvent.click(cartButton('Add to cart'))
    await userEvent.click(cartButton('Cart, 1 item'))
    await screen.findByRole('dialog', { name: 'Cart' })
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
