import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './DataTable.meta'
import { Example } from '../../docs/Example'
import { Badge, Button } from '../../atoms'
import { Pagination } from '../../molecules'
import { DataTable, type DataTableColumn, type DataTableSort } from './DataTable'

type Status = 'In transit' | 'Delivered' | 'Held'
type Shipment = { ref: string; destination: string; weight: number; items: number; status: Status }

const SHIPMENTS: Shipment[] = [
  { ref: 'SHP-201', destination: 'Cluj depot', weight: 8.2, items: 5, status: 'In transit' },
  { ref: 'SHP-202', destination: 'Arad depot', weight: 14.0, items: 12, status: 'Delivered' },
  { ref: 'SHP-203', destination: 'Brasov depot', weight: 3.5, items: 2, status: 'Held' },
  { ref: 'SHP-204', destination: 'Sibiu depot', weight: 22.1, items: 9, status: 'In transit' },
  { ref: 'SHP-205', destination: 'Oradea depot', weight: 6.0, items: 1, status: 'Delivered' },
  { ref: 'SHP-206', destination: 'Timisoara depot', weight: 18.4, items: 15, status: 'Held' },
  { ref: 'SHP-207', destination: 'Iasi depot', weight: 9.9, items: 4, status: 'In transit' },
  { ref: 'SHP-208', destination: 'Constanta depot', weight: 27.3, items: 20, status: 'Delivered' },
]

// Solid, not subtle: subtle would paint accent.<tone>.text on surface.raised, which has no gated
// row. Solid reuses the already-gated "accent.info.ink on accent.info.fill", "accent.ok.ink on
// accent.ok.fill" and "accent.warning.ink on accent.warning.fill" pairs (theme-invariant, so they
// don't depend on the surface underneath at all), which is why this table adds no new
// contrast-pairs.mjs row.
const STATUS_TONE: Record<Status, 'info' | 'ok' | 'warning'> = {
  'In transit': 'info',
  Delivered: 'ok',
  Held: 'warning',
}

const COLUMNS: DataTableColumn<Shipment>[] = [
  { key: 'ref', header: 'Reference', cell: s => s.ref, sortValue: s => s.ref },
  { key: 'destination', header: 'Destination', cell: s => s.destination },
  { key: 'weight', header: 'Weight (kg)', cell: s => s.weight.toFixed(1), sortValue: s => s.weight, numeric: true },
  { key: 'items', header: 'Items', cell: s => String(s.items), sortValue: s => s.items, numeric: true },
  {
    key: 'status',
    header: 'Status',
    cell: s => (
      <Badge emphasis="solid" tone={STATUS_TONE[s.status]}>
        {s.status}
      </Badge>
    ),
  },
]

/** A local, controlled selection: the bulk action button is a real tab stop even while nothing is
 *  selected (`aria-disabled`, never `disabled` — a natively disabled button drops focus to
 *  `<body>` the instant it disables itself). Archiving removes the selected rows and clears the
 *  selection in one step. */
function BulkExample() {
  const [rows, setRows] = useState(SHIPMENTS)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const count = selected.size

  const archive = () => {
    if (count === 0) return
    setRows(current => current.filter(row => !selected.has(row.ref)))
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <Button variant="secondary" aria-disabled={count === 0 || undefined} onClick={archive} className="self-start">
        {count > 0 ? `Archive ${count} shipment${count === 1 ? '' : 's'}` : 'Archive shipments'}
      </Button>
      <DataTable
        caption="Shipments, selectable"
        columns={COLUMNS}
        rows={rows}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
        selected={selected}
        onSelectedChange={setSelected}
      />
    </div>
  )
}

/** A controlled sort: the caller, not the table, holds `sort` -- the same shape a page that also
 *  puts the sort in the URL (Hexline's own Orders page) needs, so a reload reproduces it. */
function ControlledSortExample() {
  const [sort, setSort] = useState<DataTableSort>({ key: 'weight', direction: 'descending' })
  return (
    <DataTable
      caption="Shipments, controlled sort"
      columns={COLUMNS}
      rows={SHIPMENTS}
      getRowId={s => s.ref}
      rowHeader="ref"
      sort={sort}
      onSortChange={setSort}
    />
  )
}

/** Four rows a page, live, with Pagination's table-footer form: the range ("1–4 of n") and the
 *  rows-per-page Select come from `totalItems`, `pageSize` and `onPageSizeChange`. */
function PagedExample() {
  const [perPage, setPerPage] = useState(4)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const start = (page - 1) * perPage
  const visible = SHIPMENTS.slice(start, start + perPage)

  return (
    <div className="flex flex-col gap-3 w-full">
      <DataTable
        caption="Shipments, paged"
        columns={COLUMNS}
        rows={visible}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
        selected={selected}
        onSelectedChange={setSelected}
      />
      <Pagination
        page={page}
        pageCount={Math.ceil(SHIPMENTS.length / perPage)}
        onPageChange={setPage}
        totalItems={SHIPMENTS.length}
        pageSize={perPage}
        onPageSizeChange={size => {
          setPerPage(size)
          setPage(1)
        }}
        pageSizeOptions={[4, 8, 12]}
        label="Pagination, shipments"
      />
    </div>
  )
}

export function DataTableDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Sortable" className="block">
        <DataTable
          caption="Shipments, sortable"
          columns={COLUMNS}
          rows={SHIPMENTS}
          getRowId={s => s.ref}
          rowHeader="ref"
          defaultSort={{ key: 'ref', direction: 'ascending' }}
        />
      </Example>

      <Example caption="Controlled sort: the page, not the table, keeps track of the sort order" className="block">
        <ControlledSortExample />
      </Example>

      <Example caption="With row selection and an action that applies to every selected row" className="block">
        <BulkExample />
      </Example>

      <Example caption="With pagination and selection" className="block">
        <PagedExample />
      </Example>

      <Example caption="Empty" className="block">
        <DataTable caption="Returns" columns={COLUMNS} rows={[]} getRowId={s => s.ref} rowHeader="ref" emptyMessage="No returns yet." />
      </Example>
    </ComponentDocs>
  )
}
