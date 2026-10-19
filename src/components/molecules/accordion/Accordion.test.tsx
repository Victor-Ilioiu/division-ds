import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion'

function Faq(props: { variant?: 'plain' | 'boxed'; type?: 'single' | 'multiple' }) {
  const items = (
    <>
      <AccordionItem value="ship">
        <AccordionTrigger>How long does shipping take?</AccordionTrigger>
        <AccordionContent>Two to four working days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="return">
        <AccordionTrigger>Can I return a replica?</AccordionTrigger>
        <AccordionContent>Within 30 days, unfired.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="gone" disabled>
        <AccordionTrigger>Discontinued line</AccordionTrigger>
        <AccordionContent>No longer stocked.</AccordionContent>
      </AccordionItem>
    </>
  )
  return props.type === 'multiple' ? (
    <Accordion type="multiple" variant={props.variant}>
      {items}
    </Accordion>
  ) : (
    <Accordion type="single" collapsible variant={props.variant}>
      {items}
    </Accordion>
  )
}

describe('Accordion', () => {
  it('renders every trigger as a button inside a heading, level 3 by default', () => {
    render(<Faq />)
    const heading = screen.getByRole('heading', { level: 3, name: 'How long does shipping take?' })
    expect(heading).toContainElement(screen.getByRole('button', { name: 'How long does shipping take?' }))
  })

  it('lets the consumer set the heading level', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger level={2}>Payment</AccordionTrigger>
          <AccordionContent>Cards and bank transfer.</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Payment' })).toBeInTheDocument()
  })

  it('starts closed, opens on click and collapses again in single collapsible mode', async () => {
    render(<Faq />)
    const trigger = screen.getByRole('button', { name: 'How long does shipping take?' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'How long does shipping take?' })).toHaveTextContent('Two to four')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the open item when another opens in single mode', async () => {
    render(<Faq />)
    const first = screen.getByRole('button', { name: 'How long does shipping take?' })
    const second = screen.getByRole('button', { name: 'Can I return a replica?' })
    await userEvent.click(first)
    await userEvent.click(second)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps several open in multiple mode', async () => {
    render(<Faq type="multiple" />)
    const first = screen.getByRole('button', { name: 'How long does shipping take?' })
    const second = screen.getByRole('button', { name: 'Can I return a replica?' })
    await userEvent.click(first)
    await userEvent.click(second)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(second).toHaveAttribute('aria-expanded', 'true')
  })

  it('moves between triggers with the arrow keys and toggles with Enter and Space', async () => {
    render(<Faq />)
    await userEvent.tab()
    const first = screen.getByRole('button', { name: 'How long does shipping take?' })
    const second = screen.getByRole('button', { name: 'Can I return a replica?' })
    expect(first).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(second).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard(' ')
    expect(second).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard('{Home}')
    expect(first).toHaveFocus()
  })

  it('does not open a disabled item', async () => {
    render(<Faq />)
    const trigger = screen.getByRole('button', { name: 'Discontinued line' })
    expect(trigger).toBeDisabled()
  })

  it('marks the variant on the root, plain by default', () => {
    const { container, rerender } = render(<Faq />)
    expect(container.firstElementChild).toHaveAttribute('data-variant', 'plain')
    rerender(<Faq variant="boxed" />)
    expect(container.firstElementChild).toHaveAttribute('data-variant', 'boxed')
  })

  it('gives a boxed item an aria-hidden bevelled backing layer and leaves the item itself unclipped', () => {
    const { container } = render(<Faq variant="boxed" />)
    const item = container.querySelector('[data-accordion-item]')!
    expect(item.className).not.toMatch(/bevel-/)
    const backing = item.querySelector('[aria-hidden="true"].bevel-md')
    expect(backing).not.toBeNull()
  })

  it('merges className on every part', () => {
    const { container } = render(
      <Accordion type="single" collapsible className="root-x">
        <AccordionItem value="a" className="item-x">
          <AccordionTrigger className="trigger-x">Payment</AccordionTrigger>
          <AccordionContent className="content-x" forceMount>
            Cards.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(container.firstElementChild).toHaveClass('root-x')
    expect(container.querySelector('.item-x')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Payment' })).toHaveClass('trigger-x')
    expect(container.querySelector('.content-x')).not.toBeNull()
  })

  it('forwards refs', () => {
    const root = createRef<HTMLDivElement>()
    const item = createRef<HTMLDivElement>()
    const trigger = createRef<HTMLButtonElement>()
    render(
      <Accordion type="single" collapsible ref={root}>
        <AccordionItem value="a" ref={item}>
          <AccordionTrigger ref={trigger}>Payment</AccordionTrigger>
          <AccordionContent>Cards.</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(root.current).not.toBeNull()
    expect(item.current).not.toBeNull()
    expect(trigger.current).toBe(screen.getByRole('button', { name: 'Payment' }))
  })

  it('is axe-clean closed and open, in both variants', async () => {
    const { container, rerender } = render(<Faq />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'How long does shipping take?' }))
    expect(await axeClean(container)).toHaveNoViolations()
    rerender(<Faq variant="boxed" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
