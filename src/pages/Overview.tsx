import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Avatar, Badge, Button, Kbd, Progress, Switch, Tag, linkVariants } from '../components/atoms'
import { Panel } from '../components/Panel'
import {
  PageHeader,
  SectionHeading,
  docsItemHeading,
  docsProse,
  docsSectionRun,
} from '../components/docs/PageChrome'
import { DEMO_PAGES } from '../demo/routes'
import { CRM_PAGES } from '../crm/routes'
import { CONSOLE_PAGES } from '../console/routes'

/**
 * The front door, and the one brand-register surface in the app (PRODUCT.md: "One documented
 * exception ... the Overview and any hero moment are `brand`").
 *
 * It used to be five identically sized bordered boxes of heading-plus-sentence, with no numeral,
 * no live component, no panel and not one link on the page. The reader PRODUCT.md names, a hiring
 * design-systems lead with five minutes and often a phone, was given nothing to stop on and
 * nowhere to go, on the page they are guaranteed to see first.
 *
 * Three things changed, and each one is a rule this system already had, spent at the one size the
 * brand register permits:
 *
 * 1. NUMERALS AS HEROES. design.md lists the motif, and every component page already carries it at
 *    28px as a section index. The evidence here is numeric, so the hero is a numeral rather than a
 *    sentence: clamp(4.5rem, 15vw, 13rem), tabular figures, the pad dimmed to `numeral.pad` and
 *    `aria-hidden` exactly as Progress's readout does it, so a screen reader hears "18" and not
 *    "zero one eight".
 * 2. IT USES WHAT IT DOCUMENTS. Real Button, Badge, Tag, Kbd, Avatar, Switch and Progress, a real
 *    `Panel` with its corner crosshair, and the same `PageHeader` / `SectionHeading` chrome the
 *    other twenty-seven pages use. A design system's front door rendering hand-rolled boxes is the
 *    worst advertisement available to it.
 * 3. EVERY NUMBER IS RECOMPUTED. `OVERVIEW_COUNTS` is exported and `Overview.test.tsx` asserts each
 *    figure against the repository: the atom folders, the sidebar's flattened route list, the
 *    theme token files, and the contrast gate's own pair list. PRODUCT.md's second principle is
 *    "evidence over assertion", and a number printed at 200px that nothing recomputes is the
 *    loudest possible place to go stale.
 *
 * What it deliberately does NOT do: no new motif, no new colour, no second type scale. The h1 is
 * the same 36/52px step every component page uses, and only the numerals go above it.
 */

/** Every figure printed on this page, in one object so one test can check all of them.
 *
 *  Deliberately excluded: the unit-test and end-to-end totals. Both are true today and both are
 *  invalidated by the next test anyone writes, including the test that would have to check them.
 *  What is gated here is structural instead, and says more: how many pages are covered, rather
 *  than how many assertions ran. */
