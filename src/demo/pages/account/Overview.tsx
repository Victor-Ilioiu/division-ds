import { lazy, Suspense } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { linkVariants } from '../../../components/atoms/link/Link'
import { Stat } from '../../../components/molecules/stat/Stat'
import { DataTable, sortRows, type DataTableColumn } from '../../../components/organisms/data-table/DataTable'
import { formatMoney } from '../../../lib/money'
import { RequireSession } from '../../RequireSession'
import { ORDERS, ordersByMonth, SERVICES_BOOKED, type Order } from '../../store/orders'
import { AccountLayout } from './AccountLayout'

// SpendChart, not ChartPanel directly: ChartPanel is generic (`ChartPanel<Row>`), and `lazy()`
// erases a generic component's own type parameter, resolving the module as a plain
// `ComponentType<unknown>` -- the same reason App.tsx lazy-loads the concrete, non-generic
// ChartPanelDocs rather than ChartPanel itself. SpendChart is a one-shot, concretely-typed
// wrapper (see its own file) that keeps ChartPanel's own deep import (Recharts is the one thing
// in this app that pulls it in) behind this lazy boundary, so no other account page's bundle
// pays for it.
const SpendChart = lazy(() => import('./SpendChart').then(module => ({ default: module.SpendChart })))

/** Same reasoning as App.tsx's own ChartPanelDocsFallback: this mounts already holding its text,
 *  on the first render of this page, so there is nothing for a live region to announce a change
 *  to. */
function ChartFallback() {
  return <p className="font-body text-sm text-[var(--color-text-secondary)]">Loading…</p>
}

// No `sortValue` on any column: this is a fixed, three-row preview, already sorted (most recent
// first, below) -- a sortable "Date" header here would silently re-order it under the reader's
// own click, with no page-size or filter to make sense of "sorted by what, out of how many". The
// full history at "View all orders" (Orders.tsx's own COLUMNS) is where sorting belongs.
const RECENT_COLUMNS: DataTableColumn<Order>[] = [
  { key: 'id', header: 'Order', cell: order => order.id },
  { key: 'date', header: 'Date', cell: order => order.date },
  { key: 'status', header: 'Status', cell: order => order.status },
  { key: 'total', header: 'Total', numeric: true, cell: order => formatMoney(order.totalCents) },
]

function OverviewBody() {
  // "in 2026" is a stated fact on screen (the three Stat labels below), not just today's
  // incidental shape of the fixed table -- filtering explicitly is what keeps that claim true if
  // this table ever grows a row from a different year, rather than trusting every row already
  // happens to be one.
  const ordersIn2026 = ORDERS.filter(order => order.date.startsWith('2026-'))
  const totalCents = ordersIn2026.reduce((sum, order) => sum + order.totalCents, 0)
  const recent = sortRows(ordersIn2026, order => order.date, 'descending').slice(0, 3)
  const chartData = ordersByMonth()

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat label="Orders in 2026" value={ordersIn2026.length} />
        <Stat label="Spent in 2026" value={formatMoney(totalCents)} />
        <Stat label="Services booked in 2026" value={SERVICES_BOOKED} />
      </div>

      <Suspense fallback={<ChartFallback />}>
        <SpendChart data={chartData} />
      </Suspense>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">Recent orders</h2>
          <RouterLink to="/store/account/orders" className={linkVariants()}>
            View all orders
          </RouterLink>
        </div>
        <DataTable
          caption="Recent orders"
          hideCaption
          columns={RECENT_COLUMNS}
          rows={recent}
          getRowId={order => order.id}
          rowHeader="id"
        />
      </div>
    </div>
  )
}

export function Overview() {
  return (
    <RequireSession>
      <AccountLayout>
        <OverviewBody />
      </AccountLayout>
    </RequireSession>
  )
}
