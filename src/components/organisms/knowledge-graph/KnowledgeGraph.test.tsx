import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { KnowledgeGraph, type GraphGroup, type GraphLink, type GraphNode } from './KnowledgeGraph'

// jsdom has no WebGL 2, so these tests see the fallback: the note list, shown.
const NODES: GraphNode[] = [
  { id: 'a', label: 'Packing guide', group: 'ops' },
  { id: 'b', label: 'Carrier rates', group: 'ops' },
  { id: 'c', label: 'Loose note', group: 'misc' },
]
const LINKS: GraphLink[] = [{ source: 'a', target: 'b' }]
const GROUPS: GraphGroup[] = [
  { id: 'ops', label: 'Operations', color: 'blue' },
  { id: 'misc', label: 'Other', color: 'gray' },
]

describe('KnowledgeGraph', () => {
  it('lists every note as a button by its label', () => {
    render(<KnowledgeGraph label="Map of notes" nodes={NODES} links={LINKS} groups={GROUPS} onSelect={() => {}} />)
    const list = screen.getByRole('list', { name: 'Map of notes' })
    expect(list.querySelectorAll('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Packing guide' })).toBeInTheDocument()
  })

  it('calls onSelect with the picked id', async () => {
    const onSelect = vi.fn()
    render(<KnowledgeGraph label="Map of notes" nodes={NODES} links={LINKS} groups={GROUPS} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Carrier rates' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('hides notes without links when asked, and counts groups in the legend', () => {
    render(<KnowledgeGraph label="Map of notes" nodes={NODES} links={LINKS} groups={GROUPS} hideOrphans onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Loose note' })).not.toBeInTheDocument()
    const legend = screen.getByRole('list', { name: 'Groups' })
    expect(legend).toHaveTextContent('Operations')
    expect(legend).not.toHaveTextContent('Other')
  })

  it('forwards a ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    render(<KnowledgeGraph ref={ref} className="mt-4" label="Map of notes" nodes={NODES} links={LINKS} groups={GROUPS} onSelect={() => {}} />)
    expect(ref.current).toHaveClass('mt-4', 'flex')
  })

  it('is axe clean', async () => {
    const { container } = render(
      <KnowledgeGraph label="Map of notes" nodes={NODES} links={LINKS} groups={GROUPS} onSelect={() => {}} />,
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
