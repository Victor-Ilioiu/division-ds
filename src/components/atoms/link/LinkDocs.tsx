import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Link.meta'
import { Example } from '../../docs/Example'
import { Link } from './Link'

export function LinkDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="In running text">
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
          Check the <Link href="/kits">field kit index</Link> before you head out, and read the{' '}
          <Link href="https://example.com" external tone="quiet">
            supplier notes
          </Link>{' '}
          if the hop-up looks off.
        </p>
      </Example>

      <Example caption="Tones">
        <Link href="/kits" tone="signal">
          Field kits
        </Link>
        <Link href="/kits" tone="quiet">
          Field kits
        </Link>
      </Example>

      <Example caption="External">
        <Link href="https://example.com" external>
          Supplier
        </Link>
      </Example>
    </ComponentDocs>
  )
}
