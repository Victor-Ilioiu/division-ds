import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import type { CartLine } from '../cart/Cart'
import { CheckoutForm, type CheckoutFormProps, type CheckoutOrder } from './CheckoutForm'

const LINES: CartLine[] = [
  { id: 'kestrel-c', name: 'Kestrel C carbine replica', unitPrice: 13900, quantity: 1 },
  { id: 'prism-holo-sight', name: 'Prism holo sight', unitPrice: 4900, quantity: 2 },
]
const COUNTRIES = [
  { value: 'ie', label: 'Ireland' },
  { value: 'ro', label: 'Romania' },
]

/** A required FormField's label ends in an aria-hidden "*", so its text content is "Email*". */
const byLabel = (label: string) => screen.getByLabelText(new RegExp(`^${label}\\*?$`))
const continueButton = () => screen.getByRole('button', { name: 'Continue' })

function renderCheckout(props: Partial<CheckoutFormProps> = {}) {
  return render(<CheckoutForm lines={LINES} countries={COUNTRIES} onPlaceOrder={() => {}} {...props} />)
}

async function fillShipping() {
  await userEvent.type(byLabel('Email'), 'ana@example.com')
  await userEvent.type(byLabel('Full name'), 'Ana Pop')
  await userEvent.type(byLabel('Address line 1'), 'Strada Lunga 12')
  await userEvent.type(byLabel('Town or city'), 'Brasov')
  await userEvent.type(byLabel('Postal code'), '500035')
  await userEvent.click(screen.getByRole('combobox', { name: 'Country' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Romania' }))
}

async function toPayment() {
  await fillShipping()
  await userEvent.click(continueButton())
  await userEvent.click(screen.getByRole('radio', { name: /Express/ }))
  await userEvent.click(continueButton())
}

async function fillCard() {
  await userEvent.type(byLabel('Name on card'), 'Ana Pop')
  await userEvent.type(byLabel('Card number'), '4242 4242 4242 4242')
  await userEvent.type(byLabel('Expiry date'), '12/30')
  await userEvent.type(byLabel('Security code'), '123')
}

describe('CheckoutForm', () => {
  // Mutation: drop `{...input}` from the `text` helper's Input; no field carries autocomplete.
  it('starts on Shipping, with the stepper on step 1 and an autocomplete token on every field', () => {
    renderCheckout()
    const progress = screen.getByRole('list', { name: 'Checkout progress' })
    expect(within(progress).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('heading', { name: 'Step 1 of 3: Shipping' })).toBeInTheDocument()
    const tokens: Record<string, string> = {
      Email: 'email',
      'Full name': 'shipping name',
      'Address line 1': 'shipping address-line1',
      'Address line 2 (optional)': 'shipping address-line2',
      'Town or city': 'shipping address-level2',
      'Postal code': 'shipping postal-code',
      'Phone (optional)': 'shipping tel',
    }
    for (const [name, token] of Object.entries(tokens)) {
      expect(screen.getByRole('textbox', { name }), name).toHaveAttribute('autocomplete', token)
    }
    // Radix Select renders a native select inside a form, which is what autofill fills.
    expect(document.querySelector('select[autocomplete="shipping country"]')).not.toBeNull()
  })

  // Mutation: drop the attempt effect's focus call; the summary shows but focus stays on Continue.
  it('lists what is missing when Continue fails, in field order, and focuses the summary', async () => {
    renderCheckout()
    await userEvent.click(continueButton())
    const summary = screen.getByRole('group', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getAllByRole('link').map(link => link.textContent)).toEqual([
      'Enter your email address.',
      'Enter the name to deliver to.',
      'Enter the first line of the address.',
      'Enter the town or city.',
      'Enter the postal code.',
      'Choose a country.',
    ])
    await userEvent.click(within(summary).getByRole('link', { name: 'Choose a country.' }))
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveFocus()
  })

  // Mutations: drop the step-heading focus (focus stays on Continue, then Back); reset `values` in
  // goTo (the email is empty after Back).
  it('moves on to Delivery once Shipping is valid, focusing the step heading, and Back keeps what was typed', async () => {
    renderCheckout()
    await fillShipping()
    await userEvent.click(continueButton())
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Delivery' })).toHaveFocus()
    const progress = screen.getByRole('list', { name: 'Checkout progress' })
    expect(within(progress).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Step 1 of 3: Shipping' })).toHaveFocus()
    expect(byLabel('Email')).toHaveValue('ana@example.com')
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('Romania')
  })

  // Mutation: give the first radio `${idOf('delivery')}-0` instead of idOf('delivery'); the link's
  // getElementById finds nothing and focus stays on the link.
  it('asks for a delivery option when none is chosen, and the summary entry focuses the first one', async () => {
    renderCheckout()
    await fillShipping()
    await userEvent.click(continueButton())
    await userEvent.click(continueButton())
    const summary = screen.getByRole('group', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    await userEvent.click(within(summary).getByRole('link', { name: 'Choose a delivery option.' }))
    expect(screen.getByRole('radio', { name: /Standard/ })).toHaveFocus()
    expect(screen.getByRole('radiogroup', { name: 'Delivery option' })).toHaveAttribute('aria-invalid', 'true')
  })

  // Mutation: compute `total` from the subtotal alone; the total stays €237.00.
  it('adds the chosen delivery to the order summary total', async () => {
    renderCheckout()
    const order = screen.getByRole('region', { name: 'Order summary' })
    const total = () => within(order).getByText('Total').nextElementSibling
    expect(total()).toHaveTextContent('€237.00')
    await fillShipping()
    await userEvent.click(continueButton())
    await userEvent.click(screen.getByRole('radio', { name: /Express/ }))
    expect(within(order).getByText('Delivery').nextElementSibling).toHaveTextContent('€12.00')
    expect(total()).toHaveTextContent('€249.00')
  })

  // Mutation: start `billingSame` at false; the checkbox is unchecked and the billing fields show.
  it('bills the shipping address by default, and asks for one with billing tokens when unticked', async () => {
    renderCheckout()
    await toPayment()
    const same = screen.getByRole('checkbox', { name: 'Billing address is the same as shipping' })
    expect(same).toBeChecked()
    expect(screen.queryByRole('textbox', { name: 'Billing address line 1' })).toBeNull()
    await userEvent.click(same)
    expect(screen.getByRole('textbox', { name: 'Billing address line 1' })).toHaveAttribute(
      'autocomplete',
      'billing address-line1'
    )
    expect(screen.getByRole('textbox', { name: 'Billing postal code' })).toHaveAttribute('autocomplete', 'billing postal-code')
    expect(screen.getByRole('combobox', { name: 'Billing country' })).toBeInTheDocument()
  })

  // Mutation: delete the demo Alert; the first expectation fails.
  it('marks the card fields as a demo and gives each its cc token', async () => {
    renderCheckout()
    await toPayment()
    expect(screen.getByText('Demo only')).toBeInTheDocument()
    expect(screen.getByText('No payment is taken. Use any numbers.')).toBeInTheDocument()
    const tokens: Record<string, string> = {
      'Name on card': 'cc-name',
      'Card number': 'cc-number',
      'Expiry date': 'cc-exp',
      'Security code': 'cc-csc',
    }
    for (const [name, token] of Object.entries(tokens)) {
      expect(screen.getByRole('textbox', { name }), name).toHaveAttribute('autocomplete', token)
    }
  })

  // Mutations: pass `{ ...values, total }` to onPlaceOrder (toEqual fails on the card keys); render
  // the status only once placed (the first getByRole('status') throws); use native `disabled`
  // instead of aria-disabled while placing (not.toBeDisabled() and the aria-disabled assertion
  // both catch a native-disabled busy button here too, not only in Button.test.tsx).
  it('places the order without any card field, keeps the busy button focused, and confirms it', async () => {
    let finish: () => void = () => {}
    const onPlaceOrder = vi.fn((_order: CheckoutOrder) => new Promise<void>(resolve => (finish = resolve)))
    renderCheckout({ onPlaceOrder })
    const status = screen.getByRole('status')
    await toPayment()
    await fillCard()
    const place = screen.getByRole('button', { name: 'Place order' })
    await userEvent.click(place)
    expect(place).toHaveAttribute('aria-busy', 'true')
    expect(place).toHaveAttribute('aria-disabled', 'true')
    expect(place).not.toBeDisabled()
    expect(place).toHaveFocus()
    await act(async () => finish())
    expect(onPlaceOrder).toHaveBeenCalledTimes(1)
    expect(onPlaceOrder.mock.calls[0][0]).toEqual({
      email: 'ana@example.com',
      name: 'Ana Pop',
      phone: '',
      shipping: { line1: 'Strada Lunga 12', line2: '', city: 'Brasov', postalCode: '500035', country: 'ro' },
      deliveryId: 'express',
      billing: 'same-as-shipping',
      total: 24900,
    })
    expect(place).not.toHaveAttribute('aria-busy')
    expect(status).toHaveTextContent('Order placed. This is a demo: no payment was taken.')
  })

  // Back is inert while an order is placing: it can neither leave the step nor let a second click
  // start a second order. The two guards are independent -- dropping either `goTo`'s own
  // `if (pending || placed) return` or Back's own onClick guard alone still leaves the other one
  // blocking the click, and the test still passes. Mutation: drop BOTH together (goTo's guard and
  // Back's onClick guard); Back navigates to Delivery while the order is still placing.
  it('does nothing on Back while an order is placing, and the outcome still lands on Payment', async () => {
    let finish: () => void = () => {}
    const onPlaceOrder = vi.fn(() => new Promise<void>(resolve => (finish = resolve)))
    renderCheckout({ onPlaceOrder })
    const status = screen.getByRole('status')
    await toPayment()
    await fillCard()
    const place = screen.getByRole('button', { name: 'Place order' })
    await userEvent.click(place)
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(back)
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Payment' })).toBeInTheDocument()
    expect(place).toHaveAttribute('aria-busy', 'true')
    // A second attempt while the first is still placing must do nothing either: a second click on
    // the button, and an Enter press in a field, which implicitly submits the form the same way a
    // click on the default submit button would. Button's own `loading` prop already blocks both
    // paths by itself (aria-disabled and its click prevented); `submit`'s own `pending` guard is a
    // second, independent line of defence behind it. Mutation: drop both together -- Button's
    // WHILE_LOADING click prevention (`onClick: () => {}` instead of `event.preventDefault()`) and
    // `submit`'s own `pending` half -- and both the second click and the Enter press reach
    // onPlaceOrder, landing on the assertion below with 3 calls instead of 1.
    await userEvent.click(place)
    await userEvent.click(byLabel('Security code'))
    await userEvent.keyboard('{Enter}')
    await act(async () => finish())
    expect(onPlaceOrder).toHaveBeenCalledTimes(1)
    expect(status).toHaveTextContent('Order placed. This is a demo: no payment was taken.')
  })

  // Placing an order is final: neither button does anything once one has succeeded. The two
  // guards are independent, same as above -- dropping either `submit`'s own `placed` half or
  // Place order's onClick guard alone still leaves the other blocking the click. Mutation: drop
  // BOTH together; a second click calls onPlaceOrder again.
  it('does not place a second order when Place order is clicked again after the first succeeds', async () => {
    const onPlaceOrder = vi.fn().mockResolvedValue(undefined)
    renderCheckout({ onPlaceOrder })
    const status = screen.getByRole('status')
    await toPayment()
    await fillCard()
    const place = screen.getByRole('button', { name: 'Place order' })
    await userEvent.click(place)
    await waitFor(() => expect(status).toHaveTextContent('Order placed'))
    expect(place).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(place)
    expect(onPlaceOrder).toHaveBeenCalledTimes(1)
  })

  // Same independent-guards shape as the two tests above. Mutation: drop `goTo`'s own `placed`
  // half together with Back's onClick guard; Back moves the checkout to Delivery and the
  // confirmation is left behind under a step that never placed anything.
  it('does nothing on Back once the order is placed, and the confirmation stays on Payment', async () => {
    const onPlaceOrder = vi.fn().mockResolvedValue(undefined)
    renderCheckout({ onPlaceOrder })
    const status = screen.getByRole('status')
    await toPayment()
    await fillCard()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(status).toHaveTextContent('Order placed'))
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(back)
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Payment' })).toBeInTheDocument()
    expect(status).toHaveTextContent('Order placed. This is a demo: no payment was taken.')
  })

  // A rejection is never dropped silently; it shows, and the fields already typed survive a retry.
  // This is also the "stays generic" half of the resolved-{error} change below: a caller that only
  // ever rejects (never resolves { error }) keeps getting this exact text, unchanged.
  // Mutation: drop the catch block; the rejection is unhandled and no alert ever appears.
  it('shows a visible, persistent alert rather than dropping a failed placement silently, and lets a retry succeed', async () => {
    const onPlaceOrder = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(undefined)
    renderCheckout({ onPlaceOrder })
    const status = screen.getByRole('status')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('')
    await toPayment()
    await fillCard()
    const place = screen.getByRole('button', { name: 'Place order' })
    await userEvent.click(place)
    await waitFor(() => expect(place).not.toHaveAttribute('aria-busy'))
    expect(alert).toHaveTextContent('Something went wrong placing your order. Please try again.')
    expect(byLabel('Card number')).toHaveValue('4242 4242 4242 4242')
    await userEvent.click(place)
    await waitFor(() => expect(status).toHaveTextContent('Order placed'))
    expect(alert).toHaveTextContent('')
  })

  // The additive half of the same alert: a caller with a specific fix to name resolves { error }
  // instead of rejecting, and the form shows that exact string in the same alert rather than the
  // generic one -- the order is not marked placed, and the fields stay put for a retry.
  // Mutation: change `result && 'error' in result` to `false` in CheckoutForm.tsx's submit -> the
  // order is marked placed instead, and this message never appears.
  it("shows the caller's own message, and does not mark the order placed, when onPlaceOrder resolves { error }", async () => {
    const MESSAGE =
      'We could not deliver to that postal code. Go back to Shipping to change it, then place the order again.'
    const onPlaceOrder = vi.fn().mockResolvedValueOnce({ error: MESSAGE })
    renderCheckout({ onPlaceOrder })
    const status = screen.getByRole('status')
    const alert = screen.getByRole('alert')
    await toPayment()
    await fillCard()
    const place = screen.getByRole('button', { name: 'Place order' })
    await userEvent.click(place)
    await waitFor(() => expect(place).not.toHaveAttribute('aria-busy'))
    expect(alert).toHaveTextContent(MESSAGE)
    expect(status).toHaveTextContent('')
    expect(place).not.toHaveAttribute('aria-disabled', 'true')
    expect(byLabel('Card number')).toHaveValue('4242 4242 4242 4242')
  })

  // A synchronous throw that fails the same way twice in a row must still be announced the second
  // time: the alert's own DOM node has to change, not just hold text that happens to read the
  // same as before. Mutation: drop the `await Promise.resolve()` between clearing the alert and
  // calling onPlaceOrder; the second attempt's mutation count no longer grows.
  it('re-announces an identical placement failure on a second attempt', async () => {
    const onPlaceOrder = vi.fn(() => {
      throw new Error('boom')
    })
    renderCheckout({ onPlaceOrder })
    await toPayment()
    await fillCard()
    const place = screen.getByRole('button', { name: 'Place order' })
    const alert = screen.getByRole('alert')
    let mutations = 0
    const observer = new MutationObserver(() => {
      mutations++
    })
    observer.observe(alert, { childList: true, characterData: true, subtree: true })
    await userEvent.click(place)
    expect(alert).toHaveTextContent('Something went wrong placing your order. Please try again.')
    const afterFirst = mutations
    expect(afterFirst).toBeGreaterThan(0)
    await userEvent.click(place)
    expect(alert).toHaveTextContent('Something went wrong placing your order. Please try again.')
    expect(mutations).toBeGreaterThan(afterFirst)
    observer.disconnect()
  })

  // Mutation: drop the billing-errors clearing from the checkbox's onCheckedChange; the old
  // "Enter the first line of the billing address." error reappears the moment the fields are shown
  // again, before anyone has touched them in that new showing.
  it('clears a stale billing error once "same as shipping" is re-ticked', async () => {
    renderCheckout()
    await toPayment()
    const same = screen.getByRole('checkbox', { name: 'Billing address is the same as shipping' })
    await userEvent.click(same)
    await userEvent.click(screen.getByRole('textbox', { name: 'Billing address line 1' }))
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Enter the first line of the billing address.' })).toBeInTheDocument()
    await userEvent.click(same)
    await userEvent.click(same)
    expect(screen.queryByRole('link', { name: 'Enter the first line of the billing address.' })).toBeNull()
  })

  it('is axe clean on the payment step with errors showing', async () => {
    const { container } = renderCheckout()
    await toPayment()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await screen.findByRole('group', { name: 'There is a problem' })
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: drop ref={ref} from the root.
  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = renderCheckout({ ref })
    expect(ref.current).toBe(container.firstElementChild)
  })
})
