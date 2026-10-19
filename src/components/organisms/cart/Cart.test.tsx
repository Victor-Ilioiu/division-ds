import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { type LinkRenderProps } from '../../../lib/render-link'
import { Toaster } from '../../molecules'
import { Button } from '../../atoms'
import { Sheet, SheetContent, SheetTrigger } from '../sheet/Sheet'
import { Cart, type CartLine } from './Cart'

const LINES: CartLine[] = [
  { id: 'kestrel-c', name: 'Kestrel C carbine replica', detail: 'Black', unitPrice: 13900, quantity: 1 },
  { id: 'prism-holo-sight', name: 'Prism holo sight', unitPrice: 4900, quantity: 2 },
  { id: 'beam-600', name: 'Beam 600 rail light', unitPrice: 2400, quantity: 1 },
]

function Harness({ initial = LINES, undo = true }: { initial?: CartLine[]; undo?: boolean }) {
  const [lines, setLines] = useState(initial)
  return (
    <Cart
      lines={lines}
      onQuantityChange={(id, quantity) => setLines(all => all.map(l => (l.id === id ? { ...l, quantity } : l)))}
      onRemove={id => setLines(all => all.filter(l => l.id !== id))}
      onRestore={undo ? (line, index) => setLines(all => [...all.slice(0, index), line, ...all.slice(index)]) : undefined}
    />
  )
}

const renderCart = (ui = <Harness />) => render(<Toaster>{ui}</Toaster>)
const removeButton = (name: string) => screen.getByRole('button', { name: `Remove ${name}` })

