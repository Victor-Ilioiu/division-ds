import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './SectionHeading.meta'
import { Example } from '../../docs/Example'
import { Button, Link } from '../../atoms'
import { SectionHeading } from './SectionHeading'

export function SectionHeadingDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Title only" className="block">
        <SectionHeading level={4} title="Top-rated replicas" />
      </Example>

      <Example caption="With a description and an action" className="block">
        <SectionHeading
          level={4}
          title="Top-rated accessories"
          description="Optics and parts, ordered by what the reviews say."
          action={<Link href="#accessories">All accessories</Link>}
        />
      </Example>

      <Example caption="Numbered, in a run" className="block">
        <div className="flex flex-col gap-10">
          <SectionHeading level={4} index={1} title="Replicas" description="Three lengths on one receiver." />
          <SectionHeading level={4} index={2} title="Optics" description="A tube sight and a holo sight." />
          <SectionHeading
            level={4}
            index={3}
            title="Parts and accessories"
            action={
              <Button asChild variant="secondary" size="sm">
                <a href="#parts">All parts</a>
              </Button>
            }
          />
        </div>
      </Example>

      <Example caption="Naming its section" className="block">
        <section aria-labelledby="section-heading-docs-care">
          <SectionHeading
            level={4}
            id="section-heading-docs-care"
            title="Care plans"
            description="The section below is a region named “Care plans”. It takes that name from this heading, which carries the id."
          />
          <p className="mt-4 font-body text-sm text-[var(--color-text-primary)]">
            A chrono check, a tune and upgrade fitting, billed monthly.
          </p>
        </section>
      </Example>
    </ComponentDocs>
  )
}
