import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './ScoreRing.meta'
import { Example } from '../../docs/Example'
import { ScoreRing } from './ScoreRing'

export function ScoreRingDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A report like Lighthouse (Google's website audit tool): four scores in a row" className="flex flex-wrap justify-center gap-8">
        <ScoreRing label="Performance" value={42} />
        <ScoreRing label="Accessibility" value={98} />
        <ScoreRing label="Best practices" value={77} />
        <ScoreRing label="SEO" value={100} />
      </Example>

      <Example caption="Sizes: sm, md and lg" className="flex flex-wrap items-end justify-center gap-8">
        <ScoreRing label="Stock health" value={64} size="sm" />
        <ScoreRing label="Stock health" value={64} />
        <ScoreRing label="Stock health" value={64} size="lg" />
      </Example>

      <Example caption="The band boundaries: 49, 50, 89 and 90" className="flex flex-wrap justify-center gap-8">
        <ScoreRing label="Depot A" value={49} size="sm" />
        <ScoreRing label="Depot B" value={50} size="sm" />
        <ScoreRing label="Depot C" value={89} size="sm" />
        <ScoreRing label="Depot D" value={90} size="sm" />
      </Example>
    </ComponentDocs>
  )
}
