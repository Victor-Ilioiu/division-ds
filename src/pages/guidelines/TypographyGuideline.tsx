import {
  DOCS_TYPE_SCALE,
  PageHeader,
  SectionHeading,
  docsProse,
  stepPx,
} from '../../components/docs/PageChrome'

/**
 * The page that states the type scale, rendering the scale rather than a second copy of it.
 *
 * It shipped with a hardcoded `text-5xl 48px / text-3xl 30px / text-xl 20px / text-base 16px /
 * text-sm 14px / text-xs 12px` list. That is Tailwind's default scale, and not one of those six
 * sizes appears anywhere in this shell: the one page whose job is to state the scale was wrong
 * about every value on it, and nothing could tell, because the specimens rendered the numbers the
 * page claimed instead of the ones the system uses. Each row now takes its class from
 * `DOCS_TYPE_STEPS` and reads its own px label back out of that class with `stepPx`, so the
 * specimen, the label and the shell cannot disagree.
 */
export function TypographyGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Typography</span>
          </>
        }
        title="Squared, slightly technical, never a costume"
      />

      <section>
        <SectionHeading>The three families</SectionHeading>
        <div className="grid gap-3">
          <div className="border border-[var(--color-border-hairline)] p-5">
            <span className="font-mono text-xs text-[var(--color-text-secondary)]">font-display, Oxanium</span>
            <p className="font-display text-3xl font-semibold mt-1">Base of operations</p>
            <p className={`${docsProse} mt-2`}>
              Used for headlines, big numbers and buttons only. It was chosen at G1 (the mood-board stage, the first
              project milestone) over Chakra Petch, the mood board&apos;s first suggestion. Oxanium
              is the most technical-looking of the candidates. It&apos;s kept to large display sizes
              on purpose: the squared ends of its letters look deliberate at 52px (pixels) and like
              a costume in a paragraph.
            </p>
          </div>
          <div className="border border-[var(--color-border-hairline)] p-5">
            <span className="font-mono text-xs text-[var(--color-text-secondary)]">font-body, Saira</span>
            <p className="font-body text-xl mt-1">
              Every rule this system states is a gate that fails the build, not a sentence in a
              document.
            </p>
            <p className={`${docsProse} mt-2`}>
              Used for every passage you actually read in the app, including this sentence.
            </p>
          </div>
          <div className="border border-[var(--color-border-hairline)] p-5">
            <span className="font-mono text-xs text-[var(--color-text-secondary)]">font-mono, JetBrains Mono</span>
            <p className="font-mono text-lg mt-1">AA 4.50:1 · LARGE 3.00:1 · 24PX</p>
            <p className={`${docsProse} mt-2`}>
              Used for eyebrows (the small label above a heading), badges, tags, timestamps and
              keycaps (drawings of keyboard keys). It&apos;s third-level text that should read as
              data, not prose. The sample above shows contrast minimums: AA is the middle level of
              the Web Content Accessibility Guidelines (WCAG), which asks for 4.50:1 contrast on
              normal text and 3.00:1 on large text.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>Scale</SectionHeading>
        <p className={`${docsProse} mb-4`}>
          Each row below is drawn at the size class (a named text size) shown beside it. The
          classes come from{' '}
          <code className="font-mono text-sm">src/components/docs/PageChrome.tsx</code>, the same
          shared setting that the page header, section headings and body copy use on all
          twenty-eight pages. The pixel (px) figure is read back out of that class, not typed in
          by hand, so it can&apos;t drift.
        </p>
        <div className="grid gap-2">
          {DOCS_TYPE_SCALE.map(step => (
            <div
              key={step.role}
              className="grid gap-x-6 gap-y-1 border-b border-[var(--color-border-hairline)] pb-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-baseline"
            >
              <span className={`font-display ${step.step}`}>Aa</span>
              <div className="min-w-0">
                <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                  {stepPx(step.step)} · {step.role}
                </span>
                <p className={`${docsProse} mt-1`}>{step.use}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Data and number styles</SectionHeading>
        <p className={`${docsProse} mb-4`}>
          Numbers get two treatments, both shown live below. A single big headline number gets
          dimmed leading zeros (the padding zeros in front). Any column of numbers shown together
          uses tabular figures, where every digit is the same width so the columns line up.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="border border-[var(--color-border-hairline)] p-5">
            <span className="font-mono text-xs text-[var(--color-text-secondary)]">Dimmed leading zero</span>
            <div className="font-display font-semibold text-5xl mt-2" role="img" aria-label="The numeral 89, padded to three digits">
              <span className="text-[var(--color-numeral-pad)]" aria-hidden="true">0</span>
              <span aria-hidden="true">89</span>
            </div>
          </div>
          <div className="border border-[var(--color-border-hairline)] p-5">
            <span className="font-mono text-xs text-[var(--color-text-secondary)]">Tabular numerals, aligned</span>
            <div className="font-mono text-lg mt-2 grid gap-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className="flex justify-between"><span>spacing.1</span><span>4</span></div>
              <div className="flex justify-between"><span>spacing.6</span><span>24</span></div>
              <div className="flex justify-between"><span>duration.base</span><span>180</span></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
