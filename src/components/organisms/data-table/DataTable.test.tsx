import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { DataTable, sortRows, type DataTableColumn } from './DataTable'

type Shipment = { ref: string; destination: string; weight: number; items: string }

const SHIPMENTS: Shipment[] = [
  { ref: 'SHP-104', destination: 'Brasov depot', weight: 12.5, items: '10' },
  { ref: 'SHP-101', destination: 'Arad depot', weight: 4, items: '2' },
  { ref: 'SHP-109', destination: 'Cluj depot', weight: 30, items: '9' },
]

const COLUMNS: DataTableColumn<Shipment>[] = [
  { key: 'ref', header: 'Reference', cell: s => s.ref, sortValue: s => s.ref },
  { key: 'destination', header: 'Destination', cell: s => s.destination },
  { key: 'weight', header: 'Weight (kg)', cell: s => s.weight.toFixed(1), sortValue: s => s.weight, numeric: true },
  // Held as strings on purpose: "10" must still sort after "9".
  { key: 'items', header: 'Items', cell: s => s.items, sortValue: s => s.items, numeric: true },
]

const rowHeaders = () => screen.getAllByRole('rowheader').map(cell => cell.textContent)

function Plain() {
  return <DataTable caption="Shipments" columns={COLUMNS} rows={SHIPMENTS} getRowId={s => s.ref} rowHeader="ref" />
}

