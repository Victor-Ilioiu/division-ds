import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ToolCall',
  title: 'Tool call',
  tier: 'molecules',
  slug: 'tool-call',
  summary:
    'A tool the assistant ran, shown right where it ran. It has the status as a word and a small symbol, a title, the tool name and how long it took, with the input and output folded away behind a button.',
  useWhen: 'An assistant reply that ran a tool, such as a query, a lookup or a calculation.',
  notFor: 'An action with side effects that needs a yes first: use ApprovalRequest.',
  anatomy: [
    { part: 'Panel', description: 'A thin frame on surface.raised. It\'s marked as a separate block, so the message\'s screen reader announcement skips it.' },
    { part: 'Status glyph', description: 'A Spinner while running, a check when done, an alert circle when failed. Decoration only.' },
    { part: 'Title and name', description: 'The title written for people, then the tool\'s own name in a monospaced font. With no title, the name comes first.' },
    { part: 'Status badge', description: 'Running, Done or Failed as a word in the tone\'s colour. Colour is never the only signal.' },
    { part: 'Duration', description: 'In a monospaced font with equal-width digits, for example "1.2 s".' },
    { part: 'Details', description: 'A "Show details" button (with aria-expanded, which tells screen readers whether it\'s open) above Input and Output. Those wrap onto new lines instead of scrolling sideways.' },
  ],
  props: [
    { name: 'name', type: 'string', description: 'Required. The tool\'s own name, shown in a monospaced font.' },
    { name: 'title', type: 'string', description: 'A plain-language description of the call, shown above the name.' },
    { name: 'status', type: "'running' | 'done' | 'failed'", description: 'Required. Shown as a word, a symbol and a colour.' },
    { name: 'duration', type: 'string', description: 'How long it took, for example "1.2 s".' },
    { name: 'input', type: 'ReactNode', description: 'What the assistant sent the tool. Folded away by default.' },
    { name: 'output', type: 'ReactNode', description: 'What came back. Folded away by default.' },
    { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Starts with the details showing.' },
    { name: 'className', type: 'string', description: 'Added to the panel.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to "Show details".' },
    { keys: ['Enter', 'Space'], does: 'Shows or hides the input and output.' },
  ],
  dos: [
    'Give each call a title a person understands: "Read stock levels at Depot 4", not just the function name.',
    'Show the call even when it\'s boring. Seeing the work is how a reader learns to trust it, or to catch a mistake.',
    'Mention a failure in the reply text too, along with what the assistant did instead.',
  ],
  donts: [
    "Don't give a call its own live region (an area screen readers announce on change). The thread's busy status speaks for the whole turn.",
    "Don't open the details by default for long payloads. The reply is what matters, and the payload is the evidence.",
    "Don't use a ToolCall for something with a side effect the person hasn't agreed to. Ask with ApprovalRequest first.",
  ],
}
