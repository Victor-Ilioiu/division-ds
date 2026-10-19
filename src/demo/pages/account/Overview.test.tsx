import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { axeClean } from '../../../test/axe'
import { SessionProvider } from '../../store/session'
import { Overview } from './Overview'

function SignInStub() {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  return (
    <div>
      <h1>Hexline account</h1>
      {notice ? <p>{notice}</p> : null}
    </div>
  )
}

function OrdersStub() {
  return <h1>Orders stub</h1>
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/demo/account']}>
      <SessionProvider>
        <Routes>
          <Route path="/demo/account" element={<Overview />} />
          <Route path="/demo/account/orders" element={<OrdersStub />} />
          <Route path="/demo/sign-in" element={<SignInStub />} />
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

afterEach(() => {
  sessionStorage.clear()
})

describe('Overview', () => {
  it('redirects a signed-out visitor to sign-in', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeInTheDocument()
    expect(screen.getByText('Sign in to see your account.')).toBeInTheDocument()
  })

  // Mutation: change `ORDERS.length` in Overview.tsx's Stat to a hardcoded number -> this
  // assertion fails against the real order count.
  it('shows the account layout and the three stats, signed in', async () => {
    signIn()
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Your account' })).toBeInTheDocument()
    // Covers the whole account section (bio, name, default size, all live here too), not just
    // orders -- AccountLayout wraps Settings and Orders the same way it wraps this page.
    expect(screen.getByText('Everything in your account here is demo data.')).toBeInTheDocument()
    expect(screen.getByText('Orders in 2026')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('Services booked in 2026')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    // A generous timeout, not the default 1000ms: this is a real lazy import (SpendChart) behind
    // Suspense, and under a full parallel test-suite run the module can take longer to resolve
    // than a synchronous render ever would on its own.
    expect(await screen.findByRole('heading', { name: 'Spend per month' }, { timeout: 5000 })).toBeInTheDocument()
  })

  // The outline has nothing between AccountLayout's own h1 and this page's content, so a chart
  // heading at ChartPanel's own default level (3) would skip straight from 1 to 3.
  // Mutation: drop the `headingLevel={2}` prop from SpendChart.tsx's `<ChartPanel>` -> the query
  // below finds nothing, since the rendered heading is an h3.
  it('gives the chart heading a level that keeps the outline unbroken', async () => {
    signIn()
    renderApp()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Spend per month' }, { timeout: 5000 })
    ).toBeInTheDocument()
  })

  // Mutation: sort recent orders ascending instead of descending in Overview.tsx (flip
  // 'descending' to 'ascending') -> the most recent order (HX-100014) is no longer first, and the
  // row-header assertion below fails.
  it('lists the three most recent orders, most recent first', () => {
    signIn()
    renderApp()
    const table = screen.getByRole('table', { name: 'Recent orders' })
    const rowHeaders = within(table).getAllByRole('rowheader').map(cell => cell.textContent)
    expect(rowHeaders).toEqual(['HX-100014', 'HX-100013', 'HX-100012'])
  })

  // A fixed, three-row preview with no filter and no page size has nothing for a reader to sort
  // "by what, out of how many" -- Orders' own full list (COLUMNS) is where that control belongs.
  // Mutation: give RECENT_COLUMNS' `date` entry a `sortValue` again (Overview.tsx before this
  // fix) -- DataTable renders it as a sortable header the instant one exists, uncontrolled or
  // not, and the query below finds a button where it should find none.
  it('has no sortable headers', () => {
    signIn()
    renderApp()
    const table = screen.getByRole('table', { name: 'Recent orders' })
    expect(within(table).queryAllByRole('button')).toHaveLength(0)
  })

  // Mutation: change the "View all orders" link's `to` from '/demo/account/orders' to
  // '/demo/account' -> the Orders stub below never renders; the account page renders again instead.
  it('links to the full orders list', async () => {
    signIn()
    renderApp()
    await userEvent.click(screen.getByRole('link', { name: 'View all orders' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Orders stub' })).toBeInTheDocument()
  })

  it('is axe clean, signed in', async () => {
    signIn()
    const { container } = renderApp()
    await screen.findByRole('heading', { name: 'Spend per month' }, { timeout: 5000 })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
