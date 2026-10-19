import type { ReactNode } from 'react'

/** The docs type scale, in one place, for every page in the shell.
 *
 *  36-52 / 26 / 19 / 15 / 11px -- h1, section heading, lede, body, label, with the section index
 *  numeral one notch above its heading at 28px -- and every adjacent step at or above a 1.25
 *  ratio, measured by `e2e/docs-visual-language.spec.ts` rather than described and hoped for.
 *
 *  It used to live inside `ComponentDocs`, which meant the eighteen atom pages carried it and the
 *  nine guideline pages, which render their own headings, carried the older flat one: a 30px
 *  light h1 and 14px uppercase section headings, inside the same shell, one click apart. A scale
 *  that only two thirds of the pages use is not a scale, and the inconsistency reads louder than
 *  the flatness it replaced. Everything typographic is exported from here so there is one place
 *  to change it and no second copy to drift.
 */

/** The size half of every step, as the Tailwind class the shell actually renders.
 *
 *  These are the literal class strings and nothing else, so `src/pages/guidelines/
 *  TypographyGuideline.tsx` can render a specimen AT each step and read its size back out of the
 *  same string, instead of restating the scale in a second list. That page shipped documenting
 *  `text-5xl 48px / text-3xl 30px / text-xl 20px / text-base 16px / text-sm 14px / text-xs 12px`,
 *  which is Tailwind's default scale and not one step of this one: the single page whose job is
 *  to state the type scale was wrong about all six values. A page that restates a number is a
 *  copy of it; a page that renders the constant cannot disagree with it.
 *
 *  Tailwind v4 finds arbitrary values by scanning source text (`src/styles/tailwind.css`'s
 *  `@source "../**\/*.{ts,tsx}"`), so the classes below are emitted because they appear here as
 *  literals. Composing one into a template string elsewhere does not change that. */
export const DOCS_TYPE_STEPS = {
  display: 'text-[2.25rem] md:text-[3.25rem]',
  section: 'text-[1.625rem]',
  index: 'text-[1.75rem]',
  lede: 'text-[1.1875rem]',
  item: 'text-[1.1875rem]',
  body: 'text-[0.9375rem]',
  label: 'text-[0.6875rem]',
} as const

/** Rem values read back out of a step's class string, rendered in px at the 16px root this app
 *  never overrides. A responsive step returns both, smallest first. */
export function stepPx(step: string): string {
  const rems = [...step.matchAll(/text-\[([\d.]+)rem\]/g)].map(m => Math.round(parseFloat(m[1]) * 16))
  return `${rems.join(' / ')}px`
}

/** The scale as an ordered list, for the page that documents it. `use` says which role takes the
 *  step, because two of them share a size and the difference is the job, not the number. */
export const DOCS_TYPE_SCALE = [
  { role: 'Page title', step: DOCS_TYPE_STEPS.display, use: 'One h1 per page. Steps down below md so a long title fits a 320px viewport.' },
  { role: 'Section index', step: DOCS_TYPE_STEPS.index, use: 'The numeral beside a component page section heading. Held above the WCAG large-text threshold of 24px, which is what licenses its 3:1 contrast pair.' },
  { role: 'Section heading', step: DOCS_TYPE_STEPS.section, use: 'A section boundary, uppercase, over a hairline. Set one notch under the index because uppercase has no descenders to lose.' },
  { role: 'Lede', step: DOCS_TYPE_STEPS.lede, use: 'The opening sentence under the h1. Optional: several pages open straight onto a specimen.' },
  { role: 'Item heading', step: DOCS_TYPE_STEPS.item, use: 'A title inside a grid cell or a panel, where a section rule would draw an edge that is not there.' },
  { role: 'Body', step: DOCS_TYPE_STEPS.body, use: 'Every reading-length passage.' },
  { role: 'Label', step: DOCS_TYPE_STEPS.label, use: 'Eyebrow, caption, table header. A role rather than a step: its contrast comes from weight and colour, not size.' },
] as const

