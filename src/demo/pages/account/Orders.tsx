import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/atoms/button/Button'
import { Select, type SelectOption } from '../../../components/atoms/select/Select'
import { FormField } from '../../../components/molecules/form-field/FormField'
import { Pagination } from '../../../components/molecules/pagination/Pagination'
import { DataTable, sortRows, type DataTableColumn, type DataTableSort, type SortDirection } from '../../../components/organisms/data-table/DataTable'
import { formatMoney } from '../../../lib/money'
import { RequireSession } from '../../RequireSession'
import { EmptyState } from '../../states/EmptyState'
import { ORDERS, type Order, type OrderStatus } from '../../store/orders'
import { AccountLayout } from './AccountLayout'

const PAGE_SIZE = 5

const STATUS_VALUES: readonly OrderStatus[] = ['Delivered', 'Shipped', 'Processing', 'Returned']

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All statuses' },
  ...STATUS_VALUES.map(status => ({ value: status, label: status })),
]

const COLUMNS: DataTableColumn<Order>[] = [
  { key: 'id', header: 'Order', cell: order => order.id },
  { key: 'date', header: 'Date', cell: order => order.date, sortValue: order => order.date },
  { key: 'items', header: 'Items', numeric: true, cell: order => String(order.items) },
  { key: 'status', header: 'Status', cell: order => order.status, sortValue: order => order.status },
  {
    key: 'total',
    header: 'Total',
    numeric: true,
    cell: order => formatMoney(order.totalCents),
    sortValue: order => order.totalCents,
  },
]

type SortKey = 'date' | 'total' | 'status'
const SORT_KEYS: readonly SortKey[] = ['date', 'total', 'status']
const DEFAULT_SORT: DataTableSort = { key: 'date', direction: 'descending' }

/** `sort=date-desc` -- the short direction spelling the URL carries, versus `DataTableSort`'s own
 *  `ascending`/`descending`. Never throws on a malformed value: an unknown key, an unknown
 *  direction, or a missing param all fall back to the default, the same defensiveness
 *  `filters.ts`'s own `parseFilters` uses for a shared or hand-edited shop link. */
function parseSort(raw: string | null): DataTableSort {
  if (!raw) return DEFAULT_SORT
  const dash = raw.lastIndexOf('-')
  if (dash < 0) return DEFAULT_SORT
  const key = raw.slice(0, dash)
  const dir = raw.slice(dash + 1)
  if (!SORT_KEYS.includes(key as SortKey)) return DEFAULT_SORT
  if (dir !== 'asc' && dir !== 'desc') return DEFAULT_SORT
  const direction: SortDirection = dir === 'asc' ? 'ascending' : 'descending'
  return { key, direction }
}

function sortToParam(sort: DataTableSort): string {
  return `${sort.key}-${sort.direction === 'ascending' ? 'asc' : 'desc'}`
}

function parsePage(raw: string | null): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

function isOrderStatus(value: string): value is OrderStatus {
  return (STATUS_VALUES as readonly string[]).includes(value)
}

function ordersLabel(n: number): string {
  return `${n} ${n === 1 ? 'order' : 'orders'}`
}

/**
 * Every order, sortable by date, total and status, filterable to one status, five rows a page --
 * all three held in the URL (`?status=&sort=date-desc&page=`) so a reload or a shared link
 * reproduces exactly what was on screen, the same reasoning the shop listing's own `filters.ts`
 * gives for doing this.
 *
 * `sortRows` (this table's own exported helper) runs once, over the full filtered list, to decide
 * which five rows belong on the current page; the slice handed to `DataTable` also carries the
 * same `sort`/`onSortChange` pair, so the header's own internal sort is a same-criteria no-op on
 * those five rows, not a second, possibly different order layered on top.
 *
 * Order ids render as plain text, never a link: there is no order-detail page for one to point
 * at.
 */
function OrdersBody() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status') ?? ''
  const status = isOrderStatus(statusParam) ? statusParam : ''
  const sort = parseSort(searchParams.get('sort'))
  const requestedPage = parsePage(searchParams.get('page'))
  const statusTriggerRef = useRef<HTMLButtonElement>(null)

  const filtered = status ? ORDERS.filter(order => order.status === status) : ORDERS
  const sortColumn = COLUMNS.find(column => column.key === sort.key)
  const sorted = sortRows(filtered, sortColumn?.sortValue, sort.direction)
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), pageCount)
  const start = (page - 1) * PAGE_SIZE
  const visible = sorted.slice(start, start + PAGE_SIZE)

  function update(patch: { status?: string; sort?: DataTableSort; page?: number }) {
    const next = new URLSearchParams(searchParams)
    if (patch.status !== undefined) {
      if (patch.status) next.set('status', patch.status)
      else next.delete('status')
    }
    if (patch.sort !== undefined) next.set('sort', sortToParam(patch.sort))
    if (patch.page !== undefined) {
      if (patch.page > 1) next.set('page', String(patch.page))
      else next.delete('page')
    }
    setSearchParams(next)
  }

  function handleStatusChange(value: string) {
    update({ status: value === 'all' ? '' : value, page: 1 })
  }

  function handleSortChange(next: DataTableSort) {
    // Same reasoning as a status filter change: a new sort re-orders the whole (filtered) list,
    // so a page number that made sense under the old order can land past the end of the new one,
    // or simply show a different, confusing five rows -- reset to page 1, same as `handleStatusChange`.
    update({ sort: next, page: 1 })
  }

  function handlePageChange(next: number) {
    update({ page: next })
  }

  // The Status trigger is what caused this: clicking it, then Clear filter (its own button, in
  // the EmptyState below) is a real filter->clear round trip, so focus goes back there rather
  // than falling to the body once EmptyState's own button leaves the DOM -- the same reasoning
  // Onboarding's own Retry button focuses Finish before it unmounts itself. The trigger element
  // survives this call unconditionally: it renders above the empty-state/table split below, never
  // inside either branch.
  function clearFilter() {
    update({ status: '', page: 1 })
    statusTriggerRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Status" className="max-w-xs">
        <Select
          ref={statusTriggerRef}
          label="Status"
          options={STATUS_OPTIONS}
          value={status || 'all'}
          onValueChange={handleStatusChange}
        />
      </FormField>
      {/* Always the count, including zero: a filter that narrows to nothing still gets an
          explicit "0 orders" here, on top of the EmptyState's own message below, rather than a
          blank status line that reads as though the count itself never rendered. */}
      <p role="status" className="min-h-4 font-mono text-xs text-[var(--color-text-secondary)]">
        {ordersLabel(filtered.length)}
      </p>
      {filtered.length === 0 ? (
        <EmptyState
          title="No orders match that status."
          action={
            <Button variant="secondary" onClick={clearFilter}>
              Clear filter
            </Button>
          }
        >
          Try a different status, or clear the filter to see every order.
        </EmptyState>
      ) : (
        <>
          <DataTable
            caption="Orders"
            hideCaption
            columns={COLUMNS}
            rows={visible}
            getRowId={order => order.id}
            rowHeader="id"
            sort={sort}
            onSortChange={handleSortChange}
          />
          <Pagination page={page} pageCount={pageCount} onPageChange={handlePageChange} label="Pagination, orders" />
        </>
      )}
    </div>
  )
}

export function Orders() {
  return (
    <RequireSession>
      <AccountLayout>
        <OrdersBody />
      </AccountLayout>
    </RequireSession>
  )
}
