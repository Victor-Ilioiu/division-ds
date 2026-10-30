import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { SessionProvider } from '../store/session'
import { Pricing } from './Pricing'

/** The current search string, mounted alongside the routed page -- the same "read what the page
 *  itself just wrote" shape as shop/Shop.test.tsx's CartProbe, but for the URL rather than the
 *  cart store. */
function SearchProbe() {
  const location = useLocation()
  // aria-hidden: `<output>`'s own implicit role is "status" (HTML-AAM), which would otherwise
  // collide with the page's own billing-announcement region in a `getByRole('status')` query.
  return (
    <output data-testid="search" aria-hidden="true">
      {location.search}
    </output>
  )
}

function renderPage({ user }: { user?: { name: string; email: string } } = {}) {
  if (user) {
    sessionStorage.setItem('hexline-session', JSON.stringify({ user, pendingEmail: null }))
  }
  return render(
    <MemoryRouter initialEntries={['/store/care']}>
      <SessionProvider>
        <Routes>
          <Route
            path="/store/care"
            element={
              <>
                <Pricing />
                <SearchProbe />
              </>
            }
          />
        </Routes>
      </SessionProvider>
    </MemoryRouter>
  )
}

/** The computed accessible text of `el`: its own text content with every `aria-hidden` descendant
 *  removed first. jsdom's `textContent` does not know about `aria-hidden` at all (it is a plain
 *  DOM read, not an accessibility-tree one), so a naive `toHaveTextContent` on the price paragraph
 *  would include the hidden "/mo" glyph and miss the exact phrase a screen reader actually
 *  announces. */
function accessibleText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove())
  return clone.textContent ?? ''
}

const billingSwitch = () => screen.getByRole('switch', { name: 'Bill annually (2 months free)' })
const searchValue = () => screen.getByTestId('search').textContent

afterEach(() => {
  sessionStorage.clear()
})

