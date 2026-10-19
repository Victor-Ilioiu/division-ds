import type { Locator, Page } from '@playwright/test'
import { SLIDER_MAX } from '../src/demo/filters'
import { DEMO_PAGES } from '../src/demo/routes'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES } from './fixtures'

/** Presses Tab until `target` holds focus, at most `max` times, asserting focus never lands on
 *  the body along the way -- the real proof a control sits in the page's own tab order, not just
 *  that Enter/Space happens to work once focus is forced there some other way. */
async function tabTo(page: Page, target: Locator, max = 15) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() => document.activeElement !== document.body),
      `tab press ${i + 1} moved focus to the body`
    ).toBe(true)
  }
  await expect(target).toBeFocused()
}

/** The same proof as `tabTo`, backwards: the only way to reach the Navbar's own cart button from
 *  deep in a product page's tab order without a mouse -- a real browser's Tab order does not wrap
 *  from the last focusable element back to the first, so a Shift+Tab loop is the keyboard-only
 *  path back up to the header, not a fallback. */
async function shiftTabTo(page: Page, target: Locator, max = 30) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Shift+Tab')
    expect(
      await page.evaluate(() => document.activeElement !== document.body),
      `shift-tab press ${i + 1} moved focus to the body`
    ).toBe(true)
  }
  await expect(target).toBeFocused()
}

/** Focus never on body, checked as its own assertion rather than only implicitly through a later
 *  `tabTo`/`toBeFocused` call -- a step that doesn't happen to be followed immediately by another
 *  Tab loop still gets the same proof that a navigation, a click or a keypress never dropped focus
 *  to the page as a whole. */
async function expectFocusNotBody(page: Page) {
  await expect.poll(() => page.evaluate(() => document.activeElement !== document.body)).toBe(true)
}

/** A single line already in the cart, in the exact shape `useCart()`'s own `add()` produces --
 *  written into `sessionStorage` via `page.evaluate` after a first, throwaway navigation, rather
 *  than `addInitScript`: an init script re-runs on every navigation for the rest of the page's
 *  life, including any the caller makes after this, and would keep silently overwriting the cart
 *  back to this one seeded line. `sessionStorage` survives the caller's own subsequent `goto` (it
 *  is scoped to the tab and the origin, not to a single document load), so seeding it once here is
 *  enough for a mouse-driven checkout test to start already past Product.tsx's own Add-to-cart
 *  step, which the keyboard journey test below covers on its own. */
async function seedCartItem(page: Page) {
  await page.goto('/demo')
  await page.evaluate(() => {
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
  })
}

/** Fills the Shipping step with a valid address (Ireland, so it lines up with the country the
 *  keyboard journey below chooses through the Select), mouse-driven -- the checkout tests that use
 *  this are not the keyboard-only one, and drive the form the fast way on purpose. */
async function fillShippingStep(page: Page, postalCode = 'T12 X285') {
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae@hexline.test')
  await page.getByLabel('Full name').fill('Rae Hexline')
  await page.getByLabel('Address line 1').fill('1 Field Lane')
  await page.getByLabel('Town or city').fill('Cork')
  await page.getByLabel('Postal code').fill(postalCode)
  await page.getByRole('combobox', { name: 'Country' }).click()
  await page.getByRole('option', { name: 'Ireland', exact: true }).click()
}

async function fillPaymentStep(page: Page) {
  await page.getByLabel('Name on card').fill('Rae Hexline')
  await page.getByLabel('Card number').fill('4242 4242 4242 4242')
  await page.getByLabel('Expiry date').fill('12/29')
  await page.getByLabel('Security code').fill('123')
}

/** Shipping (filled), Delivery (Standard) and Payment (the demo card), mouse-driven, landing on
 *  the Payment step with Place order ready to press -- shared by the axe checks and the
 *  double-submit/retry tests below, none of which are the keyboard-only journey. */
async function reachPaymentStep(page: Page, postalCode = 'T12 X285') {
  await seedCartItem(page)
  await page.goto('/demo/checkout')
  await fillShippingStep(page, postalCode)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /Standard/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await fillPaymentStep(page)
}

// Mutation: drop the `placedLines === null && lines.length === 0` guard in Checkout.tsx (render
// CheckoutForm unconditionally) -> the cart heading and notice below never appear, replaced by a
// checkout form with no lines to show.
test('a direct load of checkout with an empty cart bounces to the cart page, with a notice', async ({ page }) => {
  await page.goto('/demo/checkout')
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
  await expect(page.getByText('Your cart is empty, so there is nothing to check out yet.')).toBeVisible()
})

// Mutation: delete the `if (typeof state !== 'object' || state === null) return undefined` guard
// from `orderFrom` in Confirmation.tsx -> a direct load has `location.state === null`, so the very
// next line reads `.order` off `null` and throws ("Cannot read properties of null (reading
// 'order')") -- caught both by the missing heading below and by the console-error fixture.
test('a direct load of the confirmation page with no order shows "No recent order"', async ({ page }) => {
  await page.goto('/demo/checkout/confirmation')
  await expect(page.getByRole('heading', { level: 1, name: 'No recent order' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to the shop' })).toBeVisible()
})

// Mutation: drop the `order.shipping.postalCode === REJECTED_POSTAL_CODE` check in Checkout.tsx's
// `runPlaceOrder` (rethrow unconditionally instead of resolving `{ error }`) -> the message below
// never appears; CheckoutForm shows its own generic alert instead.
test('postal code 00000 names the fix in its own alert, and a corrected address then succeeds', async ({ page }) => {
  await reachPaymentStep(page, '00000')
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(
    page
      .getByText('We could not deliver to that postal code. Go back to Shipping to change it, then place the order again.')
      .first()
  ).toBeVisible()
  await expect(page).toHaveURL(/\/demo\/checkout$/)

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { name: /^Step 1 of 3: Shipping/ })).toBeFocused()
  await page.getByLabel('Postal code').fill('T12 X285')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page).toHaveURL(/\/demo\/checkout\/confirmation$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Order placed' })).toBeVisible()
})

// Mutation: drop the `if (inFlight.current) return inFlight.current` guard in Checkout.tsx's
// `handlePlaceOrder` -> the second click's own call reaches the real `placeOrder` too, and the
// order number below reads HX-100232.
test('two clicks on Place order in one task place exactly one order, HX-100231', async ({ page }) => {
  await page.addInitScript(() => {
    window.__hexlineLatency = 300
  })
  await reachPaymentStep(page)
  let navigations = 0
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) navigations++
  })
  // Two real clicks in the same synchronous browser task, not Playwright's own `dblclick` (tried
  // first: a real double click lands its two events in two separate tasks, letting React flush
  // `pending` between them, so `CheckoutForm`'s own state already blocks the second one and the
  // mutation above never turned this test red). This is the same shape as Shop.tsx's own
  // same-task race tests further up this file.
  await page.getByRole('button', { name: 'Place order' }).evaluate((button: HTMLElement) => {
    button.click()
    button.click()
  })
  await expect(page).toHaveURL(/\/demo\/checkout\/confirmation$/)
  await expect(page.getByText('HX-100231')).toBeVisible()
  expect(navigations, 'more than one navigation fired from the double click').toBe(1)
})

