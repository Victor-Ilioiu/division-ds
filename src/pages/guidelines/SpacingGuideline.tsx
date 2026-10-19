import { PageHeader, SectionHeading, docsProse } from '../../components/docs/PageChrome'
const STEPS = [
  { step: '1', px: '4px' },
  { step: '2', px: '8px' },
  { step: '3', px: '12px' },
  { step: '4', px: '16px' },
  { step: '6', px: '24px' },
  { step: '8', px: '32px' },
  { step: '12', px: '48px' },
  { step: '16', px: '64px' },
]

export function SpacingGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Spacing & layout</span>
          </>
        }
        title="A geometric scale, not a guess"
        lede={
          <>
            Eight spacing steps. Each one is a token (a named design value) in{' '}
            <code className="font-mono text-sm">tokens/primitive/spacing.json</code>, and they feed
            straight into Tailwind&apos;s <code className="font-mono text-sm">p-*</code>/<code className="font-mono text-sm">gap-*</code> utilities,
            the ready-made classes that set padding and the gaps between items. The ruler below
            isn&apos;t a screenshot. It&apos;s drawn live from the tokens.
          </>
        }
      />

      <section>
        <SectionHeading>Scale</SectionHeading>
        <div className="grid gap-2">
          {STEPS.map(s => (
            <div key={s.step} className="flex items-center gap-4">
              <span className="font-mono text-xs text-[var(--color-text-secondary)] w-16">--spacing-{s.step}</span>
              <div className="bg-[var(--color-accent-signal-fill)]" style={{ width: s.px, height: '10px' }} />
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">{s.px}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>The 12-column grid</SectionHeading>
        <p className={`${docsProse} mb-3`}>
          Every guideline page&apos;s <code className="font-mono text-xs">main</code> region (the
          main content area) uses this grid. Page content stays within 8–10 columns, so lines of
          text never get too wide to read comfortably.
        </p>
        <div className="grid grid-cols-12 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-12 border border-[var(--color-border-hairline)] flex items-center justify-center font-mono text-[10px] text-[var(--color-text-muted)]">
              {i + 1}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
