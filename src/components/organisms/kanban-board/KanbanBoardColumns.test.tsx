import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { KANBAN_TINT as GATE_TINT } from '../../../../scripts/lib/pairs-for-tokens.mjs'
import {
  KANBAN_TINT,
  KanbanBoard,
  applyKanbanColumnAdd,
  applyKanbanColumnDelete,
  applyKanbanColumnMove,
  applyKanbanMove,
  kanbanMessages,
  type KanbanBoardProps,
  type KanbanColumn,
} from './KanbanBoard'

type Job = { id: string; name: string; stage: string }

const COLUMNS: KanbanColumn[] = [
  { id: 'applied', title: 'Applied', color: 'blue', limit: 3 },
  { id: 'interview', title: 'Interview' },
  { id: 'offer', title: 'Offer', color: 'green' },
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

/** A parent that holds columns and items and applies every column change, as a real one does. */
function LiveBoard({ spy }: { spy?: Partial<KanbanBoardProps<Job>> }) {
  const [columns, setColumns] = useState(COLUMNS)
  const [jobs, setJobs] = useState(JOBS)
  return (
    <Board
      columns={columns}
      items={jobs}
      onMove={(id, stage, index) => {
        spy?.onMove?.(id, stage, index)
        setJobs(current => applyKanbanMove(current, id, stage, index, accessors))
      }}
      onColumnMove={(id, index) => {
        spy?.onColumnMove?.(id, index)
        setColumns(current => applyKanbanColumnMove(current, id, index))
      }}
      onColumnAdd={(after, draft) => {
        spy?.onColumnAdd?.(after, draft)
        setColumns(current => applyKanbanColumnAdd(current, after, { id: draft.title.toLowerCase(), ...draft }))
      }}
      onColumnEdit={(id, draft) => {
        spy?.onColumnEdit?.(id, draft)
        setColumns(current => current.map(column => (column.id === id ? { ...column, ...draft } : column)))
      }}
      onColumnDelete={(id, moveTo) => {
        spy?.onColumnDelete?.(id, moveTo)
        setColumns(current => current.filter(column => column.id !== id))
        setJobs(current => applyKanbanColumnDelete(current, id, moveTo, accessors))
      }}
      tableColumns={[{ key: 'name', header: 'Candidate', cell: job => job.name, sortValue: job => job.name }]}
    />
  )
}

const columnOf = (id: string) => document.querySelector(`[data-kanban-column="${id}"]`) as HTMLElement
const titles = () => screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)

async function openColumnMenu(title: string) {
  await userEvent.click(screen.getByRole('button', { name: `${title} column options` }))
  return screen.findByRole('menu')
}

