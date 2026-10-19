import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '../../components/molecules'
import type { CheckoutFormProps, CheckoutOrder } from '../../components/organisms/checkout-form/CheckoutForm'
import { ApiError, placeOrder } from '../store/api'
import { CartProvider, useCart } from '../store/cart'
import { DISCLAIMER } from '../content'
import { Checkout } from './Checkout'

vi.mock('../store/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../store/api')>()
  return { ...actual, placeOrder: vi.fn() }
})

// CheckoutForm's own validation, steps and retryable alert already have their own test file
// (checkout-form/CheckoutForm.test.tsx) -- this page's job is the wiring around it (the cart's
// lines, the country list, and what `onPlaceOrder` actually does), so it is stubbed down to just
// that: a probe that records the props it was given and a way to call `onPlaceOrder` directly,
// the same shape Product.test.tsx's own `CartProbe` reads the cart the page just wrote to.
let lastProps: CheckoutFormProps | null = null

vi.mock('../../components/organisms/checkout-form/CheckoutForm', async importOriginal => {
  const actual = await importOriginal<typeof import('../../components/organisms/checkout-form/CheckoutForm')>()
  return {
    ...actual,
    CheckoutForm: (props: CheckoutFormProps) => {
      lastProps = props
      return (
        <div data-testid="checkout-form-stub">
          <p data-testid="lines">{props.lines.map(line => `${line.id}:${line.quantity}`).join(',')}</p>
          <p data-testid="countries">{props.countries.map(country => country.value).join(',')}</p>
        </div>
      )
    },
  }
})

const ORDER: CheckoutOrder = {
  email: 'rae@hexline.test',
  name: 'Rae',
  phone: '',
  shipping: { line1: '1 Field Lane', line2: '', city: 'Cork', postalCode: 'T12 X285', country: 'IE' },
  deliveryId: 'standard',
  billing: 'same-as-shipping',
  total: 6900,
}

/** A single line already in the cart -- the shape `useCart()`'s own `add()` produces, written
 *  straight into storage so `CartProvider` picks it up on its very first render, before the
 *  guard in `Checkout.tsx` ever gets to look at an empty cart. Adding through the real `add()`
 *  after mount, as Product.test.tsx and Cart.test.tsx both do, is one render too late here: the
 *  guard runs on the FIRST render, when the cart is still empty, and once it has already
 *  navigated to `/demo/cart` there is nothing that ever routes back. */
function seedCart() {
  sessionStorage.setItem(
    'hexline-cart',
    JSON.stringify([
      {
        id: 'bump-helmet:S/M:black',
        productId: 'bump-helmet',
        name: 'Bump helmet',
        href: '/demo/shop/bump-helmet',
        detail: 'Size S/M · Black',
        unitPrice: 6900,
        quantity: 1,
        maxQuantity: 10,
        size: 'S/M',
        colourId: 'black',
      },
    ])
  )
}

function Stub({ name }: { name: string }) {
  const location = useLocation()
  return (
    <div>
      <h1>{name}</h1>
      <output data-testid="state">{JSON.stringify(location.state)}</output>
    </div>
  )
}

function CartProbe() {
  const { lines } = useCart()
  return <output data-testid="cart-lines">{lines.map(line => `${line.id}:${line.quantity}`).join(',')}</output>
}

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/demo/checkout']}>
      <Toaster>
        <CartProvider>
          <CartProbe />
          <Routes>
            <Route path="/demo/checkout" element={<Checkout />} />
            <Route path="/demo/checkout/confirmation" element={<Stub name="Confirmation" />} />
            <Route path="/demo/cart" element={<Stub name="Cart" />} />
          </Routes>
        </CartProvider>
      </Toaster>
    </MemoryRouter>
  )
}

/** Unmounts only `Checkout` itself, leaving `Toaster` and `CartProvider` mounted -- the real
 *  shape of "the page navigated away while an order was still in flight," unlike unmounting the
 *  whole tree, which would also take down the toast infrastructure the page's own post-unmount
 *  branch depends on. */
