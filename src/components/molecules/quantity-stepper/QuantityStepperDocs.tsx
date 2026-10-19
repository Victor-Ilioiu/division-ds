import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './QuantityStepper.meta'
import { Example } from '../../docs/Example'
import { QuantityStepper } from './QuantityStepper'

/** A live example: the total recomputes from the committed quantity, in the same tabular figures
 *  every other numeral hero in this system uses, so the digits don't shift width as it changes. */
function CartLine() {
  const price = 38
  const [qty, setQty] = useState(2)
  return (
    <div className="flex items-center gap-4 w-full">
      <span className="flex-1 font-body text-sm text-[var(--color-text-primary)]">Speed loader</span>
      <QuantityStepper
        label="Speed loader quantity"
        defaultValue={2}
        min={1}
        max={9}
        onValueChange={setQty}
      />
      <span className="w-16 text-right font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
        €{price * qty}
      </span>
    </div>
  )
}

export function QuantityStepperDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <QuantityStepper label="Speed loader quantity" defaultValue={1} />
      </Example>

      <Example caption="Bounded: with a lowest and a highest allowed number">
        <div className="flex flex-col gap-2">
          <QuantityStepper label="Bump helmet quantity" defaultValue={1} min={1} max={4} />
          <span className="font-mono text-xs text-[var(--color-text-secondary)]">Only four left</span>
        </div>
      </Example>

      <Example caption="Stepping by five">
        <QuantityStepper label="BB bottle quantity" defaultValue={5} min={0} max={50} step={5} />
      </Example>

      <Example caption="In a cart line">
        <CartLine />
      </Example>
    </ComponentDocs>
  )
}
