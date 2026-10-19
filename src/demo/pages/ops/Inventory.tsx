import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, PackageSearch, Trash2 } from 'lucide-react'
import { Badge } from '../../../components/atoms/badge/Badge'
import { Button } from '../../../components/atoms/button/Button'
import { Select, type SelectGroup } from '../../../components/atoms/select/Select'
import { EmptyState } from '../../../components/molecules/empty-state/EmptyState'
import { FormField } from '../../../components/molecules/form-field/FormField'
import { MultiSelect } from '../../../components/molecules/multi-select/MultiSelect'
import { PageHeader } from '../../../components/molecules/page-header/PageHeader'
import { Pagination } from '../../../components/molecules/pagination/Pagination'
import { Search } from '../../../components/molecules/search/Search'
import { useToast } from '../../../components/molecules/toast/Toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from '../../../components/organisms/alert-dialog/AlertDialog'
import {
  DataTable,
  sortRows,
  type DataTableColumn,
  type DataTableSort,
} from '../../../components/organisms/data-table/DataTable'
import { formatMoney } from '../../../lib/money'
import { CATEGORIES } from '../../store/catalog'
import {
  inventoryFromCatalog,
  opsRequest,
  STOCK_STATUS_LABEL,
  stockStatus,
  type InventoryItem,
  type StockStatus,
} from './data'
import { OpsLayout } from './OpsLayout'

const STATUS_TONE: Record<StockStatus, 'ok' | 'warning' | 'hostile' | 'neutral'> = {
  'in-stock': 'ok',
  low: 'warning',
  'sold-out': 'hostile',
  discontinued: 'neutral',
}

const STATUS_ORDER: readonly StockStatus[] = ['in-stock', 'low', 'sold-out', 'discontinued']

function isStockStatus(value: string | null): value is StockStatus {
  return value !== null && (STATUS_ORDER as readonly string[]).includes(value)
}

const STATUS_GROUPS: SelectGroup[] = [
  { label: 'Any', options: [{ value: 'all', label: 'Any status' }] },
  {
    label: 'Available',
    options: [
      { value: 'in-stock', label: STOCK_STATUS_LABEL['in-stock'] },
      { value: 'low', label: STOCK_STATUS_LABEL.low },
    ],
  },
  {
    label: 'Unavailable',
    options: [
      { value: 'sold-out', label: STOCK_STATUS_LABEL['sold-out'] },
      { value: 'discontinued', label: STOCK_STATUS_LABEL.discontinued },
    ],
  },
]

const CATEGORY_OPTIONS = CATEGORIES.map(category => ({
  value: category.id,
  label: category.label,
}))

