import { describe, it, expect } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { ChatMessage } from '../../molecules/chat-message/ChatMessage'
import { ToolCall } from '../../molecules/tool-call/ToolCall'
import { ChatThread, type ChatThreadProps } from './ChatThread'

type Turn = { id: string; role: 'user' | 'assistant' | 'system'; text: string; streaming?: boolean }

const HISTORY: Turn[] = [
  { id: '1', role: 'user', text: 'How is Depot 4?' },
  { id: '2', role: 'assistant', text: 'Stock is fine.' },
]

function Thread({ turns = HISTORY, ...props }: { turns?: Turn[] } & Partial<ChatThreadProps>) {
  return (
    <ChatThread label="Conversation with the assistant" {...props}>
      {turns.map(turn => (
        <ChatMessage
          key={turn.id}
          role={turn.role}
          author={turn.role === 'user' ? 'You' : turn.role === 'system' ? 'Status' : 'Assistant'}
          streaming={turn.streaming}
        >
          {turn.text}
        </ChatMessage>
      ))}
    </ChatThread>
  )
}

const status = () => screen.getByRole('status')

/** jsdom has no layout: give the log the metrics a real one would have. */
function setMetrics(log: HTMLElement, { scrollHeight, clientHeight, scrollTop }: Record<string, number>) {
  Object.defineProperty(log, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(log, 'clientHeight', { configurable: true, value: clientHeight })
  Object.defineProperty(log, 'scrollTop', { configurable: true, writable: true, value: scrollTop })
}

describe('ChatThread', () => {
  it('is a log named by label, not itself live, and a tab stop; merges className', () => {
    const { container } = render(<Thread className="extra h-96" />)
    const log = screen.getByRole('log', { name: 'Conversation with the assistant' })
    expect(log).toHaveAttribute('aria-live', 'off')
    expect(log).toHaveAttribute('tabindex', '0')
    expect(container.firstElementChild).toHaveClass('extra')
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('does not read out the history it opens with', () => {
    render(<Thread />)
    expect(status()).toBeEmptyDOMElement()
  })

  it('shows a working line when busy and announces it once, politely', () => {
    const { rerender } = render(<Thread />)
    expect(screen.queryByText('Assistant is working')).toBeNull()
    rerender(<Thread busy />)
    expect(status()).toHaveTextContent('Assistant is working')
    const log = screen.getByRole('log')
    expect(log).toHaveTextContent('Assistant is working')
    rerender(<Thread busy busyLabel="Assistant is working" />)
    expect(status().children).toHaveLength(1)
  })

  it('announces a streamed reply once, with its final text, and never a fragment', () => {
    const { rerender } = render(<Thread />)
    const asking = [...HISTORY, { id: '3', role: 'user' as const, text: 'And Depot 5?' }]
    rerender(<Thread turns={asking} />)
    expect(status()).toBeEmptyDOMElement()
    rerender(<Thread turns={[...asking, { id: '4', role: 'assistant', text: 'Depot 5', streaming: true }]} />)
    rerender(<Thread turns={[...asking, { id: '4', role: 'assistant', text: 'Depot 5 is low on', streaming: true }]} />)
    expect(status()).toBeEmptyDOMElement()
    rerender(<Thread turns={[...asking, { id: '4', role: 'assistant', text: 'Depot 5 is low on pallets.' }]} />)
    expect(status()).toHaveTextContent('Assistant: Depot 5 is low on pallets.')
    expect(status().children).toHaveLength(1)
    rerender(<Thread turns={[...asking, { id: '4', role: 'assistant', text: 'Depot 5 is low on pallets.' }]} busy={false} />)
    expect(status().children).toHaveLength(1)
  })

  it('announces a system line, and leaves tool calls out of a reply’s announcement', () => {
    const { rerender } = render(<ChatThread label="Conversation with the assistant">{null}</ChatThread>)
    rerender(
      <ChatThread label="Conversation with the assistant">
        <ChatMessage role="assistant" author="Assistant">
          <ToolCall name="query_stock_levels" status="done" duration="1.2 s" />
          <p>All good.</p>
        </ChatMessage>
        <ChatMessage role="system" author="Status">
          Assistant stopped
        </ChatMessage>
      </ChatThread>
    )
    const said = [...status().children].map(node => node.textContent)
    expect(said).toEqual(['Assistant: All good.', 'Assistant stopped'])
  })

  it('waits for the text of a reply that starts with only a running tool call', () => {
    const reply = (tool: 'running' | 'done', text: string, streaming: boolean) => (
      <ChatThread label="Conversation with the assistant">
        <ChatMessage role="assistant" author="Assistant" streaming={streaming}>
          <ToolCall name="query_stock_levels" status={tool} />
          {text ? <p>{text}</p> : null}
        </ChatMessage>
      </ChatThread>
    )
    const { rerender } = render(<ChatThread label="Conversation with the assistant">{null}</ChatThread>)
    rerender(reply('running', '', false))
    expect(status()).toBeEmptyDOMElement()
    rerender(reply('done', 'Stock', true))
    expect(status()).toBeEmptyDOMElement()
    rerender(reply('done', 'Stock is fine.', false))
    expect([...status().children].map(node => node.textContent)).toEqual(['Assistant: Stock is fine.'])
  })

  it('shows Jump to latest when the reader scrolls up, and jumps to the end with focus on the log', async () => {
    render(<Thread />)
    const log = screen.getByRole('log')
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).toBeNull()
    setMetrics(log, { scrollHeight: 1000, clientHeight: 300, scrollTop: 100 })
    fireEvent.scroll(log)
    const jump = screen.getByRole('button', { name: 'Jump to latest' })
    await userEvent.click(jump)
    expect(log.scrollTop).toBe(1000)
    expect(log).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).toBeNull()
  })

  it('never moves a reader who scrolled up when new text arrives, and follows one at the end', () => {
    const { rerender } = render(<Thread />)
    const log = screen.getByRole('log')
    setMetrics(log, { scrollHeight: 1000, clientHeight: 300, scrollTop: 100 })
    fireEvent.scroll(log)
    rerender(<Thread turns={[...HISTORY, { id: '3', role: 'assistant', text: 'More', streaming: true }]} />)
    expect(log.scrollTop).toBe(100)
    setMetrics(log, { scrollHeight: 1000, clientHeight: 300, scrollTop: 690 })
    fireEvent.scroll(log)
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).toBeNull()
    setMetrics(log, { scrollHeight: 1200, clientHeight: 300, scrollTop: 690 })
    rerender(<Thread turns={[...HISTORY, { id: '3', role: 'assistant', text: 'More text', streaming: true }]} />)
    expect(log.scrollTop).toBe(1200)
  })

  it('never takes focus while a reply streams in', () => {
    const { rerender } = render(
      <>
        <input aria-label="Draft" />
        <Thread />
      </>
    )
    const draft = screen.getByRole('textbox', { name: 'Draft' })
    act(() => draft.focus())
    for (const text of ['A', 'A reply', 'A reply arrives.']) {
      rerender(
        <>
          <input aria-label="Draft" />
          <Thread turns={[...HISTORY, { id: '3', role: 'assistant', text, streaming: text !== 'A reply arrives.' }]} busy />
        </>
      )
    }
    expect(draft).toHaveFocus()
  })

  it('is axe clean, busy and scrolled up', async () => {
    const { container } = render(<Thread busy turns={[...HISTORY, { id: '3', role: 'assistant', text: 'Wor', streaming: true }]} />)
    const log = screen.getByRole('log')
    setMetrics(log, { scrollHeight: 1000, clientHeight: 300, scrollTop: 0 })
    fireEvent.scroll(log)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
