import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Textarea.meta'
import { Example } from '../../docs/Example'
import { Textarea } from './Textarea'
import { AiLabel } from '../ai-label/AiLabel'

const AI_NOTES = 'Ships with two midcaps and a sling. Ask for the 1.2 J spring if you play indoors.'

function CounterExample() {
  const max = 140
  const [value, setValue] = useState('')
  return (
    <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
      Field day summary
      <Textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        maxLength={max}
        aria-describedby="textarea-docs-counter"
      />
      <span id="textarea-docs-counter" className="text-xs text-[var(--color-text-secondary)]">
        {value.length} / {max}
      </span>
    </label>
  )
}

export function TextareaDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
          Field notes
          <Textarea placeholder="What did you observe on site?" />
        </label>
      </Example>

      <Example caption="Rows">
        <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
          Short (2 rows)
          <Textarea rows={2} placeholder="One-line summary, wraps if needed" />
        </label>
        <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
          Tall (8 rows)
          <Textarea rows={8} placeholder="Full incident report" />
        </label>
      </Example>

      <Example caption="States">
        <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
          Invalid
          <Textarea invalid defaultValue="Site coordinates unclear" />
        </label>
        <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
          Disabled
          <Textarea disabled defaultValue="Locked until review closes" />
        </label>
        {/* read-only is a different state from disabled and looks different — the text stays
            selectable and the control stays in the tab order, so `read-only:text-[...]` dims the
            text without the disabled fill. It was styled but never demonstrated. */}
        <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
          Read-only
          <Textarea readOnly defaultValue="Submitted 14:02, no further edits" />
        </label>
      </Example>

      <Example caption="Filled by AI, with a revert">
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <label htmlFor="ai-notes" className="text-sm">Order notes</label>
          <AiLabel explanation="Drafted from the replica's listing. Check the details before you send it." />
          <Textarea id="ai-notes" aiValue={AI_NOTES} defaultValue={AI_NOTES} />
        </div>
      </Example>

      <Example caption="With a counter">
        <CounterExample />
      </Example>
    </ComponentDocs>
  )
}
