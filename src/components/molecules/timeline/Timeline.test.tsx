import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Phone, Truck } from 'lucide-react'
import { axeClean } from '../../../test/axe'
import { Timeline, TimelineGroup, TimelineItem } from './Timeline'

function Grouped() {
  return (
    <Timeline label="Activity on Depot 4" className="extra">
      <TimelineGroup title="Today">
        <TimelineItem icon={<Truck />} tone="info" title="Shipment left" meta="Dispatch" time="2026-10-15T09:40:00Z" timeLabel="09:40">
          Nine items.
        </TimelineItem>
        <TimelineItem
          icon={<Phone />}
          title="Call with Ilse Varga"
          time="2026-10-15T08:15:00Z"
          timeLabel="08:15"
          details="Pickup moved to Thursday."
        />
      </TimelineGroup>
      <TimelineGroup title="Yesterday" level={4}>
        <TimelineItem icon={<Truck />} tone="ok" title="Delivery checked in" time="2026-10-14T10:30:00Z" timeLabel="10:30" />
      </TimelineGroup>
    </Timeline>
  )
}

describe('Timeline', () => {
  it('is an ordered list named by label, merging className', () => {
    render(<Grouped />)
    const list = screen.getByRole('list', { name: 'Activity on Depot 4' })
    expect(list.tagName).toBe('OL')
    expect(list).toHaveClass('extra')
  })

  it('takes items directly, without groups', () => {
    render(
      <Timeline label="Work order">
        <TimelineItem icon={<Truck />} title="Opened" time="2026-10-09T08:00:00Z" timeLabel="Fri 9 Oct" />
        <TimelineItem icon={<Truck />} title="Closed" time="2026-10-13T15:45:00Z" timeLabel="Tue 13 Oct" />
      </Timeline>
    )
    expect(within(screen.getByRole('list', { name: 'Work order' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('heads each group at level 3 by default, or the level given, and names its list by the title', () => {
    render(<Grouped />)
    expect(screen.getByRole('heading', { level: 3, name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Yesterday' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Today' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('puts the instant in a time element and shows the label', () => {
    render(<Grouped />)
    const time = screen.getByText('09:40')
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', '2026-10-15T09:40:00Z')
  })

  it('renders the meta and the body', () => {
    render(<Grouped />)
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    expect(screen.getByText('Nine items.')).toBeInTheDocument()
  })

  it('colours the marker by tone, neutral by default, and keeps the icon out of the accessibility tree', () => {
    const { container } = render(<Grouped />)
    const markers = [...container.querySelectorAll('[data-tone]')]
    expect(markers.map(marker => marker.getAttribute('data-tone'))).toEqual(['info', 'neutral', 'ok'])
    expect(markers[0].className).toContain('text-[var(--color-accent-info-text)]')
    markers.forEach(marker => expect(marker).toHaveAttribute('aria-hidden', 'true'))
  })

  it('draws no rail after the last event of a list', () => {
    const { container } = render(<Grouped />)
    container.querySelectorAll('[data-part="rail"]').forEach(rail => expect(rail).toHaveClass('group-last/item:hidden'))
  })

  it('hides details behind a disclosure button that says its state', async () => {
    render(<Grouped />)
    const button = screen.getByRole('button', { name: 'Show details' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!
    expect(panel).not.toBeVisible()
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAccessibleName('Hide details')
    expect(panel).toBeVisible()
    expect(panel).toHaveTextContent('Pickup moved to Thursday.')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('is axe clean, closed and with details open', async () => {
    const { container } = render(<Grouped />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'Show details' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
