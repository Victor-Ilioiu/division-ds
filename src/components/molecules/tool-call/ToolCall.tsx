import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Badge, Spinner } from '../../atoms'

export type ToolCallStatus = 'running' | 'done' | 'failed'

export type ToolCallProps = {
  /** Required. The tool's own name, shown in mono: "query_stock_levels". */
  name: string
  /** A person's description of the call: "Read stock levels at Depot 4". Shown above the name. */
  title?: string
  /** Required. Said in a word as well as a glyph and a colour. */
  status: ToolCallStatus
  /** How long it took: "1.2 s". */
  duration?: string
  /** What the assistant sent the tool. Collapsed by default. */
  input?: ReactNode
  /** What came back. Collapsed by default. */
  output?: ReactNode
  /** Starts with input and output shown. @default false */
  defaultOpen?: boolean
  className?: string
}

/** Status in three channels: a glyph (a Spinner while running), a Badge with the word, and the
 *  tone's colour on both. The word is the one that cannot be missed. */
const STATUS: Record<ToolCallStatus, { word: string; tone: 'info' | 'ok' | 'hostile' }> = {
  running: { word: 'Running', tone: 'info' },
  done: { word: 'Done', tone: 'ok' },
  failed: { word: 'Failed', tone: 'hostile' },
}

const RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * What the assistant did on the person's behalf, shown where it happened in the reply: a compact
 * panel with the status glyph, the title and the tool's name, the status word and the duration,
 * and a "Show details" disclosure over the input and output. Showing the work is how a reader
 * learns to trust (or catch) an assistant, so the call is never hidden; its payload is, until
 * asked for, because it is long and mostly machine-shaped.
 *
 * The running glyph is a decorative Spinner (no label): the Badge already says "Running", and a
 * status region per call would make a thread with several calls talk over itself. The thread's own
 * busy status is the one that speaks. The block carries `data-chat-block`, so the message's
 * announcement skips it.
 *
 * The details are a disclosure button (`aria-expanded`, `aria-controls`), as in Timeline, not an
 * Accordion: one optional extra, not a set of panels. Input and output wrap (`whitespace-pre-wrap`,
 * `break-words`) rather than scroll sideways, so a long payload never widens the page at 320px.
 *
 * Contrast rows, by exact name. Title: "text.primary on surface.raised (over surface.base)". Name,
 * duration, labels and the disclosure button: "alert body and ghost dismiss (text.secondary) on
 * surface.raised (over surface.base)". Status glyphs: "alert icon and border (accent.<tone>.text)
 * on surface.raised (over surface.base)". The frame is a hairline, decorative.
 */
export function ToolCall({
  name,
  title,
  status,
  duration,
  input,
  output,
  defaultOpen = false,
  className,
}: ToolCallProps) {
  const [open, setOpen] = useState(defaultOpen)
  const detailsId = useId()
  const { word, tone } = STATUS[status]
  const hasDetails = input !== undefined || output !== undefined

  return (
    <div
      // CHAT_BLOCK_ATTRIBUTE: left out of the message's announcement.
      data-chat-block=""
      data-status={status}
      className={cn(
        'flex flex-col gap-2 px-3 py-2.5 border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-raised)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="inline-flex items-center justify-center w-5 h-5 shrink-0 mt-px">
          {status === 'running' ? (
            <Spinner size="sm" className="text-[var(--color-accent-info-text)]" />
          ) : status === 'done' ? (
            <CircleCheck className="w-4 h-4 text-[var(--color-accent-ok-text)]" />
          ) : (
            <CircleAlert className="w-4 h-4 text-[var(--color-accent-hostile-text)]" />
          )}
        </span>
        <div className="flex flex-col min-w-0 grow">
          {title === undefined ? null : (
            <p className="font-body text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
          )}
          <p
            className={cn(
              'font-mono text-sm break-all',
              title === undefined ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
            )}
          >
            {name}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 shrink-0">
          <Badge tone={tone}>{word}</Badge>
          {duration === undefined ? null : (
            <span className="font-mono text-xs uppercase tracking-[0.12em] tabular-nums text-[var(--color-text-secondary)]">
              {duration}
            </span>
          )}
        </div>
      </div>
      {hasDetails ? (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen(value => !value)}
            className={cn(
              'self-start ml-8 inline-flex items-center gap-1 min-h-6 font-mono text-xs uppercase tracking-[0.12em]',
              'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              RING
            )}
          >
            {open ? 'Hide details' : 'Show details'}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-[var(--duration-fast)] motion-reduce:transition-none',
                open && 'rotate-180'
              )}
            />
          </button>
          <div id={detailsId} hidden={!open} className="anim-snap-in ml-8 flex flex-col gap-3">
            {input === undefined ? null : <Payload label="Input">{input}</Payload>}
            {output === undefined ? null : <Payload label="Output">{output}</Payload>}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Payload({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">{label}</p>
      <div className="pl-3 border-l border-[var(--color-border-hairline-strong)] font-mono text-sm whitespace-pre-wrap break-words text-[var(--color-text-secondary)]">
        {children}
      </div>
    </div>
  )
}
