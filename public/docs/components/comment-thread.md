# CommentThread

> The comments on one item, as in an issue tracker: each with an avatar, the author, a time, the text and its actions (Reply, Edit, Delete), replies one level deep under the comment they answer, and a box to add a comment at the end. An assistant's comments carry an AiLabel, so a thread shared by people and an agent always says who wrote what.

- **Best for:** People, and an assistant working on the item, discussing one item: a ticket, a document, an order.
- **Not for:** A conversation with an assistant, turn by turn: use ChatThread. A record of what happened to the item: use Timeline.
- Organism. Source: `src/components/organisms/comment-thread/CommentThread.tsx`
- Rendered docs page: `/components/comment-thread`

## Import

```tsx
import { CommentThread } from 'src/components/organisms/comment-thread/CommentThread'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- A Toaster at the root, as every overlay needs: Delete asks in an AlertDialog.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the list: "Comments on #12". |
| `comments` | `readonly ThreadComment[]` |  | Required. { id, author, body, time, timeLabel, edited?, canEdit?, canDelete?, replies? }, oldest first. author is { name, avatarSrc?, assistant? }. |
| `onAdd` | `(body: string, parentId: string \| null) => void \| Promise<unknown>` |  | Turns on the comment box and Reply. parentId is null for a new comment, or the top-level comment a reply belongs to. Return a promise to keep the button busy until it settles; when it rejects, the text stays in the box. |
| `onEdit` | `(id: string, body: string) => void \| Promise<unknown>` |  | Turns on Edit for comments with canEdit. |
| `onDelete` | `(id: string) => void \| Promise<unknown>` |  | Turns on Delete for comments with canDelete. An AlertDialog asks first. |
| `renderBody` | `(comment: ThreadComment) => ReactNode` | `the text, line breaks kept` | How the text is drawn, for links or Markdown. |
| `composerLabel` | `string` | `'Add a comment'` | The comment box's label. |
| `composerHelp` | `string` |  | Help under the label: who reads the comments, what happens next. |
| `submitLabel` | `string` | `'Comment'` | The comment box's button. |
| `emptyTitle` | `string` | `'No comments yet'` | The empty state title. |
| `emptyLevel` | `2 \| 3 \| 4` | `3` | The empty state's heading level. |
| `className` | `string` |  | Merged with the root classes. When Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | The root div. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/**
 * A comment thread on one item, after Jira's: each comment is an avatar, the author, a time, the
 * text and its actions (Reply, Edit, Delete), with replies one level deep under the comment they
 * answer, and a box to add a comment at the end. Comments from an assistant carry an AiLabel, so a
 * thread shared by people and an agent always says who wrote what.
 *
 * Controlled: the thread draws `comments` and reports what someone did; the parent stores it.
 * Replies to a reply join the same parent, so the depth never passes one.
 *
 * Contrast: every colour is on surface.base or the reply rail beside it. The author is
 * "text.primary on surface.base", the time, "Edited" and empty text "text.secondary on
 * surface.base", the body "text.primary on surface.base". The reply rail is the hairline, which is
 * decorative (the nesting is also in the list structure).
 */

export type CommentAuthor = {
  name: string
  /** An image for the avatar. Initials stand in without one. */
  avatarSrc?: string
  /** Marks the author as an assistant: an AiLabel beside the name. */
  assistant?: boolean
}
```

```ts
export type ThreadComment = {
  id: string
  author: CommentAuthor
  body: string
  /** An ISO datetime, for the time element's dateTime. */
  time: string
  /** What people see: "2 hours ago", "25 Nov, 14:02". */
  timeLabel: string
  edited?: boolean
  /** Shows Edit on this comment, when onEdit is set. @default false */
  canEdit?: boolean
  /** Shows Delete on this comment, when onDelete is set. @default false */
  canDelete?: boolean
  /** Replies, oldest first. Only a top-level comment's replies are drawn. */
  replies?: ThreadComment[]
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Comment, reply, edit and delete

```tsx
const START: ThreadComment[] = [
  {
    id: 'c1',
    author: { name: 'Ilse Varga' },
    body: 'The scanner at gate 2 drops every third read. A photo of the error is attached.',
    time: '2026-11-25T09:40:00Z',
    timeLabel: '25 Nov, 09:40',
    canEdit: true,
    canDelete: true,
    replies: [
      {
        id: 'c2',
        author: { name: 'Assistant', assistant: true },
        body: 'The firmware on that scanner is two versions behind the others. I have drafted the update steps in the description.',
        time: '2026-11-25T09:52:00Z',
        timeLabel: '25 Nov, 09:52',
      },
    ],
  },
  {
    id: 'c3',
    author: { name: 'Tomas Reyes' },
    body: 'I can do the update on Thursday morning.',
    time: '2026-11-25T11:10:00Z',
    timeLabel: '25 Nov, 11:10',
  },
]

function LiveThreadExample() {
  const [comments, setComments] = useState(START)
  const stamp = () => ({ time: new Date().toISOString(), timeLabel: 'Just now' })
  return (
    <CommentThread
      className="max-w-2xl"
      label="Comments on R-1043"
      comments={comments}
      composerHelp="Ctrl+Enter sends."
      onAdd={(body, parentId) => {
        const comment: ThreadComment = { id: `n${Date.now()}`, author: { name: 'Ilse Varga' }, body, canEdit: true, canDelete: true, ...stamp() }
        setComments(current => parentId
          ? current.map(c => (c.id === parentId ? { ...c, replies: [...(c.replies ?? []), comment] } : c))
          : [...current, comment])
      }}
      onEdit={(id, body) => setComments(current => current.map(c => (c.id === id ? { ...c, body, edited: true } : c)))}
      onDelete={id => setComments(current => current.filter(c => c.id !== id))}
    />
  )
}

<LiveThreadExample />
```

### Read-only, with nothing yet

```tsx
<CommentThread label="Comments on R-1044" comments={[]} />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through each comment's Reply, Edit and Delete, then the comment box. |
| `Ctrl` `Enter` | In a comment box, sends it (Cmd+Enter on a Mac). Enter alone starts a new line. |

## Do

- Mark every comment an assistant wrote with author.assistant, so its AiLabel says so.
- Let people edit and delete only their own comments: set canEdit and canDelete per comment.
- Say in composerHelp who reads the comments, when an agent picks them up.

## Don't

- Don't use it as a chat with an assistant. That is ChatThread.
- Don't nest replies deeper than one level. The component joins a reply to a reply to the same parent for you.

## Anatomy

- **List**: An ol named by label, oldest comment first.
- **Comment**: An article named by its author: a small Avatar, the name, an AiLabel for an assistant, the time in a time element, and "Edited" after a change.
- **Body**: The text, line breaks kept, or what renderBody draws.
- **Actions**: Reply, Edit and Delete as quiet link buttons, each named with the author ("Reply to Ilse Varga"). Edit and Delete show only on comments that allow them.
- **Replies**: An ol under the comment, behind a hairline rail. A reply to a reply joins the same list.
- **Comment box**: A Textarea in a FormField with a Comment button. Ctrl+Enter sends it. Reply and Edit open the same box in place.
- **Empty state**: A small EmptyState when there are no comments yet.
