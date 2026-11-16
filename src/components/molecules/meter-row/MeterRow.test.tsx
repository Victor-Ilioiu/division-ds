import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { MeterAxis, MeterBar, MeterRow } from './MeterRow'

describe('MeterRow', () => {
  it('shows the label and the display value', () => {
    render(<MeterRow label="North depot" value={1240} max={2000} display="1.2K" />)
    expect(screen.getByText('North depot')).toBeInTheDocument()
    expect(screen.getByText('1.2K')).toHaveClass('font-data')
  })

  it('draws the bar as a share of max, linear or log', () => {
    const { container, rerender } = render(<MeterBar value={50} max={200} />)
    expect((container.querySelector('span span') as HTMLElement).style.width).toBe('25%')
    rerender(<MeterBar value={0} max={200} scale="log" />)
    expect((container.querySelector('span span') as HTMLElement).style.width).toBe('0%')
  })

  it('paints the state as brightness', () => {
    const { container } = render(<MeterRow label="Queued" value={1} max={2} state="pending" />)
    expect(container.firstElementChild).toHaveClass('text-[var(--color-text-pending)]')
  })

  it('becomes one button with onActivate', async () => {
    const onActivate = vi.fn()
    render(<MeterRow label="North depot" value={1} max={2} onActivate={onActivate} />)
    await userEvent.click(screen.getByRole('button', { name: 'North depot' }))
    expect(onActivate).toHaveBeenCalledOnce()
  })

  it('forwards a ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    render(<MeterRow ref={ref} className="mt-1" label="A" value={1} max={2} />)
    expect(ref.current).toHaveClass('mt-1', 'relative')
  })

  it('places axis ticks on the scale', () => {
    render(<MeterAxis max={100000} />)
    expect(screen.getByText('1K')).toBeInTheDocument()
    expect(screen.getByText('100K')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <MeterRow label="North depot" value={1240} max={2000} href="#north" />
        <MeterRow label="East yard" value={300} max={2000} state="pending" />
      </div>,
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
