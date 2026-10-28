import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'PromptInput',
  title: 'Prompt input',
  tier: 'molecules',
  slug: 'prompt-input',
  summary:
    "The box where a person writes to an assistant. It grows to fit the text, has one Send/Stop button and can show suggestions. Enter sends, and Shift+Enter starts a new line.",
  useWhen: 'The message box under a ChatThread.',
  notFor: 'A long field in a form: use Textarea inside a FormField.',
  requires: ['A parent that keeps the draft in state and clears it in onSubmit.'],
  pitfalls: [
    {
      wrong: '{busy ? <Button onClick={stop}>Stop</Button> : <Button type="submit">Send</Button>}',
      right: '<PromptInput busy={busy} onStop={stop} ... />',
      why: "Swapping two buttons drops keyboard focus to the page at the moment they switch. PromptInput keeps one button and changes its label and what it does.",
    },
  ],
  anatomy: [
    { part: 'Form', description: 'Paints surface.base itself, as every form does.' },
    { part: 'Suggestions', description: "A group of chips above the box. Clicking one submits its text (disabled while busy), or with editableSuggestions puts it in the box to edit." },
    { part: 'Box', description: "A Textarea with a label that's hidden on screen but read by screen readers. It grows from one line to about eight, then scrolls inside." },
    { part: 'Send / Stop', description: 'One button: a primary Send with an arrow, or, while busy, a secondary Stop with a square.' },
    { part: 'Hint', description: 'One line under the box, which is also the box\'s description: "Enter to send, Shift+Enter for a new line".' },
  ],
  props: [
    { name: 'label', type: 'string', description: "Required. Names the box. It's hidden on screen." },
    { name: 'value', type: 'string', description: 'Required. The draft. Controlled, meaning your page holds it.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Required.' },
    { name: 'onSubmit', type: '(value: string) => void', description: "Required. Fires on Enter, Send or a suggestion, and never with a blank draft. Clear the draft here." },
    { name: 'busy', type: 'boolean', default: 'false', description: 'Send turns into Stop, and Enter sends nothing.' },
    { name: 'onStop', type: '() => void', description: 'Runs on Stop, and on Escape in the box while busy.' },
    { name: 'suggestions', type: 'readonly string[]', description: 'Ready-made prompts shown as chips. Clicking one submits it.' },
    { name: 'editableSuggestions', type: 'boolean', default: 'false', description: 'Clicking a suggestion puts its text in the box to edit instead of sending it. Use it when a person will likely change the prompt first. The chips then stay usable while busy.' },
    { name: 'placeholder', type: 'string', description: 'Shown in the empty box.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: "Nothing can be typed or sent. Say why somewhere nearby." },
    { name: 'hint', type: 'string', default: "'Enter to send, Shift+Enter for a new line'", description: 'The line under the box, which is also its description.' },
    { name: 'className', type: 'string', description: 'Added to the form.' },
  ],
  keyboard: [
    { keys: ['Enter'], does: "Sends the draft. Does nothing while busy, or while someone's composing characters with an IME (Input Method Editor, the tool used to type languages like Chinese or Japanese)." },
    { keys: ['Shift', 'Enter'], does: 'Starts a new line.' },
    { keys: ['Escape'], does: 'While busy, stops the reply.' },
  ],
  dos: [
    'Clear the draft in onSubmit, and set busy as soon as the request starts.',
    "Wire up onStop whenever the reply can be stopped. A reply that streams in with no Stop is a wait with no way out.",
    'Offer two to four suggestions in an empty thread, and drop them once the conversation has started.',
  ],
  donts: [
    "Don't disable the box while busy; a person may be writing the next message while the reply arrives.",
    "Don't wrap it in a FormField. Its label is hidden on purpose, and it brings its own hint.",
    "Don't move focus into it when the reply finishes. It never left, unless the person moved it.",
  ],
}