const COLUMNS: DataTableColumn<InventoryItem>[] = [
  {
    key: 'name',
    header: 'Item',
    sortValue: item => item.name,
    cell: item => (
      <span className="flex flex-col gap-0.5">
        <span>{item.name}</span>
        <span className="font-mono text-sm font-normal text-[var(--color-text-secondary)]">{item.sku}</span>
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    sortValue: item => item.categoryLabel,
    cell: item => item.categoryLabel,
  },
  {
    key: 'price',
    header: 'Price',
    numeric: true,
    sortValue: item => item.price,
    cell: item => formatMoney(item.price),
  },
  {
    key: 'stock',
    header: 'Stock',
    numeric: true,
    sortValue: item => item.stock,
    cell: item => String(item.stock),
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: item => STATUS_ORDER.indexOf(stockStatus(item)),
    cell: item => {
      const status = stockStatus(item)
      return (
        <Badge emphasis="subtle" tone={STATUS_TONE[status]}>
          {STOCK_STATUS_LABEL[status]}
        </Badge>
      )
    },
  },
]

const DEFAULT_SORT: DataTableSort = { key: 'name', direction: 'ascending' }
const PAGE_SIZES = [5, 10, 20]

function itemsLabel(n: number): string {
  return `${n} ${n === 1 ? 'item' : 'items'}`
}

function toCsv(items: readonly InventoryItem[]): string {
  const rows = items.map(item =>
    [
      item.sku,
      `"${item.name}"`,
      item.categoryLabel,
      (item.price / 100).toFixed(2),
      item.stock,
      STOCK_STATUS_LABEL[stockStatus(item)],
    ].join(','),
  )
  return ['SKU,Item,Category,Price (EUR),Stock,Status', ...rows].join('\n')
}

/**
 * The stock list: every catalogue product with its SKU, price, units on hand and a status derived
 * from them (`stockStatus`). Three filters (text, categories, status), a sortable and selectable
 * table, the table-footer form of Pagination, and three bulk actions that show the system's three
 * answers to "how sure do you need to be": Mark discontinued and Reinstate act at once and offer
 * Undo in a toast, because both are reversible; Delete is not, so it asks first, in an
 * AlertDialog whose action returns the request's promise and stays busy until it settles.
 *
 * The status filter starts from `?status=` so the dashboard's "View in inventory" lands already
 * narrowed to low stock. Everything else is local state: the demo's edits are not meant to
 * survive a reload, and "Restore demo items" is the reset when every row has been deleted.
 *
 * Selection is kept across filters and pages (DataTable's own rule: select-all acts on the rows
 * shown and keeps the rest), so a bulk action acts on everything selected, and its label counts
 * all of it, in view or not.
 */
export function Inventory() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status')
  const [items, setItems] = useState<InventoryItem[]>(inventoryFromCatalog)
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [status, setStatus] = useState<'all' | StockStatus>(isStockStatus(initialStatus) ? initialStatus : 'all')
  const [sort, setSort] = useState<DataTableSort>(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  const needle = query.trim().toLowerCase()
  const filtered = items.filter(
    item =>
      (needle === '' || item.name.toLowerCase().includes(needle) || item.sku.toLowerCase().includes(needle)) &&
      (categories.length === 0 || categories.includes(item.category)) &&
      (status === 'all' || stockStatus(item) === status),
  )
  const filtering = needle !== '' || categories.length > 0 || status !== 'all'
  const sortColumn = COLUMNS.find(column => column.key === sort.key)
  const sorted = sortRows(filtered, sortColumn?.sortValue, sort.direction)
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const visible = sorted.slice(start, start + pageSize)
  const count = selected.size
  const chosen = items.filter(item => selected.has(item.id))
  const noun = itemsLabel(count)

  function filterChanged() {
    setPage(1)
  }

  function clearFilters() {
    setQuery('')
    setCategories([])
    setStatus('all')
    setPage(1)
    searchRef.current?.focus()
  }

  function setDiscontinued(ids: ReadonlySet<string>, value: boolean) {
    setItems(current => current.map(item => (ids.has(item.id) ? { ...item, discontinued: value } : item)))
  }

  function markDiscontinued(value: boolean) {
    if (count === 0) return
    const ids = new Set(selected)
    const before = new Map(items.map(item => [item.id, item.discontinued]))
    setDiscontinued(ids, value)
    setSelected(new Set())
    toast({
      tone: 'ok',
      title: value ? `${itemsLabel(ids.size)} marked discontinued` : `${itemsLabel(ids.size)} reinstated`,
      description: value ? 'They stay in the list and leave the store.' : 'They are back in the store.',
      action: {
        label: 'Undo',
        altText: value
          ? 'Select the same items and choose Reinstate.'
          : 'Select the same items and choose Mark discontinued.',
        onAction: () =>
          setItems(current =>
            current.map(item => (ids.has(item.id) ? { ...item, discontinued: before.get(item.id) ?? false } : item)),
          ),
      },
    })
  }

  function deleteSelected() {
    const ids = new Set(selected)
    return opsRequest().then(() => {
      setItems(current => current.filter(item => !ids.has(item.id)))
      setSelected(new Set())
      toast({ tone: 'ok', title: `${itemsLabel(ids.size)} deleted` })
    })
  }

  function exportCsv() {
    // jsdom (the unit tests) has no createObjectURL; the toast still says what happened.
    if (typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(new Blob([toCsv(sorted)], { type: 'text/csv' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'hexline-inventory.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    }
    toast({
      tone: 'info',
      title: 'Inventory exported',
      description: `${itemsLabel(sorted.length)}, as filtered and sorted.`,
    })
  }

  const empty = filtering ? (
    <EmptyState
      level={2}
      size="sm"
      framed={false}
      icon={<PackageSearch />}
      title="No items match"
      description="Nothing in the inventory matches every filter. Remove one, or clear them all."
      actions={<Button onClick={clearFilters}>Clear filters</Button>}
    />
  ) : (
    <EmptyState
      level={2}
      size="sm"
      framed={false}
      icon={<PackageSearch />}
      title="The inventory is empty"
      description="Every item has been deleted. The demo can put the catalogue back."
      actions={
        <Button
          variant="secondary"
          onClick={() => {
            setItems(inventoryFromCatalog())
            setPage(1)
          }}
        >
          Restore demo items
        </Button>
      }
    />
  )

  return (
    <OpsLayout>
      <PageHeader
        eyebrow="Back office"
        title="Inventory"
        description="Every item in the store, with units on hand. Low stock is six or fewer."
        actions={
          <Button variant="secondary" iconStart={<Download />} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,14rem)]">
          <Search
            ref={searchRef}
            label="Search inventory"
            placeholder="Search by name or SKU"
            value={query}
            onValueChange={value => {
              setQuery(value)
              filterChanged()
            }}
            className="md:col-span-2 xl:col-span-1"
          />
          <FormField label="Categories">
            <MultiSelect
              label="Categories"
              options={CATEGORY_OPTIONS}
              value={categories}
              placeholder="All categories"
              onValueChange={value => {
                setCategories(value)
                filterChanged()
              }}
            />
          </FormField>
          <FormField label="Stock status">
            <Select
              label="Stock status"
              groups={STATUS_GROUPS}
              value={status}
              onValueChange={value => {
                setStatus(isStockStatus(value) ? value : 'all')
                filterChanged()
              }}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--color-border-hairline)] py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p role="status" className="font-body text-sm font-semibold text-[var(--color-text-primary)]">
              {filtering ? `${filtered.length} of ${itemsLabel(items.length)} match` : itemsLabel(items.length)}
            </p>
            {count === 0 ? (
              <p className="font-body text-sm text-[var(--color-text-secondary)]">Select items to act on them.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              aria-disabled={count === 0 || undefined}
              onClick={() => markDiscontinued(true)}
            >
              Mark discontinued
            </Button>
            <Button
              size="sm"
              variant="secondary"
              aria-disabled={count === 0 || undefined}
              onClick={() => markDiscontinued(false)}
            >
              Reinstate
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="danger"
                  iconStart={<Trash2 />}
                  aria-disabled={count === 0 || undefined}
                  onClick={event => {
                    // Radix skips its own open when the event is already handled, so a press
                    // with nothing selected stays a no-op while the button stays a tab stop.
                    if (count === 0) event.preventDefault()
                  }}
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                title={`Delete ${noun}?`}
                description={`${chosen
                  .slice(0, 3)
                  .map(item => item.name)
                  .join(
                    ', ',
                  )}${count > 3 ? ` and ${count - 3} more` : ''} ${count === 1 ? 'leaves' : 'leave'} the inventory and the store. Past orders keep their lines.`}
              >
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep {count === 1 ? 'it' : 'them'}</AlertDialogCancel>
                  <AlertDialogAction loadingLabel={`Deleting ${noun}`} onClick={deleteSelected}>
                    Delete {noun}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <DataTable
          caption="Inventory"
          hideCaption
          columns={COLUMNS}
          rows={visible}
          getRowId={item => item.id}
          rowHeader="name"
          sort={sort}
          onSortChange={next => {
            setSort(next)
            setPage(1)
          }}
          selectable
          rowLabel={item => item.name}
          selected={selected}
          onSelectedChange={setSelected}
          emptyMessage={empty}
        />
        {sorted.length > 0 ? (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalItems={sorted.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={size => {
              setPageSize(size)
              setPage(1)
            }}
            label="Pagination, inventory"
          />
        ) : null}
      </div>
    </OpsLayout>
  )
}
