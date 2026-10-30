import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { DISCLAIMER } from '../../content'
import { axeClean } from '../../../test/axe'
import { Toaster } from '../../../components/molecules'
import { CartProvider, useCart } from '../../store/cart'
import { Product } from './Product'

/** Reads the cart the page itself just wrote to, the same way Shop.test.tsx's own probe does. */
function CartProbe() {
  const { lines } = useCart()
  return <output data-testid="lines">{lines.map(line => `${line.id}:${line.quantity}`).join(',')}</output>
}

/** Stands in for the not-yet-built `/store/cart`: just enough to prove the toast action's
 *  `navigate` call actually landed here. */
function CartStub() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname}</output>
}

function renderProduct(path = '/store/shop/bump-helmet') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Toaster>
        <CartProvider>
          <Routes>
            <Route path="/store/shop/:id" element={<Product />} />
            <Route path="/store/cart" element={<CartStub />} />
          </Routes>
          <CartProbe />
        </CartProvider>
      </Toaster>
    </MemoryRouter>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

describe('Product', () => {
  it('renders the name, breadcrumb trail and price', () => {
    renderProduct()
    expect(screen.getByRole('heading', { level: 1, name: 'Bump helmet' })).toBeInTheDocument()
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(trail).toHaveTextContent(/Home/)
    expect(trail).toHaveTextContent(/Shop/)
    expect(trail).toHaveTextContent(/Tactical equipment/)
    expect(screen.getByText('€69.00')).toBeInTheDocument()
  })

  it('sets the tab title to the product name', () => {
    renderProduct()
    expect(document.title).toBe('Hexline — Bump helmet')
  })

  it('is axe clean', async () => {
    const { container } = renderProduct()
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: change `findProduct(id)` in Product.tsx to always return the first catalogue entry
  // regardless of `id` -> this heading never renders for an id nothing matches.
  it('an unknown id renders its own not-found heading and a link back to the shop, never redirecting', () => {
    renderProduct('/store/shop/does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: 'Product not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the shop' })).toHaveAttribute('href', '/store/shop')
    expect(document.title).toBe('Hexline — product not found')
  })

  // Mutation: change the `product.soldOut ?` check that swaps in the Sold out button to `false`
  // in Product.tsx -> the Sold out button never renders for a sold-out product.
  it('a sold-out product shows the Sold out button and an explanatory line, never its own Add to cart', () => {
    renderProduct('/store/shop/kestrel-l')
    expect(screen.getByRole('button', { name: 'Sold out' })).toBeInTheDocument()
    // testing-library's own `getByRole` name matching is exact by default (unlike Playwright's,
    // substring by default) -- this doesn't also match the related grid's own "Add to cart:
    // Kestrel C carbine replica" button below.
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    expect(screen.getByText(/out of stock/)).toBeInTheDocument()
  })

  // aria-disabled, never native `disabled`: a native-disabled button drops out of the tab order
  // and takes its own explanation with it. This one stays reachable, and the reason it can't be
  // used stays announced through aria-describedby.
  // Mutation: change the Sold out `<Button>`'s `aria-disabled` back to a native `disabled` prop in
  // Product.tsx -> the button drops out of the tab order, and `button.focus()` below is a no-op
  // (jsdom, like a real browser, refuses focus to a disabled element), failing the `toHaveFocus`
  // assertion.
  it('the Sold out button stays focusable and described by its explanatory line, and a click does nothing', async () => {
    renderProduct('/store/shop/kestrel-l')
    const button = screen.getByRole('button', { name: 'Sold out' })
    expect(button).not.toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    button.focus()
    expect(button).toHaveFocus()
    const describedBy = button.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)).toHaveTextContent(/out of stock/)
    await userEvent.click(button)
    expect(screen.getByTestId('lines')).toHaveTextContent('')
  })

  // The Sold out button's own inertness (aria-disabled, a prevented click) carries no browser
  // enforcement over a completely different control: pressing Enter inside Quantity submits the
  // form the normal way (proven in a real browser by the e2e test of the same name) regardless of
  // which button on it is disabled, so the guard has to sit in `submit` itself, first, before
  // anything else runs. Fired here as a raw `submit` event rather than a simulated Enter
  // keypress: jsdom's own implicit-submission behaviour does not reproduce a real browser's for a
  // form with more than one field and no submit button (exactly this one, once sold out), so a
  // simulated Enter here would prove nothing either way -- this instead exercises the guard
  // itself, the same event `submit` actually receives however it is triggered.
  //
  // Asserted by the absence of ANY toast, not by the cart staying empty: a sold-out product's own
  // stock is 0, so `useCart()`'s own `add` already refuses it independently (`maxQuantityFor`
  // returns 0) -- the cart would stay empty even with this guard removed, proving nothing about
  // THIS guard specifically. Removing it still lets `submit` reach `add`, which then reports
  // 'at-max' and raises the "You already have the most we can sell of" toast instead -- a toast
  // the real guard never lets fire at all, which is what distinguishes the two.
  // Mutation: remove the `if (product.soldOut) return` line from `submit` in Product.tsx.
  it('a sold-out product raises no toast at all when submitted directly, even with valid choices', () => {
    const { container } = renderProduct('/store/shop/kestrel-l')
    fireEvent.click(screen.getByRole('radio', { name: 'Black' }))
    fireEvent.submit(container.querySelector('form')!)
    expect(screen.getByTestId('lines')).toHaveTextContent('')
    expect(screen.queryByText(/Added|most we can sell/)).not.toBeInTheDocument()
  })

  // Mutation: change the `outcome === 'at-max'` check in Product.tsx's `submit` to always show the
  // "Added" toast -> this message never appears, even once the line can't grow any further.
  it("adding past the line's own maximum says so instead of Added", async () => {
    renderProduct()
    await userEvent.click(screen.getByRole('radio', { name: 'S/M' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Black' }))
    const add = () => userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    // bump-helmet's own stock is 8, the binding ceiling here (below the store's flat 10).
    for (let i = 0; i < 8; i++) await add()
    expect(screen.getByTestId('lines')).toHaveTextContent('bump-helmet:S/M:black:8')
    await add()
    expect(await screen.findByText('You already have the most we can sell of Bump helmet.')).toBeInTheDocument()
    expect(screen.getByTestId('lines')).toHaveTextContent('bump-helmet:S/M:black:8')
  })

  // Mutation: change the QuantityStepper's `max` prop in Product.tsx back to a hardcoded `10` ->
  // this reads 8, then 3, instead of stopping at the line's own remaining stock.
  it('the Quantity stepper caps at the line’s own remaining stock, not the store’s flat ceiling', async () => {
    renderProduct()
    await userEvent.click(screen.getByRole('radio', { name: 'S/M' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Black' }))
    // bump-helmet's own stock is 8, below the store's flat ceiling of 10, and nothing is in the
    // cart yet for this variant.
    expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toHaveAttribute('aria-valuemax', '8')
    const add = () => userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    for (let i = 0; i < 5; i++) await add()
    expect(screen.getByTestId('lines')).toHaveTextContent('bump-helmet:S/M:black:5')
    // 5 of the 8 are already in this exact line, so 3 remain -- not 8, and not the flat 10.
    expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toHaveAttribute('aria-valuemax', '3')
  })

  // Mutation: drop the `errors.validateAll(fieldsFor(), valueOf)` guard from `submit` in
  // Product.tsx (call `add` unconditionally) -> the error summary below never appears, and the
  // cart gains a line with an empty size/colour instead.
  it('Add to cart with nothing chosen shows an error for both size and colour, and focuses the summary', async () => {
    renderProduct()
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    const summary = screen.getByRole('group', { name: 'There is a problem' })
    expect(summary).toHaveFocus()
    expect(summary).toHaveTextContent('Choose a size.')
    expect(summary).toHaveTextContent('Choose a colour.')
    expect(screen.getByTestId('lines')).toHaveTextContent('')
  })

  // A one-size product (no `sizes`) skips the Size fieldset entirely, so only Colour can ever be
  // the missing choice.
  // Mutation: change `fieldsFor` in Product.tsx to always return `['size', 'colour']` -> the
  // summary gains a spurious "Choose a size." entry for a product with no Size fieldset at all.
  it('a one-size product only asks for a colour, skipping the Size fieldset entirely', async () => {
    renderProduct('/store/shop/knee-pads')
    expect(screen.queryByRole('group', { name: 'Size' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    const summary = screen.getByRole('group', { name: 'There is a problem' })
    expect(summary).toHaveTextContent('Choose a colour.')
    expect(summary).not.toHaveTextContent('Choose a size.')
  })

  // Mutation: change the quantity `add` receives in Product.tsx's `submit` from `quantity` to
  // `quantity + 1` -> the merged line reads ":4", not ":2".
  it('adding the same size and colour twice gives one cart line at quantity 2', async () => {
    renderProduct()
    await userEvent.click(screen.getByRole('radio', { name: 'S/M' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Black' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(screen.getByTestId('lines')).toHaveTextContent('bump-helmet:S/M:black:2')
  })

  // Mutation: change the toast action's `onAction` destination in Product.tsx's `submit` from
  // `/store/cart` to `/store/shop` -> the stub route this test navigates to never mounts.
  it('Add to cart raises a toast naming the size and colour, with a View cart action that navigates', async () => {
    renderProduct()
    await userEvent.click(screen.getByRole('radio', { name: 'S/M' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Black' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(await screen.findByText('Added Bump helmet (Size S/M · Black)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'View cart' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/store/cart')
  })

  it('Details shows the description by default; In the box and Guide show their own content', async () => {
    renderProduct('/store/shop/kestrel-c')
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/electric airsoft carbine replica/)
    await userEvent.click(screen.getByRole('tab', { name: 'In the box' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Barrel cleaning rod')
    await userEvent.click(screen.getByRole('tab', { name: 'Guide' }))
    // Replicas are covered by the cleaning guide (see journal.ts's own `categories`), so this is
    // the "a guide matches" branch, not the generic Field notes fallback.
    expect(
      screen.getByRole('link', { name: 'Read the field guide: Cleaning a replica after a field day' })
    ).toHaveAttribute('href', '/store/journal/cleaning-after-a-field-day')
  })

  // No Field notes guide lists `tactical` in its own `categories`, so this covers Product.tsx's
  // `undefined` branch: the fallback link, rather than a broken or guessed one.
  // Mutation: change the fallback branch's `to="/store/journal"` to `to="/store"` -> this assertion
  // fails on the href.
  it("falls back to the Field notes index when no guide covers the product's category", async () => {
    renderProduct('/store/shop/dummy-radio')
    await userEvent.click(screen.getByRole('tab', { name: 'Guide' }))
    expect(screen.getByRole('link', { name: 'Read the field guides' })).toHaveAttribute('href', '/store/journal')
  })

  // Most Hexline products come one way: no sizes and no choice of finish. The page then shows
  // neither fieldset and Add to cart needs nothing chosen first.
  // Mutation: change `fieldsFor` in Product.tsx back to always include 'colour' -> the submit
  // fails validation on a colour nobody can choose, and the cart stays empty.
  it('a product with no size and no colour to choose shows neither group and adds straight away', async () => {
    renderProduct('/store/shop/dummy-radio')
    expect(screen.queryByRole('group', { name: /Size/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Colour/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(await screen.findByText('Added Dummy radio')).toBeInTheDocument()
    expect(screen.getByTestId('lines')).toHaveTextContent('dummy-radio:-:-:1')
  })

  // Every page that shows a product states what the products are, from the one constant.
  // Mutation: remove `<Disclaimer />` from Product.tsx -> this fails.
  it('states the disclaimer', () => {
    renderProduct()
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument()
  })

  it('shows up to three related products from the same category, under "More Tactical equipment"', () => {
    renderProduct()
    const heading = screen.getByRole('heading', { level: 2, name: 'More Tactical equipment' })
    expect(heading).toBeInTheDocument()
    const grid = screen.getByRole('list', { name: 'More Tactical equipment' })
    expect(grid.querySelectorAll('li')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Knee pads, pair' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bump helmet' })).not.toBeInTheDocument()
  })

  // The related grid's own Add to cart goes through the same `quickAddToCart` helper as the Shop
  // grid's own (store/quickAdd.ts) -- Shop.test.tsx's own "Add to cart adds..." test already
  // mutation-guards the shared function itself; this proves this page's own call site passes it
  // the RELATED item's id, not the current product's.
  // Mutation: change `handleRelatedAdd` in Product.tsx from `quickAddToCart(add, toast, item.id)`
  // to `quickAddToCart(add, toast, product.id)` -> the toast names the current product (Bump
  // helmet) instead of the one actually clicked.
  it("the related grid's own Add to cart adds Knee pads' first colour, with no size to name", async () => {
    renderProduct()
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart: Knee pads, pair' }))
    expect(await screen.findByText('Added Knee pads, pair (Black)')).toBeInTheDocument()
    expect(screen.getByTestId('lines')).toHaveTextContent('knee-pads:-:black:1')
  })

  // Bump helmet and Knee pads, pair (the related link this test follows) share a "Black"
  // colour id, deliberately: checking a SIZE the two products don't share would pass even without
  // the reset, since the stale value simply wouldn't match either of the new product's own size
  // values -- proving nothing about the reset itself.
  // Mutation: drop the `useEffect(() => { setSize(''); ... }, [id])` reset in Product.tsx ->
  // switching products keeps the previous product's colour selection, and "Black" reads as
  // checked on Knee pads, pair before anyone has chosen anything there.
  it('navigating from one product to another resets the title and clears the previous selection', async () => {
    renderProduct()
    await userEvent.click(screen.getByRole('radio', { name: 'Black' }))
    expect(screen.getByRole('radio', { name: 'Black' })).toBeChecked()

    // The related grid's own link is a real client-side navigation to a different `:id`, on the
    // SAME mounted `<Product>` -- exactly the case the reset effect exists for.
    await userEvent.click(screen.getByRole('link', { name: 'Knee pads, pair' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee pads, pair' })).toBeInTheDocument()
    expect(document.title).toBe('Hexline — Knee pads, pair')
    expect(screen.getByRole('radio', { name: 'Black' })).not.toBeChecked()
  })
})