describe('Cart', () => {
  it('is a region named by its heading, listing each line with a named quantity', () => {
    renderCart()
    const cart = screen.getByRole('region', { name: 'Cart' })
    expect(within(cart).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('spinbutton', { name: 'Prism holo sight quantity' })).toHaveValue('2')
    expect(screen.getByText('4 items')).toBeInTheDocument()
  })

  it('totals each line and the cart', () => {
    renderCart()
    expect(screen.getByText('€98.00', { exact: false })).toHaveTextContent('Line total: €98.00')
    expect(screen.getByRole('status')).toHaveTextContent('Subtotal €261.00')
  })

  // The sr-only status and its sighted visual twin both render a "Subtotal" span, so the DOM has
  // two -- exactly one of them may be in the accessibility tree, or the figure gets announced
  // twice. Mutation: drop aria-hidden from the twin's <p>; both spans then have no aria-hidden
  // ancestor, and `accessible` grows to 2.
  it('exposes exactly one accessible "Subtotal" node; the visual twin stays aria-hidden', () => {
    renderCart()
    const matches = screen.getAllByText('Subtotal')
    expect(matches).toHaveLength(2)
    const accessible = matches.filter(el => !el.closest('[aria-hidden="true"]'))
    expect(accessible).toHaveLength(1)
  })

  // Mutation: put the `role="status"` paragraph back inside the non-empty-only branch (its
  // original position). While the cart is empty there is then no status node at all, so
  // `screen.getByRole('status')` throws before the Undo click ever runs.
  it('keeps the same subtotal status node from empty to restored, so the change is announced', async () => {
    function SingleLineHarness() {
      const [lines, setLines] = useState<CartLine[]>([LINES[0]])
      return (
        <Cart
          lines={lines}
          onQuantityChange={(id, quantity) => setLines(all => all.map(l => (l.id === id ? { ...l, quantity } : l)))}
          onRemove={id => setLines(all => all.filter(l => l.id !== id))}
          onRestore={(line, index) => setLines(all => [...all.slice(0, index), line, ...all.slice(index)])}
        />
      )
    }
    renderCart(<SingleLineHarness />)
    const cart = screen.getByRole('region', { name: 'Cart' })
    await userEvent.click(removeButton('Kestrel C carbine replica'))
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
    // Scoped to the cart: a toast is showing too, and Radix's own announcer is also role="status".
    const status = within(cart).getByRole('status')
    expect(status).toHaveTextContent('')
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(status).toHaveTextContent('Subtotal €139.00'))
    expect(within(cart).getByRole('status')).toBe(status)
  })

  it('updates the subtotal when a quantity changes', async () => {
    renderCart()
    screen.getByRole('spinbutton', { name: 'Prism holo sight quantity' }).focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('status')).toHaveTextContent('Subtotal €310.00')
  })

  it('keeps a quantity being typed with its own line when the caller changes the lines underneath it', async () => {
    const onQuantityChange = vi.fn()
    const cart = (lines: CartLine[]) => (
      <Toaster>
        <Cart lines={lines} onQuantityChange={onQuantityChange} onRemove={() => {}} />
      </Toaster>
    )
    const { rerender } = render(cart(LINES))
    const sight = screen.getByRole('spinbutton', { name: 'Prism holo sight quantity' })
    await userEvent.clear(sight)
    await userEvent.type(sight, '7')
    // The first line leaves from somewhere else (another tab, a server push) while the draft is open.
    rerender(cart(LINES.slice(1)))
    await userEvent.tab()
    expect(onQuantityChange).toHaveBeenCalledWith('prism-holo-sight', 7)
    // Not `toEqual([['prism-holo-sight', 7]])`: that pins the exact call count, which rides on jsdom firing
    // exactly one blur on the tab-away. The hazard this test exists to catch is the draft landing
    // on the wrong line, not how many times the field committed -- so assert that directly.
    expect(onQuantityChange).not.toHaveBeenCalledWith('beam-600', expect.anything())
    expect(screen.getByRole('spinbutton', { name: 'Beam 600 rail light quantity' })).toHaveValue('1')
  })

  it('moves focus to the next line after a removal, then the previous, then the heading', async () => {
    renderCart()
    await userEvent.click(removeButton('Kestrel C carbine replica'))
    expect(removeButton('Prism holo sight')).toHaveFocus()
    await userEvent.click(removeButton('Beam 600 rail light'))
    expect(removeButton('Prism holo sight')).toHaveFocus()
    await userEvent.click(removeButton('Prism holo sight'))
    expect(screen.getByRole('heading', { name: 'Cart' })).toHaveFocus()
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
  })

  // A harness whose onRestore reinserts at the removed index (the shared Harness above) cannot
  // fail the "restored focus keyed by id, not by index" mutation: when a line comes straight back
  // to the slot it left, the index it was removed from and the index it is restored to are the
  // same number, so a by-index bug reads as correct by coincidence. This harness appends instead,
  // so Undo puts the line somewhere other than where remove() last saw it -- and an earlier,
  // unrelated removal first shifts every later index by one, so a by-index bug would also have to
  // get the WRONG number right twice by accident. That earlier removal's own toast is left
  // showing, Undo unused; the assertion below is on the second removal only, not the first -- that
  // one is already covered by "moves focus to the next line after a removal, then the previous,
  // then the heading".
  it('offers Undo, which puts the line back and focuses it, even when the restore lands somewhere else', async () => {
    function AppendingHarness() {
      const [lines, setLines] = useState(LINES)
      return (
        <Cart
          lines={lines}
          onQuantityChange={(id, quantity) => setLines(all => all.map(l => (l.id === id ? { ...l, quantity } : l)))}
          onRemove={id => setLines(all => all.filter(l => l.id !== id))}
          onRestore={line => setLines(all => [...all, line])}
        />
      )
    }
    renderCart(<AppendingHarness />)
    await userEvent.click(removeButton('Kestrel C carbine replica'))
    await userEvent.click(removeButton('Prism holo sight'))
    const toast = screen.getByText('Removed Prism holo sight').closest('li') as HTMLElement
    await userEvent.click(within(toast).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(removeButton('Prism holo sight')).toHaveFocus())
    const order = screen.getAllByRole('spinbutton').map(field => field.getAttribute('aria-label'))
    expect(order).toEqual(['Beam 600 rail light quantity', 'Prism holo sight quantity'])
  })

  // The appending test above proves Undo focuses the restored line by id; it never asserts on the
  // *index* passed to onRestore, since its own onRestore ignores that argument. This uses the
  // shared Harness instead, which reinserts the line AT the index it is given -- so the final
  // order only comes out right if the real index `remove()` captured reached onRestore.
  // Mutation: hardcode `onRestore(line, 0)` in Cart.tsx's `remove` in place of the captured
  // `index` -- Prism holo sight reinserts at the front instead of the middle, and this fails.
  it('passes onRestore the index the line was actually removed from', async () => {
    renderCart()
    await userEvent.click(removeButton('Prism holo sight'))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(removeButton('Prism holo sight')).toHaveFocus())
    const order = screen.getAllByRole('spinbutton').map(field => field.getAttribute('aria-label'))
    expect(order).toEqual(['Kestrel C carbine replica quantity', 'Prism holo sight quantity', 'Beam 600 rail light quantity'])
  })

  it('offers no Undo without onRestore', async () => {
    renderCart(<Harness undo={false} />)
    await userEvent.click(removeButton('Kestrel C carbine replica'))
    expect(await screen.findByText('Removed Kestrel C carbine replica')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('does not move focus later for a removal the parent declined', async () => {
    function Declining() {
      const [lines, setLines] = useState(LINES)
      return (
        <>
          <button type="button" onClick={() => setLines(all => all.slice(1))}>
            Drop the first line
          </button>
          <Cart
            lines={lines}
            onQuantityChange={(id, quantity) => setLines(all => all.map(l => (l.id === id ? { ...l, quantity } : l)))}
            onRemove={() => {}}
          />
        </>
      )
    }
    renderCart(<Declining />)
    await userEvent.click(removeButton('Beam 600 rail light'))
    screen.getByRole('spinbutton', { name: 'Prism holo sight quantity' }).focus()
    await userEvent.keyboard('{ArrowUp}')
    const drop = screen.getByRole('button', { name: 'Drop the first line' })
    await userEvent.click(drop)
    expect(drop).toHaveFocus()
  })

  // The previous test's in-cart action (an ArrowUp on a spinbutton) bubbles to the section either
  // way, so it cannot tell a capture-phase clear from a bubble-phase one. This one exercises the
  // actual reason the clear has to be capture-phase: a caller's renderLink can stop propagation on
  // its own element, and only a capture-phase listener on the cart runs before that stopPropagation
  // call ever takes effect.
  // Mutation: change onKeyDownCapture/onPointerDownCapture to onKeyDown/onPointerDown in Cart.tsx
  // -- the stopping link's keydown never reaches the section's clear, the wait stays armed, and
  // this fails the same way the previous test would if capture-phase clearing were dropped outright.
  it('clears a pending removal even when a renderLink stops propagation', async () => {
    const stoppingLink = ({ href, className, children }: LinkRenderProps) => (
      <a
        href={href}
        className={className}
        onPointerDown={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
      >
        {children}
      </a>
    )
    function DecliningWithStoppingLink() {
      const [lines, setLines] = useState<CartLine[]>(LINES.map(line => ({ ...line, href: `#${line.id}` })))
      return (
        <>
          <button type="button" onClick={() => setLines(all => all.slice(1))}>
            Drop the first line
          </button>
          <Cart
            lines={lines}
            onQuantityChange={(id, quantity) => setLines(all => all.map(l => (l.id === id ? { ...l, quantity } : l)))}
            onRemove={() => {}}
            renderLink={stoppingLink}
          />
        </>
      )
    }
    renderCart(<DecliningWithStoppingLink />)
    await userEvent.click(removeButton('Beam 600 rail light'))
    screen.getByRole('link', { name: 'Prism holo sight' }).focus()
    await userEvent.keyboard('x')
    const drop = screen.getByRole('button', { name: 'Drop the first line' })
    await userEvent.click(drop)
    expect(drop).toHaveFocus()
  })

  // A hidden section is never a valid focus target, whatever the browser or test environment does
  // with it: rather than reading `document.activeElement` afterwards (which jsdom's own FocusScope
  // can pull back before the assertion runs, whether or not the fix is present), a listener on the
  // cart records whether anything inside it was ever a focus target during the flow.
  it('leaves focus in an open sheet when Undo there restores a line on the page behind it', async () => {
    function PageCartAndSheet() {
      const [lines, setLines] = useState(LINES)
      return (
        <>
          <Cart
            lines={lines}
            onQuantityChange={() => {}}
            onRemove={id => setLines(all => all.filter(l => l.id !== id))}
            onRestore={(line, index) => setLines(all => [...all.slice(0, index), line, ...all.slice(index)])}
          />
          <Sheet>
            <SheetTrigger asChild>
              <Button>Open filters</Button>
            </SheetTrigger>
            <SheetContent title="Filters">
              <p>No filters yet.</p>
            </SheetContent>
          </Sheet>
        </>
      )
    }
    renderCart(<PageCartAndSheet />)
    const cart = screen.getByRole('region', { name: 'Cart' })
    await userEvent.click(removeButton('Kestrel C carbine replica'))
    // The removal's own focus move, inside the cart, is expected: it must land before the listener
    // below starts recording, or it would read as the very thing this test is proving didn't happen.
    await waitFor(() => expect(removeButton('Prism holo sight')).toHaveFocus())
    const focusins: FocusEvent[] = []
    cart.addEventListener('focusin', event => focusins.push(event))
    await userEvent.click(screen.getByRole('button', { name: 'Open filters' }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    await userEvent.click(await within(sheet).findByRole('button', { name: 'Undo' }))
    const hiddenCart = screen.getByRole('region', { name: 'Cart', hidden: true })
    await waitFor(() => expect(within(hiddenCart).getAllByRole('listitem', { hidden: true })).toHaveLength(3))
    expect(focusins).toHaveLength(0)
  })

  it('forwards a ref to the section', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Toaster>
        <Cart ref={ref} lines={LINES} onQuantityChange={() => {}} onRemove={() => {}} />
      </Toaster>
    )
    expect(ref.current).toBe(screen.getByRole('region', { name: 'Cart' }))
  })

  it('is axe clean', async () => {
    const { container } = renderCart()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
