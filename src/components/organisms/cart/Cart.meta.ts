import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Cart',
  title: 'Cart',
  tier: 'organisms',
  slug: 'cart',
  summary:
    "The lines someone means to buy, with quantities, line totals and a subtotal that screen readers announce as it changes. Removing a line can be undone, and focus (where keyboard input goes) is never lost.",
  anatomy: [
    { part: 'Heading', description: "Names the cart. Focus lands here once it's empty." },
    {
      part: 'Line',
      description: 'Name (a link when it has an href), detail, unit price, quantity, line total and Remove.',
    },
    { part: 'Quantity', description: "A QuantityStepper named '{name} quantity', starting at 1." },
    { part: 'Remove', description: "A ghost icon button named 'Remove {name}'." },
    {
      part: 'Subtotal',
      description: "A status line visible only to screen readers (sr-only), plus a visual twin. Screen readers announce the status as it changes. The twin, in tabular figures, is what sighted readers see, and it's aria-hidden (hidden from screen readers) so nothing is announced twice.",
    },
    { part: 'Footer', description: 'Optional actions, such as Check out.' },
  ],
  props: [
    { name: 'lines', type: 'CartLine[]', description: "Required. The cart doesn't keep any lines of its own." },
    {
      name: 'onQuantityChange',
      type: '(id: string, quantity: number) => void',
      description: "Required. Called when a line's QuantityStepper changes.",
    },
    { name: 'onRemove', type: '(id: string) => void', description: 'Required. Called when Remove is pressed.' },
    {
      name: 'onRestore',
      type: '(line: CartLine, index: number) => void',
      description: 'Puts a removed line back at its old position. When you pass it, the removal toast offers Undo.',
    },
    { name: 'title', type: 'string', default: "'Cart'", description: "The heading's text, and the cart's accessible name (the name a screen reader announces)." },
    { name: 'headingLevel', type: '2 | 3 | 4', default: '2', description: "Match the page's heading outline." },
    { name: 'emptyMessage', type: 'string', default: "'Your cart is empty.'", description: 'Shown in place of the list.' },
    { name: 'footer', type: 'ReactNode', description: "Under the subtotal, such as a checkout button. Hidden while the cart's empty." },
    { name: 'currency', type: 'string', default: "'EUR'", description: 'Passed to formatMoney.' },
    { name: 'locale', type: 'string', default: "'en-IE'", description: 'Passed to formatMoney.' },
    {
      name: 'renderLink',
      type: '(props: LinkRenderProps) => ReactNode',
      default: 'a plain anchor',
      description: 'Draws a line name that has an href.',
    },
    { name: 'className', type: 'string', description: 'Merged with the root classes. Later Tailwind utilities win.' },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'The section.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves through each line's link, quantity and Remove." },
    { keys: ['↑', '↓'], does: 'On a quantity, steps it by one.' },
    { keys: ['Enter'], does: 'On Remove, removes the line. Focus moves to the next line.' },
    { keys: ['F8'], does: 'Jumps to the removal toast, so you can reach Undo.' },
  ],
  useWhen: 'The lines someone means to buy: quantities, line totals, a subtotal and removal that can be undone.',
  notFor: 'Collecting shipping and payment: use CheckoutForm.',
  dos: [
    'Pass onRestore, so a removal can be undone.',
    "Store prices in the currency's smallest unit (cents for EUR).",
    'Put the cart in a Sheet on narrow screens. The Undo toast shows inside it.',
    'Remove a line on the page, then open a sheet: the Undo toast moves into the sheet and still works there.',
    "Expect Undo pressed there to leave focus on the sheet's own toast list, inside its focus trap (the sheet keeps keyboard focus inside itself), never on the page body. The page's cart is hidden and can't take it.",
  ],
  donts: [
    "Don't let a quantity reach zero. Remove is how a line leaves.",
    "Don't remove a line without telling the cart. It's controlled: it shows only the lines you pass in.",
  ],
}
