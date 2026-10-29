# Cart

> The lines someone means to buy, with quantities, line totals and a subtotal that screen readers announce as it changes. Removing a line can be undone, and focus (where keyboard input goes) is never lost.

- **Best for:** The lines someone means to buy: quantities, line totals, a subtotal and removal that can be undone.
- **Not for:** Collecting shipping and payment: use CheckoutForm.
- Organism. Source: `src/components/organisms/cart/Cart.tsx`
- Rendered docs page: `/components/cart`

## Import

```tsx
import { Cart } from 'src/components/organisms/cart/Cart'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `lines` | `CartLine[]` |  | Required. The cart doesn't keep any lines of its own. |
| `onQuantityChange` | `(id: string, quantity: number) => void` |  | Required. Called when a line's QuantityStepper changes. |
| `onRemove` | `(id: string) => void` |  | Required. Called when Remove is pressed. |
| `onRestore` | `(line: CartLine, index: number) => void` |  | Puts a removed line back at its old position. When you pass it, the removal toast offers Undo. |
| `title` | `string` | `'Cart'` | The heading's text, and the cart's accessible name (the name a screen reader announces). |
| `headingLevel` | `2 \| 3 \| 4` | `2` | Match the page's heading outline. |
| `emptyMessage` | `string` | `'Your cart is empty.'` | Shown in place of the list. |
| `footer` | `ReactNode` |  | Under the subtotal, such as a checkout button. Hidden while the cart's empty. |
| `currency` | `string` | `'EUR'` | Passed to formatMoney. |
| `locale` | `string` | `'en-IE'` | Passed to formatMoney. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` | `a plain anchor` | Draws a line name that has an href. |
| `className` | `string` |  | Merged with the root classes. Later Tailwind utilities win. |
| `ref` | `Ref<HTMLElement>` |  | The section. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type CartLine = {
  /** Unique within lines: rows are keyed by it, and callbacks identify lines by it. */
  id: string
  name: string
  href?: string
  /** Size, colour and the like: "Size M · Ember". */
  detail?: string
  /** In the currency's minor unit (cents for EUR). */
  unitPrice: number
  quantity: number
  /** @default 99 */
  maxQuantity?: number
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### In the page

```tsx
const LINES: CartLine[] = [
  { id: 'kestrel-c', name: 'Kestrel C carbine replica', href: '#kestrel-c', detail: 'Black', unitPrice: 13900, quantity: 1 },
  {
    id: 'prism-holo-sight',
    name: 'Prism holo sight',
    href: '#prism-holo-sight',
    unitPrice: 4900,
    quantity: 2,
  },
  { id: 'beam-600', name: 'Beam 600 rail light', href: '#beam-600', unitPrice: 2400, quantity: 1 },
]

function useCart(initial: CartLine[]) {
  const [lines, setLines] = useState(initial)
  return {
    lines,
    onQuantityChange: (id: string, quantity: number) =>
      setLines(all => all.map(line => (line.id === id ? { ...line, quantity } : line))),
    onRemove: (id: string) => setLines(all => all.filter(line => line.id !== id)),
    onRestore: (line: CartLine, index: number) => setLines(all => [...all.slice(0, index), line, ...all.slice(index)]),
  }
}

function InThePageExample() {
  const cart = useCart(LINES)
  return <Cart {...cart} title="Cart" headingLevel={4} footer={<Button>Check out</Button>} />
}

<InThePageExample />
```

### In a sheet

```tsx
const LINES: CartLine[] = [
  { id: 'kestrel-c', name: 'Kestrel C carbine replica', href: '#kestrel-c', detail: 'Black', unitPrice: 13900, quantity: 1 },
  {
    id: 'prism-holo-sight',
    name: 'Prism holo sight',
    href: '#prism-holo-sight',
    unitPrice: 4900,
    quantity: 2,
  },
  { id: 'beam-600', name: 'Beam 600 rail light', href: '#beam-600', unitPrice: 2400, quantity: 1 },
]

function useCart(initial: CartLine[]) {
  const [lines, setLines] = useState(initial)
  return {
    lines,
    onQuantityChange: (id: string, quantity: number) =>
      setLines(all => all.map(line => (line.id === id ? { ...line, quantity } : line))),
    onRemove: (id: string) => setLines(all => all.filter(line => line.id !== id)),
    onRestore: (line: CartLine, index: number) => setLines(all => [...all.slice(0, index), line, ...all.slice(index)]),
  }
}

function InASheetExample() {
  const cart = useCart(LINES)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open cart</Button>
      </SheetTrigger>
      <SheetContent title="Your cart">
        <Cart {...cart} title="Items" headingLevel={3} footer={<Button>Check out</Button>} />
      </SheetContent>
    </Sheet>
  )
}

<InASheetExample />
```

### Empty

```tsx
<Cart lines={[]} onQuantityChange={() => {}} onRemove={() => {}} headingLevel={4} title="Saved for later" />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through each line's link, quantity and Remove. |
| `↑` `↓` | On a quantity, steps it by one. |
| `Enter` | On Remove, removes the line. Focus moves to the next line. |
| `F8` | Jumps to the removal toast, so you can reach Undo. |

## Do

- Pass onRestore, so a removal can be undone.
- Store prices in the currency's smallest unit (cents for EUR).
- Put the cart in a Sheet on narrow screens. The Undo toast shows inside it.
- Remove a line on the page, then open a sheet: the Undo toast moves into the sheet and still works there.
- Expect Undo pressed there to leave focus on the sheet's own toast list, inside its focus trap (the sheet keeps keyboard focus inside itself), never on the page body. The page's cart is hidden and can't take it.

## Don't

- Don't let a quantity reach zero. Remove is how a line leaves.
- Don't remove a line without telling the cart. It's controlled: it shows only the lines you pass in.

## Anatomy

- **Heading**: Names the cart. Focus lands here once it's empty.
- **Line**: Name (a link when it has an href), detail, unit price, quantity, line total and Remove.
- **Quantity**: A QuantityStepper named '{name} quantity', starting at 1.
- **Remove**: A ghost icon button named 'Remove {name}'.
- **Subtotal**: A status line visible only to screen readers (sr-only), plus a visual twin. Screen readers announce the status as it changes. The twin, in tabular figures, is what sighted readers see, and it's aria-hidden (hidden from screen readers) so nothing is announced twice.
- **Footer**: Optional actions, such as Check out.
