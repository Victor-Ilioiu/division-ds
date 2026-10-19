import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Stat } from './Stat'

describe('Stat', () => {
  it('pairs the label with the value as a term and its definition', () => {
    render(<Stat label="Kits dispatched" value={18} />)
    expect(screen.getByRole('term')).toHaveTextContent('Kits dispatched')
    expect(screen.getByRole('definition')).toHaveTextContent('18')
  })

  it('pads with dimmed zeros hidden from assistive tech', () => {
    render(<Stat label="Kits dispatched" value={18} padTo={3} />)
    const pad = screen.getByText('0')
    expect(pad).toHaveAttribute('aria-hidden', 'true')
    expect(pad.className).toContain('--color-numeral-pad')
  })

  it('does not pad a value that is not an integer', () => {
    render(<Stat label="Distance" value="4.2k" padTo={5} />)
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.getByText('4.2k')).toBeInTheDocument()
  })

  it('speaks direction, amount, period and sentiment for a delta', () => {
    render(
      <Stat
        label="Failed syncs"
        value={3}
        delta={{ value: '40%', direction: 'down', sentiment: 'positive', period: 'last week' }}
      />
    )
    expect(screen.getByText('down 40% from last week, an improvement')).toHaveClass('sr-only')
  })

  it('shows the unit beside the value', () => {
    render(<Stat label="Payload" value={24} unit="kg" />)
    expect(screen.getByRole('definition')).toHaveTextContent('24kg')
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Stat ref={ref} label="x" value={1} />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  it('is axe clean with a pad and a delta', async () => {
    const { container } = render(
      <Stat label="Kits dispatched" value={18} padTo={3} delta={{ value: '12%', direction: 'up', sentiment: 'positive', period: 'last week' }} />
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
