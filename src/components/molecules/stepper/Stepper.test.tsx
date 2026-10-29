import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Stepper } from './Stepper'

const STEPS = [{ label: 'Shipping' }, { label: 'Payment' }, { label: 'Review', description: 'Check the manifest' }]

describe('Stepper', () => {
  it('is a named ordered list', () => {
    render(<Stepper steps={STEPS} current={1} />)
    const list = screen.getByRole('list', { name: 'Progress' })
    expect(list.tagName).toBe('OL')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('marks the current step, and only it', () => {
    render(<Stepper steps={STEPS} current={1} />)
    const items = screen.getAllByRole('listitem')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[2]).not.toHaveAttribute('aria-current')
  })

  it('says each step status in words', () => {
    render(<Stepper steps={STEPS} current={1} />)
    const [done, now, next] = screen.getAllByRole('listitem')
    expect(done).toHaveTextContent('completed')
    expect(now).toHaveTextContent('current')
    expect(next).toHaveTextContent('not started')
  })

  it('shows every step complete when current is past the end', () => {
    render(<Stepper steps={STEPS} current={3} />)
    screen.getAllByRole('listitem').forEach(item => expect(item).toHaveTextContent('completed'))
  })

  it('renders a step description', () => {
    render(<Stepper steps={STEPS} current={0} />)
    expect(screen.getByText('Check the manifest')).toBeInTheDocument()
  })

  it('has nothing to click', () => {
    render(<Stepper steps={STEPS} current={1} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('forwards a ref to the list', () => {
    const ref = createRef<HTMLOListElement>()
    render(<Stepper ref={ref} steps={STEPS} current={0} />)
    expect(ref.current?.tagName).toBe('OL')
  })

  it('is horizontal from the sm breakpoint by default', () => {
    render(<Stepper steps={STEPS} current={1} />)
    const list = screen.getByRole('list')
    expect(list).toHaveAttribute('data-orientation', 'horizontal')
    expect(list).toHaveClass('sm:grid')
  })

  it('places the first step flush left, middle steps centred and the last flush right', () => {
    const { container } = render(<Stepper steps={[...STEPS, { label: 'Done' }]} current={2} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map(i => i.getAttribute('data-placement'))).toEqual(['first', 'middle', 'middle', 'last'])
    // Two columns per gap between steps: first and last take one, middle steps two.
    expect(screen.getByRole('list').style.getPropertyValue('--stepper-columns')).toBe('6')
    expect(items[1]).toHaveClass('sm:col-span-2', 'sm:items-center')
    expect(items[3]).toHaveClass('sm:items-end')
    // Each gap is drawn as two halves meeting at the column line; done-coloured up to the current step.
    const connectors = [...container.querySelectorAll('[data-part="connector"]')]
    expect(connectors).toHaveLength(6)
    const done = connectors.map(c => c.className.includes('accent-signal-indicator'))
    expect(done).toEqual([true, true, true, true, false, false])
  })

  it('stays a column at every width when vertical, with a connector between markers', () => {
    const { container } = render(<Stepper steps={STEPS} current={1} orientation="vertical" />)
    const list = screen.getByRole('list')
    expect(list).toHaveAttribute('data-orientation', 'vertical')
    expect(list.className).not.toContain('sm:grid')
    // One connector between each pair of steps, never after the last, always shown.
    const connectors = container.querySelectorAll('[data-part="connector"]')
    expect(connectors).toHaveLength(2)
    connectors.forEach(c => expect(c.className).not.toContain('hidden'))
  })

  it('keeps every description and status when vertical', () => {
    render(
      <Stepper
        orientation="vertical"
        current={1}
        steps={[
          { label: 'Ordered', description: 'Paid on 12 October' },
          { label: 'Packed', description: 'At the Brasov depot' },
          { label: 'Shipped' },
        ]}
      />
    )
    const [done, now, next] = screen.getAllByRole('listitem')
    expect(done).toHaveTextContent('Paid on 12 October')
    expect(now).toHaveAttribute('aria-current', 'step')
    expect(now).toHaveTextContent('At the Brasov depot')
    expect(next).toHaveTextContent('not started')
  })

  it('is axe clean when vertical', async () => {
    const { container } = render(<Stepper steps={STEPS} current={2} orientation="vertical" label="Shipment" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('is axe clean', async () => {
    const { container } = render(<Stepper steps={STEPS} current={1} label="Checkout progress" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
