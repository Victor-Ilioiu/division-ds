import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { Toaster } from '../../components/molecules'
import { CartProvider, useCart } from '../store/cart'
import { findProduct } from '../store/catalog'
import { DISCLAIMER } from '../content'
import { Cart } from './Cart'

const HELMET = findProduct('bump-helmet')!

function Stub({ name }: { name: string }) {
  return <h1>{name}</h1>
}

/** Seeds the cart through the real `add()` a product page would call, rather than writing
 *  sessionStorage JSON by hand -- the same reasoning as Product.test.tsx's own `CartProbe`. */
function AddPack() {
  const { add } = useCart()
  return <button onClick={() => add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 })}>Seed cart</button>
}

function renderCart() {
  return render(
    <MemoryRouter initialEntries={['/store/cart']}>
      <Toaster>
        <CartProvider>
          <AddPack />
          <Routes>
            <Route path="/store/cart" element={<Cart />} />
            <Route path="/store/checkout" element={<Stub name="Checkout" />} />
            <Route path="/store/shop" element={<Stub name="Shop" />} />
          </Routes>
        </CartProvider>
      </Toaster>
    </MemoryRouter>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

describe('Cart', () => {
  // Every page that shows a product states what the products are, from the one constant. The
  // empty cart states it too: the sentence is about the store, not about what is in the cart.
  // Mutation: remove `<Disclaimer />` from Cart.tsx -> this fails.
  it('states the disclaimer, with or without lines', async () => {
    renderCart()
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Seed cart' }))
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument()
  })

  it('an empty cart shows the h1, the empty message and a Browse the shop link, with no footer', () => {
    renderCart()
    expect(screen.getByRole('heading', { level: 1, name: 'Your cart' })).toBeInTheDocument()
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the shop' })).toHaveAttribute('href', '/store/shop')
    expect(screen.queryByRole('link', { name: 'Checkout' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue shopping' })).not.toBeInTheDocument()
  })

  // Mutation: change the Checkout link's `to` from `/store/checkout` to anything else -> the href
  // assertion below fails.
  it('a full cart shows Checkout and Continue shopping links, no Browse-the-shop line', async () => {
    renderCart()
    await userEvent.click(screen.getByRole('button', { name: 'Seed cart' }))
    expect(await screen.findByText('1 item')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Checkout' })).toHaveAttribute('href', '/store/checkout')
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/store/shop')
    expect(screen.queryByText('Browse the shop')).not.toBeInTheDocument()
  })

  // Mutation: drop the `onRestore={restore}` prop from the Cart organism in Cart.tsx -> Undo never
  // appears on the removal toast below.
  it('removing a line offers Undo, wired to the real cart', async () => {
    renderCart()
    await userEvent.click(screen.getByRole('button', { name: 'Seed cart' }))
    await screen.findByText('1 item')
    await userEvent.click(screen.getByRole('button', { name: /Remove Bump helmet/ }))
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('1 item')).toBeInTheDocument()
  })

  it('is axe clean when empty', async () => {
    const { container } = renderCart()
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('is axe clean with a line in it', async () => {
    const { container } = renderCart()
    await userEvent.click(screen.getByRole('button', { name: 'Seed cart' }))
    await screen.findByText('1 item')
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

/** Confirms the redirect notice itself, the same shape auth.test.tsx's own Stub/Probe pair reads
 *  a bounce elsewhere in the shell. */
describe('Cart notice', () => {
  // Mutation: remove `<RouteNotice />` from Cart.tsx -> the notice text below never renders even
  // though the router state carries it.
  it('shows a notice left in router state by a redirect', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/store/cart',
            state: { notice: 'Your cart is empty, so there is nothing to check out yet.' },
          },
        ]}
      >
        <Toaster>
          <CartProvider>
            <Cart />
          </CartProvider>
        </Toaster>
      </MemoryRouter>
    )
    expect(screen.getByText('Your cart is empty, so there is nothing to check out yet.')).toBeInTheDocument()
  })
})