describe('sortRows', () => {
  it('keeps equal rows in their original order, in both directions', () => {
    const rows = [
      { id: 'a', n: 1 },
      { id: 'b', n: 1 },
      { id: 'c', n: 0 },
    ]
    expect(sortRows(rows, r => r.n, 'ascending').map(r => r.id)).toEqual(['c', 'a', 'b'])
    expect(sortRows(rows, r => r.n, 'descending').map(r => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns an unsorted copy, in the order given', () => {
    const rows = [{ id: 'a' }, { id: 'b' }]
    const sorted = sortRows(rows, undefined, 'ascending')
    expect(sorted).toEqual(rows)
    expect(sorted).not.toBe(rows)
  })
})

describe('DataTable', () => {
  it('is a table named by its caption, inside a focusable scroll region with the same name', () => {
    render(<Plain />)
    expect(screen.getByRole('table', { name: 'Shipments' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Shipments' })).toHaveAttribute('tabindex', '0')
  })

  it('makes the rowHeader column the row headers', () => {
    render(<Plain />)
    expect(rowHeaders()).toEqual(['SHP-104', 'SHP-101', 'SHP-109'])
  })

  it('sorts ascending, then descending, marking only the sorted column and saying so', async () => {
    render(<Plain />)
    const weight = screen.getByRole('button', { name: 'Weight (kg)' })
    await userEvent.click(weight)
    expect(screen.getByRole('columnheader', { name: 'Weight (kg)' })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: 'Reference' })).not.toHaveAttribute('aria-sort')
    expect(rowHeaders()).toEqual(['SHP-101', 'SHP-104', 'SHP-109'])
    await userEvent.click(weight)
    expect(screen.getByRole('columnheader', { name: 'Weight (kg)' })).toHaveAttribute('aria-sort', 'descending')
    expect(rowHeaders()).toEqual(['SHP-109', 'SHP-104', 'SHP-101'])
    expect(screen.getByText('Sorted by Weight (kg), descending')).toBeInTheDocument()
  })

  it('orders numbers held as strings by value, not by character', async () => {
    render(<Plain />)
    await userEvent.click(screen.getByRole('button', { name: 'Items' }))
    expect(rowHeaders()).toEqual(['SHP-101', 'SHP-109', 'SHP-104'])
  })

  it('starts sorted when given defaultSort', () => {
    render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS}
        getRowId={s => s.ref}
        rowHeader="ref"
        defaultSort={{ key: 'ref', direction: 'ascending' }}
      />
    )
    expect(rowHeaders()).toEqual(['SHP-101', 'SHP-104', 'SHP-109'])
  })

  it('is controlled when sort is given: a click reports the next sort but never changes it on its own', async () => {
    const onSortChange = vi.fn()
    const { rerender } = render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS}
        getRowId={s => s.ref}
        rowHeader="ref"
        sort={{ key: 'ref', direction: 'ascending' }}
        onSortChange={onSortChange}
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Reference' })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: 'Reference' }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'ref', direction: 'descending' })
    // The click above is reported, not applied: without the caller re-rendering with the new
    // sort, the table's own rendered order and aria-sort must stay exactly as given.
    expect(screen.getByRole('columnheader', { name: 'Reference' })).toHaveAttribute('aria-sort', 'ascending')
    expect(rowHeaders()).toEqual(['SHP-101', 'SHP-104', 'SHP-109'])
    rerender(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS}
        getRowId={s => s.ref}
        rowHeader="ref"
        sort={{ key: 'ref', direction: 'descending' }}
        onSortChange={onSortChange}
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Reference' })).toHaveAttribute('aria-sort', 'descending')
    expect(rowHeaders()).toEqual(['SHP-109', 'SHP-104', 'SHP-101'])
  })

  it('leaves a column without sortValue as plain header text', () => {
    render(<Plain />)
    expect(within(screen.getByRole('columnheader', { name: 'Destination' })).queryByRole('button')).toBeNull()
  })

  it('wraps a plain header in the same min-h-6/items-center box as a sortable one, so both sit at the same baseline', () => {
    render(<Plain />)
    const sortButton = within(screen.getByRole('columnheader', { name: 'Reference' })).getByRole('button')
    const plainWrapper = screen.getByRole('columnheader', { name: 'Destination' }).firstElementChild
    expect(plainWrapper?.tagName).toBe('SPAN')
    expect(sortButton.className).toContain('min-h-6')
    expect(sortButton.className).toContain('items-center')
    expect(plainWrapper?.className).toContain('min-h-6')
    expect(plainWrapper?.className).toContain('items-center')
  })

  it('never marks or announces a sort for a defaultSort naming an unsortable column', () => {
    render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS}
        getRowId={s => s.ref}
        rowHeader="ref"
        defaultSort={{ key: 'destination', direction: 'ascending' }}
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Destination' })).not.toHaveAttribute('aria-sort')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    // Row order is untouched: sortRows itself no-ops without a sortValue.
    expect(rowHeaders()).toEqual(['SHP-104', 'SHP-101', 'SHP-109'])
  })

  it('names each row checkbox, counts the selection, and goes mixed then all', async () => {
    render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
      />
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select SHP-101' }))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    const all = screen.getByRole('checkbox', { name: 'Select all rows' })
    expect(all).toHaveAttribute('aria-checked', 'mixed')
    await userEvent.click(all)
    expect(screen.getByText('3 selected')).toBeInTheDocument()
    for (const box of screen.getAllByRole('checkbox', { name: /^Select SHP/ })) expect(box).toBeChecked()
    await userEvent.click(all)
    expect(screen.queryByText(/selected$/)).toBeNull()
  })

  it('reports selection to a controlled caller', async () => {
    const onSelectedChange = vi.fn()
    render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
        selected={new Set(['SHP-104'])}
        onSelectedChange={onSelectedChange}
      />
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select SHP-101' }))
    expect([...onSelectedChange.mock.calls[0][0]].sort()).toEqual(['SHP-101', 'SHP-104'])
  })

  it('keeps selections on other pages when select-all toggles the rows shown', async () => {
    const onSelectedChange = vi.fn()
    const page = SHIPMENTS.slice(0, 2)
    const table = (selected: Set<string>) => (
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={page}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
        selected={selected}
        onSelectedChange={onSelectedChange}
      />
    )
    // SHP-109 is selected on another page, not among the rows shown.
    const { rerender } = render(table(new Set(['SHP-109'])))
    const all = screen.getByRole('checkbox', { name: 'Select all rows' })
    await userEvent.click(all)
    expect([...onSelectedChange.mock.calls[0][0]].sort()).toEqual(['SHP-101', 'SHP-104', 'SHP-109'])
    rerender(table(new Set(['SHP-101', 'SHP-104', 'SHP-109'])))
    await userEvent.click(all)
    expect([...onSelectedChange.mock.calls[1][0]]).toEqual(['SHP-109'])
  })

  it('leaves "Select all rows" unchecked when only off-page rows are selected', () => {
    render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS.slice(0, 2)}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
        defaultSelected={['SHP-109']}
      />
    )
    expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps an off-page id selected when select-all moves a mixed page to all selected', async () => {
    const onSelectedChange = vi.fn()
    render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS.slice(0, 2)}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
        selected={new Set(['SHP-104', 'SHP-109'])}
        onSelectedChange={onSelectedChange}
      />
    )
    const all = screen.getByRole('checkbox', { name: 'Select all rows' })
    expect(all).toHaveAttribute('aria-checked', 'mixed')
    await userEvent.click(all)
    expect([...onSelectedChange.mock.calls[0][0]].sort()).toEqual(['SHP-101', 'SHP-104', 'SHP-109'])
  })

  it('says how much of the selection is not shown', () => {
    render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS.slice(0, 2)}
        getRowId={s => s.ref}
        rowHeader="ref"
        selectable
        rowLabel={s => s.ref}
        defaultSelected={['SHP-104', 'SHP-109']}
      />
    )
    // A selectable DataTable renders two role="status" elements (this one and the sort
    // status), so scope by text rather than by role.
    const status = screen.getByText('2 selected, 1 not shown')
    expect(status).toHaveAttribute('role', 'status')
  })

  it('shows the empty message across every column', () => {
    render(
      <DataTable caption="Returns" columns={COLUMNS} rows={[]} getRowId={s => s.ref} rowHeader="ref" emptyMessage="No returns yet." />
    )
    expect(screen.getByRole('cell', { name: 'No returns yet.' })).toHaveAttribute('colspan', '4')
  })

  it('forwards a ref to the table', () => {
    const ref = createRef<HTMLTableElement>()
    render(<DataTable ref={ref} caption="Shipments" columns={COLUMNS} rows={SHIPMENTS} getRowId={s => s.ref} rowHeader="ref" />)
    expect(ref.current).toBe(screen.getByRole('table'))
  })

  it('is axe clean, sorted, selectable, with one row selected', async () => {
    const { container } = render(
      <DataTable
        caption="Shipments"
        columns={COLUMNS}
        rows={SHIPMENTS}
        getRowId={s => s.ref}
        rowHeader="ref"
        defaultSort={{ key: 'weight', direction: 'descending' }}
        selectable
        rowLabel={s => s.ref}
        defaultSelected={['SHP-104']}
      />
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
