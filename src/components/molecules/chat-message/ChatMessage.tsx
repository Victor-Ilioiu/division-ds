import { useContext, useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { ChatAnnouncerContext, announcementText } from './announcer'

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export type ChatMessageProps = {
  /** Who is speaking. `system` is a quiet centred status line: "Assistant stopped". */
  role: ChatMessageRole
  /** Required. "You", "Assistant". Shown above the message and names it for a screen reader. */
  author: string
  /** ISO datetime, for `<time dateTime>`. */
  time?: string
  /** What is shown for the time: "09:40". */
  timeLabel?: string
  /** Still arriving: `aria-busy` on the message, and a caret after the text. In a ChatThread the
   *  finished text is announced once, when this turns false; never word by word. @default false */
  streaming?: boolean
  /** Text, paragraphs, or ToolCall and ApprovalRequest blocks. */
  children: ReactNode
  /** Small buttons under an assistant message: Copy, Retry. */
  actions?: ReactNode
  className?: string
}

/**
 * One turn in a conversation. An `article` named by its author line, so a screen reader browsing a
 * ChatThread's log hears "You" or "Assistant" at the start of each message and can jump between
 * them by landmark-like article navigation.
 *
 * The three roles read differently on purpose. The person's own words sit in a sunken bubble on
 * the right, the shape every chat has taught them; the assistant's reply has no bubble and the
 * full width, because it is the long text and holds blocks (tool calls, approvals) that need the
 * room; a system line is a mono label in the middle, for the conversation's own events.
 *
 * Streaming. `aria-busy` says the message is incomplete to anyone who reaches it mid-stream. The
 * caret is a static block, not a blink: a blink that lasts as long as the stream would be content
 * that flashes for more than five seconds with no way to stop it (SC 2.2.2), and reduced motion
 * would have to remove it anyway. Inside a ChatThread, the message tells the thread its finished
 * text when `streaming` turns false (or when it arrives already complete), and the thread reads it
 * out once through its status region. Blocks marked as such are left out of that text.
 *
 * Contrast rows, by exact name. User bubble text: "toast title (text.primary) on surface.sunken".
 * Assistant text: "text.primary on surface.base". Author, time and the system line: "text.secondary
 * on surface.base". The caret is decorative (a pseudo-element), the bubble's border a hairline.
 */
export function ChatMessage({
  role,
  author,
  time,
  timeLabel,
  streaming = false,
  children,
  actions,
  className,
}: ChatMessageProps) {
  const authorId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const thread = useContext(ChatAnnouncerContext)
  // Decided once, at the first effect: was this message part of the history the thread opened
  // with? A message that mounted while still streaming is new, whatever the thread says.
  const arrivedLive = useRef<boolean | null>(null)
  const announced = useRef(false)

  useEffect(() => {
    if (!thread || role === 'user' || announced.current) return
    if (arrivedLive.current === null) arrivedLive.current = streaming || thread.live()
    if (!arrivedLive.current || streaming || !bodyRef.current) return
    // A reply that so far holds only a running ToolCall has nothing to say yet; it is announced
    // when its text has streamed in.
    const text = announcementText(bodyRef.current)
    if (!text) return
    announced.current = true
    thread.announce(role === 'system' ? text : `${author}: ${text}`)
  }, [thread, role, author, streaming])

  const timeElement =
    timeLabel === undefined ? null : (
      <time
        dateTime={time}
        className="font-mono text-xs uppercase tracking-[0.12em] tabular-nums text-[var(--color-text-secondary)]"
      >
        {timeLabel}
      </time>
    )

  // The caret is a ::after on the body's last paragraph, so it sits at the end of the text even
  // when the message also holds blocks (a ToolCall above the reply). A pseudo-element with empty
  // content is not in the accessibility tree. No paragraph yet (only a running ToolCall), no caret.
  const caret =
    "[&>p:last-child]:after:content-[''] [&>p:last-child]:after:inline-block [&>p:last-child]:after:w-[0.5em] [&>p:last-child]:after:h-[1.1em] [&>p:last-child]:after:ml-0.5 [&>p:last-child]:after:align-text-bottom [&>p:last-child]:after:bg-[var(--color-accent-signal-fill)]"

  if (role === 'system') {
    return (
      <article
        aria-labelledby={authorId}
        aria-busy={streaming || undefined}
        className={cn('anim-snap-in flex items-center gap-3', className)}
      >
        <span aria-hidden="true" className="h-px grow bg-[var(--color-border-hairline)]" />
        <span id={authorId} className="sr-only">
          {author}
        </span>
        <div
          ref={bodyRef}
          className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-center text-[var(--color-text-secondary)]"
        >
          {children}
          {timeElement ? <> · {timeElement}</> : null}
        </div>
        <span aria-hidden="true" className="h-px grow bg-[var(--color-border-hairline)]" />
      </article>
    )
  }

  const user = role === 'user'
  return (
    <article
      aria-labelledby={authorId}
      aria-busy={streaming || undefined}
      data-role={role}
      className={cn('anim-snap-in flex flex-col gap-1.5 min-w-0', user ? 'items-end' : 'items-stretch', className)}
    >
      <div className="flex items-baseline gap-3">
        <span
          id={authorId}
          className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]"
        >
          {author}
        </span>
        {timeElement}
      </div>
      <div
        ref={bodyRef}
        data-part="body"
        data-streaming={streaming ? '' : undefined}
        className={cn(
          'flex flex-col gap-3 min-w-0 font-body text-sm leading-relaxed text-[var(--color-text-primary)] break-words',
          user && 'max-w-[85%] px-3 py-2 border border-[var(--color-border-hairline)] bg-[var(--color-surface-sunken)]',
          streaming && caret
        )}
      >
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
      {actions === undefined || user ? null : <div className="flex flex-wrap gap-2 mt-1">{actions}</div>}
    </article>
  )
}
