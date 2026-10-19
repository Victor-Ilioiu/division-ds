import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Button } from '../../atoms'
import { ChatMessage } from './ChatMessage'
import { announcementText } from './announcer'

describe('ChatMessage', () => {
  it('is an article named by its author, merging className', () => {
    render(
      <ChatMessage role="user" author="You" className="extra">
        How much stock is at Depot 4?
      </ChatMessage>
    )
    const message = screen.getByRole('article', { name: 'You' })
    expect(message).toHaveClass('extra')
    expect(message).toHaveTextContent('How much stock is at Depot 4?')
  })

  it('is aria-busy with a caret while streaming, and neither once it stops', () => {
    const { rerender, container } = render(
      <ChatMessage role="assistant" author="Assistant" streaming>
        Depot 4 holds
      </ChatMessage>
    )
    const message = screen.getByRole('article', { name: 'Assistant' })
    expect(message).toHaveAttribute('aria-busy', 'true')
    // The caret is a ::after on the last paragraph, drawn only while the body says it streams.
    const body = container.querySelector('[data-part="body"]')!
    expect(body).toHaveAttribute('data-streaming')
    expect(body.className).toContain("[&>p:last-child]:after:content-['']")
    rerender(
      <ChatMessage role="assistant" author="Assistant">
        Depot 4 holds 1,240 replicas.
      </ChatMessage>
    )
    expect(message).not.toHaveAttribute('aria-busy')
    expect(body).not.toHaveAttribute('data-streaming')
    expect(body.className).not.toContain('after:content')
  })

  it('puts the instant in a time element', () => {
    render(
      <ChatMessage role="assistant" author="Assistant" time="2026-10-15T09:40:00Z" timeLabel="09:40">
        Done.
      </ChatMessage>
    )
    const time = screen.getByText('09:40')
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', '2026-10-15T09:40:00Z')
  })

  it('shows actions under an assistant message, never under the person’s own', () => {
    const { rerender } = render(
      <ChatMessage role="assistant" author="Assistant" actions={<Button size="xs">Copy</Button>}>
        Reply.
      </ChatMessage>
    )
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    rerender(
      <ChatMessage role="user" author="You" actions={<Button size="xs">Copy</Button>}>
        Question.
      </ChatMessage>
    )
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
  })

  it('renders a system line as a quiet article with its author for a screen reader only', () => {
    render(
      <ChatMessage role="system" author="Status">
        Assistant stopped
      </ChatMessage>
    )
    const line = screen.getByRole('article', { name: 'Status' })
    expect(line).toHaveTextContent('Assistant stopped')
    expect(screen.getByText('Status')).toHaveClass('sr-only')
  })

  it('leaves blocks out of the announced text', () => {
    const body = document.createElement('div')
    body.innerHTML = '<p>Stock is fine.</p><div data-chat-block>Done 1.2 s Show details</div><p>  Nothing to order. </p>'
    expect(announcementText(body)).toBe('Stock is fine. Nothing to order.')
  })

  it('is axe clean, streaming and done, for every role', async () => {
    const { container } = render(
      <div>
        <ChatMessage role="user" author="You" time="2026-10-15T09:40:00Z" timeLabel="09:40">
          Question
        </ChatMessage>
        <ChatMessage role="assistant" author="Assistant" streaming actions={<Button size="xs">Copy</Button>}>
          Answer
        </ChatMessage>
        <ChatMessage role="system" author="Status">
          Assistant stopped
        </ChatMessage>
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
