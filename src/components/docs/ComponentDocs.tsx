import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '../atoms/button/Button'
import { Kbd } from '../atoms/kbd/Kbd'
import { Link } from '../atoms/link/Link'
import { PageHeader, SectionHeading, docsLabel, docsProse } from './PageChrome'

import type { ComponentMeta, Pitfall, PropRow } from './meta'
import { publicPath } from '../../base-path'

/** A docs table in a horizontally scrollable region.
 *
 *  SC 1.4.10 excepts "content which requires two-dimensional layout" -- a data table qualifies, so
 *  a table that scrolls sideways inside its own container is the sanctioned accommodation, not a
 *  dodge. What is NOT optional is the container being keyboard-operable: a scroll container
 *  reachable only by mouse wheel or touch drag fails SC 2.1.1, and axe's `scrollable-region-
 *  focusable` rule (wcag2a, in this project's AA tag set) fires on exactly that. Hence
 *  `tabIndex={0}` plus a named `role="region"` and a real focus ring -- the ring because a
 *  focusable element with no visible indicator would then fail SC 2.4.7 instead.
 *
 *  Only Anatomy and Keyboard use this now. Props does not: it was the widest content on the site
 *  and the reason this container exists at all, and a scroll region is a poor answer for it. At
 *  320px a four-column props table rendered as blank-gap fragments with the whole Description
 *  column off-screen. It is a description list laid out on a grid instead (see `PropsList`),
 *  which reflows rather than scrolls. */
