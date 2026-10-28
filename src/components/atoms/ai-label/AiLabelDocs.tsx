import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './AiLabel.meta'
import { Example } from '../../docs/Example'
import { AiLabel } from './AiLabel'

export function AiLabelDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Static mark">
        <AiLabel />
      </Example>

      <Example caption="With an explanation and sources">
        <div className="flex flex-col gap-2 max-w-md">
          <AiLabel
            label="AI summary"
            explanation="Summarised from the three most recent reviews of this replica. It can miss details or get them wrong: verify before you rely on it."
            sources={[
              { label: 'Review by Ilse Varga', href: '#review-1' },
              { label: 'Review by Tomas Brandt', href: '#review-2' },
            ]}
          />
          <p className="text-sm text-[var(--color-text-primary)]">
            Reviewers find the gearbox quiet and the hop-up easy to tune; two mention a loose stock.
          </p>
        </div>
      </Example>
    </ComponentDocs>
  )
}
