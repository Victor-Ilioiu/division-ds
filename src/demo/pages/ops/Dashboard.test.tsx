import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '../../../components/atoms/tooltip/Tooltip'
import { Toaster } from '../../../components/molecules/toast/Toast'
import { axeClean } from '../../../test/axe'
import { lowStock, inventoryFromCatalog, RECENT_ORDERS, setOpsLatency } from './data'
import { Dashboard } from './Dashboard'

function InventoryStub() {
  const location = useLocation()
  return <h1>Inventory stub {location.search}</h1>
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/demo/ops']}>
      <TooltipProvider>
        <Toaster>
          <Routes>
            <Route path="/demo/ops" element={<Dashboard />} />
            <Route path="/demo/ops/inventory" element={<InventoryStub />} />
          </Routes>
        </Toaster>
      </TooltipProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => setOpsLatency(0))
afterEach(() => setOpsLatency(600))

describe('Ops dashboard', () => {
  // Mutation: start `loaded` true in Dashboard.tsx regardless of latency -> the busy group never
  // renders and the first assertion fails.
  it('shows a skeleton while the first load runs, then the content', async () => {
    setOpsLatency(30)
    renderDashboard()
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    // The Refresh button is busy too (it is the same load), so the group is found by its label.
    expect(screen.getByText('Loading the dashboard').closest('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Refresh/ })).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('table', { name: 'Recent orders' })).toBeInTheDocument()
    expect(screen.queryByText('Loading the dashboard')).toBeNull()
  })

  it('renders the stats, the orders, the low-stock list and the team on shift', async () => {
    renderDashboard()
    expect(screen.getByText('Orders today')).toBeInTheDocument()
    expect(screen.getByText('Items to reorder')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Recent orders' })
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map(cell => cell.textContent),
    ).toEqual(RECENT_ORDERS.map(order => order.id))
    const lowList = screen.getByRole('list', { name: 'Low on stock' })
    expect(within(lowList).getAllByRole('listitem')).toHaveLength(lowStock(inventoryFromCatalog()).length)
    expect(screen.getByRole('list', { name: /On shift, 5 members/ })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Revenue, last 14 days' }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  // Mutation: drop the `reordered` swap in DashboardBody -> the button stays and the badge query fails.
  it('reorders an item: the button goes busy, a toast confirms, a badge replaces the button', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(
      screen.getByRole('button', {
        name: 'Reorder Harrier LR bolt-action replica',
      }),
    )
    expect(await screen.findByText('Reorder sent')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Reorder Harrier LR bolt-action replica',
      }),
    ).toBeNull()
    expect(screen.getByText('Reordered')).toBeInTheDocument()
  })

  it('says when a refresh has finished', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText('Dashboard refreshed.')).toBeInTheDocument()
  })

  it('links to the inventory already filtered to low stock', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('link', { name: 'View in inventory' }))
    expect(
      await screen.findByRole('heading', {
        name: 'Inventory stub ?status=low',
      }),
    ).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderDashboard()
    await screen.findByRole('heading', { name: 'Units sold by category' }, { timeout: 5000 })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
