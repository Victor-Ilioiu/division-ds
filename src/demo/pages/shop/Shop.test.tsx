import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { DISCLAIMER } from '../../content'
import { axeClean } from '../../../test/axe'
import { Toaster } from '../../../components/molecules'
import { CartProvider, useCart } from '../../store/cart'
import { Shop } from './Shop'

/** Reads the cart the page itself just wrote to, the same way CartSheet.test.tsx checks `add`'s
 *  own effect rather than mocking the store. */
function CartProbe() {
  const { lines } = useCart()
  return <output data-testid="lines">{lines.map(line => `${line.id}:${line.quantity}`).join(',')}</output>
}

function renderShop() {
  return render(
    <MemoryRouter initialEntries={['/demo/shop']}>
      <Toaster>
        <CartProvider>
          <Shop />
          <CartProbe />
        </CartProvider>
      </Toaster>
    </MemoryRouter>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

describe('Shop', () => {
  it('renders the Shop heading with its breadcrumb trail', () => {
    renderShop()
    expect(screen.getByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderShop()
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: change the count status's source from `result.total` to `CATALOG.length` -> the
  // text stops updating (it stays "22 products" after narrowing to Optics), and the anchored-regex
  // assertion below fails. (`toHaveTextContent` matches a plain string as a substring, and
  // `toHaveTextContent` has no `exact` option at all -- jest-dom's own type only accepts
  // `normalizeWhitespace` -- so an unanchored string here would let "20 products" pass a check
  // for "0 products", or "12 products" one for "2 products", since one contains the other.
  // `/^2 products$/` pins the whole thing.)
  it('the status text updates as a category filter narrows the results', async () => {
    renderShop()
    const status = screen.getByRole('status', { name: 'Result count' })
    expect(status).toHaveTextContent(/^22 products$/)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Optics' }))
    expect(status).toHaveTextContent(/^2 products$/)
  })

  // Optics: one sold-out product (Halo tube sight) and one in stock (Prism holo sight), so
  // narrowing to Optics and then to in-stock-only Optics lands on exactly one product.
  // Mutation: change `productsLabel`'s ternary from `total === 1 ? 'product' : 'products'` to
  // always `'products'` -> the text reads "1 products" and the assertion below fails.
  it('reads "1 product", singular, when exactly one product matches', async () => {
    renderShop()
    const status = screen.getByRole('status', { name: 'Result count' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Optics' }))
    await userEvent.click(screen.getByRole('switch', { name: 'In stock only' }))
    expect(status).toHaveTextContent(/^1 product$/)
  })

  // Mutation: change Clear filters' onClick from `setSearchParams(new URLSearchParams())` to a
  // no-op -> the search field's value assertion below fails immediately (it still reads the typed
  // text, since the URL was never reset).
  it('Clear filters empties the query and moves focus to the h1', async () => {
    renderShop()
    const search = screen.getByRole('searchbox', { name: 'Search the range' })
    await userEvent.type(search, 'zzzz-nothing-matches-this{Enter}')
    const clear = await screen.findByRole('button', { name: 'Clear filters' })
    await userEvent.click(clear)
    expect(screen.getByRole('searchbox', { name: 'Search the range' })).toHaveValue('')
    expect(screen.getByRole('heading', { level: 1, name: 'Shop' })).toHaveFocus()
  })

  // Mutation: drop the `colourId: colour.id` field from `quickAddToCart`'s `add(...)` call
  // (store/quickAdd.ts, shared with Product.tsx's own related-grid Add to cart) -> the cart line's
  // own id (`lineId`, keyed on productId+size+colourId) no longer matches
  // `kestrel-c:-:black`, and the `getByTestId('lines')` assertion below fails.
  // (Kestrel C has two finishes and no sizes; Product.test.tsx covers a product with both.)
  it('Add to cart adds the first colour, and raises a toast naming it', async () => {
    renderShop()
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart: Kestrel C carbine replica' }))
    expect(await screen.findByText('Added Kestrel C carbine replica (Black)')).toBeInTheDocument()
    expect(screen.getByTestId('lines')).toHaveTextContent('kestrel-c:-:black:1')
  })

  // Every page that shows a product states what the products are, from the one constant.
  // Mutation: remove `<Disclaimer />` from Shop.tsx -> this fails.
  it('states the disclaimer', () => {
    renderShop()
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument()
  })

  // Mutation: change the `outcome === 'at-max'` check in quickAddToCart (store/quickAdd.ts) to
  // always show the "Added" toast -> this message never appears, even once the line is full.
  it("quick-add past the line's own maximum says so instead of Added", async () => {
    renderShop()
    const add = () => userEvent.click(screen.getByRole('button', { name: 'Add to cart: Kestrel C carbine replica' }))
    // kestrel-c's own stock is 8, the binding ceiling here (below the store's flat 10).
    for (let i = 0; i < 8; i++) await add()
    expect(screen.getByTestId('lines')).toHaveTextContent('kestrel-c:-:black:8')
    await add()
    expect(await screen.findByText('You already have the most we can sell of Kestrel C carbine replica.')).toBeInTheDocument()
    expect(screen.getByTestId('lines')).toHaveTextContent('kestrel-c:-:black:8')
  })
})

/** Confirms the redirect notice itself, the same shape Cart.test.tsx's own "Cart notice" describe
 *  reads a bounce elsewhere in the shell -- Shop is the destination the redirect rule sends an
 *  already signed-in visitor to from SignIn, Verify and CreateAccount. */
describe('Shop notice', () => {
  // Mutation: remove `<RouteNotice />` from Shop.tsx -> the notice text below never renders even
  // though the router state carries it.
  it('shows a notice left in router state by a redirect', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/demo/shop', state: { notice: "You're already signed in." } }]}>
        <Toaster>
          <CartProvider>
            <Shop />
          </CartProvider>
        </Toaster>
      </MemoryRouter>
    )
    expect(screen.getByText("You're already signed in.")).toBeInTheDocument()
  })
})
