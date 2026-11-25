import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'CommentThread',
  title: 'Comment thread',
  tier: 'organisms',
  slug: 'comment-thread',
  summary:
    "The comments on one item, as in an issue tracker: each with an avatar, the author, a time, the text and its actions (Reply, Edit, Delete), replies one level deep under the comment they answer, and a box to add a comment at the end. An assistant's comments carry an AiLabel, so a thread shared by people and an agent always says who wrote what.",
  useWhen: 'People, and an assistant working on the item, discussing one item: a ticket, a document, an order.',
  notFor: 'A conversation with an assistant, turn by turn: use ChatThread. A record of what happened to the item: use Timeline.',
  requires: ['A Toaster at the root, as every overlay needs: Delete asks in an AlertDialog.'],
  anatomy: [
    { part: 'List', description: 'An ol named by label, oldest comment first.' },
    { part: 'Comment', description: 'An article named by its author: a small Avatar, the name, an AiLabel for an assistant, the time in a time element, and "Edited" after a change.' },
    { part: 'Body', description: 'The text, line breaks kept, or what renderBody draws.' },
    { part: 'Actions', description: 'Reply, Edit and Delete as quiet link buttons, each named with the author ("Reply to Ilse Varga"). Edit and Delete show only on comments that allow them.' },
    { part: 'Replies', description: 'An ol under the comment, behind a hairline rail. A reply to a reply joins the same list.' },
    { part: 'Comment box', description: 'A Textarea in a FormField with a Comment button. Ctrl+Enter sends it. Reply and Edit open the same box in place.' },
    { part: 'Empty state', description: 'A small EmptyState when there are no comments yet.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Names the list: "Comments on #12".' },
    { name: 'comments', type: 'readonly ThreadComment[]', description: 'Required. { id, author, body, time, timeLabel, edited?, canEdit?, canDelete?, replies? }, oldest first. author is { name, avatarSrc?, assistant? }.' },
    { name: 'onAdd', type: '(body: string, parentId: string | null) => void | Promise<unknown>', description: 'Turns on the comment box and Reply. parentId is null for a new comment, or the top-level comment a reply belongs to. Return a promise to keep the button busy until it settles; when it rejects, the text stays in the box.' },
    { name: 'onEdit', type: '(id: string, body: string) => void | Promise<unknown>', description: 'Turns on Edit for comments with canEdit.' },
    { name: 'onDelete', type: '(id: string) => void | Promise<unknown>', description: 'Turns on Delete for comments with canDelete. An AlertDialog asks first.' },
    { name: 'renderBody', type: '(comment: ThreadComment) => ReactNode', default: 'the text, line breaks kept', description: 'How the text is drawn, for links or Markdown.' },
    { name: 'composerLabel', type: 'string', default: "'Add a comment'", description: "The comment box's label." },
    { name: 'composerHelp', type: 'string', description: 'Help under the label: who reads the comments, what happens next.' },
    { name: 'submitLabel', type: 'string', default: "'Comment'", description: "The comment box's button." },
    { name: 'emptyTitle', type: 'string', default: "'No comments yet'", description: 'The empty state title.' },
    { name: 'emptyLevel', type: '2 | 3 | 4', default: '3', description: "The empty state's heading level." },
    { name: 'className', type: 'string', description: 'Merged with the root classes. When Tailwind utility classes clash, the later one wins.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'The root div.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves through each comment's Reply, Edit and Delete, then the comment box." },
    { keys: ['Ctrl', 'Enter'], does: 'In a comment box, sends it (Cmd+Enter on a Mac). Enter alone starts a new line.' },
  ],
  dos: [
    "Mark every comment an assistant wrote with author.assistant, so its AiLabel says so.",
    'Let people edit and delete only their own comments: set canEdit and canDelete per comment.',
    'Say in composerHelp who reads the comments, when an agent picks them up.',
  ],
  donts: [
    "Don't use it as a chat with an assistant. That is ChatThread.",
    "Don't nest replies deeper than one level. The component joins a reply to a reply to the same parent for you.",
  ],
}