function renderToggleableCheckout() {
  function Toggle() {
    const [show, setShow] = useState(true)
    return (
      <>
        {show ? <Checkout /> : null}
        <button onClick={() => setShow(false)}>Leave checkout</button>
      </>
    )
  }
  return render(
    <MemoryRouter initialEntries={['/demo/checkout']}>
      <Toaster>
        <CartProvider>
          <CartProbe />
          <Toggle />
        </CartProvider>
      </Toaster>
    </MemoryRouter>
  )
}

afterEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  lastProps = null
})

describe('Checkout', () => {
  // Mutation: drop the `placedLines === null && lines.length === 0` guard in Checkout.tsx (render
  // CheckoutForm unconditionally) -> the stub route below never mounts, and the notice is never
  // carried.
  it('an empty cart on direct load redirects to /demo/cart with a notice', async () => {
    renderCheckout()
    expect(await screen.findByRole('heading', { level: 1, name: 'Cart' })).toBeInTheDocument()
    expect(screen.getByTestId('state').textContent).toContain(
      'Your cart is empty, so there is nothing to check out yet.'
    )
  })

  it('renders its own h1 and hands CheckoutForm the cart lines and the six countries', () => {
    seedCart()
    renderCheckout()
    expect(screen.getByRole('heading', { level: 1, name: 'Hexline checkout' })).toBeInTheDocument()
    expect(screen.getByTestId('lines')).toHaveTextContent('bump-helmet:S/M:black:1')
    expect(screen.getByTestId('countries')).toHaveTextContent('IE,RO,DE,FR,US,GB')
  })

  // Every page that shows a product states what the products are, from the one constant.
  // Mutation: remove `<Disclaimer />` from Checkout.tsx -> this fails.
  it('states the disclaimer', () => {
    seedCart()
    renderCheckout()
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument()
  })

  // Mutation: change `clear()` to a no-op in Checkout.tsx's `runPlaceOrder` -> `cart-lines` below
  // still reads the seeded line after the order succeeds.
  it('a successful order clears the cart and navigates to the confirmation with the order in state', async () => {
    vi.mocked(placeOrder).mockResolvedValue({ orderNumber: 'HX-100231' })
    seedCart()
    renderCheckout()

    await act(async () => {
      await lastProps!.onPlaceOrder(ORDER)
    })

    expect(placeOrder).toHaveBeenCalledWith(ORDER)
    expect(screen.getByTestId('cart-lines')).toBeEmptyDOMElement()
    expect(await screen.findByRole('heading', { level: 1, name: 'Confirmation' })).toBeInTheDocument()
    const state = JSON.parse(screen.getByTestId('state').textContent ?? 'null')
    expect(state.order).toEqual({
      orderNumber: 'HX-100231',
      email: 'rae@hexline.test',
      total: 6900,
      lines: [expect.objectContaining({ id: 'bump-helmet:S/M:black', quantity: 1 })],
    })
  })

  // Mutation: wrap the `await placeOrder(order)` call in Checkout.tsx's `runPlaceOrder` in a
  // try/catch that swallows the rejection -> the assertion below (a rejection reaching the
  // caller) fails, and the cart-lines probe would also read empty instead of keeping the line.
  it('a rejected order propagates to the caller, without clearing the cart or navigating', async () => {
    vi.mocked(placeOrder).mockRejectedValue(new ApiError('We could not place your order.'))
    seedCart()
    renderCheckout()

    await expect(lastProps!.onPlaceOrder(ORDER)).rejects.toBeInstanceOf(ApiError)
    expect(screen.getByTestId('cart-lines')).toHaveTextContent('bump-helmet:S/M:black:1')
    expect(screen.queryByRole('heading', { level: 1, name: 'Confirmation' })).not.toBeInTheDocument()
  })

  // A page-level guard, not CheckoutForm's own `pending` state (which only takes effect once React
  // has re-rendered with it set): two calls made before either has settled must still only reach
  // the real `placeOrder` once, and must be the exact same promise -- the shape the double-submit
  // e2e test at latency 300 in flows.spec.ts depends on.
  // Mutation: drop the `if (inFlight.current) return inFlight.current` guard in Checkout.tsx's
  // `handlePlaceOrder` -> `placeOrder` below is called twice instead of once.
  it('two calls made before the first settles collapse into the same promise, and placeOrder runs once', async () => {
    let resolveOrder: (value: { orderNumber: string }) => void = () => {}
    vi.mocked(placeOrder).mockImplementation(() => new Promise(resolve => (resolveOrder = resolve)))
    seedCart()
    renderCheckout()

    const first = lastProps!.onPlaceOrder(ORDER)
    const second = lastProps!.onPlaceOrder(ORDER)
    expect(second).toBe(first)
    expect(placeOrder).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveOrder({ orderNumber: 'HX-100231' })
      await first
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Confirmation' })).toBeInTheDocument()
  })

  // Mutation: drop the `if (!mounted.current)` branch in Checkout.tsx's `runPlaceOrder` (always
  // navigate) -> the confirmation heading below appears even though the page that started this
  // order is gone, instead of the toast.
  it('an order that resolves after the page unmounted clears the cart and toasts, without navigating', async () => {
    vi.mocked(placeOrder).mockResolvedValue({ orderNumber: 'HX-100231' })
    seedCart()
    renderToggleableCheckout()
    const onPlaceOrder = lastProps!.onPlaceOrder

    await act(async () => {
      screen.getByRole('button', { name: 'Leave checkout' }).click()
    })
    expect(screen.queryByRole('heading', { level: 1, name: 'Hexline checkout' })).not.toBeInTheDocument()

    await act(async () => {
      await onPlaceOrder(ORDER)
    })
    expect(await screen.findByText('Order HX-100231 placed.')).toBeInTheDocument()
    expect(screen.getByTestId('cart-lines')).toBeEmptyDOMElement()
  })

  // The failure side of the same rule: a result landing after the person has left never drops the
  // bad news either, and there is no form left here to show a retryable alert on, so it toasts.
  // Mutation: drop the `if (!mounted.current)` branch from Checkout.tsx's `runPlaceOrder` catch
  // (always rethrow) -> `onPlaceOrder` below rejects instead of resolving, and this toast never
  // appears.
  it('a rejected order that lands after the page unmounted toasts the failure, without throwing or clearing the cart', async () => {
    vi.mocked(placeOrder).mockRejectedValue(new ApiError('Network unavailable'))
    seedCart()
    renderToggleableCheckout()
    const onPlaceOrder = lastProps!.onPlaceOrder

    await act(async () => {
      screen.getByRole('button', { name: 'Leave checkout' }).click()
    })

    await act(async () => {
      await onPlaceOrder(ORDER)
    })
    expect(await screen.findByText('Your order was not placed.')).toBeInTheDocument()
    // Nothing was placed: the line the order was for is still there, exactly as before.
    expect(screen.getByTestId('cart-lines')).toHaveTextContent('bump-helmet:S/M:black:1')
  })

  // Item 5's design-system change, exercised end to end through the real (unmocked) `api.ts`: the
  // one rejection with a fix a person can act on resolves `{ error }` naming it, rather than
  // reaching CheckoutForm as a rejection with only the generic text.
  // Mutation: drop the `order.shipping.postalCode === REJECTED_POSTAL_CODE` check in Checkout.tsx's
  // `runPlaceOrder` (rethrow unconditionally) -> `onPlaceOrder` below rejects instead of resolving
  // `{ error }`.
  it('the postal-code rejection resolves { error } naming the fix, and never clears the cart', async () => {
    vi.mocked(placeOrder).mockRejectedValue(new ApiError('We could not place your order.'))
    seedCart()
    renderCheckout()
    const order = { ...ORDER, shipping: { ...ORDER.shipping, postalCode: '00000' } }

    const result = await lastProps!.onPlaceOrder(order)
    expect(result).toEqual({
      error: 'We could not deliver to that postal code. Go back to Shipping to change it, then place the order again.',
    })
    expect(screen.getByTestId('cart-lines')).toHaveTextContent('bump-helmet:S/M:black:1')
  })
})
