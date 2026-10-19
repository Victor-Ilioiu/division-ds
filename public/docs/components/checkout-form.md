# CheckoutForm

> Shipping, delivery and payment in three steps, with the order summary beside them. It's a demo: no payment is ever taken, and the card fields say so.

- **Best for:** A demo checkout: shipping, delivery and payment in three steps beside the order summary.
- **Not for:** Taking a real payment. It's a demo and never charges.
- Organism. Source: `src/components/organisms/checkout-form/CheckoutForm.tsx`
- Rendered docs page: `/components/checkout-form`

## Import

```tsx
import { CheckoutForm, DELIVERY_OPTIONS } from 'src/components/organisms/checkout-form/CheckoutForm'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `lines` | `CartLine[]` |  | Required. What's being bought. The order summary lists them. |
| `countries` | `SelectOption[]` |  | Required. The options for the country Select. |
| `deliveryOptions` | `DeliveryOption[]` | `DELIVERY_OPTIONS` | Prices in the currency's smallest unit. Zero shows as Free. |
| `onPlaceOrder` | `(order: CheckoutOrder) => void \| { error: string } \| Promise<void \| { error: string }>` |  | Required. Gets the contact details, addresses, delivery id and total, and never a card field. If it rejects, an alert appears that lets the person try again, so the failure isn't lost. Resolving { error } shows that specific message in the same alert. |
| `headingLevel` | `2 \| 3` | `2` | The level of the 'Checkout' heading. Steps and the order summary sit one level below it, and never below ErrorSummary's own fixed h4 (level-4 heading). |
| `currency` | `string` | `'EUR'` | Passed to formatMoney. |
| `locale` | `string` | `'en-IE'` | Passed to formatMoney. |
| `className` | `string` |  | Merged with the root classes. Later Tailwind utilities win. |
| `ref` | `Ref<HTMLDivElement>` |  | The root. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type DeliveryOption = {
  id: string
  label: string
  detail: string
  /** In the currency's minor unit (cents for EUR). Zero shows as "Free". */
  price: number
}
```

```ts
export const DELIVERY_OPTIONS: DeliveryOption[] = [
  { id: 'standard', label: 'Standard', detail: '3 to 5 working days', price: 0 },
  { id: 'express', label: 'Express', detail: 'Next working day', price: 1200 },
]
```

```ts
export type CheckoutAddress = { line1: string; line2: string; city: string; postalCode: string; country: string }
```

```ts
/** What the form hands over. No card field ever leaves it, demo or not. */
export type CheckoutOrder = {
  email: string
  name: string
  phone: string
  shipping: CheckoutAddress
  deliveryId: string
  billing: CheckoutAddress | 'same-as-shipping'
  /** In the currency's minor unit: the lines plus delivery. */
  total: number
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Three steps, a demo order

```tsx
const LINES: CartLine[] = [
  { id: 'kestrel-c', name: 'Kestrel C carbine replica', unitPrice: 13900, quantity: 1 },
  { id: 'prism-holo-sight', name: 'Prism holo sight', unitPrice: 4900, quantity: 2 },
  { id: 'beam-600', name: 'Beam 600 rail light', unitPrice: 2400, quantity: 1 },
]

const COUNTRIES = [
  { value: 'ie', label: 'Ireland' },
  { value: 'ro', label: 'Romania' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'es', label: 'Spain' },
]

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

<CheckoutForm lines={LINES} countries={COUNTRIES} onPlaceOrder={() => wait(800).then(() => undefined)} headingLevel={3} />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the fields, then Back and Continue. |
| `Enter` | In a field, goes on to the next step, or places the order on the last one. |
| `↑` `↓` | In the delivery options, moves and picks. |
| `Space` | On the billing checkbox, toggles it. |

## Do

- Pass the cart lines, so the order summary and the total come from the same numbers.
- Keep the demo notice whenever the card fields are fake.
- Store prices in the currency's smallest unit (cents for EUR).

## Don't

- Don't make the Stepper clickable. Back and Continue move between steps.
- Don't ask for the billing address unless it's different from shipping.
- Don't validate a card number in a demo. Nothing's charged.

## Anatomy

- **Stepper**: Shows where the person is. It isn't clickable, so nobody can skip to a step whose fields don't exist yet.
- **Step heading**: Read as 'Step 2 of 3: Delivery' by a screen reader. Focus (where keyboard input goes) lands here on Continue and Back.
- **Error summary**: Lists the step's missing or wrong fields and takes focus. Each entry jumps to its field.
- **Delivery options**: A radio group with prices, and nothing picked in advance.
- **Billing**: Uses the shipping address by default. Unticking the box asks for a billing address.
- **Demo notice**: An info Alert above the card fields saying no payment is taken.
- **Order summary**: Lines, subtotal, delivery and total, formatted by formatMoney.
- **Confirmation**: A status line that's always on the page and confirms the order.
- **Placement alert**: Also always on the page. If onPlaceOrder rejects, or resolves { error } with a specific message, this alert says so, instead of the button just quietly stopping being busy. Everything already typed stays put for another try.
