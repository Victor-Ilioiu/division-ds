import { PageHeader, docsProse } from '../../components/docs/PageChrome'
import { useMemo, useState } from 'react'
import colorPrimitives from '../../../tokens/primitive/color.json'
import spacingPrimitives from '../../../tokens/primitive/spacing.json'
import motionPrimitives from '../../../tokens/primitive/motion.json'
import { readCssVar } from '../../lib/tokens-runtime'

type Row = { name: string; kind: 'color' | 'dimension' | 'duration' | 'ease' }

// Same naming convention build-tokens.mjs uses when it writes tokens.css -- derived here, not
// hand-duplicated, so this list can never drift from what the pipeline actually generates.
function deriveRows(): Row[] {
  const rows: Row[] = []
  for (const [name, ramp] of Object.entries(colorPrimitives.color.primitive)) {
    for (const stop of Object.keys(ramp)) {
      rows.push({ name: `--color-${name}-${stop}`, kind: 'color' })
    }
  }
  for (const step of Object.keys(spacingPrimitives.spacing)) {
    rows.push({ name: `--spacing-${step}`, kind: 'dimension' })
  }
  for (const name of Object.keys(motionPrimitives.duration)) {
    rows.push({ name: `--duration-${name}`, kind: 'duration' })
  }
  for (const name of Object.keys(motionPrimitives.ease)) {
    rows.push({ name: `--ease-${name}`, kind: 'ease' })
  }
  return rows
}

export function TokensBrowser() {
  const [query, setQuery] = useState('')
  const rows = useMemo(() => deriveRows(), [])
  const filtered = rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Tokens browser</span>
          </>
        }
        title="Every primitive token, live"
      />
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filter, e.g. signal, spacing-4, duration"
        aria-label="Filter tokens"
        className="font-mono text-sm border border-[var(--color-border-control)] bg-transparent px-3 py-2 min-h-[36px] w-full max-w-sm mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      />
      <div className="border border-[var(--color-border-hairline)]">
        {filtered.map(row => {
          const value = readCssVar(row.name)
          return (
            <div key={row.name} className="flex items-center gap-4 px-4 py-2 border-b border-[var(--color-border-hairline)] font-mono text-xs last:border-b-0">
              {row.kind === 'color' && <span className="inline-block w-5 h-5 border border-[var(--color-border-hairline)]" style={{ background: value }} aria-hidden="true" />}
              <span className="flex-1 text-[var(--color-text-primary)]">{row.name}</span>
              <span className="text-[var(--color-text-secondary)]">{value}</span>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className={`${docsProse} px-4 py-6`}>No tokens match "{query}".</p>
        )}
      </div>
    </div>
  )
}