describe('Pricing', () => {
  // Mutation: change TierCard's badge condition from `tier.recommended ?` to `false ?` -> the
  // last assertion below fails, since "Most chosen" never renders anywhere.
  it('renders the Hexline Care heading, its three tier names and the recommended badge', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Basic' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Field' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Squad' })).toBeInTheDocument()
    expect(screen.getByText('Most chosen')).toBeInTheDocument()
  })

  // `div`, not the Badge atom's own `span` (which carries this same fixed-height class on its
  // own, one only, regardless of this fix) -- this counts the three wrapper rows this fix adds.
  // Mutation: put `tier.recommended ?` straight back around the Badge, with no reserved wrapper
  // div -> only the "Field" tier (the recommended one) has a wrapper at all, and the count below
  // drops from 3 to 0.
  it('reserves the badge row at a fixed height on every tier card, not only the recommended one', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('div[class~="h-[22px]"]')).toHaveLength(3)
  })

  // Mutation: change Price's sr-only suffix from `' per month'` to `''` -> the accessible text
  // becomes "€4.00", and the assertion below fails.
  it('a monthly price reads as an accessible "N euros per month" phrase', () => {
    renderPage()
    const basicCard = screen.getByRole('heading', { level: 2, name: 'Basic' }).closest('article')!
    const price = within(basicCard).getByText('€4.00', { exact: false })
    expect(accessibleText(price)).toBe('€4.00 per month')
  })

  // Mutation: drop the `checked`/`onCheckedChange` wiring from Pricing's Switch (render it
  // uncontrolled) -> the URL never gains `billing=annual` and this fails on the first assertion.
  it('the billing switch writes ?billing=annual and re-renders the annual price', async () => {
    renderPage()
    expect(searchValue()).toBe('')
    const basicCard = screen.getByRole('heading', { level: 2, name: 'Basic' }).closest('article')!
    expect(within(basicCard).getByText('€4.00', { exact: false })).toBeInTheDocument()

    await userEvent.click(billingSwitch())

    expect(searchValue()).toBe('?billing=annual')
    // 10 x the monthly price (two months free), per content.ts's CARE catalogue.
    expect(within(basicCard).getByText('€40.00', { exact: false })).toBeInTheDocument()
    expect(within(basicCard).queryByText('€4.00', { exact: false })).not.toBeInTheDocument()
  })

  // Mutation: mount the status paragraph only after a click (`{annual && <p role="status">...`)
  // instead of always -- the region does not exist yet at the moment the text would first change,
  // so a screen reader user never hears the first announcement. Caught here, not in axe: axe has
  // no opinion on when a live region mounts, only on whether one exists at all.
  it('a persistent status announces which billing period is showing', async () => {
    renderPage()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Showing monthly prices')
    await userEvent.click(billingSwitch())
    expect(status).toHaveTextContent('Showing annual prices')
  })

  // Mutation: point the CTA at '/store/create-account' unconditionally, ignoring `useSession()`'s
  // `user` -> the second assertion below fails for a signed-in render.
  it('the CTA goes to create-account signed out, and to the account page signed in', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Get started with Basic' })).toHaveAttribute(
      'href',
      '/store/create-account'
    )
    renderPage({ user: { name: 'Alex', email: 'alex@hexline.test' } })
    expect(screen.getAllByRole('link', { name: 'Get started with Basic' })[1]).toHaveAttribute(
      'href',
      '/store/account'
    )
  })

  // Mutation: render the comparison table's tier headers as `<td>` instead of `<th scope="col">`
  // -> `columnheader` drops to 1 (only "Feature") and the assertion fails.
  it('the comparison table has a caption, column headers and row headers', () => {
    renderPage()
    const table = screen.getByRole('table')
    // Same text as the visible "Compare plans" heading above the table, not a second phrase --
    // see Pricing.tsx's own comment on its caption.
    expect(within(table).getByText('Compare plans')).toBeInTheDocument()
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
      'Feature',
      'Basic',
      'Field',
      'Squad',
    ])
    expect(within(table).getAllByRole('rowheader')[0]).toHaveTextContent('Chrono check with every service')
  })

  // Mutation: drop `sr-only` from the caption's className -> the caption's own text becomes a
  // second, visible "Compare plans" sitting right under the real `<h2>` of the same name, and the
  // class assertion below fails.
  it('keeps the table caption visually hidden, screen-reader only', () => {
    const { container } = renderPage()
    const caption = container.querySelector('caption')!
    expect(caption).toHaveClass('sr-only')
    expect(caption).toHaveTextContent('Compare plans')
  })

  // `[style*=...]`, not a class -- `.crosshair` alone is Card's own decorative corner-mark
  // utility (every tier card carries it), not specific to the removed placeholder; the
  // `repeating-linear-gradient` inline background was that placeholder's own, only.
  // Mutation: put the hatched placeholder div back in the page header -> this query finds it and
  // the assertion fails.
  it('has no leftover hatched placeholder band', () => {
    const { container } = renderPage()
    expect(container.querySelector('[style*="repeating-linear-gradient"]')).toBeNull()
  })

  // Mutation: move the billing switch back into the page header, away from the "Plans" heading
  // it actually controls -> the switch is no longer a sibling of that heading's own row and the
  // `within` query below finds nothing.
  it('places the billing switch next to the "Plans" heading it controls', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 2, name: 'Plans' })
    const row = heading.parentElement!
    expect(within(row).getByRole('switch', { name: 'Bill annually (2 months free)' })).toBeInTheDocument()
  })

  // Mutation: drop the sr-only span from `Included` and render only the glyph -> the row still
  // shows "✓" visually but a screen reader hears nothing that says "included", and the assertion
  // below (which reads the accessible text, not the raw glyph) fails.
  it('each included/not-included mark carries a visually hidden word', () => {
    renderPage()
    const table = screen.getByRole('table')
    const loanerRow = within(table).getByRole('rowheader', { name: 'Loaner replica while yours is in service' })
      .closest('tr')!
    const cells = within(loanerRow).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('Not included')
    expect(cells[2]).toHaveTextContent('Included')
  })

  // Mutation: render `<summary>` without the `group`/`open:` wiring, i.e. a `<div onClick>`
  // instead of a real `<details>` -- a real click still "works" visually, but `.open` never
  // exists as a DOM property, so `toBeInTheDocument`-style access below would throw instead of
  // reading `false`/`true`. Native `<details>` is what makes the FAQ operable from the keyboard
  // for free; this proves the element really is one.
  it('a click on an FAQ summary opens its native <details>', async () => {
    renderPage()
    const item = screen.getByText('Can I cancel any time?').closest('details') as HTMLDetailsElement
    expect(item.open).toBe(false)
    await userEvent.click(screen.getByText('Can I cancel any time?'))
    expect(item.open).toBe(true)
  })

  // Mutation: drop `htmlFor` from the billing Switch's label -> axe reports a real
  // `button-name` violation on the switch (Radix's SwitchTrigger renders a plain `<button>`
  // with no accessible name of its own once the label stops pointing at it).
  it('is axe clean', async () => {
    const { container } = renderPage()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
