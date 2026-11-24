import { useMemo, useState } from 'react'
import { Select } from '../../atoms/select/Select'
import { DataTable, type DataTableColumn } from '../data-table/DataTable'
import { ColorSwatch } from './KanbanColumnDialogs'
import type { KanbanColumn, KanbanLayout } from './KanbanBoard'

/**
 * The board's table view: the same items as rows, in board order (column by column, then card
 * order), with the caller's `tableColumns` and one column of the board's own, after the row
 * header, that holds the card's column as a Select. Changing it is the menu move: the card goes
 * to the end of that column through the same `onMove`.
 */
export function KanbanTable<T>({
  label,
  columns,
  layout,
  byId,
  getItemLabel,
  tableColumns,
  rowHeader,
  statusLabel,
  emptyMessage,
  onMoveTo,
}: {
  label: string
  columns: readonly KanbanColumn[]
  layout: KanbanLayout
  byId: ReadonlyMap<string, T>
  getItemLabel: (item: T) => string
  tableColumns: readonly DataTableColumn<T>[]
  rowHeader: string
  statusLabel: string
  emptyMessage: string
  onMoveTo: (itemId: string, columnId: string) => void
}) {
  // Rows keep the place they first had, as in Notion: a card whose column changes stays on its row
  // rather than jumping to its new column's block, so the Select that changed it keeps focus where
  // it is. New cards join at the end; removed ones drop out.
  type Row = { itemId: string; columnId: string; item: T }
  const now = useMemo(() => {
    const map = new Map<string, Row>()
    for (const column of columns)
      for (const itemId of layout[column.id] ?? []) {
        const item = byId.get(itemId)
        if (item !== undefined) map.set(itemId, { itemId, columnId: column.id, item })
      }
    return map
  }, [columns, layout, byId])
  const [order, setOrder] = useState<string[]>(() => [...now.keys()])
  const kept = order.filter(itemId => now.has(itemId))
  const seen = new Set(kept)
  const next = [...kept, ...[...now.keys()].filter(itemId => !seen.has(itemId))]
  // Derived from the last render's order, so it is set during render (React's pattern for state
  // that follows a prop), and only when it changed, which ends the loop on the next pass.
  if (next.length !== order.length || next.some((itemId, index) => itemId !== order[index])) setOrder(next)
  const rows = next.map(itemId => now.get(itemId)!)

  const options = columns.map(column => ({ value: column.id, label: column.title, icon: <ColorSwatch color={column.color} /> }))
  const place = new Map(columns.map((column, index) => [column.id, index]))

  const status: DataTableColumn<Row> = {
    key: '__kanban-status',
    header: statusLabel,
    sortValue: row => place.get(row.columnId) ?? 0,
    cell: row => (
      <Select
        label={`${statusLabel} for ${getItemLabel(row.item)}`}
        options={options}
        value={row.columnId}
        onValueChange={columnId => {
          if (columnId !== row.columnId) onMoveTo(row.itemId, columnId)
        }}
        inputSize="sm"
        iconInTrigger
        className="min-w-40"
      />
    ),
  }

  const wrapped: DataTableColumn<Row>[] = tableColumns.map(column => ({
    key: column.key,
    header: column.header,
    numeric: column.numeric,
    cell: row => column.cell(row.item),
    sortValue: column.sortValue ? row => column.sortValue!(row.item) : undefined,
  }))
  const headerAt = wrapped.findIndex(column => column.key === rowHeader)
  const all = [...wrapped.slice(0, headerAt + 1), status, ...wrapped.slice(headerAt + 1)]

  return (
    <DataTable<Row>
      caption={label}
      hideCaption
      columns={all}
      rows={rows}
      getRowId={row => row.itemId}
      rowHeader={rowHeader}
      emptyMessage={emptyMessage}
    />
  )
}
