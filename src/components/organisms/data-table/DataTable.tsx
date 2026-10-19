import { useId, useMemo, useState, type ReactNode, type Ref } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Checkbox } from '../../atoms'

export type SortDirection = 'ascending' | 'descending'
export type DataTableSort = { key: string; direction: SortDirection }

export type DataTableColumn<Row> = {
  key: string
  header: string
  cell: (row: Row) => ReactNode
  /** Present means sortable: the value rows are ordered by. */
  sortValue?: (row: Row) => string | number
  /** Right-aligned, tabular figures. */
  numeric?: boolean
}

type DataTableBaseProps<Row> = {
  /** Required: names the table and its scroll region. */
  caption: string
  /** Hides the caption visually; it still names both. @default false */
  hideCaption?: boolean
  columns: DataTableColumn<Row>[]
  rows: readonly Row[]
  getRowId: (row: Row) => string
  /** The key of the column whose cell heads each row. */
  rowHeader: string
  defaultSort?: DataTableSort
  /** Controlled sort. When set, the table no longer holds its own sort state -- toggling a
   *  header only calls `onSortChange`, the same controlled/uncontrolled split `selected`/
   *  `defaultSelected` already draw. Undefined (the default) keeps the table's own state, seeded
   *  from `defaultSort`. */
  sort?: DataTableSort
  /** Called with the next sort on every header click. Required to make `sort` do anything;
   *  without it a controlled table would render a header button that never changes what it says. */
  onSortChange?: (sort: DataTableSort) => void
  /** @default 'Nothing to show.' */
  emptyMessage?: ReactNode
  className?: string
  ref?: Ref<HTMLTableElement>
}

type DataTableSelectionProps<Row> =
  | { selectable?: false }
  | {
      selectable: true
      /** Names each row's checkbox: "Select {rowLabel(row)}". */
      rowLabel: (row: Row) => string
      selected?: ReadonlySet<string>
      defaultSelected?: Iterable<string>
      onSelectedChange?: (selected: Set<string>) => void
    }

export type DataTableProps<Row> = DataTableBaseProps<Row> & DataTableSelectionProps<Row>

/** Pure and stable: equal rows keep their order in both directions. Strings compare with numeric
 *  collation, so "2" sorts before "10". */
export function sortRows<Row>(
  rows: readonly Row[],
  sortValue: ((row: Row) => string | number) | undefined,
  direction: SortDirection
): Row[] {
  if (!sortValue) return [...rows]
  const factor = direction === 'ascending' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = sortValue(a)
    const y = sortValue(b)
    const order =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })
    return order * factor
  })
}

/**
 * Contrast rows, by exact name. Header text: "text.secondary on surface.base" and "alert body and ghost
 * dismiss (text.secondary) on surface.raised (over surface.base)". Cells and row headers: "text.primary
 * on surface.base" and "text.primary on surface.raised (over surface.base)". The unsorted glyph, a
 * graphic: "text.muted on surface.base" and "text.muted on surface.raised (over surface.base)".
 * Checkboxes: "selection control border on control fill", "rating empty star (border.selection) on
 * surface.raised (over surface.base)", "checked/on fill (accent.signal.fill) on surface.base" and
 * "rating filled star (accent.signal.fill) on surface.raised (over surface.base)". Focus: "focus.ring
 * on surface.base" and "focus ring (focus.ring) on surface.raised (over surface.base)". No row is ever
 * tinted: on the signal wash a checked box and the ring measure under 3:1 in light theme.
 */
const RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
const HEADER_CELL =
  'px-3 py-2 text-left align-bottom font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]'
const CELL = 'px-3 py-2.5 text-left align-top text-[var(--color-text-primary)]'

