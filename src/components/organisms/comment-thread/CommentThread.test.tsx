import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Toaster } from '../../molecules'
import { CommentThread, type ThreadComment } from './CommentThread'

const COMMENTS: ThreadComment[] = [
  {
    id: 'c1',
    author: { name: 'Ilse Varga' },
    body: 'The login form loses the email on a failed submit.\nSteps are in the screenshot.',
    time: '2026-11-25T09:40:00Z',
    timeLabel: '09:40',
    canEdit: true,
    canDelete: true,
    replies: [
      {
        id: 'c2',
        author: { name: 'Claude', assistant: true },
        body: 'Fixed on the branch: the field keeps its value now.',
        time: '2026-11-25T10:05:00Z',
        timeLabel: '10:05',
        edited: true,
      },
    ],
  },
]

function renderThread(props: Partial<Parameters<typeof CommentThread>[0]> = {}) {
  return render(
    <Toaster>
      <CommentThread label="Comments on #12" comments={COMMENTS} {...props} />
    </Toaster>
  )
}

describe('CommentThread', () => {
  it('lists comments with their author, time and replies', () => {
    renderThread()
    const list = screen.getByRole('list', { name: 'Comments on #12' })
    const first = within(list).getByRole('article', { name: 'Ilse Varga' })
    expect(first).toHaveTextContent('The login form loses the email')
    expect(within(first).getByText('09:40')).toHaveAttribute('datetime', '2026-11-25T09:40:00Z')
    const replies = screen.getByRole('list', { name: 'Replies to Ilse Varga' })
    const reply = within(replies).getByRole('article', { name: 'Claude' })
    expect(within(reply).getByText('Assistant')).toBeInTheDocument()
    expect(within(reply).getByText('Edited')).toBeInTheDocument()
  })

  it('shows an empty state with no comments, and no box without onAdd', () => {
    renderThread({ comments: [] })
    expect(screen.getByRole('heading', { name: 'No comments yet' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('adds a comment and clears the box', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    renderThread({ onAdd })
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'Can you check Safari too?')
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    expect(onAdd).toHaveBeenCalledWith('Can you check Safari too?', null)
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Add a comment' })).toHaveValue(''))
  })

  it('sends with Ctrl+Enter', async () => {
    const onAdd = vi.fn()
    renderThread({ onAdd })
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'Shipped{Control>}{Enter}{/Control}')
    expect(onAdd).toHaveBeenCalledWith('Shipped', null)
  })

  it('keeps the text when adding fails', async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error('offline'))
    renderThread({ onAdd })
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'Lost?')
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await waitFor(() => expect(onAdd).toHaveBeenCalled())
    expect(screen.getByRole('textbox', { name: 'Add a comment' })).toHaveValue('Lost?')
  })

  it('replies to a reply under the same top-level comment', async () => {
    const onAdd = vi.fn()
    renderThread({ onAdd })
    await userEvent.click(screen.getByRole('button', { name: 'Reply to Claude' }))
    const box = screen.getByRole('textbox', { name: 'Reply to Ilse Varga' })
    expect(box).toHaveFocus()
    await userEvent.type(box, 'Thanks')
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))
    expect(onAdd).toHaveBeenCalledWith('Thanks', 'c1')
  })

  it('edits only the comments that allow it', async () => {
    const onEdit = vi.fn()
    renderThread({ onEdit })
    expect(screen.queryByRole('button', { name: 'Edit comment by Claude' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Edit comment by Ilse Varga' }))
    const box = screen.getByRole('textbox', { name: 'Edit comment by Ilse Varga' })
    await userEvent.clear(box)
    await userEvent.type(box, 'Fixed wording')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onEdit).toHaveBeenCalledWith('c1', 'Fixed wording')
  })

  it('asks before deleting', async () => {
    const onDelete = vi.fn()
    renderThread({ onDelete })
    await userEvent.click(screen.getByRole('button', { name: 'Delete comment by Ilse Varga' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this comment?' })
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete comment' }))
    expect(onDelete).toHaveBeenCalledWith('c1')
  })

  it('forwards its ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Toaster><CommentThread ref={ref} className="extra" label="Comments" comments={[]} /></Toaster>)
    expect(ref.current).toHaveClass('extra')
  })

  it('has no axe violations', async () => {
    const { container } = renderThread({ onAdd: () => {}, onEdit: () => {}, onDelete: () => {} })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
