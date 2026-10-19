import { useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { exitAlert } from '../../../lib/exit'
import { useMergedRefs } from '../../../lib/refs'
import { TONES, type Tone } from '../../../lib/tone'
import { IconButton } from '../../atoms'

/** The tone's border colour as the `.bevel-edge` diagonal's colour: the cut removes the border
 *  along the corner, and this paints it back. Written out in full for Tailwind's scanner. */
const EDGE: Record<Tone, string> = {
  info: '[--bevel-edge-color:var(--color-accent-info-text)]',
  ok: '[--bevel-edge-color:var(--color-accent-ok-text)]',
  warning: '[--bevel-edge-color:var(--color-accent-warning-text)]',
  hostile: '[--bevel-edge-color:var(--color-accent-hostile-text)]',
}

export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'role'> & {
  tone?: Tone
  title: string
  children?: ReactNode
  /** Adds role="alert" (hostile, warning) or role="status" (info, ok). Only for an alert
   *  inserted after the page loaded; static content is read in order and needs no live role. */
  live?: boolean
  /** Runs once the alert has faded and collapsed (M7), not on the click: unmount it here. With
   *  reduced motion it runs at once. */
  onDismiss?: () => void
  dismissLabel?: string
  action?: ReactNode
  /** One line: icon, title and body in a single sentence, action and dismiss at the end. For a
   *  notice that sits in a toolbar, a table header or a card, where a full alert is too tall. */
  compact?: boolean
  ref?: Ref<HTMLDivElement>
  /** Typed away: `live` and `tone` decide the role together, and a role in rest would win. */
  role?: never
}

/**
 * An inline message that sits in the page. Tone is carried three ways -- an icon, a visually
 * hidden word before the title ("Warning:"), and colour, as a 1px border on all four sides in the
 * tone's `.text` step -- never as a side stripe (Global Constraints). The icon is a graphic (3:1)
 * and the border is a UI component boundary (3:1); both are gated against surface.raised, the
 * root's own background, in scripts/lib/contrast-pairs.mjs.
 *
 * The body stays in text.primary/text.secondary, never the tone colour: long text in orange or
 * red is harder to read and says nothing the icon has not already said.
 *
 * The root is cut 12px at the bottom-right (`.bevel-alert`, src/styles/bevel.css), the same
 * corner as an action Button's own cut, with 8px side padding so the two diagonals sit close. The
 * clip-path would clip a focus ring that reaches the corner, but the action's ring sits inside the
 * padding, clear of the diagonal; the dismiss button is at the top-right, away from the cut. The
 * border follows the diagonal through `.bevel-edge`.
 *
 * Dismissed, it fades, then its height collapses so what sits below rises into its place
 * (M7, src/lib/exit.ts). A gap the parent puts between alerts is not animated: it closes with the
 * unmount, a few pixels at the end of the collapse.
 *
 * `compact` keeps every channel -- icon, hidden tone word, border, title -- and changes only the
 * arrangement: the title (semibold, primary) and the body (secondary) share one paragraph, so they
 * read as one sentence and wrap together if the line runs out, rather than truncating text a
 * person may need. Same tokens and pairs as the full layout, so nothing new to gate.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  live = false,
  onDismiss,
  dismissLabel = 'Dismiss',
  action,
  compact = false,
  className,
  ref,
  ...rest
}: AlertProps) {
  const t = TONES[tone]
  const Icon = t.icon
  const rootRef = useRef<HTMLDivElement | null>(null)
  const setRefs = useMergedRefs(rootRef, ref)
  const exiting = useRef(false)
  const dismiss = () => {
    if (!onDismiss || exiting.current) return
    exiting.current = true
    exitAlert(rootRef.current, () => {
      exiting.current = false
      onDismiss()
    })
  }
  const role = live ? (tone === 'hostile' || tone === 'warning' ? 'alert' : 'status') : undefined

  const dismissButton = onDismiss ? (
    // The dismiss margins go on the wrapper (wrapperClassName), not on the button's own
    // className. IconButton's focus ring is drawn on the wrapper, unclipped; pulling the
    // button in with a margin on the button itself would leave the ring hugging the button's
    // old, unshifted position instead of moving with it.
    <IconButton
      label={dismissLabel}
      variant="ghost"
      size="sm"
      onClick={dismiss}
      wrapperClassName={compact ? '-my-1.5 -mr-1.5' : '-mt-1 -mr-1'}
    >
      <X aria-hidden="true" className="w-4 h-4" />
    </IconButton>
  ) : null

  if (compact) {
    return (
      <div
        ref={setRefs}
        role={role}
        data-compact=""
        className={cn(
          'relative bevel-alert bevel-edge flex items-center gap-2 px-2 py-2 border bg-[var(--color-surface-raised)]',
          t.border,
          EDGE[tone],
          className
        )}
        {...rest}
      >
        <Icon aria-hidden="true" className={cn('w-4 h-4 shrink-0', t.text)} />
        <p className="grow min-w-0 font-body text-sm text-[var(--color-text-secondary)]">
          <span className="sr-only">{t.word}: </span>
          <span className="font-semibold text-[var(--color-text-primary)]">{title}</span>
          {children ? (
            <>
              {' '}
              <span>{children}</span>
            </>
          ) : null}
        </p>
        {action ? <div className="shrink-0">{action}</div> : null}
        {dismissButton}
      </div>
    )
  }

  return (
    <div
      ref={setRefs}
      role={role}
      className={cn(
        'relative bevel-alert bevel-edge flex items-start gap-3 px-2 py-4 border bg-[var(--color-surface-raised)]',
        t.border,
        EDGE[tone],
        className
      )}
      {...rest}
    >
      <Icon aria-hidden="true" className={cn('w-5 h-5 mt-0.5 shrink-0', t.text)} />
      <div className="grow min-w-0">
        <p className="font-display font-semibold text-[var(--color-text-primary)]">
          <span className="sr-only">{t.word}: </span>
          {title}
        </p>
        {children ? (
          <div className="mt-1 font-body text-sm text-[var(--color-text-secondary)]">{children}</div>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      {dismissButton}
    </div>
  )
}
