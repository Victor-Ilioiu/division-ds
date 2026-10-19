import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ChatThread',
  title: 'Chat thread',
  tier: 'organisms',
  slug: 'chat-thread',
  summary:
    "A scrolling log of ChatMessages. It follows new text only while the reader is at the end, and it announces each finished reply to screen readers once.",
  useWhen: 'A conversation with an assistant, above a PromptInput, where replies stream in.',
  notFor: 'A record of events on one thing: use Timeline.',
  requires: [
    "A height, because the thread scrolls and the page doesn't. Use h-[28rem], or flex-1 min-h-0 inside a column.",
    'ChatMessage children, so the thread can announce each finished reply.',
  ],
  pitfalls: [
    {
      wrong: '<div role="log" aria-live="polite">{messages}</div>',
      right: '<ChatThread label="Conversation with the assistant">{messages}</ChatThread>',
      why: "A polite live log makes a screen reader read a streaming reply aloud one fragment at a time. The thread keeps the log quiet and announces each finished reply once.",
    },
    {
      wrong: 'useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages])',
      right: '<ChatThread ...>  // follows the end only while the reader is there',
      why: "Scrolling on every change yanks away a reader who scrolled up to read. And smooth scrolling on every fragment means the screen never stops moving.",
    },
  ],
  anatomy: [
    { part: 'Log', description: "Has role=\"log\" and is named by label. aria-live is off, so screen readers don't read every change. It's a tab stop (a place the Tab key lands) so a keyboard can scroll it, and it scrolls inside its own height." },
    { part: 'Messages', description: 'ChatMessage children, oldest first, 24px (pixels) apart.' },
    { part: 'Working line', description: 'Shown while busy: the conveyor Spinner and "Assistant is working" at the end of the log.' },
    { part: 'Jump to latest', description: 'Appears only when the reader has scrolled away from the end. It jumps instantly and puts focus on the log.' },
    { part: 'Status', description: 'A visually hidden role="status" that screen readers hear. It says the busy label once when work starts, and each finished reply once.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Names the log.' },
    { name: 'busy', type: 'boolean', default: 'false', description: 'The assistant is working. Shows a working line and makes one announcement when it starts.' },
    { name: 'busyLabel', type: 'string', default: "'Assistant is working'", description: "The working line's words, and what gets announced." },
    { name: 'jumpLabel', type: 'string', default: "'Jump to latest'", description: "The jump button's words." },
    { name: 'className', type: 'string', description: 'Goes on the root. Give the thread a height here.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves to the log, then into the controls inside messages, then to Jump to latest when it's shown." },
    { keys: ['ArrowUp', 'ArrowDown'], does: 'With the log focused, scrolls it.' },
    { keys: ['PageUp', 'PageDown'], does: 'With the log focused, scrolls it a page at a time.' },
  ],
  dos: [
    'Give the thread a fixed or flexible height so the thread scrolls, not the page.',
    'Set busy as soon as the request starts. Clear it when the last fragment has arrived or the reply is stopped.',
    'After a Stop, add a system line ("Assistant stopped") so the record and the announcement both say what happened.',
    'Keep the PromptInput outside the thread, directly under it.',
  ],
  donts: [
    "Don't scroll the thread yourself on new messages. It follows the end only while the reader is there.",
    "Don't move focus into the thread when a reply arrives. Focus stays where the person put it.",
    "Don't add a second live region (an area screen readers announce changes from) for replies or tool calls. The thread's status is the only voice.",
  ],
}
