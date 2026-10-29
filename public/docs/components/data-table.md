# DataTable

> Rows of records that people read, compare and sort. It's a real HTML table with a caption, column and row headers, and sortable columns. When there's a job to do, each row gets a checkbox.

- **Best for:** Records people read, compare and sort across columns, with optional bulk selection.
- **Not for:** A list people scan row by row: use ListItem. A form in every cell.
- Organism. Source: `src/components/organisms/data-table/DataTable.tsx`
- Rendered docs page: `/components/data-table`

## Import

```tsx
import { DataTable, sortRows } from 'src/components/organisms/data-table/DataTable'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `caption` | `string` |  | Required. Names the table and its scroll region. |
| `hideCaption` | `boolean` | `false` | Hides the caption visually. It still names the table and its scroll region for screen readers. |
| `columns` | `DataTableColumn<Row>[]` |  | Required. Each column has key, header, cell, sortValue and numeric. |
| `rows` | `readonly Row[]` |  | Required. |
| `getRowId` | `(row: Row) => string` |  | Required. |
| `rowHeader` | `string` |  | Required. The key of the column that heads each row. |
| `defaultSort` | `DataTableSort` |  | Starts the table sorted. Uncontrolled: the table keeps track of the sort itself after that. |
| `sort` | `DataTableSort` |  | Controlled sort, meaning your code holds the sort and passes it in. Set it together with onSortChange. A header click then only reports the next sort. |
| `onSortChange` | `(sort: DataTableSort) => void` |  | Called with the next sort on every header click, whether sort is controlled or not. |
| `emptyMessage` | `ReactNode` | `'Nothing to show.'` | Shown across every column when rows is empty. |
| `selectable` | `boolean` | `false` | Turns on the checkbox column. |
| `rowLabel` | `(row: Row) => string` |  | Required when selectable. Gives each row's checkbox its name. |
| `selected` | `ReadonlySet<string>` |  | Controlled selection (your code holds it), keyed by getRowId. |
| `defaultSelected` | `Iterable<string>` |  | The starting selection when it's uncontrolled (the table holds it). |
| `onSelectedChange` | `(selected: Set<string>) => void` |  | Called with the next selection on every change. |
| `className` | `string` |  | Goes on the table element. |
| `ref` | `Ref<HTMLTableElement>` |  | Points at the table element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type SortDirection = 'ascending' | 'descending'
```

```ts
export type DataTableSort = { key: string; direction: SortDirection }
```

```ts
export type DataTableColumn<Row> = {
  key: string
  header: string
  cell: (row: Row) => ReactNode
  /** Present means sortable: the value rows are ordered by. */
  sortValue?: (row: Row) => string | number
  /** Right-aligned, tabular figures. */
  numeric?: boolean
}
```

```ts
/** Pure and stable: equal rows keep their order in both directions. Strings compare with numeric
 *  collation, so "2" sorts before "10". */
export function sortRows<Row>(
  rows: readonly Row[],
  sortValue: ((row: Row) => string | number) | undefined,
  direction: SortDirection
): Row[]
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Sortable

```tsx
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

<DataTable
  caption="Shipments, sortable"
  columns={COLUMNS}
  rows={SHIPMENTS}
  getRowId={s => s.ref}
  rowHeader="ref"
  defaultSort={{ key: 'ref', direction: 'ascending' }}
/>
```

### Controlled sort: the page, not the table, keeps track of the sort order

```tsx
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

<ControlledSortExample />
```

### With row selection and an action that applies to every selected row

```tsx
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

<BulkExample />
```

### With pagination and selection

```tsx
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

<PagedExample />
```

### Empty

```tsx
type Status = 'In transit' | 'Delivered' | 'Held'

type Shipment = { ref: string; destination: string; weight: number; items: number; status: Status }

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

<DataTable caption="Returns" columns={COLUMNS} rows={[]} getRowId={s => s.ref} rowHeader="ref" emptyMessage="No returns yet." />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the scroll region, then to each sort button and checkbox in order. |
| `Enter` | Sorts by that column, or flips its direction. |
| `Space` | Sorts, or ticks a checkbox. |
| `←` `→` | Scroll the region sideways while it has focus. |

## Do

- Right-align numbers and mark their column as numeric.
- Say how many rows there are near the table, and put Pagination below it.
- Keep a bulk action's button a tab stop (a place the Tab key lands) while nothing is selected, and mark it aria-disabled so screen readers say it's unavailable.
- You can page or filter the rows freely. Select-all acts on the rows shown and keeps what was selected elsewhere, and the count says how many selected rows are out of view.

## Don't

- Don't make every column sortable. Sort the ones people compare.
- Don't tint selected or hovered rows. The checkbox and the count already say it.
- Don't put a form in every cell. That's a different component.

## Anatomy

- **Caption**: Names the table and its scroll region. You can hide it visually and it still works for screen readers.
- **Scroll region**: It can take keyboard focus, so a wide table scrolls from the keyboard.
- **Column header**: A sort button when the column sorts. The sorted column carries aria-sort, an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers which way it's sorted.
- **Row header**: The cell from the rowHeader column. It names its row.
- **Selection**: A checkbox per row, one to select all, and a count above the table. Selected rows don't get a tint.
- **Empty**: One cell that spans every column.
