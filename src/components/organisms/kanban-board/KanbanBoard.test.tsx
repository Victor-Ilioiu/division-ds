import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import {
  KanbanBoard,
  applyKanbanMove,
  groupKanbanItems,
  kanbanDragOver,
  kanbanDrop,
  kanbanMessages,
  kanbanPosition,
  type KanbanBoardProps,
  type KanbanColumn,
} from './KanbanBoard'

type Job = { id: string; name: string; stage: string }

const COLUMNS: KanbanColumn[] = [
  { id: 'applied', title: 'Applied', meta: '2 people' },
  { id: 'interview', title: 'Interview' },
  { id: 'offer', title: 'Offer' },
]

const JOBS: Job[] = [
  { id: 'a', name: 'Ilse Varga', stage: 'applied' },
  { id: 'b', name: 'Tomas Reyes', stage: 'applied' },
  { id: 'c', name: 'Mara Lind', stage: 'interview' },
]

const accessors = {
  getItemId: (job: Job) => job.id,
  getColumnId: (job: Job) => job.stage,
  setColumnId: (job: Job, stage: string) => ({ ...job, stage }),
}

function Board(props: Partial<KanbanBoardProps<Job>>) {
  return (
    <KanbanBoard
      label="Hiring board"
      columns={COLUMNS}
      items={JOBS}
      getItemId={accessors.getItemId}
      getColumnId={accessors.getColumnId}
      getItemLabel={job => job.name}
      renderCard={job => <a href={`#${job.id}`}>{job.name}</a>}
      onMove={() => {}}
      {...props}
    />
  )
}

/** A parent that applies each move, as every real board does. */
function LiveBoard({ onMove }: { onMove?: (...args: [string, string, number]) => void }) {
  const [jobs, setJobs] = useState(JOBS)
  return (
    <Board
      items={jobs}
      onMove={(id, stage, index) => {
        onMove?.(id, stage, index)
        setJobs(current => applyKanbanMove(current, id, stage, index, accessors))
      }}
    />
  )
}

const columnList = (title: string) => screen.getByRole('list', { name: title })