function SortGlyph({ direction }: { direction?: SortDirection }) {
  const Glyph = direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ArrowUpDown
  return (
    <Glyph
      aria-hidden="true"
      className={cn('w-3.5 h-3.5 shrink-0', direction ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]')}
    />
  )
}

export function DataTable<Row>(props: DataTableProps<Row>) {
  const {
    caption,
    hideCaption = false,
    columns,
    rows,
    getRowId,
    rowHeader,
    defaultSort,
    emptyMessage = 'Nothing to show.',
    className,
    ref,
  } = props
  const selection = props.selectable ? props : undefined
  const id = useId()
  const captionId = `${id}-caption`

  const [internalSort, setInternalSort] = useState<DataTableSort | undefined>(defaultSort)
  const sort = props.sort ?? internalSort
  const [internalSelected, setInternalSelected] = useState<Set<string>>(
    () => new Set(selection?.defaultSelected ?? [])
  )
  const selected = selection?.selected ?? internalSelected

  const sortColumn = columns.find(column => column.key === sort?.key)
  // A defaultSort naming a column with no sortValue must not announce or mark a sort that never
  // happens: aria-sort and the "Sorted by" status are derived only when the sorted column is
  // actually sortable.
  const activeSort =
    sortColumn?.sortValue && sort ? { column: sortColumn, direction: sort.direction } : undefined
  const sorted = useMemo(
    () => sortRows(rows, sortColumn?.sortValue, sort?.direction ?? 'ascending'),
    [rows, sortColumn, sort]
  )

  const ids = rows.map(getRowId)
  const shown = new Set(ids)
  const selectedCount = ids.filter(rowId => selected.has(rowId)).length
  const allState: boolean | 'indeterminate' =
    selectedCount === 0 ? false : selectedCount === ids.length ? true : 'indeterminate'
  // Selected rows that are not among the rows given: another page, or filtered out.
  const notShown = [...selected].filter(rowId => !shown.has(rowId)).length

  const setSelected = (next: Set<string>) => {
    if (selection?.selected === undefined) setInternalSelected(next)
    selection?.onSelectedChange?.(next)
  }
  const toggleRow = (rowId: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(rowId)
    else next.delete(rowId)
    setSelected(next)
  }
  // Acts on the rows shown and keeps every other selection: with paging or filtering, `rows` is
  // only part of the data, and replacing the set would silently drop what was chosen elsewhere.
  const toggleAll = () => {
    const next = new Set(selected)
    for (const rowId of ids) {
      if (allState === true) next.delete(rowId)
      else next.add(rowId)
    }
    setSelected(next)
  }
  const toggleSort = (key: string) => {
    const next: DataTableSort =
      sort?.key === key
        ? { key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' }
        : { key, direction: 'ascending' }
    if (props.sort === undefined) setInternalSort(next)
    props.onSortChange?.(next)
  }

  const columnCount = columns.length + (selection ? 1 : 0)

  return (
    <div className="flex flex-col gap-3">
      {selection ? (
        <p role="status" className="min-h-4 font-mono text-xs text-[var(--color-text-secondary)]">
          {selected.size === 0
            ? ''
            : notShown > 0
              ? `${selected.size} selected, ${notShown} not shown`
              : `${selected.size} selected`}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {activeSort ? `Sorted by ${activeSort.column.header}, ${activeSort.direction}` : ''}
      </p>
      {/* Focusable and named, so a keyboard user can scroll a table wider than the screen. */}
      <div role="region" aria-labelledby={captionId} tabIndex={0} className={cn('overflow-x-auto', RING)}>
        <table ref={ref} className={cn('w-full border-collapse font-body text-sm', className)}>
          <caption
            id={captionId}
            className={cn(
              'pb-3 text-left font-display font-semibold text-base text-[var(--color-text-primary)]',
              hideCaption && 'sr-only'
            )}
          >
            {caption}
          </caption>
          <thead>
            <tr className="border-b border-[var(--color-border-hairline-strong)]">
              {selection ? (
                <th scope="col" className="w-10 px-3 py-2 align-bottom">
                  <Checkbox aria-label="Select all rows" checked={allState} onCheckedChange={toggleAll} />
                </th>
              ) : null}
              {columns.map(column => {
                const direction = activeSort?.column.key === column.key ? activeSort.direction : undefined
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={direction}
                    className={cn(HEADER_CELL, column.numeric && 'text-right')}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 min-h-6 uppercase tracking-[0.12em] hover:text-[var(--color-text-primary)]',
                          RING
                        )}
                      >
                        {column.header}
                        <SortGlyph direction={direction} />
                      </button>
                    ) : (
                      // Same min-h-6/items-center box as the sort button above, so a plain
                      // header's text sits at the same baseline as a sortable one instead of a
                      // few px lower -- the button's height (not its content) is what align-bottom
                      // on the <th> is measuring against.
                      <span className="inline-flex items-center min-h-6">{column.header}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-3 py-8 text-center text-[var(--color-text-secondary)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map(row => {
                const rowId = getRowId(row)
                return (
                  <tr key={rowId} className="border-b border-[var(--color-border-hairline)]">
                    {selection ? (
                      <td className="w-10 px-3 py-2 align-top">
                        <Checkbox
                          aria-label={`Select ${selection.rowLabel(row)}`}
                          checked={selected.has(rowId)}
                          onCheckedChange={value => toggleRow(rowId, value === true)}
                        />
                      </td>
                    ) : null}
                    {columns.map(column => {
                      const align = column.numeric ? 'text-right font-mono tabular-nums' : undefined
                      return column.key === rowHeader ? (
                        <th key={column.key} scope="row" className={cn(CELL, 'font-semibold', align)}>
                          {column.cell(row)}
                        </th>
                      ) : (
                        <td key={column.key} className={cn(CELL, align)}>
                          {column.cell(row)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
