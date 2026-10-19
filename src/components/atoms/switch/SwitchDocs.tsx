import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Switch.meta'
import { Example } from '../../docs/Example'
import { Switch } from './Switch'

function LiveExample() {
  const [on, setOn] = useState(false)
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <Switch id="live-beacon" checked={on} onCheckedChange={setOn} />
        <label htmlFor="live-beacon">Field beacon</label>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {on ? 'Broadcasting position.' : 'Beacon is off.'}
      </p>
    </div>
  )
}

export function SwitchDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Off and on">
        <div className="flex items-center gap-3">
          <Switch id="state-off" />
          <label htmlFor="state-off">Off</label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="state-on" defaultChecked />
          <label htmlFor="state-on">On</label>
        </div>
      </Example>

      <Example caption="Live">
        <LiveExample />
      </Example>

      <Example caption="Disabled">
        <div className="flex items-center gap-3">
          <Switch id="state-disabled-off" disabled />
          <label htmlFor="state-disabled-off">Disabled, off</label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="state-disabled-on" disabled defaultChecked />
          <label htmlFor="state-disabled-on">Disabled, on</label>
        </div>
      </Example>

      <Example caption="A settings row">
        <div className="flex w-full items-start justify-between gap-4">
          <div>
            <label htmlFor="settings-offline-maps" className="font-medium">
              Offline maps
            </label>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Download the current route area before you lose signal.
            </p>
          </div>
          <Switch id="settings-offline-maps" defaultChecked />
        </div>
      </Example>
    </ComponentDocs>
  )
}