// Mutation: drop the `if (!mounted.current)` branch in Checkout.tsx's `runPlaceOrder` -> `navigate`
// runs for a component that already left, and the confirmation heading appears at `/demo/shop`
// instead of the toast below, failing the URL assertion.
test('leaving checkout while an order is placing clears the cart and toasts, without navigating', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__hexlineLatency = 1500
  })
  await reachPaymentStep(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.getByRole('link', { name: 'Shop', exact: true }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
  await expect(page.getByText('Order HX-100231 placed.').first()).toBeVisible({ timeout: 4000 })
  await expect(page).toHaveURL(/\/demo\/shop$/)
  await expect(page.getByRole('button', { name: 'Cart, 0 items' })).toBeVisible()
})

// demo.spec's generic per-page pass only ever reaches /demo/cart empty (its default state). A
// line in the cart is a real state that pass can't set up on its own -- the same reasoning as
// this file's other per-state axe checks above.
// Mutation: empty the Checkout link's text in Cart.tsx's own footer (`<RouterLink to="/demo/
// checkout"></RouterLink>`) -> a real `link-name` violation, only reachable once a line is in the
// cart (the footer is hidden entirely while it's empty).
for (const theme of THEMES) {
  test(`the cart with a line in it is axe clean, in ${theme} theme`, async ({ page }) => {
    await seedCartItem(page)
    await page.goto('/demo/cart')
    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
    await expect(page.getByText('1 item')).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// demo.spec's generic per-page pass never opens this Sheet -- a cart button with nothing in it is
// all it ever reaches. An open sheet holding a real line (its own quantity control, a Remove
// button per line, the footer links) is a state that pass can't set up on its own, the same
// reasoning as this file's other per-state axe checks above.
// Mutation: change the per-line Remove button's `label` in Cart.tsx from `Remove ${line.name}` to
// `''` -> a real `button-name` violation on that row's own control, reachable only with a line
// showing, in either theme.
for (const theme of THEMES) {
  test(`the cart sheet is axe clean while open with a line in it, in ${theme} theme`, async ({ page }) => {
    await seedCartItem(page)
    await page.goto('/demo')
    await page.getByRole('button', { name: 'Cart, 1 item' }).click()
    await expect(page.getByRole('dialog', { name: 'Cart' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// demo.spec's generic per-page pass only ever reaches /demo/checkout with an empty cart (the
// redirect it bounces to). A real checkout form is a state that pass can't set up on its own.
// Mutation: drop the page's own `<h1>Hexline checkout</h1>` in Checkout.tsx -> a real
// `page-has-heading-one` violation (CheckoutForm's own `h2` doesn't satisfy it), in either theme.
for (const theme of THEMES) {
  test(`checkout step 1 (Shipping) is axe clean, in ${theme} theme`, async ({ page }) => {
    await seedCartItem(page)
    await page.goto('/demo/checkout')
    await expect(page.getByRole('heading', { level: 1, name: 'Hexline checkout' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// Mutation: drop the `errors.validateAll(fieldsFor(step), ...)` guard in CheckoutForm's `submit`
// -> the ErrorSummary this test looks for never appears, and the ensuing axe pass never actually
// checked the error state.
for (const theme of THEMES) {
  test(`checkout's Shipping validation error is axe clean, in ${theme} theme`, async ({ page }) => {
    await seedCartItem(page)
    await page.goto('/demo/checkout')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('group', { name: 'There is a problem' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// Mutation: change the postal code that triggers a rejection in api.ts's `placeOrder` from
// `00000` to a different value -> the alert this test waits for never appears, and the test times
// out instead of ever reaching axe.
for (const theme of THEMES) {
  test(`the rejected-order alert is axe clean, in ${theme} theme`, async ({ page }) => {
    await reachPaymentStep(page, '00000')
    await page.getByRole('button', { name: 'Place order' }).click()
    await expect(
      page
        .getByText('We could not deliver to that postal code. Go back to Shipping to change it, then place the order again.')
        .first()
    ).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// demo.spec's generic per-page pass only ever reaches the confirmation with no state (a direct
// load). A real, just-placed order is a state that pass can't set up on its own.
// Mutation: drop the `<h1>Order placed</h1>` from Confirmation.tsx's order-placed branch (the
// "No recent order" branch's own `h1` is a different element, so this state's own coverage is not
// redundant with demo.spec's generic pass) -> a real `page-has-heading-one` violation.
for (const theme of THEMES) {
  test(`the confirmation with a just-placed order is axe clean, in ${theme} theme`, async ({ page }) => {
    await reachPaymentStep(page)
    await page.getByRole('button', { name: 'Place order' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Order placed' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test.describe('cart, checkout and confirmation reflow at short viewports', () => {
  const VIEWPORTS = [
    { width: 1280, height: 256 },
    { width: 320, height: 256 },
  ]

  // Mutation: add `min-w-[2000px]` to Cart.tsx's root wrapper div -> the page is wider than both
  // viewports below, and the poll never becomes true within its timeout.
  for (const viewport of VIEWPORTS) {
    test(`the cart has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await seedCartItem(page)
      await page.setViewportSize(viewport)
      await page.goto('/demo/cart')
      await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
          message: `${viewport.width}x${viewport.height} scrolls horizontally`,
        })
        .toBe(true)
    })
  }

  // Mutation: add `min-w-[2000px]` to Checkout.tsx's root wrapper div -> CheckoutForm's own
  // `@3xl:grid-cols-[minmax(0,1fr)_18rem]` two-column layout at 1280px width is exactly the case
  // this exists to catch, and the poll below never becomes true within its timeout.
  for (const viewport of VIEWPORTS) {
    test(`checkout has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await seedCartItem(page)
      await page.setViewportSize(viewport)
      await page.goto('/demo/checkout')
      await expect(page.getByRole('heading', { level: 1, name: 'Hexline checkout' })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
          message: `${viewport.width}x${viewport.height} scrolls horizontally`,
        })
        .toBe(true)
    })
  }

  // Mutation: add `min-w-[2000px]` to Confirmation.tsx's root wrapper div -> the poll below never
  // becomes true within its timeout.
  for (const viewport of VIEWPORTS) {
    test(`the confirmation has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await page.goto('/demo/checkout/confirmation')
      await expect(page.getByRole('heading', { level: 1, name: 'No recent order' })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
          message: `${viewport.width}x${viewport.height} scrolls horizontally`,
        })
        .toBe(true)
    })
  }
})

// The full purchase journey, driven only by the keyboard, from the homepage to a placed order:
// Home -> Shop (filtered to Tactical equipment) -> a product's own page -> the cart sheet, opened from the
// Navbar (never the toast's own "View cart" action, which the listing-to-detail-to-cart journey
// above already covers) -> Checkout -> Shipping -> Delivery -> Payment -> Place order ->
// Confirmation. Every step polls that focus is never on the body, on top of `tabTo`/`shiftTabTo`'s
// own per-press check along the way.
// Mutation: change the CartSheet's Checkout link's `to` from `/demo/checkout` to anything else ->
// the journey never reaches `/demo/checkout`, and the heading assertion there fails.
test('the full purchase journey works from the keyboard, homepage to confirmation', async ({ page }) => {
  await page.goto('/demo')
  // The first way into the shop under the hero: the link that closes the heading of the
  // top-rated replicas. The hero's own controls (the kit link and Buy kit) come before it in the
  // Tab order. It opens the shop already filtered to replicas, and the next step adds a category.
  const shopLink = page.getByRole('link', { name: 'All replicas' })
  await tabTo(page, shopLink, 40)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
  await expectFocusNotBody(page)

  const packsCheckbox = page.getByRole('checkbox', { name: 'Tactical equipment' })
  await tabTo(page, packsCheckbox, 30)
  await page.keyboard.press('Space')
  await expect(packsCheckbox).toBeChecked()

  const productLink = page.getByRole('link', { name: 'Bump helmet' })
  await tabTo(page, productLink, 30)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Bump helmet' })).toBeVisible()
  await expectFocusNotBody(page)

  const sizeRadio = page.getByRole('radio', { name: 'S/M' })
  await tabTo(page, sizeRadio)
  await page.keyboard.press('Space')
  await expect(sizeRadio).toBeChecked()

  const colourRadio = page.getByRole('radio', { name: 'Black' })
  await tabTo(page, colourRadio)
  await page.keyboard.press('Space')
  await expect(colourRadio).toBeChecked()

  const addToCart = page.getByRole('button', { name: 'Add to cart', exact: true })
  await tabTo(page, addToCart)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Added Bump helmet (Size S/M · Black)').first()).toBeVisible()
  await expectFocusNotBody(page)

  // Backwards on purpose: the cart button lives in the Navbar, above everything the journey so
  // far has moved through, and a real browser's Tab order does not wrap round to reach it going
  // forward.
  const cartButton = page.getByRole('button', { name: 'Cart, 1 item' })
  await shiftTabTo(page, cartButton, 40)
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Cart' })
  await expect(sheet).toBeVisible()
  await expectFocusNotBody(page)

  const checkoutLink = sheet.getByRole('link', { name: 'Checkout' })
  await tabTo(page, checkoutLink, 15)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Hexline checkout' })).toBeVisible()
  await expectFocusNotBody(page)

  // Shipping: every field reached by Tab and filled with a real keypress-by-keypress type, never
  // `.fill()` (which sets the DOM value directly, proving nothing about the tab order or the
  // field's own keyboard operability).
  await tabTo(page, page.getByRole('textbox', { name: 'Email', exact: true }), 10)
  await page.keyboard.type('rae@hexline.test')
  await tabTo(page, page.getByLabel('Full name'), 5)
  await page.keyboard.type('Rae Hexline')
  await tabTo(page, page.getByLabel('Address line 1'), 5)
  await page.keyboard.type('1 Field Lane')
  await tabTo(page, page.getByLabel('Town or city'), 5)
  await page.keyboard.type('Cork')
  await tabTo(page, page.getByLabel('Postal code'), 5)
  await page.keyboard.type('T12 X285')

  const countrySelect = page.getByRole('combobox', { name: 'Country' })
  await tabTo(page, countrySelect, 10)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Ireland', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown', { delay: 100 })
  await expect(page.getByRole('option', { name: 'Romania', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(countrySelect).toHaveText('Romania')

  const continueShipping = page.getByRole('button', { name: 'Continue' })
  await tabTo(page, continueShipping, 10)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /^Step 2 of 3: Delivery/ })).toBeFocused()

  // Delivery: nothing is pre-selected, so Tab lands on the first option (Standard) without
  // checking it -- Space is what a real WAI-ARIA radiogroup needs to select the focused item from
  // a cold Tab-in, the same reasoning as the product page's own size/colour radios above.
  const standardRadio = page.getByRole('radio', { name: /Standard/ })
  await tabTo(page, standardRadio, 10)
  await page.keyboard.press('Space')
  await expect(standardRadio).toBeChecked()

  const continueDelivery = page.getByRole('button', { name: 'Continue' })
  await tabTo(page, continueDelivery, 10)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Step 3 of 3: Payment' })).toBeFocused()

  // Payment: "Billing address is the same as shipping" is checked by default, so no billing
  // fields ever appear to fill. The demo card is never sent anywhere (CheckoutForm never hands it
  // to `onPlaceOrder` -- see `orderFrom` in CheckoutForm.tsx). Reached and typed into the same way
  // as Shipping above, never `.fill()`.
  await tabTo(page, page.getByLabel('Name on card'), 10)
  await page.keyboard.type('Rae Hexline')
  await tabTo(page, page.getByLabel('Card number'), 5)
  await page.keyboard.type('4242 4242 4242 4242')
  await tabTo(page, page.getByLabel('Expiry date'), 5)
  await page.keyboard.type('12/29')
  await tabTo(page, page.getByLabel('Security code'), 5)
  await page.keyboard.type('123')

  const placeOrder = page.getByRole('button', { name: 'Place order' })
  await tabTo(page, placeOrder, 10)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Order placed' })).toBeVisible()
  await expect(page.getByText('HX-100231')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cart, 0 items' })).toBeVisible()
  await expectFocusNotBody(page)
})

// A real browser, not the mocked API a unit test can control directly: these journeys drive the
// actual `signIn`/`verifyCode`/`createAccount`/`requestPasswordReset` triggers in api.ts end to
// end, through the two-step code and on to the account created in it. Zero latency, or every
// journey pays the module's ~400ms default on every step: `window.__hexlineLatency` is the one
// hook api.ts reads for this (see commands.md).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__hexlineLatency = 0
  })
})

// Mutation: drop the `if ('errors' in result) return result.errors` check in SignIn.tsx -> a
// wrong password proceeds to sign in anyway, and the page moves on to the verify step instead of
// showing the error.
test('a wrong password focuses the error summary and names the password', async ({ page }) => {
  await page.goto('/demo/sign-in')
  await expect(page.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae@hexline.test')
  await page.getByLabel(/^Password/).fill('wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  const summary = page.getByRole('group', { name: 'There is a problem' })
  await expect(summary).toBeFocused()
  await expect(summary).toContainText('That password is not right.')
  await expect(summary.getByRole('link')).toHaveAttribute('href', /-password$/)
})

// A real mouse click's mousedown and mouseup land at the same fixed screen position; a locator's
// own `.click()` cannot exercise this, because it re-measures its target immediately before
// clicking, every time. `page.mouse.click` at one position, captured once, is what actually
// exercises the swallowed-click bug: mousedown on Sign in blurs the still-focused, empty email
// field first (a real browser blurs the outgoing control before the incoming click completes),
// which puts a message in `errors.errors` (a field shows its own error on blur, not only on
// submit) -- and if that alone were enough to mount the whole ErrorSummary block above every
// field, Sign in jumps down by the summary's own height between this single click's mousedown and
// its mouseup, and the mouseup lands on whatever the email field's own growth left behind instead.
// Mutation: render the summary on blur again (drop the `attempt > 0 &&` gate from AuthForm's
// ErrorSummary `errors` prop) -> mousedown/mouseup/click land on BUTTON/INPUT/FORM instead of
// BUTTON/BUTTON/BUTTON (checked by hand while writing this test, not asserted directly, since the
// exact element a stray click lands on is incidental), no `submit` event ever fires, and the
// summary this test waits for never takes focus.
test('a blurred, empty email does not swallow the first click on Sign in', async ({ page }) => {
  await page.goto('/demo/sign-in')
  await expect(page.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeVisible()
  const email = page.getByRole('textbox', { name: 'Email', exact: true })
  const signIn = page.getByRole('button', { name: 'Sign in' })
  await email.click()
  const box = await signIn.boundingBox()
  if (!box) throw new Error('Sign in has no layout box')
  // Near the button's bottom edge, not its centre: the field's own inline error (allowed to show
  // on blur, and allowed to nudge the button down a little) still leaves this point inside the
  // button once it moves: only the whole summary reappearing moves it far enough to clear this
  // point entirely. Email never loses focus before this click -- that loss, and the validation it
  // triggers, is the thing this single mousedown is supposed to cause.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 3)
  const summary = page.getByRole('group', { name: 'There is a problem' })
  await expect(summary).toBeFocused()
  await expect(summary).toContainText('Enter your email address.')
})

// Mutation: change SignIn's success destination from `AUTH_PATHS['verify-code']` to
// `/demo/shop` directly -> the "Enter your code" heading below never appears.
test('a right password reaches the two-step code, and the right code signs in to the shop', async ({ page }) => {
  await page.goto('/demo/sign-in')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae@hexline.test')
  await page.getByLabel(/^Password/).fill('hexline')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Enter your code' })).toBeVisible()
  // A route change, not a mode switch inside one AuthForm instance: the app-wide navigation
  // focus hook is what's responsible here, not AuthForm's own heading-focus effect.
  await expect(page.locator('#main')).toBeFocused()

  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('000000')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page.getByText('That code is not right. Check your app and try again.').first()).toBeVisible()

  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).toHaveURL(/\/demo\/shop$/)
  await expect(page.locator('#main')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Account: Rae' })).toBeVisible()
})

// Mutation: drop the `from: pathname + search` from RequireSession.tsx's redirect state (or drop
// `navigate(from ?? '/demo/shop')` in Verify.tsx back to a plain `navigate('/demo/shop')`) -> the
// URL assertion below finds `/demo/shop`, not the orders page the visit actually asked for.
test('a direct load of a protected page bounces through sign-in and back to the page it asked for', async ({
  page,
}) => {
  await page.goto('/demo/account/orders?status=Delivered')
  await expect(page.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeVisible()
  await expect(page.getByText('Sign in to see your account.')).toBeVisible()

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae@hexline.test')
  await page.getByLabel(/^Password/).fill('hexline')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Enter your code' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).toHaveURL(/\/demo\/account\/orders\?status=Delivered$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
  await expect(page.locator('#main')).toBeFocused()
})

// Mutation: drop the `if (!email)` guard in Verify.tsx (render the form regardless) -> the
// sign-in heading and notice below never appear; a code form with nothing behind it does instead.
test('a direct load of the verify page with nothing pending bounces to sign-in, with a notice', async ({ page }) => {
  await page.goto('/demo/sign-in/verify')
  await expect(page.getByRole('heading', { level: 2, name: 'Sign in' })).toBeVisible()
  await expect(page.getByText('Start by signing in.')).toBeVisible()
  await expect(page.locator('#main')).toBeFocused()
})

// AuthForm shows its own confirmation on any `reset-password` submit that resolves without
// errors, regardless of whether `requestPasswordReset` was actually called -- dropping that call
// from ResetPassword.tsx does NOT fail this assertion (the unit test's own call-with assertion is
// what actually pins that wiring). The mode link that reaches this page in the first place is
// the one thing this journey can catch on its own.
// Mutation: make SignIn's `handleModeChange` a no-op (`() => {}`) -> the "Reset your password"
// heading below never appears.
test('forgot password shows the neutral confirmation', async ({ page }) => {
  await page.goto('/demo/sign-in')
  await page.getByRole('button', { name: 'Forgot your password?' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Reset your password' })).toBeVisible()
  await expect(page.locator('#main')).toBeFocused()
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae@hexline.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(
    page.getByText('If an account exists for rae@hexline.test, a reset link is on its way.')
  ).toBeVisible()
})

// Mutation: change the destination CreateAccount's onSubmit navigates to on success from
// `/demo/onboarding` to anything else -> the URL assertion below fails.
test('create account: a taken address shows an email error, a fresh one reaches onboarding', async ({ page }) => {
  await page.goto('/demo/create-account')
  await page.getByLabel('Name').fill('Rae')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('taken@hexline.test')
  await page.getByLabel(/^Password/).fill('longenough')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('group', { name: 'There is a problem' })).toContainText(
    'That email is already registered.'
  )

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae@hexline.test')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/demo\/onboarding$/)
  await expect(page.locator('#main')).toBeFocused()
})

// Mutation: wrap the `await signIn(...)` call in SignIn's onSubmit in a try/catch that swallows
// the rejection -> this alert never appears, and the person sees a form that just sits there.
test('offline@hexline.test shows the generic alert, never a field error', async ({ page }) => {
  await page.goto('/demo/sign-in')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('offline@hexline.test')
  await page.getByLabel(/^Password/).fill('hexline')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Something went wrong. Please try again.').first()).toBeVisible()
  await expect(page.getByRole('group', { name: 'There is a problem' })).toHaveCount(0)
})

// demo.spec's generic per-route pass only ever reaches Verify with nothing pending -- the
// redirect it bounces to. A pending email is a real state that pass can't set up on its own, so
// it's checked here instead, the same way this file checks onboarding's own step-one state below.
// Mutation: give the code Input a placeholder instead of its FormField label (drop the `label`
// prop) -> `label` (WCAG 1.3.1/4.1.2) fails, in either theme.
for (const theme of THEMES) {
  test(`verify with a pending email is axe clean in ${theme} theme`, async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'hexline-session',
        JSON.stringify({ user: null, pendingEmail: 'rae@hexline.test' })
      )
    })
    await page.goto('/demo/sign-in/verify')
    await expect(page.getByRole('heading', { level: 2, name: 'Enter your code' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// Mutation: drop the `if (!user)` guard in Onboarding.tsx -> the page renders its own form
// instead of redirecting, and the "Hexline account" heading below is never reached.
test('a direct load of onboarding with no one signed in bounces to account creation with a notice, focus on main', async ({
  page,
}) => {
  await page.goto('/demo/onboarding')
  await expect(page.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeVisible()
  await expect(page.getByText('Create an account first.')).toBeVisible()
  await expect(page.locator('#main')).toBeFocused()
})

// Mutation: drop the `if (hasErrors(found))` branch in Onboarding's `submit` -> Next moves
// straight to Fit with nothing checked, and the group query below finds nothing.
test('onboarding: pressing Next with no activity checked shows the error and focuses the summary', async ({
  page,
}) => {
  await page.goto('/demo/create-account')
  await page.getByLabel('Name').fill('Rae')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae-onboarding-error@hexline.test')
  await page.getByLabel(/^Password/).fill('longenough')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/demo\/onboarding$/)
  await page.getByRole('button', { name: 'Next' }).click()
  const summary = page.getByRole('group', { name: 'There is a problem' })
  await expect(summary).toBeFocused()
  await expect(summary).toContainText('Choose at least one activity.')
})

// The full journey from account creation through all three onboarding steps to the shop, driven
// only by the keyboard: real Tab presses to reach every control (proving the actual tab order,
// not just that Enter/Space works once focus is forced there some other way), Space to check a
// box, Enter/ArrowDown to work the helmet-size Select (the same shape as CheckoutForm's own
// keyboard test for its country Select), and Enter to activate every button and switch.
// Mutation: change the destination Onboarding's `finish` navigates to on success from
// `/demo/shop` to anything else -> the URL assertion at the end below fails.
test('the full create-account, onboarding and shop journey works from the keyboard', async ({ page }) => {
  await page.goto('/demo/create-account')
  await page.getByLabel('Name').fill('Rae')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('rae-onboarding-keyboard@hexline.test')
  await page.getByLabel(/^Password/).fill('longenough')
  await page.getByLabel(/^Password/).press('Enter')
  await expect(page).toHaveURL(/\/demo\/onboarding$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Step 1 of 3: Activities' })).toBeVisible()

  const woodland = page.getByRole('checkbox', { name: 'Woodland field days' })
  await tabTo(page, woodland)
  await page.keyboard.press('Space')
  await expect(woodland).toBeChecked()
  const next = page.getByRole('button', { name: 'Next' })
  await tabTo(page, next)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Step 2 of 3: Fit' })).toBeFocused()

  const size = page.getByRole('combobox', { name: /^Usual helmet size/ })
  await tabTo(page, size)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'XS', exact: true })).toBeFocused()
  // Radix's own roving-focus items track "was an arrow key what moved focus here" with document-
  // level keydown/keyup listeners; back-to-back `press()` calls with no gap can land the keyup
  // before that state settles (the same reasoning as CheckoutForm's own delivery-radio keyboard
  // test), so each step gets a moment to land before the next one fires.
  await page.keyboard.press('ArrowDown', { delay: 100 })
  await page.keyboard.press('ArrowDown', { delay: 100 })
  await page.keyboard.press('ArrowDown', { delay: 100 })
  await expect(page.getByRole('option', { name: 'L', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(size).toHaveText('L')
  await tabTo(page, next)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Step 3 of 3: Updates' })).toBeFocused()

  const productNews = page.getByRole('switch', { name: 'Product news' })
  await tabTo(page, productNews)
  await page.keyboard.press('Space')
  await expect(productNews).toBeChecked()

  const finish = page.getByRole('button', { name: 'Finish' })
  await tabTo(page, finish)
  await page.keyboard.press('Enter')
  // The toast is raised in the same success branch as the navigation, immediately before it, so
  // it's checked first -- under worker contention the URL assertion below can itself take a few
  // seconds to settle, and checking the toast only after that leaves little of its default 5s
  // duration to still be showing.
  // Radix's own toast announcer mirrors the title into a second, separate live region, the same
  // duplicate-text shape as the two-step code's error above -- `.first()` for the same reason.
  await expect(page.getByText('Your account is set up.').first()).toBeVisible()
  await expect(page).toHaveURL(/\/demo\/shop$/)
})

// Retry unmounts itself the instant it succeeds in clearing the failed save, so focus has to land
// somewhere that survives that (the Finish button it shares with the form's own submit) rather
// than dropping to the body.
// Mutation: drop the `finishRef.current?.focus()` call from Retry's `onClick` -> the poll below
// times out against `document.activeElement === document.body`.
test('onboarding: a failed save shows the alert and Retry, and retrying keeps focus off the body', async ({
  page,
}) => {
  await page.goto('/demo/create-account')
  await page.getByLabel('Name').fill('Rae')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('onboarding-fails@hexline.test')
  await page.getByLabel(/^Password/).fill('longenough')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('checkbox', { name: 'Woodland field days' }).check()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('combobox', { name: /^Usual helmet size/ }).click()
  await page.getByRole('option', { name: 'M', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
  const live = page.getByRole('main').locator('p[role="alert"].sr-only')
  await expect(live).toHaveText('Something went wrong saving your preferences. Please try again.')
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect.poll(() => page.evaluate(() => document.activeElement !== document.body)).toBe(true)
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  await expect(page).toHaveURL(/\/demo\/onboarding$/)
  await expect(page.getByRole('heading', { name: 'Step 3 of 3: Updates' })).toBeVisible()
})

// demo.spec's generic per-route pass only ever reaches Onboarding with no one signed in -- the
// redirect it bounces to. A signed-in visit to step 1 is a real state that pass can't set up on
// its own, so it's checked here instead, the same way this file already checks Verify's own
// pending-email state above.
// Mutation: empty the "Woodland field days" checkbox's label text in Onboarding.tsx -> a real axe violation
// (`button-name`, WCAG 1.3.1/4.1.2 -- Radix's Checkbox renders as `role="checkbox"` on a
// `<button>`), in either theme.
for (const theme of THEMES) {
  test(`onboarding step 1 is axe clean in ${theme} theme`, async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'hexline-session',
        JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
      )
    })
    await page.goto('/demo/onboarding')
    await expect(page.getByRole('heading', { level: 1, name: 'Set up your account' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

const shopStatus = (page: Page) => page.getByRole('status', { name: 'Result count' })

// Mutation: empty out `handleInStockChange`'s body in Shop.tsx (drop the `commit({ inStock:
// checked })` call) -> `inStock=1` never reaches the URL, and the second `toHaveURL` assertion
// below fails.
test('applying a category and In stock only writes both into the URL, and a reload keeps them', async ({
  page,
}) => {
  await page.goto('/demo/shop')
  await page.getByRole('checkbox', { name: 'Tactical equipment' }).click()
  await page.getByRole('switch', { name: 'In stock only' }).click()
  await expect(page).toHaveURL(/category=tactical/)
  await expect(page).toHaveURL(/inStock=1/)
  await expect(shopStatus(page)).toHaveText('4 products')

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Tactical equipment' })).toBeChecked()
  await expect(page.getByRole('switch', { name: 'In stock only' })).toBeChecked()
  await expect(shopStatus(page)).toHaveText('4 products')
})

// Mutation: typing "shell" one character at a time, each 250ms apart -- squarely on top of the
// search debounce -- with the old `setSearchValue(filters.q)` resync (no `lastWrittenQ` guard),
// each debounced write's own resync overwrote whatever had been typed in the ~250ms since that
// write went out. Reproduced directly: with that old code, this test's field ends up reading
// "sel" or "sell" depending on timing, never "shell".
test('typing with pauses near the debounce keeps every character', async ({ page }) => {
  await page.goto('/demo/shop')
  const search = page.getByRole('searchbox', { name: 'Search the range' })
  await search.click()
  for (const ch of 'shell') {
    await page.keyboard.type(ch)
    await page.waitForTimeout(250)
  }
  await expect(search).toHaveValue('shell')
  await expect(page).toHaveURL(/q=shell/)
})

// Mutation: change `commit` in Shop.tsx to merge onto `filters` (this render's own snapshot)
// instead of `liveFilters.current` -> checking "Tactical equipment" within the search debounce's 250ms window
// merges the debounced write onto the `filters` this render closed over before the category click
// happened, so that click's own change is silently overwritten a moment later and
// `category=tactical` never survives.
test('a category checked while a search is pending survives the debounce', async ({ page }) => {
  await page.goto('/demo/shop')
  await page.getByRole('searchbox', { name: 'Search the range' }).fill('a')
  await page.getByRole('checkbox', { name: 'Tactical equipment' }).click()
  await expect(page).toHaveURL(/q=a/)
  await expect(page).toHaveURL(/category=tactical/)
})

// A real-timer version of this same race ("wait N ms, then click") was tried first, at 245ms, and
// found NOT to be a reliable guard: Playwright's own click (scroll-into-view, actionability
// checks, event dispatch) routinely eats more than the ~5ms of margin left before the debounce's
// own 250ms mark, so the click lands after the debounce fires as often as before it -- confirmed
// directly, green even against the mutation below. A real-timer test can only ever prove "this
// wait happened to land before the debounce fired THIS run," never "the code is correct
// regardless of ordering" -- which is what the two tests below prove instead, deterministically,
// with no real wait at all.

// The resync effect that keeps `liveFilters` current for an OUTSIDE change (Back/Forward, a
// shared link) has its own staleness hole, independent of `commit`'s own fix: `filters` is a new
// object every render, so an effect keyed on it fires on every render, not only a real URL change
// -- including an "urgent" render this page's own `searchValue` state can trigger between a
// click's synchronous write and the moment its own `startTransition` actually commits. Reproduced
// by forcing exactly that interleaving inside one synchronous browser task: click the category, then
// (still inside the same task) push a native `input` event through the search field and submit
// its form immediately, with no `await` in between to let Playwright's own automatic waiting
// smooth over the ordering.
// Mutation: key the resync effect in Shop.tsx on `filters` again, instead of `searchParams` -> the
// urgent re-render from the synchronous `input` event resyncs `liveFilters.current` back to its
// pre-click contents before the immediate submit ever reads it, and `category=tactical` is lost.
test('a category click survives an urgent re-render from typing, before either write lands', async ({
  page,
}) => {
  await page.goto('/demo/shop')
  const checkbox = await page.getByRole('checkbox', { name: 'Tactical equipment' }).elementHandle()
  const input = await page.getByRole('searchbox', { name: 'Search the range' }).elementHandle()
  await page.evaluate(
    ([checkboxEl, inputEl]) => {
      const check = checkboxEl as HTMLElement
      const field = inputEl as HTMLInputElement
      check.click()
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
      nativeSetter.call(field, 'a')
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.form!.requestSubmit()
    },
    [checkbox, input]
  )
  await expect(page).toHaveURL(/q=a/)
  await expect(page).toHaveURL(/category=tactical/)
})

// A deterministic version of the same debounce-vs-click race, with no real timers at all:
// `window.setTimeout` is patched to intercept only the debounce's own exact 250ms delay, holding
// its callback instead of scheduling it, so a test can fire it manually and control precisely
// when it runs relative to a click -- both orders, in the same synchronous browser task, rather
// than hoping a real wait lands on the right side of a 250ms boundary.
// Mutation: change `commit` in Shop.tsx to merge onto `filters` (this render's own snapshot)
// instead of `liveFilters.current` -> both orders below turn red (recorded in BUILD-LOG.md with
// which assertion failed for each).
for (const order of ['click-then-debounce', 'debounce-then-click'] as const) {
  test(`search and category both survive when the debounce and a click land in the same task (${order})`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const set = window.setTimeout.bind(window),
        clear = window.clearTimeout.bind(window)
      const held = new Map<number, () => void>()
      let n = 1e9
      ;(window as any).setTimeout = (fn: () => void, ms?: number, ...a: unknown[]) =>
        ms === 250 ? (held.set(n, fn), n++) : set(fn, ms, ...a)
      ;(window as any).clearTimeout = (id: number) => {
        if (!held.delete(id)) clear(id)
      }
      ;(window as any).__flushDebounce = () => {
        const f = [...held.values()]
        held.clear()
        f.forEach(g => g())
      }
    })
    await page.goto('/demo/shop')
    await page.getByRole('searchbox', { name: 'Search the range' }).fill('a')
    await page.getByRole('checkbox', { name: 'Tactical equipment' }).evaluate((el: HTMLElement, o) => {
      const flush = (window as any).__flushDebounce
      if (o === 'click-then-debounce') {
        el.click()
        flush()
      } else {
        flush()
        el.click()
      }
    }, order)
    await expect(page).toHaveURL(/q=a/)
    await expect(page).toHaveURL(/category=tactical/)
  })
}

// Mutation: drop the `clearTimeout(debounceRef.current)` call from `clearFilters` in Shop.tsx ->
// the debounce still pending from typing one more character (scheduled by the `fill` below) keeps
// running after Clear empties the URL, and fires ~250ms later, writing the stale search text
// straight back into it.
test('Clear filters cancels a search debounce still in flight', async ({ page }) => {
  await page.goto('/demo/shop?q=zzzz-nothing-matches-this')
  const search = page.getByRole('searchbox', { name: 'Search the range' })
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
  await search.fill('zzzz-nothing-matches-thisz')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(search).toHaveValue('')
  await page.waitForTimeout(400)
  await expect(page).not.toHaveURL(/q=/)
  await expect(search).toHaveValue('')
})

// Mutation: change `handleSliderCommit`'s floor in Shop.tsx from `Math.max(10, ...)` to
// `Math.max(20, ...)` -> Home (which the Slider's own `min={10}` already sends straight to 10)
// commits `max=20` instead, and both assertions below fail.
// (Tried first, and found NOT to work: reverting FilterPanel's `min` from 10 back to 0. Home then
// does land the thumb on 0 -- confirmed directly, with a throwaway script reading `aria-valuenow`
// immediately after a single Home press, no polling -- but the filters-driven resync effect
// corrects it back to 10 within the same round trip, before either awaited assertion below ever
// samples the DOM (Playwright's own auto-retry waits it out). The commit-side floor above is what
// actually reaches the URL unconditionally, so it's the one this test can prove.)
test('the price slider never shows less than the €10 it filters by', async ({ page }) => {
  await page.goto('/demo/shop')
  const slider = page.getByRole('slider', { name: /Maximum price/ })
  await slider.focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('Home')
  await expect(page).toHaveURL(/max=10(&|$)/)
  await expect(slider).toHaveAttribute('aria-valuenow', '10')
})

// Mutation: hard-code `commit` in Shop.tsx to always write with `{ replace: true }`, ignoring the
// `options` it's called with -> checking "Optics" and toggling "In stock only" both replace the
// same history entry instead of pushing a new one each, so Back below lands one step too far (on
// whatever page came before this test's own `goto`) instead of restoring the Optics-only listing.
test('Back and Forward restore the shop listing at each step it was narrowed', async ({ page }) => {
  await page.goto('/demo/shop')
  const status = shopStatus(page)
  const search = page.getByRole('searchbox', { name: 'Search the range' })
  const slider = page.getByRole('slider', { name: /Maximum price/ })
  await expect(status).toHaveText('22 products')
  // Neither field is touched by this journey (only the category and the switch are) -- these two
  // assertions exist to prove they still read correctly across Back/Forward, not just that they
  // were never disturbed. See the two dedicated tests above for search's and the slider's own
  // narrower, harder-to-fake regression coverage.
  await expect(search).toHaveValue('')
  await expect(slider).toHaveAttribute('aria-valuenow', String(SLIDER_MAX))

  // Optics: one sold-out product (Halo tube sight) and one in stock (Prism holo sight), so
  // "In stock only" actually changes the count on top of the category filter, rather than the
  // two steps landing on the same number by coincidence.
  await page.getByRole('checkbox', { name: 'Optics' }).click()
  await expect(status).toHaveText('2 products')

  await page.getByRole('switch', { name: 'In stock only' }).click()
  await expect(page).toHaveURL(/inStock=1/)
  await expect(status).toHaveText('1 product')

  await page.goBack()
  await expect(page).toHaveURL(/category=optics/)
  await expect(page).not.toHaveURL(/inStock=1/)
  await expect(status).toHaveText('2 products')
  await expect(page.getByRole('switch', { name: 'In stock only' })).not.toBeChecked()
  await expect(search).toHaveValue('')
  await expect(slider).toHaveAttribute('aria-valuenow', String(SLIDER_MAX))

  await page.goForward()
  await expect(page).toHaveURL(/inStock=1/)
  await expect(status).toHaveText('1 product')
  await expect(page.getByRole('switch', { name: 'In stock only' })).toBeChecked()
  await expect(search).toHaveValue('')
  await expect(slider).toHaveAttribute('aria-valuenow', String(SLIDER_MAX))
})

// Mutation: change the `Math.min(Math.max(1, f.page), pageCount)` page clamp in `applyFilters`
// (filters.ts) to `f.page` -> the grid renders nothing for a page past the end, and the link
// assertion below (a real product from the actual last page) fails instead of the ones from
// page 1.
test('?page=99 clamps to the shop\'s last real page instead of showing nothing', async ({ page }) => {
  await page.goto('/demo/shop?page=99')
  await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
  // Twenty-two products, six to a page: the last page holds the nineteenth to the twenty-second
  // (Bump helmet, Knee pads, Dummy radio, the kit). Field goggles is the eighteenth, the last
  // product of the page before.
  await expect(page.getByRole('link', { name: 'Dummy radio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Field goggles' })).toHaveCount(0)
})

// Mutation: drop the `CATEGORY_IDS.has(...)` guard from `parseFilters` in filters.ts -> the
// unknown category survives, the category filter then matches nothing, and the status assertion
// below fails.
test('an unknown category in the URL is dropped, showing every product with no crash', async ({ page }) => {
  await page.goto('/demo/shop?category=nope')
  await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
  await expect(shopStatus(page)).toHaveText('22 products')
})

// Mutation: change the Filters sheet's Apply button from `<SheetClose asChild>` to a plain
// `<Button>` with no `asChild`/`SheetClose` wrapper -> Apply no longer closes the sheet, and the
// `toBeHidden()` assertion below fails.
test.describe('the shop below lg', () => {
  test.use({ viewport: { width: 320, height: 800 } })

  test('the Filters sheet applies a category filter and Apply closes it', async ({ page }) => {
    await page.goto('/demo/shop')
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible()
    await page.getByRole('button', { name: 'Filters' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await expect(sheet).toBeVisible()

    // The result count behind the sheet is `aria-hidden` while a modal Radix Dialog has the page,
    // the same as everything else outside it -- checked only once Apply closes the sheet and
    // hands the page back its accessible tree.
    await sheet.getByRole('checkbox', { name: 'Tactical equipment' }).click()
    await expect(page).toHaveURL(/category=tactical/)

    await sheet.getByRole('button', { name: 'Apply' }).click()
    await expect(sheet).toBeHidden()
    await expect(shopStatus(page)).toHaveText('4 products')
  })

  for (const theme of THEMES) {
    // Mutation: drop the `label` prop from the "In stock only" `<Switch>`'s paired `<label>`
    // element in FilterPanel.tsx (leave the `htmlFor` orphaned) -> a real `button-name` violation
    // inside the open sheet, in either theme.
    test(`the Filters sheet is axe clean while open, in ${theme} theme`, async ({ page }) => {
      await page.goto('/demo/shop')
      await page.getByRole('button', { name: 'Filters' }).click()
      await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
      await applyTheme(page, theme)
      await settleAnimations(page)
      await expectAxeClean(page)
    })
  }
})

// demo.spec's generic per-page axe pass only ever reaches Shop with results (its default state).
// A search with nothing behind it is a real state that pass can't set up on its own -- the same
// reasoning as this file's other per-state axe checks above.
// Mutation: drop the "In stock only" `<Switch>`'s paired `<label>` in FilterPanel.tsx (leave the
// `htmlFor` orphaned, same shape as the sheet's own axe test above) -> a real `button-name`
// violation on the still-visible sidebar filters, in either theme, while both lookups in this
// test (the h1, the "Clear filters" button) keep finding their elements -- neither one's own
// accessible name is what the mutation touches.
for (const theme of THEMES) {
  test(`the shop is axe clean with no results, in ${theme} theme`, async ({ page }) => {
    await page.goto('/demo/shop?q=zzzz-nothing-matches-this')
    await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test.describe('shop reflow at short viewports', () => {
  for (const viewport of [
    { width: 1280, height: 256 },
    { width: 320, height: 256 },
  ]) {
    // Mutation: add `min-w-[2000px]` to Shop.tsx's root wrapper div -> the page is wider than
    // both viewports below, and the poll below never becomes true within its timeout.
    test(`no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/demo/shop')
      await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
      // A web font swapping in after the first paint reflows whatever it sizes -- wait for it to
      // settle, then poll rather than measuring once: a single-shot read right after load can
      // catch layout mid-shift and either pass or fail on a moment that never actually persists.
      await page.evaluate(() => document.fonts.ready)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
          message: `${viewport.width}x${viewport.height} scrolls horizontally`,
        })
        .toBe(true)
    })
  }

  // Mutation: add `min-w-[2000px]` to Shop.tsx's root wrapper div -> even with the sheet open
  // over it, the underlying page (still in the DOM, just `aria-hidden` behind the modal) is wider
  // than the viewport, and the overflow assertion fails. (The sheet itself is `position: fixed`
  // and cannot widen `document.documentElement.scrollWidth` on its own, confirmed directly: a
  // fixed 24rem-vs-100vw-cap `w-96` on `SheetContent` at this same 320px viewport did not move
  // this measurement at all.)
  test('no horizontal overflow at 320x256 with the Filters sheet open', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 })
    await page.goto('/demo/shop')
    await page.getByRole('button', { name: 'Filters' }).click()
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
        message: '320x256 with the Filters sheet open scrolls horizontally',
      })
      .toBe(true)
  })
})

// The full journey from the shop listing to a product's own page to the cart, driven only by the
// keyboard: a route change moves focus to #main (useFocusMainOnNavigate), so the tab order below
// starts there, through the breadcrumb trail, to the first radio in each fieldset. Both fieldsets
// start with nothing selected, so both need a real Space press, not just a tab-through.
// Mutation: change the toast action's `onAction` in Product.tsx's `submit` from
// `navigate('/demo/cart')` to a no-op -> the URL assertion at the end below fails (still on the
// product page).
test('the full listing-to-detail-to-cart journey works from the keyboard', async ({ page }) => {
  // Filtered to Tactical equipment by the URL: the bump helmet is the one product with both a
  // size and a colour to choose, and it is not on the first page of the unfiltered listing.
  await page.goto('/demo/shop?category=tactical')
  const productLink = page.getByRole('link', { name: 'Bump helmet' })
  // A fresh load starts the tab order at the very top of the shell (skip link, Brand, nav,
  // account/cart/theme controls), then the whole sidebar FilterPanel, well before the grid --
  // unlike every other `tabTo` call below, which starts from a client-side navigation that already
  // moved focus to #main (see `useFocusMainOnNavigate`) and so skips the chrome above it entirely.
  await tabTo(page, productLink, 40)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Bump helmet' })).toBeVisible()
  await expect(page).toHaveTitle('Hexline — Bump helmet')

  const sizeRadio = page.getByRole('radio', { name: 'S/M' })
  await tabTo(page, sizeRadio)
  await page.keyboard.press('Space')
  await expect(sizeRadio).toBeChecked()

  const colourRadio = page.getByRole('radio', { name: 'Black' })
  await tabTo(page, colourRadio)
  await page.keyboard.press('Space')
  await expect(colourRadio).toBeChecked()

  const addToCart = page.getByRole('button', { name: 'Add to cart', exact: true })
  await tabTo(page, addToCart)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Added Bump helmet (Size S/M · Black)').first()).toBeVisible()

  // Radix's Toast never steals focus when it appears (by design -- WAI-ARIA's own toast pattern),
  // so reaching it from the keyboard is F8 (its documented default hotkey, `VIEWPORT_DEFAULT_
  // HOTKEY` in Radix's own source), never a mouse click, which would silently defeat the point of
  // a keyboard-only journey.
  await page.keyboard.press('F8')
  const viewCart = page.getByRole('button', { name: 'View cart' })
  await tabTo(page, viewCart)
  await page.keyboard.press('Enter')
  // `/demo/cart` doesn't exist yet (a later task builds it) -- only the URL is this journey's own
  // concern, not what renders once it gets there.
  await expect(page).toHaveURL(/\/demo\/cart$/)
})

// Mutation: change the breadcrumb's `renderLink` prop on `Breadcrumbs` in Product.tsx from
// `routerLink` to nothing (the default plain `<a>`) -> the anchor's own full navigation reloads
// the document, resetting `window.__marker`, and the assertion below fails.
test('the breadcrumb trail back to the shop is a router link, not a full page reload', async ({ page }) => {
  await page.goto('/demo/shop/bump-helmet')
  await page.evaluate(() => {
    ;(window as unknown as { __marker: boolean }).__marker = true
  })
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Shop' }).click()
  await expect(page).toHaveURL(/\/demo\/shop$/)
  expect(await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)).toBe(true)
})

// Mutation: change Product.tsx's `submit` to call `add`/raise the toast unconditionally (drop the
// `errors.validateAll`/`hasErrors` guard) -> the ErrorSummary this test looks for never appears.
for (const theme of THEMES) {
  test(`the size/colour validation error is axe clean, in ${theme} theme`, async ({ page }) => {
    await page.goto('/demo/shop/bump-helmet')
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await expect(page.getByRole('group', { name: 'There is a problem' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// demo.spec's generic per-page pass only ever reaches this route in its default, in-stock state
// (via `samplePath`). A sold-out product is a real state that pass can't set up on its own -- the
// same reasoning as this file's other per-state axe checks above.
// Mutation: change the Sold out explanatory line's own element in Product.tsx from a `<p>` to a
// bare `<li>` -> a real `listitem` violation ("List item does not have a <ul>, <ol> parent
// element"), both themes.
for (const theme of THEMES) {
  test(`a sold-out product page is axe clean, in ${theme} theme`, async ({ page }) => {
    await page.goto('/demo/shop/kestrel-l')
    await expect(page.getByRole('heading', { level: 1, name: 'Kestrel L rifle replica' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sold out' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// The Sold out button's own inertness never reaches Quantity: real Chromium implicitly submits
// this form on Enter regardless of which OTHER button on it is disabled, and there is no submit
// button at all once a product is sold out. With the guard below removed, this Enter press
// reaches `add`, which then raises the "You already have the most we can sell of Kestrel L rifle
// replica." toast. The cart button staying at zero alone would not prove the guard removed either
// way -- kestrel-l's own stock is 0, so `useCart()`'s own `add` already refuses it
// independently -- so the absence of ANY toast is the assertion that actually distinguishes the
// two, the same reasoning as the unit test of the same name.
// Mutation: remove the `if (product.soldOut) return` line from `submit` in Product.tsx -> the
// "You already have the most we can sell of" toast appears below.
test('pressing Enter in Quantity on a sold-out product does not add it to the cart', async ({ page }) => {
  await page.goto('/demo/shop/kestrel-l')
  await page.getByRole('radio', { name: 'Black' }).click()
  await page.getByRole('spinbutton', { name: 'Quantity' }).click()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Cart, 0 items' })).toBeVisible()
  await expect(page.getByText(/Added|most we can sell/).first()).not.toBeVisible()
})

// Mutation: change the not-found heading in Product.tsx from an `<h1>` to a `<p>` -> a real
// `page-has-heading-one` violation, in either theme.
for (const theme of THEMES) {
  test(`an unknown product id is axe clean on its own not-found page, in ${theme} theme`, async ({ page }) => {
    await page.goto('/demo/shop/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: 'Product not found' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test.describe('product page reflow at short viewports', () => {
  for (const theme of THEMES) {
    for (const viewport of [
      { width: 1280, height: 256 },
      { width: 320, height: 256 },
    ]) {
      // Mutation: add `min-w-[2000px]` to Product.tsx's root wrapper div -> the page is wider
      // than both viewports below, and the poll never becomes true within its timeout.
      test(`no horizontal overflow at ${viewport.width}x${viewport.height}, ${theme} theme`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.goto('/demo/shop/bump-helmet')
        await expect(page.getByRole('heading', { level: 1, name: 'Bump helmet' })).toBeVisible()
        await applyTheme(page, theme)
        await page.evaluate(() => document.fonts.ready)
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
            message: `${viewport.width}x${viewport.height} scrolls horizontally in ${theme} theme`,
          })
          .toBe(true)
      })
    }
  }
})

// Every route this milestone added, dark theme only: light-theme reflow at these two short
// viewports is already proven, page by page, by the dedicated blocks above (cart, checkout,
// confirmation, shop, product) -- this is the pass that catches a dark-theme-only overflow (an
// outline, a shadow or a border that only paints in one theme) across the five auth/onboarding
// routes those blocks never touch, using each route's own `samplePath` exactly as demo.spec does,
// so a route that only renders through a redirect (Checkout with an empty cart, Verify or
// Onboarding with no session) is measured at the page it actually lands on.
test.describe('every flow route reflows at 1280x256 and 320x256 in dark theme', () => {
  // Every registered route, the homepage included. Home used to be filtered out because the
  // removed hero suite carried its own short-viewport checks; nothing else covers it now.
  const FLOW_PAGES = DEMO_PAGES
  const VIEWPORTS = [
    { width: 1280, height: 256 },
    { width: 320, height: 256 },
  ]

  // Mutation, run once as representative proof the assertion itself can fail (the other nine
  // routes share the exact same poll against the exact same two properties): add
  // `min-w-[2000px]` to SignIn.tsx's root wrapper div -> both of that route's own tests below
  // fail, the page wider than either viewport.
  for (const flowPage of FLOW_PAGES) {
    for (const viewport of VIEWPORTS) {
      test(`${flowPage.path} has no horizontal overflow at ${viewport.width}x${viewport.height} in dark theme`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport)
        await page.goto(flowPage.samplePath ?? flowPage.path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await applyTheme(page, 'dark')
        await page.evaluate(() => document.fonts.ready)
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
            message: `${flowPage.path} scrolls horizontally at ${viewport.width}x${viewport.height} in dark theme`,
          })
          .toBe(true)
      })
    }
  }
})
