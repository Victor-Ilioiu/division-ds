import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { TooltipProvider } from '../../atoms/tooltip/Tooltip'
import { StatusTracker, type StatusTrackerItem } from './StatusTracker'

const ITEMS: StatusTrackerItem[] = [
  { id: 'd1', status: 'ok', label: '10 Oct: no alerts' },
  { id: 'd2', status: 'warning', label: '11 Oct: 2 alerts, 14 min degraded' },
  { id: 'd3', status: 'hostile', label: '12 Oct: 41 min down' },
  { id: 'd4', status: 'neutral', label: '13 Oct: no readings' },
]

function Mounted(props: Partial<Parameters<typeof StatusTracker>[0]>) {
  return (
    <TooltipProvider>
      <button type="button">Before</button>
      <StatusTracker label="Uptime, last 4 days" items={ITEMS} summary="96.1% up" {...props} />
    </TooltipProvider>
  )
}

describe('StatusTracker', () => {
  it('is a list named by label, one item per bar, merging className and forwarding ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Mounted className="extra" ref={ref} />)
    const list = screen.getByRole('list', { name: 'Uptime, last 4 days' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(ref.current).toHaveClass('extra')
    expect(screen.getByText('96.1% up')).toBeInTheDocument()
  })

  it('names each bar with its status word and label, never colour alone', () => {
    render(<Mounted />)
    const bars = screen.getAllByRole('img')
    expect(bars.map(bar => bar.getAttribute('aria-label'))).toEqual([
      'Operational. 10 Oct: no alerts',
      'Degraded. 11 Oct: 2 alerts, 14 min degraded',
      'Down. 12 Oct: 41 min down',
      'No data. 13 Oct: no readings',
    ])
    bars.forEach(bar => expect(bar).toHaveAttribute('aria-roledescription', 'status bar'))
    expect(bars[1].className).toContain('bg-[var(--color-accent-warning-text)]')
  })

  it('takes other status words', () => {
    render(<Mounted statusLabels={{ hostile: 'Breach' }} />)
    expect(screen.getAllByRole('img')[2]).toHaveAccessibleName('Breach. 12 Oct: 41 min down')
  })

  it('is one tab stop, on the newest bar first', async () => {
    render(<Mounted />)
    const bars = screen.getAllByRole('img')
    expect(bars.filter(bar => bar.tabIndex === 0)).toEqual([bars[3]])
    await userEvent.click(screen.getByRole('button', { name: 'Before' }))
    await userEvent.tab()
    expect(bars[3]).toHaveFocus()
    await userEvent.tab()
    expect(document.body).toHaveFocus()
  })

  it('moves with the arrows, Home and End, stopping at the ends, and keeps the tab stop where it was', async () => {
    render(<Mounted />)
    const bars = screen.getAllByRole('img')
    bars[3].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(bars[3]).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(bars[2]).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(bars[0]).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(bars[0]).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(bars[3]).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(bars.filter(bar => bar.tabIndex === 0)).toEqual([bars[2]])
  })

  it('shows the focused bar its tooltip', async () => {
    render(<Mounted />)
    const bars = screen.getAllByRole('img')
    bars[3].focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Down. 12 Oct: 41 min down')
  })

  it('shows a hovered bar its tooltip', async () => {
    render(<Mounted />)
    await userEvent.hover(screen.getAllByRole('img')[1])
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Degraded. 11 Oct: 2 alerts, 14 min degraded')
  })

  it('renders an empty row without a tab stop', () => {
    render(<Mounted items={[]} />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('is axe clean, and with a tooltip open', async () => {
    const { container } = render(<Mounted />)
    expect(await axeClean(container)).toHaveNoViolations()
    screen.getAllByRole('img')[0].focus()
    await screen.findByRole('tooltip')
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
