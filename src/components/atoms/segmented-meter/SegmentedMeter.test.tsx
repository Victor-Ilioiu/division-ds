import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { SegmentedMeter } from './SegmentedMeter'

describe('SegmentedMeter', () => {
  it('is a named meter with its value spoken', () => {
    render(<SegmentedMeter label="Checks passed" value={3} max={5} />)
    const meter = screen.getByRole('meter', { name: 'Checks passed' })
    expect(meter).toHaveAttribute('aria-valuenow', '3')
    expect(meter).toHaveAttribute('aria-valuemax', '5')
    expect(meter).toHaveAttribute('aria-valuetext', '3 of 5')
  })

  it('draws one square per unit and clamps the value', () => {
    render(<SegmentedMeter label="Steps" value={9} max={4} />)
    const meter = screen.getByRole('meter')
    expect(meter.children).toHaveLength(4)
    expect(meter).toHaveAttribute('aria-valuenow', '4')
  })

  it('uses valueText when given, merges className and forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<SegmentedMeter ref={ref} className="mt-2" label="Steps" value={1} max={3} none={1} valueText="1 done, 1 skipped" />)
    expect(ref.current).toHaveAttribute('aria-valuetext', '1 done, 1 skipped')
    expect(ref.current).toHaveClass('mt-2', 'inline-flex')
  })

  it('is axe clean', async () => {
    const { container } = render(<SegmentedMeter label="Checks passed" value={2} max={5} none={1} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
