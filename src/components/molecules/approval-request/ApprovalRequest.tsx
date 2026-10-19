import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { CircleCheck, CircleX, ShieldQuestion } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Button } from '../../atoms'

export type ApprovalState = 'pending' | 'approved' | 'rejected'

export type ApprovalRequestProps = {
  /** Required. The action as a question: "Send this order to Arad depot?" */
  title: string
  /** The preview of exactly what will happen: the message, the change, the amount. */
  children: ReactNode
  /** Required. Pending shows the two buttons; a resolved request shows a status line instead. */
  state: ApprovalState
  /** Required. Runs the action. The parent sets `state` to 'approved'. */
  onApprove: () => void
  /** Required. Nothing happens. The parent sets `state` to 'rejected'. */
  onReject: () => void
  /** @default 'Approve' */
  approveLabel?: string
  /** @default 'Reject' */
  rejectLabel?: string
  /** The status line once approved. @default 'Approved by you' */
  approvedLabel?: string
  /** The status line once rejected. @default 'Rejected' */
  rejectedLabel?: string
  className?: string
}

const RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * A stop before a side effect. The assistant has prepared something that leaves the conversation
 * (sends a message, changes a record, spends money), and nothing happens until the person reads
 * the preview and says yes. The preview is the content itself, not a summary of it: a person can
 * only approve what they can see.
 *
 * A `section` named by its title, outlined in the signal colour while pending so it reads as the
 * thing waiting on the reader. Approve is the primary button and Reject the secondary, side by
 * side; neither is pre-focused, because an approval that arrives while someone is typing must not
 * take their Enter key.
 *
 * Resolved, the buttons are replaced by a status line ("Approved by you", "Rejected"), so the
 * history shows what was decided and the decision cannot be clicked twice. The button that had
 * focus is gone at that moment, so focus moves to the status line (`tabIndex={-1}`, read out on
 * focus) instead of falling to the page. It moves only if the request was resolved from its own
 * buttons and focus has not gone somewhere else meanwhile: a request resolved elsewhere (another
 * tab, a teammate) never takes focus.
 *
 * Contrast rows, by exact name. Title and preview: "text.primary on surface.raised (over
 * surface.base)". The label and the resolved line: "alert body and ghost dismiss (text.secondary)
 * on surface.raised (over surface.base)". The pending outline and its icon: "approval outline and
 * icon (accent.signal.text) on surface.raised (over surface.base)". The approved icon: "check icon
 * (accent.ok.text) on surface.raised (over surface.base)".
 */
export function ApprovalRequest({
  title,
  children,
  state,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  approvedLabel = 'Approved by you',
  rejectedLabel = 'Rejected',
  className,
}: ApprovalRequestProps) {
  const titleId = useId()
  const statusRef = useRef<HTMLParagraphElement>(null)
  // Set by this request's own buttons, so only a decision made here moves focus.
  const decidedHere = useRef(false)
  const pending = state === 'pending'

  useLayoutEffect(() => {
    if (pending || !decidedHere.current) return
    decidedHere.current = false
    // The focused button has just been removed, which leaves focus on <body>. Anything else means
    // the person has moved on, and focus stays where they put it.
    const active = document.activeElement
    if (active === null || active === document.body) statusRef.current?.focus()
  }, [pending])

  const decide = (handler: () => void) => () => {
    decidedHere.current = true
    handler()
  }

  return (
    <section
      aria-labelledby={titleId}
      data-chat-block=""
      data-state={state}
      className={cn(
        'flex flex-col gap-3 p-4 border bg-[var(--color-surface-raised)]',
        pending ? 'border-[var(--color-accent-signal-text)]' : 'border-[var(--color-border-hairline-strong)]',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldQuestion
          aria-hidden="true"
          className={cn(
            'w-4 h-4 shrink-0',
            pending ? 'text-[var(--color-accent-signal-text)]' : 'text-[var(--color-text-secondary)]'
          )}
        />
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
          {pending ? 'Needs your approval' : 'Approval'}
        </span>
      </div>
      <p id={titleId} className="font-body text-base font-semibold text-[var(--color-text-primary)]">
        {title}
      </p>
      <div className="pl-3 border-l border-[var(--color-border-hairline-strong)] font-body text-sm text-[var(--color-text-primary)] break-words">
        {children}
      </div>
      {pending ? (
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={decide(onApprove)}>
            {approveLabel}
          </Button>
          <Button size="sm" variant="secondary" onClick={decide(onReject)}>
            {rejectLabel}
          </Button>
        </div>
      ) : (
        <p
          ref={statusRef}
          tabIndex={-1}
          data-part="status"
          className={cn('inline-flex items-center gap-2 self-start font-body text-sm text-[var(--color-text-secondary)]', RING)}
        >
          {state === 'approved' ? (
            <CircleCheck aria-hidden="true" className="w-4 h-4 shrink-0 text-[var(--color-accent-ok-text)]" />
          ) : (
            <CircleX aria-hidden="true" className="w-4 h-4 shrink-0" />
          )}
          {state === 'approved' ? approvedLabel : rejectedLabel}
        </p>
      )}
    </section>
  )
}
