import { useEffect, useRef, useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './ChatThread.meta'
import { Example } from '../../docs/Example'
import { ApprovalRequest, type ApprovalState } from '../../molecules/approval-request/ApprovalRequest'
import { ChatMessage } from '../../molecules/chat-message/ChatMessage'
import { PromptInput } from '../../molecules/prompt-input/PromptInput'
import { ToolCall, type ToolCallStatus } from '../../molecules/tool-call/ToolCall'
import { useStreamedText } from '../../../lib/stream-text'
import { ChatThread } from './ChatThread'

type Turn =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; text: string; tool?: ToolCallStatus; approval?: boolean }
  | { id: number; role: 'system'; text: string }

/** The scripted replies, in turn. Any question gets the next one: this is a demo of the
 *  interface, not of an assistant. */
const REPLIES = [
  'Depot 4 holds 1,240 replicas across 38 lines. Two lines are under their reorder point: the K-41 field radio has 6 left against a reorder point of 10, and the trail pack has 3 left against 8. Everything else has at least two weeks of cover at the current rate. The reorder above covers both lines; once it is approved, the supplier confirms within a working day.',
  'Inbound this week: one delivery from Arad on Thursday morning, 22 pallets, booked into bay 2. Outbound: nine shipments, the largest to Sibiu on Friday. Nothing is waiting on a person except the reorder above.',
]

const HISTORY: Turn[] = [
  { id: 1, role: 'user', text: 'Summarise stock at Depot 4.' },
  {
    id: 2,
    role: 'assistant',
    text: 'Depot 4 is in good shape: 1,240 replicas on hand and nothing overdue. Two lines are low, so I have drafted a reorder for you to check.',
    tool: 'done',
    approval: true,
  },
]

function LiveConversation() {
  const [turns, setTurns] = useState<Turn[]>(HISTORY)
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<'idle' | 'tool' | 'streaming'>('idle')
  const [approval, setApproval] = useState<ApprovalState>('pending')
  const [replyIndex, setReplyIndex] = useState(0)
  const nextId = useRef(HISTORY.length + 1)
  const activeId = useRef<number | null>(null)
  const reply = useStreamedText(REPLIES[replyIndex % REPLIES.length], { active: phase === 'streaming' })

  const updateActive = (change: (turn: Turn & { role: 'assistant' }) => Turn) =>
    setTurns(list => list.map(turn => (turn.id === activeId.current && turn.role === 'assistant' ? change(turn) : turn)))

  const addStopped = () => {
    const id = nextId.current++
    setTurns(list => [...list, { id, role: 'system', text: 'Assistant stopped' }])
  }

  // The tool "runs" for a moment, then the reply starts streaming.
  useEffect(() => {
    if (phase !== 'tool') return
    const timer = window.setTimeout(() => {
      updateActive(turn => ({ ...turn, tool: 'done' }))
      setPhase('streaming')
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Finished or stopped: keep what arrived, and hand the thread a message that is no longer streaming.
  useEffect(() => {
    if (phase !== 'streaming' || !reply.done) return
    updateActive(turn => ({ ...turn, text: reply.text }))
    if (reply.stopped) addStopped()
    setPhase('idle')
    setReplyIndex(index => index + 1)
  }, [phase, reply.done, reply.text, reply.stopped])

  const send = (text: string) => {
    const question = nextId.current++
    const answer = nextId.current++
    activeId.current = answer
    setTurns(list => [...list, { id: question, role: 'user', text }, { id: answer, role: 'assistant', text: '', tool: 'running' }])
    setDraft('')
    setPhase('tool')
  }

  const stop = () => {
    if (phase === 'streaming') {
      reply.stop()
      return
    }
    // Stopped before any text: the empty reply goes, the system line says what happened.
    setTurns(list => list.filter(turn => turn.id !== activeId.current))
    addStopped()
    setPhase('idle')
  }

  const busy = phase !== 'idle'

  return (
    <div className="flex w-full max-w-2xl flex-col border border-[var(--color-border-hairline-strong)]">
      <ChatThread label="Conversation with the assistant" busy={phase === 'tool'} className="h-[28rem]">
        {turns.map(turn => {
          if (turn.role === 'user') {
            return (
              <ChatMessage key={turn.id} role="user" author="You">
                {turn.text}
              </ChatMessage>
            )
          }
          if (turn.role === 'system') {
            return (
              <ChatMessage key={turn.id} role="system" author="Status">
                {turn.text}
              </ChatMessage>
            )
          }
          const streaming = phase === 'streaming' && turn.id === activeId.current
          const text = streaming ? reply.text : turn.text
          return (
            <ChatMessage key={turn.id} role="assistant" author="Assistant" streaming={streaming}>
              {turn.tool === undefined ? null : (
                <ToolCall
                  name="query_stock_levels"
                  title="Read stock levels at Depot 4"
                  status={turn.tool}
                  duration={turn.tool === 'done' ? '1.2 s' : undefined}
                  input={'{ "depot": 4 }'}
                  output={turn.tool === 'done' ? '{ "on_hand": 1240, "lines": 38, "below_reorder_point": 2 }' : undefined}
                />
              )}
              {text === '' ? null : <p>{text}</p>}
              {turn.approval ? (
                <ApprovalRequest
                  title="Send this reorder to the supplier?"
                  state={approval}
                  onApprove={() => setApproval('approved')}
                  onReject={() => setApproval('rejected')}
                  approveLabel="Send reorder"
                  rejectLabel="Don't send"
                >
                  <p>To: Arad replica supply</p>
                  <p>10 × K-41 field radio, 8 × trail pack, to Depot 4 by Thursday 22 October.</p>
                </ApprovalRequest>
              ) : null}
            </ChatMessage>
          )
        })}
      </ChatThread>
      <PromptInput
        label="Message the assistant"
        placeholder="Ask about stock, orders or depots"
        value={draft}
        onValueChange={setDraft}
        onSubmit={send}
        busy={busy}
        onStop={stop}
        className="p-4 border-t border-[var(--color-border-hairline-strong)]"
      />
    </div>
  )
}

export function ChatThreadDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A live conversation: send anything, watch the reply stream in, press Stop to end it, or scroll up while it's still arriving">
        <LiveConversation />
      </Example>
    </ComponentDocs>
  )
}
