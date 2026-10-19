import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Radio.meta'
import { Example } from '../../docs/Example'
import { Radio, RadioGroup } from './Radio'

const SPEEDS = ['standard', 'priority', 'overnight'] as const

function LiveExample() {
  const [value, setValue] = useState<string>('standard')
  return (
    <RadioGroup aria-label="Dispatch speed" value={value} onValueChange={setValue}>
      {SPEEDS.map(speed => (
        <div key={speed} className="flex items-center gap-2">
          <Radio value={speed} id={`dispatch-${speed}`} />
          <label htmlFor={`dispatch-${speed}`} className="capitalize">
            {speed}
          </label>
        </div>
      ))}
    </RadioGroup>
  )
}

export function RadioDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A group">
        <LiveExample />
      </Example>

      <Example caption="With a default">
        <RadioGroup aria-label="Dispatch speed, defaulted" defaultValue="priority">
          {SPEEDS.map(speed => (
            <div key={speed} className="flex items-center gap-2">
              <Radio value={speed} id={`default-${speed}`} />
              <label htmlFor={`default-${speed}`} className="capitalize">
                {speed}
              </label>
            </div>
          ))}
        </RadioGroup>
      </Example>

      <Example caption="Horizontal">
        <RadioGroup aria-label="Dispatch speed, horizontal" orientation="horizontal" defaultValue="standard" className="flex-row flex-wrap gap-4">
          {SPEEDS.map(speed => (
            <div key={speed} className="flex items-center gap-2">
              <Radio value={speed} id={`horizontal-${speed}`} />
              <label htmlFor={`horizontal-${speed}`} className="capitalize">
                {speed}
              </label>
            </div>
          ))}
        </RadioGroup>
      </Example>

      <Example caption="Disabled option">
        <RadioGroup aria-label="Dispatch speed, one option disabled" defaultValue="standard">
          {SPEEDS.map(speed => (
            <div key={speed} className="flex items-center gap-2">
              <Radio value={speed} id={`disabled-${speed}`} disabled={speed === 'overnight'} />
              <label htmlFor={`disabled-${speed}`} className="capitalize">
                {speed}
              </label>
            </div>
          ))}
        </RadioGroup>
      </Example>
    </ComponentDocs>
  )
}
