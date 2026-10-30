import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CodeBlock } from '../molecules/code-block/CodeBlock'
import { Panel } from '../atoms/panel/Panel'

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
      <Panel crosshair className={cn('flex flex-wrap items-center gap-4', className)}>{children}</Panel>
      {source ? <ExampleSource caption={caption} source={source} /> : null}
    </div>
  )
}

/** The example's source, closed by default so a page of twelve examples is still a page of
 *  examples. A native disclosure: no state to keep, and find-in-page opens it in Chromium. The
 *  code is a CodeBlock: a named, focusable region (it scrolls sideways) with a copy button. */
function ExampleSource({ caption, source }: { caption: string; source: string }) {
  return (
    <details className="mt-2 group">
      <summary className="inline-flex cursor-pointer items-center min-h-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]">
        Code
      </summary>
      <CodeBlock title="tsx" label={`${caption}, source`} code={source} className="mt-2" />
    </details>
  )
}
