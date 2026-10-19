import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Progress.meta'
import { Example } from '../../docs/Example'
import { Progress } from './Progress'

export function ProgressDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Determinate">
        <div className="w-full max-w-sm">
          <Progress label="Uploading manifest" value={40} />
        </div>
      </Example>

      <Example caption="With a readout">
        <div className="w-full max-w-sm">
          <Progress label="Uploading manifest" value={65} showValue />
        </div>
      </Example>

      <Example caption="Custom max">
        <div className="w-full max-w-sm">
          <Progress label="Packing crates" value={3} max={12} showValue />
        </div>
      </Example>

      <Example caption="Indeterminate">
        <div className="w-full max-w-sm">
          <Progress label="Syncing manifest" value={null} showValue />
        </div>
      </Example>

      <Example caption="Tones">
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Progress label="Signal supply run" value={40} tone="signal" showValue />
          <Progress label="BB reserves" value={82} tone="ok" showValue />
          <Progress label="Gas reserves" value={22} tone="warning" showValue />
          <Progress label="Battery reserves" value={6} tone="hostile" showValue />
        </div>
      </Example>
    </ComponentDocs>
  )
}
