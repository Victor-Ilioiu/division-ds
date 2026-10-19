import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { SectionHeading } from './SectionHeading'

describe('SectionHeading', () => {
  it.each([2, 3, 4] as const)('renders the title as a heading at level %i, the level it was given', level => {
    render(<SectionHeading level={level} title="Top-rated replicas" />)
    expect(screen.getByRole('heading', { level, name: 'Top-rated replicas' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  // The level has no default on purpose. Only the type-check matters here, so the test is skipped:
  // a missing `level` has to fail `tsc -b`, and with it `npm run build`.
  it.skip('requires a level at compile time', () => {
    // @ts-expect-error level is required: the component does not guess where it sits in the outline
    render(<SectionHeading title="Top-rated replicas" />)
    // @ts-expect-error a page has one h1, and it is never a section opener
    render(<SectionHeading level={1} title="Top-rated replicas" />)
  })

  it('shows the description under the title, and no paragraph without one', () => {
    const { rerender, container } = render(
      <SectionHeading level={2} title="Offers" description="Reduced while stock lasts." />
    )
    expect(screen.getByText('Reduced while stock lasts.').tagName).toBe('P')
    rerender(<SectionHeading level={2} title="Offers" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders the trailing action it is given', () => {
    render(<SectionHeading level={2} title="Offers" action={<a href="#offers">All offers</a>} />)
    expect(screen.getByRole('link', { name: 'All offers' })).toHaveAttribute('href', '#offers')
  })

  // The index is a column of figures, not part of the name: a screen reader hears "Offers", never
  // "zero two Offers". Mutation: drop aria-hidden from the index span -> the name becomes
  // "02Offers" and the exact-name query below finds nothing.
  it('draws the index as a two-digit numeral that stays out of the heading name', () => {
    render(<SectionHeading level={2} index={2} title="Offers" />)
    const heading = screen.getByRole('heading', { level: 2, name: 'Offers' })
    const numeral = heading.querySelector('[aria-hidden="true"]')
    expect(numeral).toHaveTextContent('02')
    const [pad, digit] = numeral!.querySelectorAll('span')
    expect(pad).toHaveTextContent(/^0$/)
    expect(pad.className).toContain('--color-numeral-pad')
    expect(digit).toHaveTextContent(/^2$/)
    expect(digit.className).toContain('--color-accent-signal-text')
  })

  // Above the title, not in front of it: the heading is a column and the numeral is its first
  // line. jsdom has no layout, so this holds the two things layout follows from: the order in
  // the DOM and the column direction. e2e/organisms.spec.ts measures the boxes. Mutation: put
  // `flex-row` back on the heading -> the class assertion fails.
  it('stacks the index above the title: first in the heading, in a column', () => {
    render(<SectionHeading level={2} index={2} title="Offers" />)
    const heading = screen.getByRole('heading', { level: 2, name: 'Offers' })
    expect(heading).toHaveClass('flex', 'flex-col')
    const [numeral, title] = Array.from(heading.children)
    expect(numeral).toHaveAttribute('aria-hidden', 'true')
    expect(title).toHaveTextContent('Offers')
    expect(heading.children).toHaveLength(2)
  })

  it('renders no pad once the index fills both digits, and no numeral without an index', () => {
    const { rerender } = render(<SectionHeading level={2} index={12} title="Offers" />)
    const numeral = screen.getByRole('heading').querySelector('[aria-hidden="true"]')
    expect(numeral).toHaveTextContent(/^12$/)
    expect(numeral!.querySelectorAll('span')).toHaveLength(1)
    rerender(<SectionHeading level={2} title="Offers" />)
    expect(screen.getByRole('heading').querySelector('[aria-hidden="true"]')).toBeNull()
  })

  // Mutation: put `id` on the wrapper div -> the section below has no heading to take its name
  // from, and the region query fails.
  it('puts the id on the heading, so a section can be named by it', () => {
    render(
      <section aria-labelledby="offers-heading">
        <SectionHeading level={2} id="offers-heading" title="Offers" />
      </section>
    )
    expect(screen.getByRole('heading', { name: 'Offers' })).toHaveAttribute('id', 'offers-heading')
    expect(screen.getByRole('region', { name: 'Offers' })).toBeInTheDocument()
  })

  it('opens under the hairline, and merges a className onto the root', () => {
    const { container } = render(<SectionHeading level={2} title="Offers" className="mt-12" />)
    const root = container.firstElementChild!
    expect(root).toHaveClass('border-t', 'mt-12')
    expect(root.className).toContain('--color-border-hairline-strong')
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<SectionHeading ref={ref} level={2} title="Offers" />)
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current).toContainElement(screen.getByRole('heading'))
  })

  it('is axe clean with every part showing', async () => {
    const { container } = render(
      <main>
        <h1>Hexline</h1>
        <section aria-labelledby="axe-heading">
          <SectionHeading
            level={2}
            index={1}
            id="axe-heading"
            title="Top-rated replicas"
            description="The three the reviews put first."
            action={<a href="#replicas">All replicas</a>}
          />
        </section>
      </main>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
