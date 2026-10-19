import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './CheckoutForm.meta'
import { Example } from '../../docs/Example'
import type { CartLine } from '../cart/Cart'
import { CheckoutForm } from './CheckoutForm'

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

export function CheckoutFormDocs() {
  return (
    <ComponentDocs meta={meta}>
      {/* headingLevel={3}, not the 4 every other organism docs example uses: CheckoutForm's own
          step heading sits one level below its "Checkout" heading, and ErrorSummary is pinned to
          h4 regardless. At 4 the step heading would be h5, and an h5 would precede the summary's
          h4 in the DOM whenever a step fails -- at 3 the step heading is h4 too, a sibling of the
          summary's own heading rather than a level the summary then backs out of. */}
      <Example caption="Three steps, a demo order" className="block">
        <CheckoutForm lines={LINES} countries={COUNTRIES} onPlaceOrder={() => wait(800).then(() => undefined)} headingLevel={3} />
      </Example>
    </ComponentDocs>
  )
}
