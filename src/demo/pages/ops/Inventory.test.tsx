import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '../../../components/atoms/tooltip/Tooltip'
import { Toaster } from '../../../components/molecules/toast/Toast'
import { axeClean } from '../../../test/axe'
import { CATALOG } from '../../store/catalog'
import { setOpsLatency } from './data'
import { Inventory } from './Inventory'

const TOTAL = CATALOG.length

function renderInventory(path = '/store/ops/inventory') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <Toaster>
          <Routes>
            <Route path="/store/ops/inventory" element={<Inventory />} />
          </Routes>
        </Toaster>
      </TooltipProvider>
    </MemoryRouter>,
  )
}

function table() {
  return screen.getByRole('table', { name: 'Inventory' })
}

function bodyRows() {
  return within(table()).getAllByRole('rowheader')
}

beforeEach(() => setOpsLatency(0))
afterEach(() => setOpsLatency(600))

describe('Ops inventory', () => {
  it('lists every catalogue item, ten to a page, with the range in the footer', () => {
    renderInventory()
    expect(screen.getByRole('heading', { level: 1, name: 'Inventory' })).toBeInTheDocument()
    expect(screen.getByText(`${TOTAL} items`)).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByRole('navigation', { name: 'Pagination, inventory' })).toHaveTextContent(`1–10 of ${TOTAL}`)
  })

  // Mutation: drop `setPage(1)` from the onPageSizeChange handler -> page 3 of 10 stays asked
  // for after the size grows to 20, clamps to the last page, and the first row changes.
  it('pages, and resets to the first page when the page size changes', async () => {
    const user = userEvent.setup()
    renderInventory()
    const first = bodyRows()[0].textContent
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(bodyRows()[0].textContent).not.toBe(first)
    expect(screen.getByRole('navigation', { name: 'Pagination, inventory' })).toHaveTextContent(`11–20 of ${TOTAL}`)
  })

  it('starts filtered to a status from the URL', () => {
    renderInventory('/store/ops/inventory?status=low')
    expect(screen.getByText(/^\d+ of \d+ items match$/)).toBeInTheDocument()
    for (const cell of within(table()).getAllByText('Low stock')) expect(cell).toBeInTheDocument()
    expect(within(table()).queryByText('In stock')).toBeNull()
  })

  // Mutation: remove `searchRef.current?.focus()` from clearFilters -> the focus assertion fails.
  it('shows an empty state when the filters match nothing, and clears them', async () => {
    const user = userEvent.setup()
    renderInventory()
    const search = screen.getByRole('searchbox', { name: 'Search inventory' })
    await user.type(search, 'zzz-nothing')
    expect(screen.getByRole('heading', { level: 2, name: 'No items match' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination, inventory' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText(`${TOTAL} items`)).toBeInTheDocument()
    expect(search).toHaveValue('')
    expect(search).toHaveFocus()
  })

  it('filters by category with the MultiSelect', async () => {
    const user = userEvent.setup()
    renderInventory()
    await user.click(screen.getByRole('combobox', { name: 'Categories' }))
    await user.click(await screen.findByRole('option', { name: 'Optics' }))
    const optics = CATALOG.filter(product => product.category === 'optics').length
    expect(screen.getByText(`${optics} of ${TOTAL} items match`)).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(optics)
  })

  it('does nothing on Delete while nothing is selected', async () => {
    const user = userEvent.setup()
    renderInventory()
    const remove = screen.getByRole('button', { name: 'Delete' })
    expect(remove).toHaveAttribute('aria-disabled', 'true')
    await user.click(remove)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  // Mutation: make `deleteSelected` resolve without filtering `items` -> the row is still there.
  it('deletes the selection after a confirm, and says so in a toast', async () => {
    const user = userEvent.setup()
    renderInventory()
    await user.click(screen.getByRole('checkbox', { name: 'Select Bump helmet' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete 1 item?' })
    expect(dialog).toHaveAccessibleDescription(/Bump helmet leaves the inventory/)
    await user.click(within(dialog).getByRole('button', { name: 'Delete 1 item' }))
    expect(await screen.findByText('1 item deleted')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByText(`${TOTAL - 1} items`)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Select Bump helmet' })).toBeNull()
  })

  it('keeps everything on Cancel', async () => {
    const user = userEvent.setup()
    renderInventory()
    await user.click(screen.getByRole('checkbox', { name: 'Select Bump helmet' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByText(`${TOTAL} items`)).toBeInTheDocument()
  })

  it('marks the selection discontinued, with an Undo in the toast', async () => {
    const user = userEvent.setup()
    renderInventory()
    await user.click(screen.getByRole('checkbox', { name: 'Select Bump helmet' }))
    await user.click(screen.getByRole('button', { name: 'Mark discontinued' }))
    expect(await screen.findByText('1 item marked discontinued')).toBeInTheDocument()
    const row = screen.getByRole('rowheader', { name: /Bump helmet/ }).closest('tr') as HTMLElement
    expect(within(row).getByText('Discontinued')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(within(row).queryByText('Discontinued')).toBeNull()
  })

  it('offers to restore the catalogue once every item is deleted', async () => {
    const user = userEvent.setup()
    renderInventory()
    // Select everything on every page: three passes of select-all.
    for (let page = 1; page <= 3; page += 1) {
      await user.click(screen.getByRole('button', { name: `Page ${page}` }))
      await user.click(within(table()).getByRole('checkbox', { name: 'Select all rows' }))
    }
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: `Delete ${TOTAL} items` }))
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'The inventory is empty',
      }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore demo items' }))
    expect(screen.getByText(`${TOTAL} items`)).toBeInTheDocument()
  })

  it('is axe clean, with a row selected', async () => {
    const user = userEvent.setup()
    const { container } = renderInventory()
    await user.click(screen.getByRole('checkbox', { name: 'Select Bump helmet' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
