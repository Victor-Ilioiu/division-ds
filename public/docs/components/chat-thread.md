# ChatThread

> A scrolling log of ChatMessages. It follows new text only while the reader is at the end, and it announces each finished reply to screen readers once.

- **Best for:** A conversation with an assistant, above a PromptInput, where replies stream in.
- **Not for:** A record of events on one thing: use Timeline.
- Organism. Source: `src/components/organisms/chat-thread/ChatThread.tsx`
- Rendered docs page: `/components/chat-thread`

## Import

```tsx
import { ChatThread } from 'src/components/organisms/chat-thread/ChatThread'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Requires

- A height, because the thread scrolls and the page doesn't. Use h-[28rem], or flex-1 min-h-0 inside a column.
- ChatMessage children, so the thread can announce each finished reply.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the log. |
| `busy` | `boolean` | `false` | The assistant is working. Shows a working line and makes one announcement when it starts. |
| `busyLabel` | `string` | `'Assistant is working'` | The working line's words, and what gets announced. |
| `jumpLabel` | `string` | `'Jump to latest'` | The jump button's words. |
| `className` | `string` |  | Goes on the root. Give the thread a height here. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A live conversation: send anything, watch the reply stream in, press Stop to end it, or scroll up while it's still arriving

```tsx
type Turn =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; text: string; tool?: ToolCallStatus; approval?: boolean }
  | { id: number; role: 'system'; text: string }

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

<LiveConversation />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the log, then into the controls inside messages, then to Jump to latest when it's shown. |
| `ArrowUp` `ArrowDown` | With the log focused, scrolls it. |
| `PageUp` `PageDown` | With the log focused, scrolls it a page at a time. |

## Do

- Give the thread a fixed or flexible height so the thread scrolls, not the page.
- Set busy as soon as the request starts. Clear it when the last fragment has arrived or the reply is stopped.
- After a Stop, add a system line ("Assistant stopped") so the record and the announcement both say what happened.
- Keep the PromptInput outside the thread, directly under it.

## Don't

- Don't scroll the thread yourself on new messages. It follows the end only while the reader is there.
- Don't move focus into the thread when a reply arrives. Focus stays where the person put it.
- Don't add a second live region (an area screen readers announce changes from) for replies or tool calls. The thread's status is the only voice.

## Common mistakes

Wrong:

```tsx
<div role="log" aria-live="polite">{messages}</div>
```

Right:

```tsx
<ChatThread label="Conversation with the assistant">{messages}</ChatThread>
```

A polite live log makes a screen reader read a streaming reply aloud one fragment at a time. The thread keeps the log quiet and announces each finished reply once.

Wrong:

```tsx
useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages])
```

Right:

```tsx
<ChatThread ...>  // follows the end only while the reader is there
```

Scrolling on every change yanks away a reader who scrolled up to read. And smooth scrolling on every fragment means the screen never stops moving.

## Anatomy

- **Log**: Has role="log" and is named by label. aria-live is off, so screen readers don't read every change. It's a tab stop (a place the Tab key lands) so a keyboard can scroll it, and it scrolls inside its own height.
- **Messages**: ChatMessage children, oldest first, 24px (pixels) apart.
- **Working line**: Shown while busy: the conveyor Spinner and "Assistant is working" at the end of the log.
- **Jump to latest**: Appears only when the reader has scrolled away from the end. It jumps instantly and puts focus on the log.
- **Status**: A visually hidden role="status" that screen readers hear. It says the busy label once when work starts, and each finished reply once.
