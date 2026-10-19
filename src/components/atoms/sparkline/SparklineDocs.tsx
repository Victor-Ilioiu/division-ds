import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Sparkline.meta'
import { Example } from '../../docs/Example'
import { Sparkline } from './Sparkline'

export function SparklineDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Beside the value it trends" className="flex flex-wrap items-center justify-center gap-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular-nums">4.2 °C</span>
          <Sparkline
            values={[3.1, 3.2, 3.2, 3.4, 3.3, 3.6, 3.8, 3.7, 4.0, 4.2]}
            label="Cold room 2, last hour: 3.1 to 4.2 °C, rising"
            band={{ from: 2, to: 8 }}
            showLast
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular-nums">412</span>
          <Sparkline
            values={[380, 365, 402, 398, 371, 420, 412]}
            label="Orders, last 7 days: 365 to 420, steady"
            tone="signal"
            showLast
          />
        </div>
      </Example>

      <Example caption="Tones" className="flex flex-wrap items-center justify-center gap-6">
        <Sparkline values={[5, 6, 5, 7, 6, 8]} label="Neutral trend, rising" />
        <Sparkline values={[5, 6, 5, 7, 6, 8]} label="Healthy trend, rising" tone="ok" />
        <Sparkline values={[5, 6, 5, 7, 6, 8]} label="Degraded trend, rising" tone="warning" />
        <Sparkline values={[5, 6, 5, 7, 6, 8]} label="Failing trend, rising" tone="hostile" />
        <Sparkline values={[5, 6, 5, 7, 6, 8]} label="Informational trend, rising" tone="info" />
      </Example>

      <Example caption="Stretched to its container, with a safe band from 2 to 8 °C">
        <div className="w-full max-w-md">
          <Sparkline
            values={[4.1, 4.3, 4.0, 5.2, 6.8, 8.4, 9.1, 8.7, 7.2, 5.9, 5.0, 4.6]}
            label="Cold room 3, last 12 hours: 4.0 to 9.1 °C, above the safe band for 3 hours, now back inside it"
            tone="warning"
            band={{ from: 2, to: 8 }}
            min={0}
            max={10}
            height={40}
            className="w-full"
            showLast
          />
        </div>
      </Example>

      <Example caption="No values, one value, a flat run" className="flex flex-wrap items-center justify-center gap-6">
        <Sparkline values={[]} label="No readings yet" />
        <Sparkline values={[12]} label="One reading: 12" showLast />
        <Sparkline values={[7, 7, 7, 7]} label="Flat at 7" showLast />
      </Example>
    </ComponentDocs>
  )
}
