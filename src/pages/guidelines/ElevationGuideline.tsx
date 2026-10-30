import { PageHeader, SectionHeading, docsItemHeading, docsProse } from '../../components/docs/PageChrome'
import { Panel } from '../../components/atoms/panel/Panel'
import { Card, CardBody, CardDescription, CardTitle } from '../../components/molecules/card/Card'

export function ElevationGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Elevation</span>
          </>
        }
        title="Glass surfaces, hero tilt, a lift on clickable cards"
        lede={
          <>
            Panels, cards and other surfaces don&apos;t tilt by default. Setting flat product UI (user
            interface, the screens people work in) on a permanent 3D angle makes it harder to read
            and gains nothing. They use blurred glass instead. The fixed perspective tilt is kept
            for hero sections (the big banner at the top of a page) and marketing sections only.
            A card that works as a single click target doesn&apos;t tilt either. It gets the accent
            border and slides up 4px (pixels).
          </>
        }
      />

      <section>
        <SectionHeading>Corner-crosshair panel</SectionHeading>
        <Panel crosshair className="max-w-sm">
          <h3 className={docsItemHeading}>Base of operations</h3>
          <p className={`${docsProse} mt-2`}>
            The panel frame any guideline page&apos;s cards could use: a thin hairline border, a
            blurred glass fill and a dimmed crosshair at each corner.
          </p>
        </Panel>
      </section>

      <section>
        <SectionHeading>Hero tilt: static, marketing only</SectionHeading>
        <div className="holo w-56 p-4">
          <div className="h-0.5 w-10 bg-[var(--color-accent-signal-fill)] mb-2" />
          <h3 className={docsItemHeading}>Base of operations</h3>
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">Sector 4 · 1.0 km</p>
        </div>
      </section>

      <section>
        <SectionHeading>Interactive card: flat, lifts 4px</SectionHeading>
        <div className="w-64">
          <Card interactive>
            <CardBody className="flex flex-col gap-1">
              <CardTitle level={3}>
                <a
                  href="#field-report"
                  className="outline-none hover:underline underline-offset-2 after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]"
                >
                  Field report
                </a>
              </CardTitle>
              <CardDescription>Move a mouse over it, or tab to it.</CardDescription>
            </CardBody>
          </Card>
        </div>
        <p className="text-[var(--color-text-secondary)] text-xs mt-3 max-w-xl">
          This is the Card component&apos;s <code className="font-mono">interactive</code> prop (a
          setting you switch on in code). It&apos;s the one way the system marks a whole card as a
          click target. When you hover over it, or while anything inside has keyboard focus, the
          border turns the orange signal accent and the whole card slides up 4px. It drops back
          when the pointer leaves. If someone has asked their device for less motion (the{' '}
          <code className="font-mono">prefers-reduced-motion: reduce</code> setting), the card
          doesn&apos;t move and the border changes instantly. A card that isn&apos;t a click target
          does none of this.
        </p>
      </section>
    </div>
  )
}
