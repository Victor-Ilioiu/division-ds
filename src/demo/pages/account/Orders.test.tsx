import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { axeClean } from '../../../test/axe'
import { SessionProvider } from '../../store/session'
import { Orders } from './Orders'

function renderApp(initialPath = '/store/account/orders') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionProvider>
        <Routes>
          <Route path="/store/account/orders" element={<Orders />} />
          <Route path="/store/sign-in" element={<h1>Hexline account</h1>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>
  )
}

function signIn() {
  sessionStorage.setItem(
    'hexline-session',
    JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
  )
}

const orderIds = () => screen.getAllByRole('rowheader').map(cell => cell.textContent)

afterEach(() => {
  sessionStorage.clear()
})

describe('Orders', () => {
  it('redirects a signed-out visitor to sign-in', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeInTheDocument()
  })

  // Mutation: change Orders.tsx's PAGE_SIZE from 5 to 14 -> the table shows all 14 orders on one
  // page and this assertion fails.
  it('shows five orders a page, newest first by default, with pagination', () => {
    signIn()
    renderApp()
    expect(orderIds()).toHaveLength(5)
    expect(orderIds()[0]).toBe('HX-100014')
    expect(screen.getByRole('navigation', { name: 'Pagination, orders' })).toBeInTheDocument()
  })

  // Mutation: drop the `page: 1` from Orders.tsx's `handleStatusChange` -- starting from page 3
  // (30 rows would be needed for that to exist, so instead the URL is seeded directly at page 3
  // of the unfiltered list) proves the reset actually happens, rather than only ever being
  // incidentally already on page 1.
  it('filters by status, resetting to page 1', async () => {
    signIn()
    renderApp('/store/account/orders?page=3')
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    await userEvent.click(screen.getByRole('option', { name: 'Delivered' }))
    expect(await screen.findByText('10 orders')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
  })

  // No order in the fixed table is ever 'Returned' (see orders.ts's own comment), so this is a
  // real user path to the empty branch, not a manual URL.
  // Mutation: change the empty-state condition in Orders.tsx from `filtered.length === 0` to
  // `sorted.length === 0` (identical today, since sortRows never drops rows) -> harmless, so this
  // isn't the mutation that proves the branch; the real one is dropping the `filtered.length ===
  // 0 ? <EmptyState ...> : <>...</>` ternary's guard entirely (always render the table) -> the
  // table then renders with zero rows and its own built-in "Nothing to show." message instead of
  // this page's own empty state and Clear filter action.
  it('shows an empty state with a working Clear filter for a status with no orders', async () => {
    signIn()
    renderApp()
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    await userEvent.click(screen.getByRole('option', { name: 'Returned' }))
    expect(await screen.findByText('No orders match that status.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(orderIds()).toHaveLength(5)
  })

  // No order in the fixed table is ever 'Returned' -- filtering to it is a real user path to a
  // genuinely empty list, the same one the empty-state test above already reaches.
  // Mutation: drop the `ternary` guard (revert to `filtered.length === 0 ? '' : ordersLabel(...)`)
  // -- the status line below goes back to reading empty instead of "0 orders".
  it('reads "0 orders" when a filter narrows the list to nothing', async () => {
    signIn()
    renderApp()
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    await userEvent.click(screen.getByRole('option', { name: 'Returned' }))
    expect(await screen.findByText('0 orders')).toBeInTheDocument()
  })

  // Mutation: drop the `page: 1` from Orders.tsx's `handleSortChange` -- seeded on page 3 of the
  // unfiltered list (14 rows, 5 a page), clicking Total leaves it on page 3 of the newly-sorted
  // list instead of resetting, and the `Page 1` assertion below fails.
  it('sorts, resetting to page 1', async () => {
    signIn()
    renderApp('/store/account/orders?page=3')
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Total' }))
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
  })

  it('sorts by total when the Total header is clicked, and the URL survives a reload', async () => {
    signIn()
    const { unmount } = renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Total' }))
    // HX-100009 (€54.00) is the cheapest order in the fixed table -- the first row once sorted
    // ascending by total, the direction a first click on an inactive column always starts at.
    expect(orderIds()[0]).toBe('HX-100009')
    unmount()

    // "Survives a reload" for a page backed by the URL means a fresh mount at that same URL
    // reproduces the same state -- there is no real reload inside jsdom, so a fresh render at the
    // captured path is the unit-level proof; the e2e reflow test covers an actual page.reload().
    renderApp('/store/account/orders?sort=total-asc')
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('renders order ids as plain text, never a link', () => {
    signIn()
    renderApp()
    expect(screen.queryByRole('link', { name: /HX-/ })).not.toBeInTheDocument()
  })

  it('is axe clean, signed in', async () => {
    signIn()
    const { container } = renderApp()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