function Table({ head, label, children }: { head: string[]; label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {head.map(h => (
              <th
                key={h}
                scope="col"
                className="text-left font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] border-b border-[var(--color-border-hairline-strong)] pb-2.5 pr-6"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const cell = 'align-top py-3 pr-6 border-b border-[var(--color-border-hairline)]'
const prose = docsProse

/** The prop contract, as a description list on a two-column grid rather than a four-column table.
 *
 *  PRODUCT.md names this as the payload for one of the two audiences, and it was the worst-treated
 *  content on the site: 12px mono, paragraph-length prose squeezed into a fourth column, and at
 *  320px a scroll container whose Description column never appeared on screen at all.
 *
 *  The signature (name, type, default) stacks in a fixed-width left column and the description
 *  takes the rest; below `lg` the two stack. Nothing scrolls sideways, because `overflow-wrap:
 *  anywhere` lets a long `Omit<...>` signature break mid-token rather than push the page wide,
 *  which is what the old scroll region existed to accommodate.
 *
 *  `dt` and `dd` are grid items of a plain `div` inside the `dl`, which is the one wrapper the
 *  content model allows there. The type and default lines are `span`s inside the `dt` rather than
 *  siblings of it, because a `p` between a `dt` and its `dd` is invalid inside a `dl`. */
function PropsList({ rows }: { rows: PropRow[] }) {
  return (
    <dl className="border-t border-[var(--color-border-hairline-strong)]">
      {rows.map(row => (
        <div
          key={row.name}
          className="grid gap-x-10 gap-y-2 py-4 border-b border-[var(--color-border-hairline)] lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]"
        >
          <dt className="min-w-0">
            <span className="block font-mono text-[0.9375rem] font-semibold text-[var(--color-text-primary)] [overflow-wrap:anywhere]">
              {row.name}
            </span>
            <span className="block font-mono text-xs leading-relaxed text-[var(--color-text-secondary)] mt-1 [overflow-wrap:anywhere]">
              {row.type}
            </span>
            {row.default ? (
              <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-text-muted)] mt-2">
                Default{' '}
                <span className="normal-case tracking-normal text-[var(--color-text-secondary)]">
                  {row.default}
                </span>
              </span>
            ) : null}
          </dt>
          <dd className={`${prose} min-w-0 max-w-[64ch]`}>{row.description}</dd>
        </div>
      ))}
    </dl>
  )
}

/** DO and DON'T as solid chips in the state fills, not as two more 12px captions.
 *
 *  Fill is named in design.md as this system's core grammar, and `accent.<state>.ink on
 *  accent.<state>.fill` is already a gated pair in both themes (ok 7.69:1, hostile 5.19:1). The
 *  chip carries its own word, so the fill conveys nothing on its own and SC 1.4.11 does not reach
 *  its boundary.
 *
 *  The two class strings are written out rather than interpolated: Tailwind scans source text for
 *  complete class names, and a template literal like `bg-[var(--color-accent-${state}-fill)]`
 *  produces no scannable class at all, so the rule would simply never be generated. */
const ADVICE = {
  ok: 'bg-[var(--color-accent-ok-fill)] text-[var(--color-accent-ok-ink)]',
  hostile: 'bg-[var(--color-accent-hostile-fill)] text-[var(--color-accent-hostile-ink)]',
} as const

function AdviceHeading({ state, children }: { state: keyof typeof ADVICE; children: ReactNode }) {
  return (
    <h3
      className={`inline-flex items-center h-7 px-2.5 mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] ${ADVICE[state]}`}
    >
      {children}
    </h3>
  )
}

/** One mistake as code, wrong beside right, with the reason under both. The two `pre`s scroll
 *  sideways, so each is a named, focusable region (the same accommodation `Table` makes above),
 *  numbered so two mistakes on one page do not give four regions two names. */
function PitfallBlock({ pitfall, index }: { pitfall: Pitfall; index: number }) {
  const pre =
    'overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed text-[var(--color-text-primary)] bg-[var(--color-surface-base)] border border-[var(--color-border-hairline)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
  return (
    <div className="mt-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <AdviceHeading state="hostile">Wrong</AdviceHeading>
          <pre role="region" aria-label={`Mistake ${index}, wrong`} tabIndex={0} className={pre}>
            <code>{pitfall.wrong}</code>
          </pre>
        </div>
        <div className="min-w-0">
          <AdviceHeading state="ok">Right</AdviceHeading>
          <pre role="region" aria-label={`Mistake ${index}, right`} tabIndex={0} className={pre}>
            <code>{pitfall.right}</code>
          </pre>
        </div>
      </div>
      <p className={`${prose} mt-3 max-w-[64ch]`}>{pitfall.why}</p>
    </div>
  )
}

/** Copies the markdown twin, for pasting into a chat with an agent. It fetches the generated file
 *  rather than rebuilding it here, so what is copied is exactly what the link serves. The result is
 *  said in a status line, the way Example's Copy does, so it needs no Toaster above the page. */
function CopyMarkdown({ href }: { href: string }) {
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(''), 2000)
    return () => window.clearTimeout(timer)
  }, [status])

  async function copy() {
    try {
      const response = await fetch(href)
      if (!response.ok) throw new Error(String(response.status))
      await navigator.clipboard.writeText(await response.text())
      setStatus('Copied')
    } catch {
      setStatus('Copying failed. Open the Markdown link and copy it from there.')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={copy}>
        Copy as Markdown
      </Button>
      <span role="status" className="font-mono text-xs text-[var(--color-text-secondary)]">
        {status}
      </span>
    </div>
  )
}

export function ComponentDocs({ meta, children }: { meta: ComponentMeta; children: ReactNode }) {
  const { tier, title, summary: lede, useWhen, notFor, anatomy, props, keyboard, dos, donts, requires = [], pitfalls = [] } = meta
  const eyebrow = tier[0].toUpperCase() + tier.slice(1)
  const markdown = publicPath(`/docs/components/${meta.slug}.md`)

  // The markdown twin, announced the way llmstxt.org suggests, for a crawler or an agent that
  // lands on the rendered page first. The head is not React's here, so it is set and removed by hand.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'alternate'
    link.type = 'text/markdown'
    link.href = markdown
    document.head.append(link)
    return () => link.remove()
  }, [markdown])

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            {eyebrow} <span className="text-[var(--color-accent-signal-text)]">· {title}</span>
          </>
        }
        title={title}
        lede={lede}
      />

      {/* Best for / not for: the two sentences that decide between this component and its nearest
          neighbour, which the markdown page and llms.txt carry at the top too. A description
          list, label beside sentence from sm up and stacked below, so nothing wraps into a
          column at 320px. */}
      <dl className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-[6.5rem_minmax(0,1fr)] max-w-[72ch]">
        <dt className={`${docsLabel} text-[var(--color-text-muted)] sm:pt-1`}>Best for</dt>
        <dd className={prose}>{useWhen}</dd>
        <dt className={`${docsLabel} text-[var(--color-text-muted)] mt-2 sm:mt-0 sm:pt-1`}>Not for</dt>
        <dd className={prose}>{notFor}</dd>
      </dl>

      {/* What a coding agent reads in place of this page: the same metadata and the same examples,
          generated by scripts/build-agent-docs.mjs. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className={prose}>
          <Link href={markdown}>This page as Markdown</Link>, a plain-text copy for a coding agent (an
          AI tool that writes code).
        </p>
        <CopyMarkdown href={markdown} />
      </div>

      {requires.length > 0 ? (
        <div className="mt-6 border-l-2 border-[var(--color-accent-signal-text)] pl-4">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-primary)] mb-2">
            Requires
          </h2>
          <ul className={`${prose} space-y-2`}>
            {requires.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <SectionHeading index={1}>Examples</SectionHeading>
      {children}

      <SectionHeading index={2}>Anatomy</SectionHeading>
      <Table head={['Part', 'What it is']} label={`${title} anatomy`}>
        {anatomy.map(row => (
          <tr key={row.part}>
            <td
              className={`${cell} font-mono text-[0.8125rem] font-semibold text-[var(--color-text-primary)] whitespace-nowrap`}
            >
              {row.part}
            </td>
            <td className={`${cell} ${prose}`}>{row.description}</td>
          </tr>
        ))}
      </Table>

      {/* The docs search jumps here from a prop result. */}
      <div id="props" />
      <SectionHeading index={3}>Props</SectionHeading>
      <PropsList rows={props} />

      <SectionHeading index={4}>Keyboard</SectionHeading>
      {keyboard.length === 0 ? (
        <p className={prose}>You can't reach this component with the keyboard. It has no keyboard behaviour of its own.</p>
      ) : (
        <Table head={['Keys', 'Result']} label={`${title} keyboard shortcuts`}>
          {keyboard.map(row => (
            <tr key={row.keys.join('+')}>
              <td className={`${cell} whitespace-nowrap`}>
                {row.keys.map(k => (
                  <Kbd key={k} className="mr-1">
                    {k}
                  </Kbd>
                ))}
              </td>
              <td className={`${cell} ${prose}`}>{row.does}</td>
            </tr>
          ))}
        </Table>
      )}

      <SectionHeading index={5}>Do and don't</SectionHeading>
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <AdviceHeading state="ok">Do</AdviceHeading>
          <ul className={`${prose} space-y-2.5 list-disc pl-5 marker:text-[var(--color-text-muted)]`}>
            {dos.map(d => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <AdviceHeading state="hostile">Don't</AdviceHeading>
          <ul className={`${prose} space-y-2.5 list-disc pl-5 marker:text-[var(--color-text-muted)]`}>
            {donts.map(d => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>

      {pitfalls.map((pitfall, index) => (
        <PitfallBlock key={pitfall.wrong} pitfall={pitfall} index={index + 1} />
      ))}
    </div>
  )
}
