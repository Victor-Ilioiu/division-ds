import { createRef, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Pagination, paginationRange } from './Pagination'

/** A controlled wrapper: page changes are actually applied on rerender, which real focus-retention
 *  and "does the page stop advancing" assertions need — a static `page` prop can't exercise
 *  either. */
function ControlledPagination({ pageCount }: { pageCount: number }) {
  const [page, setPage] = useState(1)
  return <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
}

describe('paginationRange', () => {
  it('lists every page when there are few', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('gaps the far end near the start', () => {
    expect(paginationRange(2, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20])
  })

  it('gaps both ends in the middle', () => {
    expect(paginationRange(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
  })

  it('gaps the near end at the end', () => {
    expect(paginationRange(20, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20])
  })

  it('shows a single hidden page instead of a gap', () => {
    expect(paginationRange(4, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20])
  })

  it('widens with more siblings', () => {
    expect(paginationRange(10, 20, 2)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 20])
  })

  it('returns nothing for no pages', () => {
    expect(paginationRange(1, 0)).toEqual([])
  })
})

describe('Pagination', () => {
  it('is a named navigation landmark', () => {
    render(<Pagination page={1} pageCount={5} onPageChange={() => {}} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })

  it('names page buttons and marks the current page', () => {
    render(<Pagination page={3} pageCount={5} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current')
  })

  it('reports the page clicked, and nothing for the current one', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={3} pageCount={5} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Page 4' }))
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('steps with Previous and Next, aria-disabled (not disabled) at the ends', async () => {
    const onPageChange = vi.fn()
    const { rerender } = render(<Pagination page={1} pageCount={5} onPageChange={onPageChange} />)
    const prev = screen.getByRole('button', { name: 'Previous page' })
    // aria-disabled, never `disabled` -- a native `disabled` button drops out of the tab order,
    // which would be a focus-loss defect.
    expect(prev).toHaveAttribute('aria-disabled', 'true')
    expect(prev).not.toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
    rerender(<Pagination page={5} pageCount={5} onPageChange={onPageChange} />)
    const next = screen.getByRole('button', { name: 'Next page' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(next).not.toBeDisabled()
  })

  it('keeps focus on Next as it goes inert at the last page, and the page stops advancing', async () => {
    render(<ControlledPagination pageCount={3} />)
    const next = () => screen.getByRole('button', { name: 'Next page' })
    next().focus()
    expect(next()).toHaveFocus()
    await userEvent.click(next()) // page 1 -> 2
    await userEvent.click(next()) // page 2 -> 3, the last page: Next goes aria-disabled here
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
    expect(next()).toHaveAttribute('aria-disabled', 'true')
    expect(next()).toHaveFocus()
    // go() no-ops past pageCount, so a further click neither moves the page nor moves focus away.
    await userEvent.click(next())
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
    expect(next()).toHaveFocus()
  })

  it('renders nothing when there are no pages', () => {
    const { container } = render(<Pagination page={1} pageCount={0} onPageChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('forwards a ref to the nav', () => {
    const ref = createRef<HTMLElement>()
    render(<Pagination ref={ref} page={1} pageCount={3} onPageChange={() => {}} />)
    expect(ref.current?.tagName).toBe('NAV')
  })

  it('is axe clean', async () => {
    const { container } = render(<Pagination page={10} pageCount={20} onPageChange={() => {}} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('Pagination variants', () => {
  it('compact: a live "Page n of m" readout instead of page buttons', async () => {
    const onPageChange = vi.fn()
    render(<Pagination variant="compact" page={3} pageCount={20} onPageChange={onPageChange} />)
    expect(screen.queryByRole('button', { name: 'Page 3' })).toBeNull()
    const readout = screen.getByText('Page 3 of 20')
    expect(readout).toHaveAttribute('aria-live', 'polite')
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('select: a page Select reports the chosen page', async () => {
    const onPageChange = vi.fn()
    render(<Pagination variant="select" page={2} pageCount={6} onPageChange={onPageChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Page' })
    expect(trigger).toHaveTextContent('2')
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('option', { name: '5' }))
    expect(onPageChange).toHaveBeenCalledWith(5)
  })

  it('showFirstLast: First and Last jump to the ends and go inert there', async () => {
    const onPageChange = vi.fn()
    render(<Pagination showFirstLast page={1} pageCount={9} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: 'First page' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'First page' }))
    expect(onPageChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Last page' }))
    expect(onPageChange).toHaveBeenCalledWith(9)
  })

  it('showLabels: Previous and Next carry visible words', () => {
    render(<Pagination showLabels page={2} pageCount={5} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('showJump: goes to the typed page on Enter, clamping past the end', async () => {
    const onPageChange = vi.fn()
    render(<Pagination showJump page={1} pageCount={12} onPageChange={onPageChange} />)
    const field = screen.getByLabelText('Go to page')
    await userEvent.type(field, '7{Enter}')
    expect(onPageChange).toHaveBeenLastCalledWith(7)
    await userEvent.type(field, '99')
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onPageChange).toHaveBeenLastCalledWith(12)
  })

  it('table footer: shows the range on view and a rows-per-page Select', async () => {
    const onPageSizeChange = vi.fn()
    render(
      <Pagination
        page={2}
        pageCount={20}
        totalItems={397}
        pageSize={20}
        onPageSizeChange={onPageSizeChange}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText('21–40 of 397')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page' }))
    await userEvent.click(screen.getByRole('option', { name: '50' }))
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })

  it('clips the range at the last item', () => {
    render(<Pagination page={20} pageCount={20} totalItems={397} pageSize={20} onPageChange={() => {}} />)
    expect(screen.getByText('381–397 of 397')).toBeInTheDocument()
  })

  it('is axe clean with every addition on', async () => {
    const { container } = render(
      <Pagination
        variant="select"
        showFirstLast
        showLabels
        showJump
        page={3}
        pageCount={10}
        totalItems={200}
        pageSize={20}
        onPageSizeChange={() => {}}
        onPageChange={() => {}}
      />
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
