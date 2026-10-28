import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Button, IconButton, Textarea, Tooltip } from '../../atoms'

export type FeedbackVote = 'helpful' | 'not-helpful'

export type ResponseFeedbackProps = {
  /** Required. Runs on a vote. Return a promise to show "Submitting feedback" until it settles; a
   *  rejection puts both buttons back and says the feedback was not sent. */
  onSubmit: (vote: FeedbackVote) => void | Promise<void>
  /** Offers the optional "tell us more" step after a Not helpful vote. Without it, there is none. */
  onDetail?: (text: string) => void
  className?: string
}

type Phase = 'idle' | 'submitting' | 'submitted' | 'failed'
type Detail = 'closed' | 'open' | 'sent'

/** Cloudscape's wording, word for word: the tooltip on each button, before and after a vote. */
const TIP = {
  helpful: {
    idle: 'Helpful',
    chosen: '"Helpful" feedback has been submitted.',
    other: '"Helpful" option is unavailable after "not helpful" feedback submitted.',
  },
  'not-helpful': {
    idle: 'Not helpful',
    chosen: '"Not helpful" feedback has been submitted.',
    other: '"Not helpful" option is unavailable after "helpful" feedback submitted.',
  },
} as const

/**
 * Thumbs up and down under an assistant reply, for ChatMessage's `actions`. Only on generated
 * replies: never on a person's own message, and never as feedback on the page itself.
 *
 * One vote per reply. While it is sent both buttons are aria-disabled and the status line says
 * "Submitting feedback"; then "Feedback submitted", the chosen button stays pressed, and each
 * button's tooltip says why it no longer works. aria-disabled and not `disabled`, so the buttons
 * stay tab stops: a disabled button gets no hover or focus, so its tooltip, the reason, could
 * never be read.
 *
 * A Not helpful vote with `onDetail` opens an optional step under the buttons: a box and Send /
 * Dismiss. Inline, not a dialog: the reply stays readable while a person writes about it, and
 * nothing traps focus for a step that is optional. Focus moves to the box when it opens and to the
 * status line when it closes, because the element that had it is gone.
 */
export function ResponseFeedback({ onSubmit, onDetail, className }: ResponseFeedbackProps) {
  const id = useId()
  const [phase, setPhase] = useState<Phase>('idle')
  const [vote, setVote] = useState<FeedbackVote | null>(null)
  const [detail, setDetail] = useState<Detail>('closed')
  const [text, setText] = useState('')
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (detail === 'open') boxRef.current?.focus()
  }, [detail])

  const choose = async (choice: FeedbackVote) => {
    if (phase === 'submitting' || phase === 'submitted') return
    setVote(choice)
    setPhase('submitting')
    try {
      await onSubmit(choice)
    } catch {
      setPhase('failed')
      setVote(null)
      return
    }
    setPhase('submitted')
    if (choice === 'not-helpful' && onDetail) setDetail('open')
  }

  const closeDetail = (sent: boolean) => {
    if (sent) onDetail?.(text)
    setDetail(sent ? 'sent' : 'closed')
    // The box and its buttons are about to unmount; focus would fall to the page.
    requestAnimationFrame(() => statusRef.current?.focus())
  }

  const locked = phase === 'submitting' || phase === 'submitted'
  const button = (choice: FeedbackVote, icon: ReactNode) => {
    const tip = !locked ? TIP[choice].idle : vote === choice ? TIP[choice].chosen : TIP[choice].other
    return (
      <Tooltip content={tip}>
        <IconButton
          variant="ghost"
          size="sm"
          label={TIP[choice].idle}
          aria-pressed={vote === choice}
          // The chosen thumb is filled, so the vote shows in shape and not only in aria-pressed.
          className="aria-pressed:[&_svg]:fill-current"
          aria-disabled={locked || undefined}
          onClick={() => void choose(choice)}
        >
          {icon}
        </IconButton>
      </Tooltip>
    )
  }

  const status =
    phase === 'submitting'
      ? 'Submitting feedback'
      : phase === 'failed'
        ? 'Feedback not sent. Try again.'
        : phase === 'submitted'
          ? detail === 'sent'
            ? 'Feedback submitted. Thank you for the detail.'
            : 'Feedback submitted'
          : ''

  return (
    <div role="group" aria-label="Feedback on this reply" className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-1">
        {button('helpful', <ThumbsUp />)}
        {button('not-helpful', <ThumbsDown />)}
        <p
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className="ml-2 font-body text-sm text-[var(--color-text-secondary)] focus:outline-none"
        >
          {status}
        </p>
      </div>
      {detail === 'open' ? (
        <div className="flex flex-col gap-2 max-w-md">
          <label htmlFor={`${id}-detail`} className="font-body text-sm text-[var(--color-text-primary)]">
            What was wrong with this reply? (optional)
          </label>
          <Textarea
            ref={boxRef}
            id={`${id}-detail`}
            rows={2}
            value={text}
            onChange={event => setText(event.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={text.trim() === ''} onClick={() => closeDetail(true)}>
              Send
            </Button>
            <Button size="sm" variant="ghost" onClick={() => closeDetail(false)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
