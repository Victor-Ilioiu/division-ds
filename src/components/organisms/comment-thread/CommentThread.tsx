import { useId, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref } from 'react'
import { cn } from '../../../lib/cn'
import { AiLabel, Avatar, Button, Textarea } from '../../atoms'
import { EmptyState, FormField } from '../../molecules'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from '../alert-dialog/AlertDialog'

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

export type CommentThreadProps = {
  /** Required. Names the list: "Comments on #12". */
  label: string
  comments: readonly ThreadComment[]
  /** Turns on the comment box and Reply. parentId is null for a new comment, or the top-level
   *  comment a reply belongs to. Return a promise to keep the box busy until it settles; a
   *  rejected promise keeps the text. */
  onAdd?: (body: string, parentId: string | null) => void | Promise<unknown>
  /** Turns on Edit for comments with canEdit. */
  onEdit?: (id: string, body: string) => void | Promise<unknown>
  /** Turns on Delete for comments with canDelete. An AlertDialog asks first. */
  onDelete?: (id: string) => void | Promise<unknown>
  /** How a comment's text is drawn. @default the text, line breaks kept */
  renderBody?: (comment: ThreadComment) => ReactNode
  /** @default 'Add a comment' */
  composerLabel?: string
  composerHelp?: string
  /** @default 'Comment' */
  submitLabel?: string
  /** @default 'No comments yet' */
  emptyTitle?: string
  /** The heading level of the empty state. @default 3 */
  emptyLevel?: 2 | 3 | 4
  className?: string
  ref?: Ref<HTMLDivElement>
}

const submitOnModEnter = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }
}

/** One text box with its buttons: the new-comment box, a reply, or an edit. */
function Composer({
  label,
  help,
  initial = '',
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
}: {
  label: string
  help?: string
  initial?: string
  submitLabel: string
  onSubmit: (body: string) => void | Promise<unknown>
  onCancel?: () => void
  autoFocus?: boolean
}) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await onSubmit(body)
      setText('')
    } catch {
      // The parent reports the failure; the text stays so nothing typed is lost.
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <FormField label={label} help={help}>
        <Textarea
          rows={3}
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={submitOnModEnter}
          autoFocus={autoFocus}
        />
      </FormField>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" loading={busy} disabled={!text.trim()}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}

export function CommentThread({
  label,
  comments,
  onAdd,
  onEdit,
  onDelete,
  renderBody,
  composerLabel = 'Add a comment',
  composerHelp,
  submitLabel = 'Comment',
  emptyTitle = 'No comments yet',
  emptyLevel = 3,
  className,
  ref,
}: CommentThreadProps) {
  const listId = useId()
  // Which comment has its reply box or edit box open. One at a time.
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ThreadComment | null>(null)

  const renderComment = (comment: ThreadComment, parentId: string | null) => {
    const isEditing = editing === comment.id
    const nameId = `${listId}-${comment.id}`
    const replies = parentId === null ? (comment.replies ?? []) : []
    const showReplyBox = replyTo === comment.id
    return (
      <li key={comment.id} className="flex flex-col gap-3">
        <article aria-labelledby={nameId} className="flex gap-3">
          <Avatar name={comment.author.name} src={comment.author.avatarSrc} size="sm" className="mt-0.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span id={nameId} className="font-semibold text-[var(--color-text-primary)]">
                {comment.author.name}
              </span>
              {comment.author.assistant ? <AiLabel label="Assistant" /> : null}
              <time dateTime={comment.time} className="text-sm text-[var(--color-text-secondary)]">
                {comment.timeLabel}
              </time>
              {comment.edited ? <span className="text-sm text-[var(--color-text-secondary)]">Edited</span> : null}
            </div>
            {isEditing && onEdit ? (
              <Composer
                label={`Edit comment by ${comment.author.name}`}
                initial={comment.body}
                submitLabel="Save"
                autoFocus
                onSubmit={async body => {
                  await onEdit(comment.id, body)
                  setEditing(null)
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="min-w-0 whitespace-pre-wrap break-words text-sm text-[var(--color-text-primary)]">
                {renderBody ? renderBody(comment) : comment.body}
              </div>
            )}
            {isEditing ? null : (
              <div className="flex flex-wrap gap-3">
                {onAdd ? (
                  <Button
                    variant="link"
                    tone="neutral"
                    className="text-sm text-[var(--color-text-secondary)]"
                    aria-label={`Reply to ${comment.author.name}`}
                    onClick={() => { setEditing(null); setReplyTo(parentId ?? comment.id) }}
                  >
                    Reply
                  </Button>
                ) : null}
                {onEdit && comment.canEdit ? (
                  <Button
                    variant="link"
                    tone="neutral"
                    className="text-sm text-[var(--color-text-secondary)]"
                    aria-label={`Edit comment by ${comment.author.name}`}
                    onClick={() => { setReplyTo(null); setEditing(comment.id) }}
                  >
                    Edit
                  </Button>
                ) : null}
                {onDelete && comment.canDelete ? (
                  <Button
                    variant="link"
                    tone="neutral"
                    className="text-sm text-[var(--color-text-secondary)]"
                    aria-label={`Delete comment by ${comment.author.name}`}
                    onClick={() => setDeleting(comment)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </article>
        {replies.length || showReplyBox ? (
          <div className="ml-3 border-l border-[var(--color-border-hairline-strong)] pl-6">
            {replies.length ? (
              <ol role="list" aria-label={`Replies to ${comment.author.name}`} className="m-0 flex list-none flex-col gap-4 p-0">
                {replies.map(reply => renderComment(reply, comment.id))}
              </ol>
            ) : null}
            {showReplyBox && onAdd ? (
              <div className={cn(replies.length && 'mt-4')}>
                <Composer
                  label={`Reply to ${comment.author.name}`}
                  submitLabel="Reply"
                  autoFocus
                  onSubmit={async body => {
                    await onAdd(body, comment.id)
                    setReplyTo(null)
                  }}
                  onCancel={() => setReplyTo(null)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div ref={ref} className={cn('flex flex-col gap-6', className)}>
      {comments.length ? (
        <ol role="list" aria-label={label} className="m-0 flex list-none flex-col gap-5 p-0">
          {comments.map(comment => renderComment(comment, null))}
        </ol>
      ) : (
        <EmptyState level={emptyLevel} title={emptyTitle} size="sm" />
      )}
      {onAdd ? (
        <Composer
          label={composerLabel}
          help={composerHelp}
          submitLabel={submitLabel}
          onSubmit={body => onAdd(body, null)}
        />
      ) : null}
      <AlertDialog open={deleting !== null} onOpenChange={next => { if (!next) setDeleting(null) }}>
        <AlertDialogContent
          title="Delete this comment?"
          description={deleting ? `The comment by ${deleting.author.name} is removed for good.` : ''}
        >
          <AlertDialogFooter>
            <AlertDialogCancel>Keep comment</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) void onDelete?.(deleting.id) }}>Delete comment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
