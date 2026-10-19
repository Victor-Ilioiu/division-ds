import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { DescriptionList } from './DescriptionList'

const ITEMS = [
  { term: 'Serial', description: 'HS-4471-B' },
  { term: 'Firmware', description: <strong>2.8.1</strong> },
  { term: 'Last seen', description: '09:58' },
]

describe('DescriptionList', () => {
  it('renders a dl with one div per pair, merging className and forwarding ref', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(<DescriptionList ref={ref} items={ITEMS} className="extra" />)
    const list = container.querySelector('dl')!
    expect(ref.current).toHaveClass('extra')
    expect(ref.current).toHaveClass('@container')
    expect([...list.children].map(child => child.tagName)).toEqual(['DIV', 'DIV', 'DIV'])
    expect(list.children[0].children[0].tagName).toBe('DT')
    expect(list.children[0].children[1].tagName).toBe('DD')
  })

  it('pairs each term with its description', () => {
    render(<DescriptionList items={ITEMS} />)
    expect(screen.getByText('Firmware').tagName).toBe('DT')
    expect(screen.getByText('2.8.1').closest('dd')).toBeInTheDocument()
    expect(screen.getAllByRole('term')).toHaveLength(3)
    expect(screen.getAllByRole('definition')).toHaveLength(3)
  })

  it('is one column by default and collapses to one in a narrow container', () => {
    const { container, rerender } = render(<DescriptionList items={ITEMS} />)
    expect(container.querySelector('dl')).toHaveClass('grid-cols-1')
    expect(container.querySelector('dl')!.className).not.toContain('@md:')
    rerender(<DescriptionList items={ITEMS} columns={3} />)
    const grid = container.querySelector('dl')!
    expect(grid).toHaveClass('grid-cols-1', '@md:grid-cols-2', '@2xl:grid-cols-3')
  })

  it('is axe clean', async () => {
    const { container } = render(<DescriptionList items={ITEMS} columns={2} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
