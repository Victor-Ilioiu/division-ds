import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './PromptInput.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { PromptInput } from './PromptInput'

function DraftExample() {
  const [value, setValue] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <PromptInput
        label="Message the assistant"
        placeholder="Ask about stock, orders or depots"
        value={value}
        onValueChange={setValue}
        onSubmit={text => {
          setSent(text)
          setValue('')
        }}
        suggestions={['Summarise stock at Depot 4', 'Which replicas are running low?']}
      />
      <p className="font-body text-sm text-[var(--color-text-secondary)]" aria-live="polite">
        {sent === null ? 'Nothing sent yet.' : `Sent: ${sent}`}
      </p>
    </div>
  )
}

function BusyExample() {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(true)
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <PromptInput
        label="Message the assistant, while it works"
        value={value}
        onValueChange={setValue}
        onSubmit={() => setValue('')}
        busy={busy}
        onStop={() => setBusy(false)}
      />
      {busy ? null : (
        <Button size="sm" variant="ghost" wrapperClassName="self-start" onClick={() => setBusy(true)}>
          Make it busy again
        </Button>
      )}
    </div>
  )
}

export function PromptInputDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="With suggestions">
        <DraftExample />
      </Example>

      <Example caption="Busy: a Stop button takes the place of Send, and pressing Escape stops it too">
        <BusyExample />
      </Example>

      <Example caption="Disabled">
        <div className="flex w-full max-w-xl flex-col gap-2">
          <PromptInput label="Message the assistant (disabled)" value="" onValueChange={() => {}} onSubmit={() => {}} disabled />
          <p className="font-body text-sm text-[var(--color-text-secondary)]">The assistant is offline until 14:00.</p>
        </div>
      </Example>
    </ComponentDocs>
  )
}
