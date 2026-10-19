import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Cart.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { Sheet, SheetContent, SheetTrigger } from '../sheet/Sheet'
import { Cart, type CartLine } from './Cart'

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

/** The lines, and the three handlers a controlled Cart needs, over local state. */
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

export function CartDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="In the page" className="block">
        <InThePageExample />
      </Example>

      <Example caption="In a sheet">
        <InASheetExample />
      </Example>

      <Example caption="Empty" className="block">
        <Cart lines={[]} onQuantityChange={() => {}} onRemove={() => {}} headingLevel={4} title="Saved for later" />
      </Example>
    </ComponentDocs>
  )
}