describe('KanbanBoard', () => {
  it('is a region named by label, with a column per entry and the cards in items order', () => {
    render(<Board />)
    const region = screen.getByRole('region', { name: 'Hiring board' })
    expect(within(region).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual([
      'Applied',
      'Interview',
      'Offer',
    ])
    expect(within(columnList('Applied')).getAllByRole('link').map(link => link.textContent)).toEqual([
      'Ilse Varga',
      'Tomas Reyes',
    ])
    expect(within(columnList('Interview')).getAllByRole('link').map(link => link.textContent)).toEqual(['Mara Lind'])
    expect(screen.getByText('2 people')).toBeInTheDocument()
  })

  it('takes the column heading level from columnHeadingLevel', () => {
    render(<Board columnHeadingLevel={4} />)
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3)
  })

  it('shows the empty message in a column with no cards, and no empty list', () => {
    render(<Board />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Offer' })).toBeNull()
  })

  it('puts the renderCardCorner mark after the Move control, on the card’s right edge', () => {
    render(<Board renderCardCorner={job => <span data-testid={`corner-${job.id}`}>{job.name[0]}</span>} />)
    const corner = screen.getByTestId('corner-a')
    const move = screen.getByRole('button', { name: 'Move Ilse Varga' })
    expect(move.compareDocumentPosition(corner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(move.closest('[class*="self-stretch"]')).toContainElement(corner)
  })

  it('takes its own empty message', () => {
    render(<Board emptyColumnMessage="No offers yet" />)
    expect(screen.getByText('No offers yet')).toBeInTheDocument()
  })

  it('gives every card a Move control named for the card, described by the drag instructions', () => {
    render(<Board />)
    const move = screen.getByRole('button', { name: 'Move Ilse Varga' })
    expect(move).toHaveAttribute('aria-haspopup', 'menu')
    const describedBy = move.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)).toHaveTextContent(/press Space/)
    expect(screen.getAllByRole('button', { name: /^Move / })).toHaveLength(3)
  })

  it('lists the other columns in the Move menu, and a choice moves the card to the end of that column', async () => {
    const onMove = vi.fn()
    render(<Board onMove={onMove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move Ilse Varga' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Move to Interview',
      'Move to Offer',
    ])
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Move to Interview' }))
    // Interview holds one card, so the end of it is index 1.
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a', 'interview', 1)
  })

  it('moves into an empty column at index 0', async () => {
    const onMove = vi.fn()
    render(<Board onMove={onMove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move Mara Lind' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Move to Offer' }))
    expect(onMove).toHaveBeenCalledExactlyOnceWith('c', 'offer', 0)
  })

  it('after a menu move, says where the card went and puts focus on its Move control in the new column', async () => {
    render(<LiveBoard />)
    await userEvent.click(screen.getByRole('button', { name: 'Move Ilse Varga' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Move to Offer' }))
    const offer = columnList('Offer')
    expect(within(offer).getByRole('link', { name: 'Ilse Varga' })).toBeInTheDocument()
    expect(within(offer).getByRole('button', { name: 'Move Ilse Varga' })).toHaveFocus()
    expect(screen.getByText('Ilse Varga moved to Offer, position 1 of 1.')).toBeInTheDocument()
  })

  it('opens the menu with Enter, and lifts the card with Space, announcing it in plain words', async () => {
    const onMove = vi.fn()
    render(<Board onMove={onMove} />)
    // The first card: jsdom has no layout, so every rect is empty and the card a drag is over is
    // always the first one. Lifting the first card is the one case that matches a real browser.
    const move = screen.getByRole('button', { name: 'Move Ilse Varga' })
    move.focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(move).toHaveFocus()

    await userEvent.keyboard(' ')
    expect(await screen.findByText('Picked up Ilse Varga. It is in Applied, position 1 of 2.')).toBeInTheDocument()
    // An arrow while lifted belongs to the drag: it never opens the menu.
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.queryByRole('menu')).toBeNull()
    await act(async () => {
      await userEvent.keyboard('{Escape}')
    })
    expect(await screen.findByText('Move cancelled. Ilse Varga is back in Applied, position 1 of 2.')).toBeInTheDocument()
    expect(onMove).not.toHaveBeenCalled()
  })

  it('is axe clean', async () => {
    const { container } = render(<Board />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('is axe clean with the Move menu open', async () => {
    render(<Board />)
    await userEvent.click(screen.getByRole('button', { name: 'Move Ilse Varga' }))
    await screen.findByRole('menu')
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})

describe('kanbanMessages', () => {
  it('says the card, the column and a position counted from one', () => {
    expect(kanbanMessages.pickedUp('Ilse Varga', 'Applied', 1, 2)).toBe('Picked up Ilse Varga. It is in Applied, position 1 of 2.')
    expect(kanbanMessages.over('Ilse Varga', 'Offer', 1, 1)).toBe('Ilse Varga is over Offer, position 1 of 1.')
    expect(kanbanMessages.moved('Ilse Varga', 'Interview', 2, 2)).toBe('Ilse Varga moved to Interview, position 2 of 2.')
    expect(kanbanMessages.unchanged('Ilse Varga', 'Applied', 1, 2)).toBe(
      'Ilse Varga dropped where it was, in Applied, position 1 of 2.'
    )
    expect(kanbanMessages.cancelled('Ilse Varga', 'Applied', 1, 2)).toBe(
      'Move cancelled. Ilse Varga is back in Applied, position 1 of 2.'
    )
  })
})

describe('the drag logic, as pure functions', () => {
  const layout = groupKanbanItems(COLUMNS, JOBS, accessors.getItemId, accessors.getColumnId)

  it('groups items by column in items order, and drops an item whose column does not exist', () => {
    expect(layout).toEqual({ applied: ['a', 'b'], interview: ['c'], offer: [] })
    expect(groupKanbanItems(COLUMNS, [...JOBS, { id: 'x', name: 'X', stage: 'gone' }], accessors.getItemId, accessors.getColumnId)).toEqual(layout)
  })

  it('reads a position', () => {
    expect(kanbanPosition(layout, 'b')).toEqual({ columnId: 'applied', index: 1, count: 2 })
    expect(kanbanPosition(layout, 'nope')).toBeUndefined()
  })

  it('drag over: moves the card into another column at the card it is over, or the end of an empty one', () => {
    expect(kanbanDragOver(layout, 'a', { columnId: 'interview', itemId: 'c' })).toEqual({
      applied: ['b'],
      interview: ['a', 'c'],
      offer: [],
    })
    expect(kanbanDragOver(layout, 'a', { columnId: 'offer' })).toEqual({ applied: ['b'], interview: ['c'], offer: ['a'] })
  })

  it('drag over: returns the same layout inside one column, so nothing renders', () => {
    expect(kanbanDragOver(layout, 'a', { columnId: 'applied', itemId: 'b' })).toBe(layout)
  })

  it('drop: inside a column the card takes the index of the card it is over', () => {
    expect(kanbanDrop(layout, 'a', { columnId: 'applied', itemId: 'b' }).applied).toEqual(['b', 'a'])
    expect(kanbanDrop(layout, 'b', { columnId: 'applied', itemId: 'a' }).applied).toEqual(['b', 'a'])
  })

  it('drop: on itself changes nothing', () => {
    expect(kanbanDrop(layout, 'a', { columnId: 'applied', itemId: 'a' })).toBe(layout)
  })

  it('drop: across columns is the same move as drag over', () => {
    expect(kanbanDrop(layout, 'c', { columnId: 'applied', itemId: 'b' })).toEqual({
      applied: ['a', 'c', 'b'],
      interview: [],
      offer: [],
    })
  })

  it('applyKanbanMove puts the card at toIndex in its new column and keeps every other order', () => {
    const moved = applyKanbanMove(JOBS, 'c', 'applied', 1, accessors)
    expect(moved.map(job => `${job.id}:${job.stage}`)).toEqual(['a:applied', 'c:applied', 'b:applied'])
    const toEnd = applyKanbanMove(JOBS, 'a', 'interview', 1, accessors)
    expect(groupKanbanItems(COLUMNS, toEnd, accessors.getItemId, accessors.getColumnId)).toEqual({
      applied: ['b'],
      interview: ['c', 'a'],
      offer: [],
    })
    const toEmpty = applyKanbanMove(JOBS, 'b', 'offer', 0, accessors)
    expect(toEmpty.find(job => job.id === 'b')?.stage).toBe('offer')
    expect(JOBS[1].stage).toBe('applied')
  })
})
