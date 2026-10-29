# ChatMessage

> One turn in a conversation with an assistant: the person's words in a bubble, the reply at full width, or a centred system line. While a reply is still streaming in, it sets aria-busy (an ARIA, Accessible Rich Internet Applications, attribute that tells screen readers the content isn't finished) and shows a caret that doesn't blink.

- **Best for:** Each turn inside a ChatThread.
- **Not for:** Comments or an activity history between people: use Timeline.
- **Also on this page:** `ResponseFeedback`
- Molecule. Source: `src/components/molecules/chat-message/ChatMessage.tsx`
- Rendered docs page: `/components/chat-message`

## Import

```tsx
import { ChatMessage } from 'src/components/molecules/chat-message/ChatMessage'
import { ResponseFeedback } from 'src/components/molecules/chat-message/ResponseFeedback'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- A ChatThread around it. Outside one, a message still shows, but nothing announces it when it finishes.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `role` | `'user' \| 'assistant' \| 'system'` |  | Required. Who's speaking. system is a quiet, centred status line. |
| `author` | `string` |  | Required. "You", "Assistant". It names the message. |
| `time` | `string` |  | The date and time in ISO format (the international standard way of writing them), for <time dateTime>. |
| `timeLabel` | `string` |  | The time as shown on screen: "09:40". |
| `streaming` | `boolean` | `false` | The text is still arriving: sets aria-busy and shows a caret. Inside a ChatThread, the finished text is announced once, when this turns false. |
| `actions` | `ReactNode` |  | Small buttons under an assistant message. They aren't shown on a user message. |
| `className` | `string` |  | Goes on the article. |
| `onSubmit (ResponseFeedback)` | `(vote: 'helpful' \| 'not-helpful') => void \| Promise<void>` |  | Required. Runs on a thumbs up or down. Return a promise to show "Submitting feedback" until it settles; a rejection puts the buttons back. |
| `onDetail (ResponseFeedback)` | `(text: string) => void` |  | Offers an optional, dismissable "what was wrong" box after a Not helpful vote. Leave it out for no such step. |
| `className (ResponseFeedback)` | `string` |  | Goes on the group. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type ChatMessageRole = 'user' | 'assistant' | 'system'
```

```ts
export type FeedbackVote = 'helpful' | 'not-helpful'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### The three roles

```tsx
<div className="flex w-full max-w-xl flex-col gap-6">
  <ChatMessage role="user" author="You" time="2026-10-15T09:40:00+03:00" timeLabel="09:40">
    Which replicas are running low at Depot 4?
  </ChatMessage>
  <ChatMessage
    role="assistant"
    author="Assistant"
    time="2026-10-15T09:40:00+03:00"
    timeLabel="09:40"
    actions={
      <>
        <Button size="xs" variant="ghost" iconStart={<Copy />}>
          Copy
        </Button>
        <Button size="xs" variant="ghost" iconStart={<RotateCcw />}>
          Retry
        </Button>
      </>
    }
  >
    Two are under their reorder point: the K-41 field radio (6 left, reorder at 10) and the trail
    pack (3 left, reorder at 8). Everything else has at least two weeks of cover.
  </ChatMessage>
  <ChatMessage role="system" author="Status">
    Assistant stopped
  </ChatMessage>
</div>
```

### While the reply is still streaming in: aria-busy, an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers the message isn't finished, and a cursor that doesn't blink

```tsx
<div className="flex w-full max-w-xl flex-col gap-6">
  <ChatMessage role="assistant" author="Assistant" streaming>
    Depot 4 holds 1,240 replicas across 38 lines. The busiest
  </ChatMessage>
</div>
```

### Feedback on a reply: thumbs up or down, one vote, and an optional detail step after Not helpful

```tsx
const pretendSend = () => new Promise<void>(resolve => setTimeout(resolve, 800))

<div className="flex w-full max-w-xl flex-col gap-6">
  <ChatMessage
    role="assistant"
    author="Assistant"
    actions={<ResponseFeedback onSubmit={pretendSend} onDetail={() => {}} />}
  >
    Depot 4 holds 1,240 replicas. Eleven are below their reorder point.
  </ChatMessage>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the controls inside the message: a ToolCall's details, an approval's buttons, the actions. |

## Do

- Keep streaming true until the last piece of text has arrived, then set it to false once.
- Put tool calls and approvals in the assistant message where they happened, in order with its text.
- Use a system line for events in the conversation itself: stopped, retried, context cleared.
- Give every message an author, including a system line ("Status"). It names the article.
- Put ResponseFeedback in the actions of a generated reply once it has finished streaming, so a vote rates the whole reply.

## Don't

- Don't animate the text in yourself. useStreamedText or your stream supplies it, and the thread handles announcing it.
- Don't put actions on the person's own message. Editing a sent message is a different flow.
- Don't colour the assistant's text. The bubble, the alignment and the author line already tell the roles apart.

## Common mistakes

Wrong:

```tsx
<ChatMessage role="assistant" author="Assistant">{partial}<span className="animate-pulse">▍</span></ChatMessage>
```

Right:

```tsx
<ChatMessage role="assistant" author="Assistant" streaming={!done}>{partial}</ChatMessage>
```

streaming sets aria-busy, draws a caret that doesn't blink, and tells the thread to announce the text once, when it's finished. A hand-made blinking caret flashes for the whole stream.

## Anatomy

- **Article**: Named by the author line, so a screen reader hears who's speaking first. Has aria-busy while streaming.
- **Author line**: The author as a label in monospaced type, then the time in a <time dateTime> element.
- **Bubble (user)**: The person's words on surface.sunken, aligned right, at most 85% of the width.
- **Body (assistant)**: Full width, with no bubble: text, paragraphs, and ToolCall and ApprovalRequest blocks stacked in a column.
- **Caret**: A solid block in the signal colour after the last paragraph while streaming, drawn with the CSS ::after rule. It never blinks.
- **Actions**: Small buttons under an assistant message: Copy, Retry, and ResponseFeedback (thumbs up and down).
- **System line**: A centred label in monospaced type between two thin lines: "Assistant stopped". Its author is there for screen readers only.
