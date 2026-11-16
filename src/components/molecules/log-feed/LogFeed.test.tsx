import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { LogFeed } from './LogFeed'

const ENTRIES = [
  { name: 'sync', detail: 'pulled 12 orders' },
  { name: 'export', detail: 'wrote stock.csv' },
]

describe('LogFeed', () => {
  it('is a named log with numbered entries', () => {
    render(<LogFeed label="Recent events" entries={ENTRIES} />)
    const log = screen.getByRole('log', { name: 'Recent events' })
    expect(log).toHaveClass('font-data')
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
  })

  it('draws the newest entry bright and the rest at rest', () => {
    render(<LogFeed label="Recent events" entries={ENTRIES} />)
    const items = screen.getAllByRole('listitem')
    expect(items[1]).toHaveClass('text-[var(--color-text-active)]')
    expect(items[0]).toHaveClass('text-[var(--color-text-rest)]')
  })

  it('numbers from start and shows a prompt', () => {
    render(<LogFeed label="Recent events" entries={ENTRIES} start={9} prompt="watch orders" />)
    expect(screen.getByText('09')).toBeInTheDocument()
    expect(screen.getByText('watch orders')).toBeInTheDocument()
  })

  it('forwards a ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    render(<LogFeed ref={ref} className="p-2" label="Recent events" entries={ENTRIES} />)
    expect(ref.current).toHaveClass('p-2')
  })

  it('is axe clean', async () => {
    const { container } = render(<LogFeed label="Recent events" entries={ENTRIES} prompt="watch orders" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
