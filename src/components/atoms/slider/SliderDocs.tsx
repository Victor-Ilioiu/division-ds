import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Slider.meta'
import { Example } from '../../docs/Example'
import { Slider } from './Slider'

function SingleValueLive() {
  const [weight, setWeight] = useState([8])
  return (
    <div className="w-full max-w-sm">
      <Slider
        label="Kit weight"
        value={weight}
        onValueChange={setWeight}
        max={20}
        formatValue={v => `${v} kg`}
        showValue
      />
    </div>
  )
}

export function SliderDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Single value">
        <SingleValueLive />
      </Example>

      <Example caption="Range">
        <div className="w-full max-w-sm">
          <Slider label="Weight range" defaultValue={[4, 12]} max={20} />
        </div>
      </Example>

      <Example caption="Stepped">
        <div className="w-full max-w-sm">
          <Slider label="BB bottles" defaultValue={[5]} max={20} step={5} />
        </div>
      </Example>

      <Example caption="Disabled">
        <div className="w-full max-w-sm">
          <Slider label="Locked ration" defaultValue={[8]} max={20} disabled />
        </div>
      </Example>
    </ComponentDocs>
  )
}
