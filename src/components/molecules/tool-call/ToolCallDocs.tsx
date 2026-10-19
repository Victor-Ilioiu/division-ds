import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './ToolCall.meta'
import { Example } from '../../docs/Example'
import { ToolCall } from './ToolCall'

export function ToolCallDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Running, done and failed">
        <div className="flex w-full max-w-xl flex-col gap-3">
          <ToolCall name="query_stock_levels" title="Read stock levels at Depot 4" status="running" />
          <ToolCall
            name="query_stock_levels"
            title="Read stock levels at Depot 4"
            status="done"
            duration="1.2 s"
            input={'{ "depot": 4, "below_reorder_point": true }'}
            output={'[\n  { "sku": "K-41", "on_hand": 6, "reorder_at": 10 },\n  { "sku": "TP-08", "on_hand": 3, "reorder_at": 8 }\n]'}
          />
          <ToolCall
            name="fetch_supplier_lead_times"
            title="Check supplier lead times"
            status="failed"
            duration="4.0 s"
            output="Timed out after 4 s. The supplier feed did not answer."
          />
        </div>
      </Example>

      <Example caption="Without a title, details open">
        <div className="flex w-full max-w-xl flex-col gap-3">
          <ToolCall
            name="count_pallets"
            status="done"
            duration="0.3 s"
            input={'{ "depot": 4, "bay": 2 }'}
            output="14 pallets"
            defaultOpen
          />
        </div>
      </Example>
    </ComponentDocs>
  )
}
