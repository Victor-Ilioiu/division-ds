import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Button, Spinner } from '../../atoms'
import { ChatAnnouncerContext, type ChatAnnouncer } from '../../molecules/chat-message/announcer'

export type ChatThreadProps = {
  /** Required. Names the log: "Conversation with the assistant". */
  label: string
  /** ChatMessage elements, oldest first. */
  children: ReactNode
  /** The assistant is working: a working line at the end of the thread, and one polite
   *  announcement when it starts. @default false */
  busy?: boolean
  /** The working line's words. @default 'Assistant is working' */
  busyLabel?: string
  /** The Jump to latest button's words. @default 'Jump to latest' */
  jumpLabel?: string
  /** On the root. Give the thread a height (`h-[28rem]`, or `flex-1 min-h-0` in a column): the
   *  thread scrolls, the page does not. */
  className?: string
}

/** Within this distance of the end counts as "at the end": a reader resting a few pixels short of
 *  the bottom still gets new text kept in view. */
const STICK_DISTANCE = 32

/** How many past announcements the status region keeps. Each is its own node, so two that land in
 *  the same moment (a reply finishing, then "Assistant stopped") are both read; old ones are
 *  unchanged nodes and are not read again. */
const KEEP_ANNOUNCEMENTS = 3

/**
 * A conversation with an assistant: a scrolling `role="log"` of ChatMessages, a working line while
 * the assistant is busy, and a Jump to latest button when the reader has scrolled away from the end.
 *
 * Announcements. A log is a polite live region by default, which for a streaming reply means a
 * screen reader reads it a word or a fragment at a time, for as long as it streams. So the log is
 * `aria-live="off"`: it keeps its role, its name and its order for a reader browsing it, and speaks
 * through one visually hidden `role="status"` beside it instead, which hears exactly two things:
 * the busy label, once, when work starts; and each assistant or system message's finished text,
 * once, when it stops streaming (or arrives whole). The history the thread opens with is never
 * read out, and the person's own messages are not echoed back to them.
 *
 * Scroll. The thread follows new content only while the reader is at the end. Once they scroll up
 * to read, nothing moves under them: content keeps arriving below, and a "Jump to latest" button
 * appears. Following is an instant scroll, never smooth, so a reply arriving in fragments does not
 * animate on every fragment. The jump is instant too, and it puts focus on the log itself, because
 * the button it was on disappears at the end.
 *
 * Focus. Nothing in the thread ever takes focus on its own: text streaming in, a tool call
 * finishing, a new message arriving all leave focus wherever the person has it (usually the
 * PromptInput). The log is a tab stop (`tabIndex={0}`) so a keyboard can scroll it.
 *
 * Contrast rows, by exact name. The working line: "text.secondary on surface.base". The jump button
 * paints surface.sunken under a secondary Button's text and border: "button secondary border on
 * surface.base" over the opaque sunken fill, and "dropdown menu label (text.secondary) on
 * surface.sunken" for its words.
 */
export function ChatThread({
  label,
  children,
  busy = false,
  busyLabel = 'Assistant is working',
  jumpLabel = 'Jump to latest',
  className,
}: ChatThreadProps) {
  const logRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Whether new content should keep the end in view. A ref, not state: it changes on every scroll
  // event and nothing renders from it.
  const stuck = useRef(true)
  const [atEnd, setAtEnd] = useState(true)
  const [announcements, setAnnouncements] = useState<{ id: number; text: string }[]>([])
  const nextId = useRef(0)
  const mounted = useRef(false)

  const announce = useCallback((text: string) => {
    const id = nextId.current++
    setAnnouncements(list => [...list.slice(-(KEEP_ANNOUNCEMENTS - 1)), { id, text }])
  }, [])
  const announcer = useMemo<ChatAnnouncer>(() => ({ announce, live: () => mounted.current }), [announce])

  // After every child's own mount effect: messages that mounted with the thread are history.
  useEffect(() => {
    mounted.current = true
  }, [])

  const scrollToEnd = useCallback(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [])

  // Every render may have added text (a streamed fragment re-renders the thread with it); keep the
  // end in view before paint, so a following reader never sees the text jump.
  useLayoutEffect(() => {
    if (stuck.current) scrollToEnd()
  })

  // Height changes no render reports: an image loading, a ToolCall's details opening.
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const observer = new ResizeObserver(() => {
      if (stuck.current) scrollToEnd()
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [scrollToEnd])

  const previousBusy = useRef(busy)
  useEffect(() => {
    if (busy && !previousBusy.current) announce(busyLabel)
    previousBusy.current = busy
  }, [busy, busyLabel, announce])

  const onScroll = () => {
    const log = logRef.current
    if (!log) return
    const end = log.scrollHeight - log.scrollTop - log.clientHeight <= STICK_DISTANCE
    stuck.current = end
    setAtEnd(end)
  }

  const jump = () => {
    stuck.current = true
    setAtEnd(true)
    scrollToEnd()
    logRef.current?.focus({ preventScroll: true })
  }

  return (
    <ChatAnnouncerContext.Provider value={announcer}>
      <div className={cn('relative flex flex-col min-h-0 bg-[var(--color-surface-base)]', className)}>
        <div
          ref={logRef}
          role="log"
          aria-label={label}
          aria-live="off"
          tabIndex={0}
          onScroll={onScroll}
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overscroll-contain',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
          )}
        >
          <div ref={contentRef} className="flex flex-col gap-6 p-4">
            {children}
            {busy ? (
              <div
                data-part="working"
                className="flex items-center gap-3 font-body text-sm text-[var(--color-text-secondary)]"
              >
                <Spinner variant="conveyor" size="sm" aria-hidden="true" />
                {busyLabel}
              </div>
            ) : null}
          </div>
        </div>
        {atEnd ? null : (
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <Button
              size="sm"
              variant="secondary"
              iconStart={<ArrowDown />}
              onClick={jump}
              wrapperClassName="pointer-events-auto"
              className="bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-sunken)]"
            >
              {jumpLabel}
            </Button>
          </div>
        )}
        <div role="status" className="sr-only">
          {announcements.map(item => (
            <p key={item.id}>{item.text}</p>
          ))}
        </div>
      </div>
    </ChatAnnouncerContext.Provider>
  )
}
