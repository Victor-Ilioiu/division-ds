import { useMemo } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { SegmentedControl } from '../components/molecules/segmented-control/SegmentedControl'
import { PageHeader, docsProse, docsSectionRun } from '../components/docs/PageChrome'
import { NAV } from '../components/shell/Sidebar'

/**
 * The components index at /components, and the front door the old Overview (/design-system, now a
 * redirect here) folded into: a short masthead, then every component as one alphabetical list, filterable by tier.
 *
 * Every number is recomputed: `OVERVIEW_COUNTS` is asserted against the repository by
 * `Components.test.tsx`, and the index itself is the sidebar's NAV, so a component added to the
 * sidebar is listed here with no second edit. The list is plain links, alphabetical, three columns
 * wide; each component's page carries its description.
 */

/** Every figure printed on this page, in one object so one test can check all of them.
 *
 *  Deliberately excluded: the unit-test and end-to-end totals. Both are true today and both are
 *  invalidated by the next test anyone writes, including the test that would have to check them.
 *  What is gated here is structural instead, and says more: how many pages are covered, rather
 *  than how many assertions ran. */
export const OVERVIEW_COUNTS = {
  /** Folders under src/components/atoms, each with a component, a test file and a docs page. */
  atoms: 24,
  /** Folders under src/components/molecules, each with a component, a test file and a docs page. */
  molecules: 33,
  /** Folders under src/components/organisms, each with a component, a test file and a docs page. */
  organisms: 17,
  /** tokens/semantic/color.{dark,light}.json. */
  themes: 2,
} as const

/** A numeral in the system's own treatment: tabular figures, the leading-zero pad dimmed and
 *  hidden from assistive tech, the significant digits in the theme-invariant `signal.fill` step.
 *
 *  `signal.fill` measures 3.14:1 on the light page, which clears WCAG's 3:1 rule for large text
 *  and fails the 4.5:1 body rule. Every use of it here is 52px or larger, the pair is named in
 *  scripts/lib/contrast-pairs.mjs, and the rendered sizes are pinned by
 *  e2e/docs-visual-language.spec.ts, because a pair whose threshold depends on a font size is
 *  invalidated by a shrink rather than failed by one.
 *
 *  `width` is a fixed field, and that is the same rule Progress follows rather than an exception
 *  to it: Progress pads because its value is bounded and the field width is therefore known, and
 *  Slider does not because `min`/`max` belong to the caller. The hero (every component, all three
 *  tiers summed) stays a three-digit field: that count is bounded by the folder lists and pinning
 *  it means a new component does not reflow the numeral beside it. The gate ledger widened to four digits once the
 *  contrast-MEASUREMENT count (the number this numeral actually renders -- pairs times themes,
 *  never the pair count alone) crossed 100 -- a count that exactly fills its field renders no pad
 *  at all, which `Overview.test.tsx` does catch (it asserts every gate numeral has one), but a
 *  failing test after the fact is a worse way to learn this than headroom that avoids it, so the
 *  field is sized wider than today's values need. The pad is `aria-hidden`, so it is a column
 *  width and never part of the value. */
function Numeral({
  value,
  width,
  className,
  ...rest
}: { value: number; width: number; className: string } & Record<`data-${string}`, string>) {
  const digits = String(value)
  const pad = '0'.repeat(Math.max(0, width - digits.length))
  return (
    <span className={`font-display font-bold tabular-nums leading-[0.8] ${className}`} {...rest}>
      {pad ? (
        <span aria-hidden="true" className="text-[var(--color-numeral-pad)]">
          {pad}
        </span>
      ) : null}
      <span className="text-[var(--color-accent-signal-indicator)]">{digits}</span>
    </span>
  )
}

type Level = 'all' | 'atoms' | 'molecules' | 'organisms'
type TierLevel = Exclude<Level, 'all'>

const TIERS: { level: TierLevel; title: string }[] = [
  { level: 'atoms', title: 'Atoms' },
  { level: 'molecules', title: 'Molecules' },
  { level: 'organisms', title: 'Organisms' },
]

function isLevel(value: string | null): value is Level {
  return value === 'all' || value === 'atoms' || value === 'molecules' || value === 'organisms'
}

/** One tier's entries, straight from the sidebar's NAV. */
function entriesFor(title: string) {
  return (NAV.find(group => group.title === title)?.items ?? []).map(item => ({
    label: item.label,
    to: item.to,
    slug: item.to.split('/').pop() ?? '',
  }))
}

export function Components() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('level')
  const level: Level = isLevel(raw) ? raw : 'all'
  const tiers = useMemo(() => TIERS.map(tier => ({ ...tier, entries: entriesFor(tier.title) })), [])
  const total = tiers.reduce((sum, tier) => sum + tier.entries.length, 0)
  const entries = (level === 'all' ? tiers : tiers.filter(tier => tier.level === level))
    .flatMap(tier => tier.entries)
    .sort((x, y) => x.label.localeCompare(y.label))
  const shownCount = entries.length

  const options = [
    { value: 'all', label: `All (${total})` },
    ...tiers.map(tier => ({ value: tier.level, label: `${tier.title} (${tier.entries.length})` })),
  ]

  return (
    <div>
      {/* The masthead escapes main's padding: the negative margins and the matching padding
          cancel exactly, so the band spans main's full width without adding scroll width. */}
      <header className="-mx-4 md:-mx-10 -mt-4 md:-mt-12 px-4 md:px-10 pt-8 md:pt-14 pb-10 md:pb-12 border-b border-[var(--color-border-hairline-strong)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div>
            <PageHeader
              eyebrow={
                <>
                  Design system{' '}
                  <span className="text-[var(--color-accent-signal-text)]">· Division DS</span>
                </>
              }
              title="Components"
              lede={
                <>
                  {OVERVIEW_COUNTS.atoms} atoms, {OVERVIEW_COUNTS.molecules} molecules and{' '}
                  {OVERVIEW_COUNTS.organisms} organisms in {OVERVIEW_COUNTS.themes} themes, built from
                  scratch. Atoms are the smallest building blocks, molecules are made from atoms, and
                  organisms are full sections made from those. Every one has its own page, its own
                  tests and an axe accessibility check, and every number here is counted from the
                  repository.
                </>
              }
            />
          </div>
          <p className="lg:text-right">
            <Numeral
              value={OVERVIEW_COUNTS.atoms + OVERVIEW_COUNTS.molecules + OVERVIEW_COUNTS.organisms}
              width={3}
              className="block text-[clamp(4.5rem,15vw,10rem)] tracking-tight"
              data-numeral="hero"
            />
            <span className={`block mt-2 ${docsSectionRun}`}>Components</span>
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-8">
        <SegmentedControl
          label="Show components by level"
          options={options}
          value={level}
          onValueChange={value => {
            const next = new URLSearchParams(params)
            if (value === 'all') next.delete('level')
            else next.set('level', value)
            setParams(next, { replace: true })
          }}
          size="sm"
        />
        <p className={`${docsProse} text-sm`} role="status">
          Showing {shownCount} of {total}
        </p>
      </div>

      {/* One alphabetical list, filtered by level. CSS columns read down each column, so the
          visual order and the tab order are the same alphabetical order. */}
      <ul role="list" aria-label="Components" className="mt-8 columns-1 sm:columns-2 lg:columns-3 gap-x-8 list-none">
        {entries.map(entry => (
          <li key={entry.to} className="break-inside-avoid border-b border-[var(--color-border-hairline)]">
            <RouterLink
              to={entry.to}
              className="flex min-h-11 items-center px-2 font-display font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent-signal-wash)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              {entry.label}
            </RouterLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