export const OVERVIEW_COUNTS = {
  /** Folders under src/components/atoms, each with a component, a test file and a docs page. */
  atoms: 23,
  /** Folders under src/components/molecules, each with a component, a test file and a docs page. */
  molecules: 32,
  /** Folders under src/components/organisms, each with a component, a test file and a docs page. */
  organisms: 17,
  /** Routed, sidebar-listed pages: the twelve guidelines (Install, the theme builder and host apps among them), this one,
   *  the twenty-three atom pages, the molecule pages and the organism pages. */
  pages: 85,
  /** tokens/semantic/color.{dark,light}.json. */
  themes: 2,
  /** Rows the contrast gate runs: 90 token pairs, each measured once per theme. */
  contrastChecks: 180,
  /** src/demo/routes.ts's DEMO_PAGES, the one place a Hexline route is registered. Imported
   *  rather than typed, so a page added to or removed from the demo store moves this figure
   *  without anyone remembering to update it. */
  demoPages: DEMO_PAGES.length,
  /** src/crm/routes.ts's CRM_PAGES, the same way, for Corvane. */
  crmPages: CRM_PAGES.length,
  /** src/console/routes.ts's CONSOLE_PAGES, the same way, for Halden Console. */
  consolePages: CONSOLE_PAGES.length,
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

/** An in-app route, styled with the Link atom's own variant function rather than with the atom
 *  itself: `Link` renders a plain `<a href>`, which in a SPA reloads the whole document. The
 *  variants are exported from the barrel for exactly this. */
function Route({ to, children }: { to: string; children: ReactNode }) {
  return (
    <RouterLink to={to} className={linkVariants()}>
      {children}
    </RouterLink>
  )
}

const GATES: { value: number; body: ReactNode; to: string; linkLabel: string }[] = [
  {
    value: OVERVIEW_COUNTS.contrastChecks,
    body: (
      <>
        contrast measurements, taken every time the site is built. A contrast measurement checks
        how clearly one colour stands out from another. There are 90 token pairs (a token is a
        named colour, and each pair is a colour and the background it sits on), each one measured
        in both themes.{' '}
        <code className="font-mono text-[0.8125rem]">npm run build</code>, the command that builds
        the site, runs them before anything else and stops if a pair fails. So nobody can swap a
        token for a prettier colour without the build flagging it. See-through colours are first
        blended with what&apos;s really behind them, because the colour on paper isn&apos;t the
        pixel a reader actually sees.
      </>
    ),
    to: '/guidelines/color',
    linkLabel: 'Watch the ratios recompute',
  },
  {
    value: OVERVIEW_COUNTS.pages,
    body: (
      <>
        documented pages. Every one is checked with axe (a free tool that scans a page for
        accessibility problems) in both themes, walked through using only the keyboard, and tested
        to make sure it doesn&apos;t scroll sideways on a 320px-wide (pixel) screen, about the
        width of a small phone. Adding a page to the sidebar adds four of those tests
        automatically, with no edit to any test file.
      </>
    ),
    to: '/guidelines/accessibility',
    linkLabel: 'What is claimed, and what is not',
  },
  {
    value: OVERVIEW_COUNTS.themes,
    body: (
      <>
        themes, and in neither one is meaning shown by colour alone. A half-checked checkbox draws
        a dash instead of a tick, a switch moves its knob, and a badge always has a word on it.
        Both themes come out of one token pipeline (the script that turns the named design values
        into code). So a theme is just a list that points each name at a value. It&apos;s never a
        second stylesheet.
      </>
    ),
    to: '/guidelines/tokens',
    linkLabel: 'Every primitive token, live',
  },
  {
    value: OVERVIEW_COUNTS.demoPages,
    body: (
      <>
        pages in Hexline, a made-up shop selling airsoft replicas. It&apos;s built from the
        system&apos;s own organisms (the full page sections), so it&apos;s working code, not a
        mockup: a homepage, sign-in, a shop you can filter, product pages, a cart and a checkout
        that places an order.
      </>
    ),
    to: '/demo',
    linkLabel: 'Visit the Hexline demo store',
  },
  {
    value: OVERVIEW_COUNTS.crmPages,
    body: (
      <>
        pages in Corvane, a made-up CRM (customer relationship management tool, the software sales
        teams use to track deals) for a company that sells warehouse sensors. It has a sales
        pipeline as a board and as a table, with actions you can apply to many deals at once, a
        deal sheet, accounts, contacts, an activity feed and a forecast. All of it uses the same
        components and passes the same automated checks.
      </>
    ),
    to: '/crm',
    linkLabel: 'Open the Corvane CRM demo',
  },
  {
    value: OVERVIEW_COUNTS.consolePages,
    body: (
      <>
        pages in Halden Console, a made-up live monitoring screen for warehouse sensors. It has a
        simulated live feed you can pause, alerts you can acknowledge many at a time, sites charted
        over time, and a scripted assistant that looks into an alert and only acts once you
        approve.
      </>
    ),
    to: '/console',
    linkLabel: 'Open the Halden Console demo',
  },
]

const RULES: { title: string; body: string; to: string; linkLabel: string }[] = [
  {
    title: 'One loud colour',
    body: "Signal orange means act, selected or focused. Everything else stays grey, and that's the only reason the orange means anything.",
    to: '/guidelines/color',
    linkLabel: 'Colour',
  },
  {
    title: 'State has a shape',
    body: 'Locked, hostile (error or danger) and disabled states always pair colour with an icon or a pattern. Colour is never the only clue.',
    to: '/guidelines/accessibility',
    linkLabel: 'Accessibility',
  },
  {
    title: 'Ink on signal, never white',
    body: "White text on any accent colour fill fails AA, the standard level of the Web Content Accessibility Guidelines (WCAG) for how readable text must be. So every fill uses dark ink text instead, and each state's pairing is checked automatically.",
    to: '/components/button',
    linkLabel: 'Button',
  },
  {
    title: 'Tilt is earned, not default',
    body: "Panels and cards stay flat, with a blurred glass fill. Tilt is saved for hero sections (the big banner at the top of a page). A card that works as a single click target doesn't tilt either. It gets the accent border and slides up 4px.",
    to: '/guidelines/elevation',
    linkLabel: 'Elevation',
  },
  {
    title: 'The focus ring is never clipped',
    body: "The focus ring is the outline that shows where the keyboard is. Any shape with cut corners (made with clip-path) draws that ring outside the cut, on a wrapper the component adds by itself. So keyboard focus is never invisible, and a developer using the component can't forget it.",
    to: '/guidelines/shape',
    linkLabel: 'Shape',
  },
]

export function Overview() {
  return (
    <div>
      {/* The masthead escapes main's padding: the negative margins and the matching padding
          cancel exactly, so the band spans main's full width without adding a pixel of scroll
          width at 320px (e2e/reflow.spec.ts). It is the only full-bleed element in the app, and
          the only place in the project where extreme scale is licensed. */}
      <header className="-mx-4 md:-mx-10 -mt-4 md:-mt-12 px-4 md:px-10 pt-8 md:pt-14 pb-10 md:pb-14 border-b border-[var(--color-border-hairline-strong)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div>
            <PageHeader
              eyebrow={
                <>
                  Design system{' '}
                  <span className="text-[var(--color-accent-signal-text)]">· Division DS</span>
                </>
              }
              title="Enforce, don't just document"
              lede={
                <>
                  Twenty-three atoms, thirty-two molecules and seventeen organisms in two themes, built from
                  scratch. Atoms are the smallest building blocks, molecules are made from atoms,
                  and organisms are full sections made from those. A rule that isn&apos;t a gate (an
                  automatic check) is only a suggestion. So every rule these pages state is checked
                  by a build that fails when the rule is broken, and every number on this page is
                  counted from the repository, the project&apos;s code.
                </>
              }
            />
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Button asChild size="lg">
                <RouterLink to="/components/button">Open a component page</RouterLink>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <RouterLink to="/guidelines/accessibility">See what is gated</RouterLink>
              </Button>
            </div>
          </div>

          {/* The hero. One numeral, at a size nothing else in the project is allowed to take.
              The unit word sits on the numeral's baseline rather than as a small label above it,
              deliberately: a big number with a small label over it and supporting stats under it
              is the SaaS hero-metric template, and this has to read as a sentence the page is
              saying, not as a dashboard tile. */}
          <div className="lg:text-right">
            <p>
              <Numeral
                value={OVERVIEW_COUNTS.atoms + OVERVIEW_COUNTS.molecules + OVERVIEW_COUNTS.organisms}
                width={3}
                className="block text-[clamp(4.5rem,15vw,13rem)] tracking-tight"
                data-numeral="hero"
              />
              <span className={`block mt-2 ${docsSectionRun}`}>
                Components
              </span>
            </p>
            {/* Left-aligned even in the right-hand column: the label and the numeral take the
                right edge, but ragged-left body copy is harder to read than the alignment is
                worth. */}
            <p className={`${docsProse} text-left mt-5 max-w-[36ch] lg:ml-auto`}>
              Twenty-three small building blocks, thirty-two pieces made from them, and seventeen
              full sections made from those. Every one comes with its own page of documentation and
              its own automatic tests. One of those tests uses a free tool called axe-core. It opens
              the component the way a browser would and checks it against the public accessibility
              rules (WCAG), looking for things like a button a screen reader can't name or a field
              with no label. If it finds a problem, the test fails and the change doesn't go in.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl">
        <SectionHeading>Live, from source</SectionHeading>
        <p className={`${docsProse} max-w-[62ch] mb-6`}>
          Nothing below is a screenshot. These are seven of the twenty-three building blocks, drawn
          from the same code a developer would use, inside the system&apos;s own panel frame. Press
          Tab to move through them. Each one draws its own focus ring (the outline that shows
          where the keyboard is), and the ones with cut corners draw it outside the cut.
        </p>
        <Panel className="flex flex-wrap items-center gap-4">
          <Button>Acquire</Button>
          <Button variant="secondary">Stand down</Button>
          <Badge tone="ok" emphasis="solid">
            Nominal
          </Badge>
          <Tag>design-systems</Tag>
          <Kbd>Esc</Kbd>
          <Avatar name="Dana Iverson" size="md" />
          <Switch aria-label="Reduced motion" defaultChecked />
          <Progress label="Sync" value={64} showValue className="w-44" />
        </Panel>
        <p className={`${docsProse} mt-5`}>
          Every one of the twenty-three has its own page.{' '}
          <Route to="/components/select">Start with Select</Route>, the most complex of them, or{' '}
          <Route to="/components/progress">Progress</Route>, where the big-number style this page
          borrows comes from.
        </p>

        <SectionHeading>What is gated</SectionHeading>
        <dl className="border-t border-[var(--color-border-hairline-strong)]">
          {GATES.map(gate => (
            <div
              key={gate.to}
              className="grid gap-x-8 gap-y-3 py-7 border-b border-[var(--color-border-hairline)] sm:grid-cols-[7.5rem_minmax(0,1fr)]"
            >
              <dt>
                <Numeral
                  value={gate.value}
                  width={4}
                  className="block text-[3.25rem]"
                  data-numeral="gate"
                />
              </dt>
              <dd className={`${docsProse} max-w-[62ch]`}>
                {gate.body} <Route to={gate.to}>{gate.linkLabel}</Route>
              </dd>
            </div>
          ))}
        </dl>

        <SectionHeading>The rules</SectionHeading>
        {/* The same two-column term/description grid the props contract uses on every component
            page, because it is the same shape of content: a name, and what it commits you to. */}
        <dl className="border-t border-[var(--color-border-hairline-strong)]">
          {RULES.map(rule => (
            <div
              key={rule.title}
              className="grid gap-x-10 gap-y-2 py-5 border-b border-[var(--color-border-hairline)] lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
            >
              <dt className={`${docsItemHeading} min-w-0`}>
                {rule.title}
              </dt>
              <dd className={`${docsProse} min-w-0 max-w-[64ch]`}>
                {rule.body} <Route to={rule.to}>{rule.linkLabel}</Route>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
