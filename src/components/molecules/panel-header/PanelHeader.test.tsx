import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { PanelHeader } from './PanelHeader'

describe('PanelHeader', () => {
  it('renders the title as a heading at the given level', () => {
    render(<PanelHeader title="Orders" level={3} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Orders' })).toBeInTheDocument()
  })

  it('pads a numeric index to two digits and shows the readout', () => {
    render(<PanelHeader index={4} title="Orders" meta="12 open" />)
    expect(screen.getByText('04')).toBeInTheDocument()
    expect(screen.getByText('12 open')).toHaveClass('font-data')
  })

  it('merges className and forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<PanelHeader ref={ref} title="Orders" className="mb-2" />)
    expect(ref.current).toHaveClass('mb-2', 'flex')
  })

  it('is axe clean', async () => {
    const { container } = render(<PanelHeader index={1} title="Orders" meta="12 open" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
