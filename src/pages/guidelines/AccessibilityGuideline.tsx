import { PageHeader, docsItemHeading, docsProse } from '../../components/docs/PageChrome'
const COMMITMENTS = [
  {
    id: '2.4.11',
    title: 'Focus not obscured',
    status: 'shipped' as const,
    body: "The top navigation bar stays pinned to the top of the screen as you scroll. The page reserves room for it with `html { scroll-padding-top }`, so when you move through the page with the keyboard, the item you've landed on never ends up hidden under the bar.",
  },
  {
    id: '2.4.13',
    title: 'Focus appearance',
    status: 'shipped' as const,
    body: "The focus ring is the outline that shows which item the keyboard is on. Its color comes from the focus.ring token (a named design value), and it stands out from the background by a contrast ratio of at least 3:1 in both themes: 3.14:1 in light and 5.80:1 in dark, measured by the contrast gate, the automated check that tests color pairs. It's at least 2px (pixels) thick and is drawn outside any clip-path shape (the CSS that cuts a component's corners), never inside it. The Shape page has the live demo and explains how it works.",
  },
  {
    id: '2.5.8',
    title: 'Target size',
    status: 'shipped' as const,
    body: "Everything you can click or tap, in the site's frame and in every guideline demo, is at least 36 pixels tall (min-h-[36px]). Icon-only controls are also at least 36 pixels wide (min-w-[36px]). The rule asks for 24 pixels, so there's room to spare.",
  },
  {
    id: '2.5.7',
    title: 'Dragging movements',
    status: 'commitment' as const,
    body: "Nothing in G2 (the foundations stage, the second of the project's approval steps) needs dragging, so there's nothing to check yet. When something does, such as a slider or a list you reorder in Phase 4, it'll come with a way to do the same thing without dragging from day one. That alternative won't be added later as an afterthought.",
  },
  {
    id: '3.3.7',
    title: 'Redundant entry',
    status: 'commitment' as const,
    body: "There's no multi-step form yet. Those arrive with the checkout and sign-in (authentication) flows in Phase 5. The promise: anything a person has already typed once in a flow gets carried forward, and they're never asked for it again, unless it's a security-sensitive field.",
  },
  {
    id: '3.3.8',
    title: 'Accessible authentication',
    status: 'commitment' as const,
    body: "There's no sign-in flow yet (it comes in Phase 5). The promise: pasting and password managers will always work, and a memory or thinking test, such as a puzzle CAPTCHA (the \"prove you're human\" challenge), will never be the only way to sign in.",
  },
]

export function AccessibilityGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Accessibility</span>
          </>
        }
        title="WCAG 2.2, specific, not decorative"
        lede={
          <>
            WCAG 2.2 is the Web Content Accessibility Guidelines, version 2.2: the public rulebook
            for making websites usable by people with disabilities. Each rule has a number. These
            are six of them. Three are shipped and you can check them today. The other three are
            promises for flows that don't exist yet in G2, the foundations stage, and they're
            labelled as promises, not passed off as already verified.
          </>
        }
      />
      <div className="grid gap-4">
        {COMMITMENTS.map(c => (
          <div key={c.id} className="border border-[var(--color-border-hairline)] p-5">
            {/* Wraps since the criterion title moved from 14px to the scale's 19px step: at 320px the
                id, the title and the status chip no longer fit on one line, and a non-wrapping
                row pushed the card 3px past the viewport (e2e/reflow.spec.ts). */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">{c.id}</span>
              <h2 className={docsItemHeading}>{c.title}</h2>
              <span
                className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                  c.status === 'shipped'
                    ? 'text-[var(--color-accent-ok-text)] border border-[var(--color-accent-ok-fill)]'
                    : 'text-[var(--color-accent-warning-text)] border border-[var(--color-accent-warning-fill)]'
                }`}
              >
                {c.status === 'shipped' ? 'Shipped' : 'Forward commitment'}
              </span>
            </div>
            <p className={docsProse}>{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
