import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Stepper.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { Stepper, type Step } from './Stepper'

const CHECKOUT_STEPS: Step[] = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review', description: 'Check the manifest' },
]

const SHIPMENT_STEPS: Step[] = [
  { label: 'Ordered', description: 'Paid on 12 October' },
  { label: 'Packed', description: 'At the Brasov depot' },
  { label: 'Shipped', description: 'With the courier' },
  { label: 'Delivered' },
]

function LiveStepper() {
  const [current, setCurrent] = useState(0)
  return (
    <div className="flex flex-col gap-6 w-full">
      <Stepper steps={CHECKOUT_STEPS} current={current} label="Checkout progress" />
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={current === 0}
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
        >
          Back
        </Button>
        <Button
          size="sm"
          disabled={current >= CHECKOUT_STEPS.length}
          onClick={() => setCurrent(c => Math.min(CHECKOUT_STEPS.length, c + 1))}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

export function StepperDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Checkout">
        <div className="w-full">
          <Stepper steps={CHECKOUT_STEPS} current={1} label="Checkout progress" />
        </div>
      </Example>

      <Example caption="Complete">
        <div className="w-full">
          <Stepper steps={CHECKOUT_STEPS} current={3} label="Checkout progress" />
        </div>
      </Example>

      <Example caption="Vertical, with descriptions">
        <div className="w-full max-w-xs">
          <Stepper steps={SHIPMENT_STEPS} current={2} orientation="vertical" label="Shipment progress" />
        </div>
      </Example>

      <Example caption="Live: move through the steps with Back and Continue">
        <LiveStepper />
      </Example>
    </ComponentDocs>
  )
}
