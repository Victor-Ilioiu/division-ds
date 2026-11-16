import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { StatusChip } from './StatusChip'

describe('StatusChip', () => {
  it('renders its word in the data font', () => {
    render(<StatusChip label="New" />)
    expect(screen.getByText('New')).toHaveClass('font-data', 'uppercase')
  })

  it('merges className and forwards a ref', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<StatusChip ref={ref} label="Cap" className="ml-2" />)
    expect(ref.current).toHaveClass('ml-2')
    expect(ref.current?.textContent).toBe('Cap')
  })

  it('is axe clean in every tone', async () => {
    const { container } = render(
      <>
        {(['neutral', 'signal', 'ok', 'warning', 'hostile', 'info'] as const).map(tone => (
          <StatusChip key={tone} tone={tone} label={tone} />
        ))}
      </>,
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
