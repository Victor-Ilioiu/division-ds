import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ChatMessage',
  title: 'Chat message',
  tier: 'molecules',
  slug: 'chat-message',
  summary:
    "One turn in a conversation with an assistant: the person's words in a bubble, the reply at full width, or a centred system line. While a reply is still streaming in, it sets aria-busy (an ARIA, Accessible Rich Internet Applications, attribute that tells screen readers the content isn't finished) and shows a caret that doesn't blink.",
  useWhen: 'Each turn inside a ChatThread.',
  notFor: 'Comments or an activity history between people: use Timeline.',
  requires: [
    "A ChatThread around it. Outside one, a message still shows, but nothing announces it when it finishes.",
  ],
  pitfalls: [
    {
      wrong: '<ChatMessage role="assistant" author="Assistant">{partial}<span className="animate-pulse">▍</span></ChatMessage>',
      right: '<ChatMessage role="assistant" author="Assistant" streaming={!done}>{partial}</ChatMessage>',
      why: "streaming sets aria-busy, draws a caret that doesn't blink, and tells the thread to announce the text once, when it's finished. A hand-made blinking caret flashes for the whole stream.",
    },
  ],
  anatomy: [
    { part: 'Article', description: "Named by the author line, so a screen reader hears who's speaking first. Has aria-busy while streaming." },
    { part: 'Author line', description: 'The author as a label in monospaced type, then the time in a <time dateTime> element.' },
    { part: 'Bubble (user)', description: 'The person\'s words on surface.sunken, aligned right, at most 85% of the width.' },
    { part: 'Body (assistant)', description: 'Full width, with no bubble: text, paragraphs, and ToolCall and ApprovalRequest blocks stacked in a column.' },
    { part: 'Caret', description: "A solid block in the signal colour after the last paragraph while streaming, drawn with the CSS ::after rule. It never blinks." },
    { part: 'Actions', description: 'Small buttons under an assistant message: Copy, Retry, and ResponseFeedback (thumbs up and down).' },
    { part: 'System line', description: 'A centred label in monospaced type between two thin lines: "Assistant stopped". Its author is there for screen readers only.' },
  ],
  props: [
    { name: 'role', type: "'user' | 'assistant' | 'system'", description: "Required. Who's speaking. system is a quiet, centred status line." },
    { name: 'author', type: 'string', description: 'Required. "You", "Assistant". It names the message.' },
    { name: 'time', type: 'string', description: 'The date and time in ISO format (the international standard way of writing them), for <time dateTime>.' },
    { name: 'timeLabel', type: 'string', description: 'The time as shown on screen: "09:40".' },
    {
      name: 'streaming',
      type: 'boolean',
      default: 'false',
      description: "The text is still arriving: sets aria-busy and shows a caret. Inside a ChatThread, the finished text is announced once, when this turns false.",
    },
    { name: 'actions', type: 'ReactNode', description: "Small buttons under an assistant message. They aren't shown on a user message." },
    { name: 'className', type: 'string', description: 'Goes on the article.' },
    { name: 'onSubmit (ResponseFeedback)', type: "(vote: 'helpful' | 'not-helpful') => void | Promise<void>", description: 'Required. Runs on a thumbs up or down. Return a promise to show "Submitting feedback" until it settles; a rejection puts the buttons back.' },
    { name: 'onDetail (ResponseFeedback)', type: '(text: string) => void', description: 'Offers an optional, dismissable "what was wrong" box after a Not helpful vote. Leave it out for no such step.' },
    { name: 'className (ResponseFeedback)', type: 'string', description: 'Goes on the group.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to the controls inside the message: a ToolCall\'s details, an approval\'s buttons, the actions.' },
  ],
  dos: [
    'Keep streaming true until the last piece of text has arrived, then set it to false once.',
    'Put tool calls and approvals in the assistant message where they happened, in order with its text.',
    'Use a system line for events in the conversation itself: stopped, retried, context cleared.',
    'Give every message an author, including a system line ("Status"). It names the article.',
    'Put ResponseFeedback in the actions of a generated reply once it has finished streaming, so a vote rates the whole reply.',
  ],
  donts: [
    "Don't animate the text in yourself. useStreamedText or your stream supplies it, and the thread handles announcing it.",
    "Don't put actions on the person's own message. Editing a sent message is a different flow.",
    "Don't colour the assistant's text. The bubble, the alignment and the author line already tell the roles apart.",
  ],
}
