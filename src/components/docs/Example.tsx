import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../atoms/button/Button'
import { Panel } from '../Panel'

/** One captioned live demo. The caption is an h3 under ComponentDocs's "Examples" h2, so
 *  heading order never skips a level — axe's heading-order rule is in the AA tag set.
 *
 *  `source` is never written by hand. The `example-sources` plugin in vite.config.ts reads each
 *  example's children out of the docs page and passes them in, so the code shown is the code
 *  rendered above it, and `scripts/build-agent-docs.mjs` writes the same text into the markdown
 *  page an agent reads. */
export function Example({
  caption,
  children,
  className,
  source,
}: {
  caption: string
  children: ReactNode
  className?: string
  source?: string
}) {
  return (
    <div className="mb-10">
      {/* The caption used to be muted 12px mono, i.e. the same treatment as the section headings,
          the eyebrow and every table header. It keeps the 12px mono role (it is a label, not a
          heading step) and takes its contrast from weight and colour instead: JetBrains Mono 600
          on text.primary. */}
      <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-primary)] mb-3">
        {caption}
      </h3>
      <Panel className={cn('flex flex-wrap items-center gap-4', className)}>{children}</Panel>
      {source ? <ExampleSource caption={caption} source={source} /> : null}
    </div>
  )
}

/** The example's source, closed by default so a page of twelve examples is still a page of
 *  examples. A native disclosure: no state to keep, and find-in-page opens it in Chromium.
 *
 *  The `pre` scrolls sideways (code does not reflow, and SC 1.4.10 excepts it), so it is a named,
 *  focusable region with a visible ring, for the same reason ComponentDocs's tables are. */
function ExampleSource({ caption, source }: { caption: string; source: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <details className="mt-2 group">
      <summary className="inline-flex cursor-pointer items-center min-h-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]">
        Code
      </summary>
      <div className="mt-2 border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)]">
        <pre
          role="region"
          aria-label={`${caption}, source`}
          tabIndex={0}
          className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <code>{source}</code>
        </pre>
        <div className="flex items-center gap-3 border-t border-[var(--color-border-hairline)] px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(source).then(() => setCopied(true))
            }}
          >
            Copy
          </Button>
          <span role="status" className="font-mono text-xs text-[var(--color-text-secondary)]">
            {copied ? 'Copied' : ''}
          </span>
        </div>
      </div>
    </details>
  )
}
