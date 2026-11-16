import type { ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type LogFeedEntry = {
  /** What happened: an agent, a tool, a note name. */
  name: ReactNode
  /** Shown after an arrow: "→ wrote research/x.md". */
  detail?: ReactNode
}

export type LogFeedProps = {
  /** Required. Names the log region for assistive tech. */
  label: string
  /** Oldest first; the last entry is the newest and is drawn bright. */
  entries: LogFeedEntry[]
  /** A prompt line above the entries ("search brain"), followed by a block caret. */
  prompt?: ReactNode
  /** Numbers start here. @default 1 */
  start?: number
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * A read-only activity feed in the data face: `NN name → detail`, the newest entry in
 * text.primary, the older ones at rest (text.secondary). Not the Terminal: that wraps xterm for a
 * live PTY; this is plain DOM text for a short list of events. `role="log"` so additions are
 * announced politely. The caret blinks only without prefers-reduced-motion.
 */
export function LogFeed({ label, entries, prompt, start = 1, className, ref }: LogFeedProps) {
  const width = String(start + Math.max(entries.length - 1, 0)).length
  return (
    <div ref={ref} role="log" aria-label={label} className={cn('flex flex-col gap-1 font-data text-sm min-w-0', className)}>
      {prompt !== undefined ? (
        <p className="flex items-center gap-2 text-[var(--color-text-primary)] min-w-0">
          <span aria-hidden="true" className="text-[var(--color-text-muted)]">
            &gt;
          </span>
          <span className="truncate">{prompt}</span>
          <span
            aria-hidden="true"
            className="inline-block h-[1.1em] w-[0.6em] shrink-0 bg-[var(--color-text-primary)] motion-safe:animate-pulse"
          />
        </p>
      ) : null}
      <ol className="flex flex-col gap-0.5 list-none p-0 m-0 min-w-0">
        {entries.map((entry, index) => {
          const newest = index === entries.length - 1
          return (
            <li
              key={index}
              className={cn(
                'flex gap-2 min-w-0',
                newest ? 'text-[var(--color-text-active)]' : 'text-[var(--color-text-rest)]'
              )}
            >
              <span className="shrink-0 text-[var(--color-text-muted)]">{String(start + index).padStart(Math.max(width, 2), '0')}</span>
              <span className="shrink-0">{entry.name}</span>
              {entry.detail !== undefined ? (
                <span className="min-w-0 truncate">
                  <span aria-hidden="true">→ </span>
                  {entry.detail}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
