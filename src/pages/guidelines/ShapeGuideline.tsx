import { PageHeader, SectionHeading, docsProse } from '../../components/docs/PageChrome'
const BEVELS = [
  { cls: 'bevel-sm', label: 'bevel-sm, 8px cut' },
  { cls: 'bevel-md', label: 'bevel-md, 14px cut' },
  { cls: 'bevel-lg', label: 'bevel-lg, 22px cut' },
]

export function ShapeGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Shape</span>
          </>
        }
        title="Cut corners, never rounded ones"
      />

      <section>
        <SectionHeading>Bevel tokens</SectionHeading>
        <div className="flex gap-6 flex-wrap">
          {BEVELS.map(b => (
            <div key={b.cls} className="text-center">
              <div className={`${b.cls} w-28 h-28 bg-[var(--color-accent-signal-fill)]`} />
              <p className="font-mono text-xs text-[var(--color-text-secondary)] mt-2">{b.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>The focus ring is never clipped</SectionHeading>
        <p className={`${docsProse} mb-4 max-w-xl`}>
          The cut corners are made with <code className="font-mono text-xs">clip-path</code>, a
          CSS rule that trims an element to a shape. It trims everything painted on that element,
          including the focus ring (the outline that shows where the keyboard is) if it&apos;s
          drawn as the element&apos;s own outline. Phase 2&apos;s research into similar systems
          (BUILD-LOG.md, the augmented-ui finding) flagged this as a real risk for any system
          shaped with clip-path. The fix is to put the ring on an untrimmed wrapper around the
          shape, never on the trimmed shape itself. Press Tab to reach the button below. The ring
          draws a clean rectangle around the bevelled shape instead of a clipped fragment of one.
        </p>
        <div className="bevel-focus-wrap">
          <button
            className="bevel-md bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)] font-display font-semibold uppercase tracking-wide text-sm px-6 py-3 min-h-[36px]"
          >
            Acquire target
          </button>
        </div>
      </section>
    </div>
  )
}
