import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'CheckoutForm',
  title: 'Checkout form',
  tier: 'organisms',
  slug: 'checkout-form',
  summary:
    "Shipping, delivery and payment in three steps, with the order summary beside them. It's a demo: no payment is ever taken, and the card fields say so.",
  anatomy: [
    { part: 'Stepper', description: "Shows where the person is. It isn't clickable, so nobody can skip to a step whose fields don't exist yet." },
    { part: 'Step heading', description: "Read as 'Step 2 of 3: Delivery' by a screen reader. Focus (where keyboard input goes) lands here on Continue and Back." },
    { part: 'Error summary', description: "Lists the step's missing or wrong fields and takes focus. Each entry jumps to its field." },
    { part: 'Delivery options', description: 'A radio group with prices, and nothing picked in advance.' },
    { part: 'Billing', description: 'Uses the shipping address by default. Unticking the box asks for a billing address.' },
    { part: 'Demo notice', description: 'An info Alert above the card fields saying no payment is taken.' },
    { part: 'Order summary', description: 'Lines, subtotal, delivery and total, formatted by formatMoney.' },
    { part: 'Confirmation', description: "A status line that's always on the page and confirms the order." },
    {
      part: 'Placement alert',
      description:
        "Also always on the page. If onPlaceOrder rejects, or resolves { error } with a specific message, this alert says so, instead of the button just quietly stopping being busy. Everything already typed stays put for another try.",
    },
  ],
  props: [
    { name: 'lines', type: 'CartLine[]', description: "Required. What's being bought. The order summary lists them." },
    { name: 'countries', type: 'SelectOption[]', description: 'Required. The options for the country Select.' },
    { name: 'deliveryOptions', type: 'DeliveryOption[]', default: 'DELIVERY_OPTIONS', description: "Prices in the currency's smallest unit. Zero shows as Free." },
    {
      name: 'onPlaceOrder',
      type: '(order: CheckoutOrder) => void | { error: string } | Promise<void | { error: string }>',
      description:
        "Required. Gets the contact details, addresses, delivery id and total, and never a card field. If it rejects, an alert appears that lets the person try again, so the failure isn't lost. Resolving { error } shows that specific message in the same alert.",
    },
    { name: 'headingLevel', type: '2 | 3', default: '2', description: "The level of the 'Checkout' heading. Steps and the order summary sit one level below it, and never below ErrorSummary's own fixed h4 (level-4 heading)." },
    { name: 'currency', type: 'string', default: "'EUR'", description: 'Passed to formatMoney.' },
    { name: 'locale', type: 'string', default: "'en-IE'", description: 'Passed to formatMoney.' },
    { name: 'className', type: 'string', description: 'Merged with the root classes. Later Tailwind utilities win.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'The root.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves through the fields, then Back and Continue.' },
    { keys: ['Enter'], does: 'In a field, goes on to the next step, or places the order on the last one.' },
    { keys: ['↑', '↓'], does: 'In the delivery options, moves and picks.' },
    { keys: ['Space'], does: 'On the billing checkbox, toggles it.' },
  ],
  useWhen: 'A demo checkout: shipping, delivery and payment in three steps beside the order summary.',
  notFor: "Taking a real payment. It's a demo and never charges.",
  dos: [
    'Pass the cart lines, so the order summary and the total come from the same numbers.',
    'Keep the demo notice whenever the card fields are fake.',
    "Store prices in the currency's smallest unit (cents for EUR).",
  ],
  donts: [
    "Don't make the Stepper clickable. Back and Continue move between steps.",
    "Don't ask for the billing address unless it's different from shipping.",
    "Don't validate a card number in a demo. Nothing's charged.",
  ],
}