/** Body copy, 15px. The step below the lede. */
export const docsProse = `${DOCS_TYPE_STEPS.body} leading-relaxed text-[var(--color-text-secondary)]`

/** The 11px label role. Not a step in the scale: it takes its contrast from weight (JetBrains
 *  Mono 600) and colour rather than from size, so it can sit under a 52px heading without
 *  reading as the same voice at a smaller size. */
export const docsLabel = `font-mono ${DOCS_TYPE_STEPS.label} font-semibold uppercase tracking-[0.2em]`

/** The 19px step, used as a heading rather than as a lede: a title inside a grid cell or a panel,
 *  where the section step and its rule would be a section boundary that is not there. Motion
 *  demos, Accessibility criteria and Elevation's panel titles take this. It carries no heading
 *  level of its own -- the page keeps whatever level its document outline already needed. */
export const docsItemHeading = `font-display font-semibold ${DOCS_TYPE_STEPS.item} leading-snug`

/** The uppercase section-heading run, shared with the one place outside `SectionHeading` that
 *  renders it: the Overview's hero unit word. */
export const docsSectionRun = `font-display font-semibold ${DOCS_TYPE_STEPS.section} leading-none uppercase tracking-[0.02em]`

/** Eyebrow, h1 and optional lede: the first three lines of every page in the shell.
 *
 *  `lede` is optional because several guideline pages open straight onto a specimen with no
 *  introductory sentence. Inventing one to fill the step would be writing copy, so the step is
 *  simply absent on those pages. */
export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: ReactNode
  title: string
  lede?: ReactNode
}) {
  return (
    <>
      <p className={`${docsLabel} text-[var(--color-text-muted)]`}>{eyebrow}</p>
      <h1 className={`font-display font-bold ${DOCS_TYPE_STEPS.display} leading-[0.95] tracking-tight mt-3 mb-5`}>
        {title}
      </h1>
      {lede ? (
        <p className={`font-light ${DOCS_TYPE_STEPS.lede} leading-relaxed text-[var(--color-text-secondary)] max-w-[58ch]`}>
          {lede}
        </p>
      ) : null}
    </>
  )
}

/** A section heading, optionally numbered.
 *
 *  The index is this system's "numerals as heroes" motif applied to the chrome that frames the
 *  components: tabular figures, the leading zero dimmed to `numeral.pad`, the significant digit in
 *  `accent.signal.fill`. It renders at 28px, which clears WCAG's large-text threshold of 24px, so
 *  the theme-invariant `signal.fill` step is usable here in BOTH themes: it measures 3.14:1 on
 *  the light page, which fails 4.5:1 for body copy but clears the 3:1 large-text rule. Gated as
 *  its own named pair in scripts/check-contrast.mjs ("docs section index ..."), because the
 *  obligation is per-use: a use nothing names is a use nothing re-measures when a token moves.
 *  The 28px is the whole basis of that pair's 3:1 threshold, so it is pinned separately by
 *  e2e/docs-visual-language.spec.ts. Shrinking this heading below 24px does not fail the contrast
 *  gate, it silently invalidates it.
 *
 *  `index` is omitted on the guideline pages: the numbered index is a motif, and the atom pages
 *  earn it because their five sections are the same five sections every time, in the same order.
 *  A guideline page's sections are not an ordered contract, so numbering them would be decoration
 *  wearing a motif's clothes.
 *
 *  `aria-hidden` on the numeral keeps the heading's accessible name the word alone ("Props", not
 *  "zero three Props"). */
export function SectionHeading({ index, children }: { index?: number; children: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-3 mt-16 mb-5 pt-5 border-t border-[var(--color-border-hairline-strong)]">
      {index === undefined ? null : (
        <span
          aria-hidden="true"
          className={`font-display font-bold ${DOCS_TYPE_STEPS.index} leading-none tabular-nums shrink-0`}
        >
          <span className="text-[var(--color-numeral-pad)]">0</span>
          <span className="text-[var(--color-accent-signal-fill)]">{index}</span>
        </span>
      )}
      <span className={docsSectionRun}>
        {children}
      </span>
    </h2>
  )
}