describe('KanbanBoard column colours', () => {
  it('keeps the tint numbers the contrast gate measures', () => {
    expect(KANBAN_TINT).toEqual(GATE_TINT)
  })

  it('colours the title with the category text token and tints the column and its cards with the fill', () => {
    render(<Board />)
    const applied = columnOf('applied')
    expect(within(applied).getByRole('heading', { name: 'Applied' })).toHaveStyle({ color: 'var(--color-category-blue-text)' })
    const tints = applied.querySelectorAll<HTMLElement>('[data-kanban-tint="blue"]')
    // The column's own layer, then one per card.
    expect(tints).toHaveLength(3)
    expect(tints[0].style.opacity).toBe(String(KANBAN_TINT.column))
    expect(tints[1].style.opacity).toBe(String(KANBAN_TINT.card))
    expect(tints[0].style.backgroundColor).toBe('var(--color-category-blue-fill)')
    expect(tints[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('leaves a column with no colour as it was: primary title, no tint', () => {
    render(<Board />)
    const interview = columnOf('interview')
    expect(within(interview).getByRole('heading', { name: 'Interview' })).toHaveStyle({ color: 'var(--color-text-primary)' })
    expect(interview.querySelector('[data-kanban-tint]')).toBeNull()
  })
})

describe('KanbanBoard card limits', () => {
  it('shows the count against the limit, and says when a column is over it', () => {
    const { rerender } = render(<Board />)
    expect(within(columnOf('applied')).getByText('2 of a limit of 3 cards.')).toBeInTheDocument()
    rerender(<Board columns={[{ ...COLUMNS[0], limit: 1 }, ...COLUMNS.slice(1)]} />)
    expect(within(columnOf('applied')).getByText('2 cards, over the limit of 1.')).toBeInTheDocument()
    expect(within(columnOf('applied')).getByText(/Over limit/)).toBeInTheDocument()
  })
})

describe('KanbanBoard column menu', () => {
  it('has no header buttons without the column callbacks', () => {
    render(<Board />)
    expect(screen.queryByRole('button', { name: /column options/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Add a column/ })).toBeNull()
  })

  it('lists Edit, Move left, Move right and Delete, leaving out a move past either end', async () => {
    render(<LiveBoard />)
    const first = await openColumnMenu('Applied')
    expect(within(first).getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Edit', 'Move right', 'Delete'])
    await userEvent.keyboard('{Escape}')
    const middle = await openColumnMenu('Interview')
    expect(within(middle).getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Edit', 'Move left', 'Move right', 'Delete'])
  })

  it('moves a column from the menu, says so, and keeps focus on its More button', async () => {
    const onColumnMove = vi.fn()
    render(<LiveBoard spy={{ onColumnMove }} />)
    const menu = await openColumnMenu('Applied')
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Move right' }))
    expect(onColumnMove).toHaveBeenCalledWith('applied', 1)
    expect(titles()).toEqual(['Interview', 'Applied', 'Offer'])
    expect(screen.getByText(kanbanMessages.columnMoved('Applied', 2, 3))).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Applied column options' })).toHaveFocus())
  })
})

describe('KanbanBoard column dialogs', () => {
  it('edits the name, the colour and the limit, then gives focus back to the More button', async () => {
    const onColumnEdit = vi.fn()
    render(<LiveBoard spy={{ onColumnEdit }} />)
    const menu = await openColumnMenu('Interview')
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Interview' })
    const name = within(dialog).getByRole('textbox', { name: /Name/ })
    expect(name).toHaveValue('Interview')
    await userEvent.clear(name)
    await userEvent.type(name, 'Screen')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Colour' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Purple' }))
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Card limit/ }), '4')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(onColumnEdit).toHaveBeenCalledWith('interview', { title: 'Screen', color: 'purple', limit: 4 })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(within(columnOf('interview')).getByRole('heading', { name: 'Screen' })).toHaveStyle({
      color: 'var(--color-category-purple-text)',
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Screen column options' })).toHaveFocus())
  })

  it('stops a save with no name or a limit that is not a whole number, and says why', async () => {
    const onColumnEdit = vi.fn()
    render(<LiveBoard spy={{ onColumnEdit }} />)
    await userEvent.click(within(await openColumnMenu('Offer')).getByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Offer' })
    await userEvent.clear(within(dialog).getByRole('textbox', { name: /Name/ }))
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Card limit/ }), '2.5')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(onColumnEdit).not.toHaveBeenCalled()
    const summary = within(dialog).getByRole('heading', { name: 'There is a problem' }).closest('[tabindex]') as HTMLElement
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getByRole('link', { name: 'Enter a name for the column.' })).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: /whole number above 0/ })).toBeInTheDocument()
  })

  it('adds a column after the one whose Add button was pressed', async () => {
    const onColumnAdd = vi.fn()
    render(<LiveBoard spy={{ onColumnAdd }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add a column after Applied' }))
    const dialog = await screen.findByRole('dialog', { name: 'New column' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Name/ }), 'Screening')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add column' }))
    expect(onColumnAdd).toHaveBeenCalledWith('applied', { title: 'Screening', color: undefined, limit: undefined })
    expect(titles()).toEqual(['Applied', 'Screening', 'Interview', 'Offer'])
    expect(screen.getByText(kanbanMessages.columnAdded('Screening'))).toBeInTheDocument()
  })

  it('deletes an empty column on a plain confirm and moves focus to the next column', async () => {
    const onColumnDelete = vi.fn()
    render(<LiveBoard spy={{ onColumnDelete }} />)
    await userEvent.click(within(await openColumnMenu('Offer')).getByRole('menuitem', { name: 'Delete' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Delete Offer?' })
    expect(within(confirm).queryByRole('combobox')).toBeNull()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete column' }))
    await waitFor(() => expect(onColumnDelete).toHaveBeenCalledWith('offer', null))
    expect(titles()).toEqual(['Applied', 'Interview'])
    // Offer was last, so the previous column takes focus.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Interview column options' })).toHaveFocus())
  })

  it('asks where a column’s cards go before deleting it, the next column by default', async () => {
    const onColumnDelete = vi.fn()
    render(<LiveBoard spy={{ onColumnDelete }} />)
    await userEvent.click(within(await openColumnMenu('Applied')).getByRole('menuitem', { name: 'Delete' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Delete Applied?' })
    expect(within(confirm).getByRole('combobox', { name: 'Move its cards to' })).toHaveTextContent('Interview')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete column' }))
    await waitFor(() => expect(onColumnDelete).toHaveBeenCalledWith('applied', 'interview'))
    const interview = screen.getByRole('list', { name: 'Interview' })
    expect(within(interview).getAllByRole('link').map(link => link.textContent)).toEqual(['Mara Lind', 'Ilse Varga', 'Tomas Reyes'])
  })

  it('keeps the column when the confirm is cancelled', async () => {
    const onColumnDelete = vi.fn()
    render(<LiveBoard spy={{ onColumnDelete }} />)
    await userEvent.click(within(await openColumnMenu('Offer')).getByRole('menuitem', { name: 'Delete' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Keep column' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Offer column options' })).toHaveFocus())
    expect(onColumnDelete).not.toHaveBeenCalled()
  })

  it('offers an Add column button on a board with no columns', async () => {
    const onColumnAdd = vi.fn()
    render(<Board columns={[]} items={[]} onColumnAdd={onColumnAdd} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add column' }))
    const dialog = await screen.findByRole('dialog', { name: 'New column' })
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Name/ }), 'To do')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add column' }))
    expect(onColumnAdd).toHaveBeenCalledWith(null, { title: 'To do', color: undefined, limit: undefined })
  })
})

describe('KanbanBoard Add card', () => {
  it('puts an Add card button at the foot of each column, named for the column', async () => {
    const onAddCard = vi.fn()
    render(<Board onAddCard={onAddCard} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card to Offer' }))
    expect(onAddCard).toHaveBeenCalledWith('offer')
  })
})

describe('KanbanBoard table view', () => {
  it('has no view switch without tableColumns', () => {
    render(<Board />)
    expect(screen.queryByRole('radiogroup', { name: 'View' })).toBeNull()
  })

  it('switches to a table of the same items, with each card’s column as a Select', async () => {
    const onMove = vi.fn()
    render(<LiveBoard spy={{ onMove }} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Table' }))
    const table = screen.getByRole('table', { name: 'Hiring board' })
    expect(within(table).getAllByRole('rowheader').map(cell => cell.textContent)).toEqual(['Ilse Varga', 'Tomas Reyes', 'Mara Lind'])
    const status = within(table).getByRole('combobox', { name: 'Status for Mara Lind' })
    expect(status).toHaveTextContent('Interview')
    await userEvent.click(status)
    await userEvent.click(await screen.findByRole('option', { name: 'Offer' }))
    expect(onMove).toHaveBeenCalledWith('c', 'offer', 0)
    // The row keeps its place; only its Status changed.
    expect(within(table).getAllByRole('rowheader').map(cell => cell.textContent)).toEqual(['Ilse Varga', 'Tomas Reyes', 'Mara Lind'])
    expect(within(table).getByRole('combobox', { name: 'Status for Mara Lind' })).toHaveTextContent('Offer')
    await userEvent.click(screen.getByRole('radio', { name: 'Board' }))
    expect(within(screen.getByRole('list', { name: 'Offer' })).getByRole('link', { name: 'Mara Lind' })).toBeInTheDocument()
  })

  it('follows a controlled view', () => {
    const onViewChange = vi.fn()
    render(
      <Board
        view="table"
        onViewChange={onViewChange}
        tableColumns={[{ key: 'name', header: 'Candidate', cell: job => job.name }]}
      />
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('KanbanBoard with every column feature', () => {
  it('is axe clean on the board, the open column menu and the table', async () => {
    const { container } = render(<LiveBoard />)
    expect(await axeClean(container)).toHaveNoViolations()
    await openColumnMenu('Applied')
    expect(await axeClean(document.body)).toHaveNoViolations()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('radio', { name: 'Table' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('is axe clean with the edit dialog open', async () => {
    render(<LiveBoard />)
    await userEvent.click(within(await openColumnMenu('Applied')).getByRole('menuitem', { name: 'Edit' }))
    await screen.findByRole('dialog')
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})

describe('column helpers', () => {
  it('applyKanbanColumnMove puts the column at toIndex, clamped to the row', () => {
    expect(applyKanbanColumnMove(COLUMNS, 'offer', 0).map(column => column.id)).toEqual(['offer', 'applied', 'interview'])
    expect(applyKanbanColumnMove(COLUMNS, 'applied', 9).map(column => column.id)).toEqual(['interview', 'offer', 'applied'])
  })

  it('applyKanbanColumnAdd inserts after a column, or first', () => {
    const added = { id: 'new', title: 'New' }
    expect(applyKanbanColumnAdd(COLUMNS, 'applied', added).map(column => column.id)).toEqual(['applied', 'new', 'interview', 'offer'])
    expect(applyKanbanColumnAdd(COLUMNS, null, added)[0].id).toBe('new')
  })

  it('applyKanbanColumnDelete moves the cards to the end of another column in order, or drops them', () => {
    expect(applyKanbanColumnDelete(JOBS, 'applied', 'interview', accessors).map(job => `${job.id}:${job.stage}`)).toEqual([
      'c:interview',
      'a:interview',
      'b:interview',
    ])
    expect(applyKanbanColumnDelete(JOBS, 'applied', null, accessors).map(job => job.id)).toEqual(['c'])
  })

  it('speaks a column move in plain words', () => {
    expect(kanbanMessages.columnPickedUp('Applied', 1, 3)).toBe('Picked up the Applied column. It is column 1 of 3.')
    expect(kanbanMessages.columnMoved('Applied', 2, 3)).toBe('The Applied column moved to column 2 of 3.')
    expect(kanbanMessages.columnCancelled('Applied', 1, 3)).toBe('Move cancelled. The Applied column is back at column 1 of 3.')
  })
})
