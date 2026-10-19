import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Select.meta'
import { Example } from '../../docs/Example'
import { Input } from '../input/Input'
import { Crosshair, Package, Truck, Zap } from 'lucide-react'
import { Select, type SelectGroup } from './Select'

const SPEED_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'priority', label: 'Priority' },
  { value: 'overnight', label: 'Overnight', disabled: true },
]

const TERRAIN_OPTIONS = [
  { value: 'woodland', label: 'Woodland' },
  { value: 'urban', label: 'Urban' },
  { value: 'desert', label: 'Desert' },
  { value: 'indoor', label: 'Indoor' },
]

const DELIVERY_GROUPS: SelectGroup[] = [
  {
    label: 'Courier',
    options: [
      { value: 'standard', label: 'Standard', icon: <Truck /> },
      { value: 'priority', label: 'Priority', icon: <Zap /> },
    ],
  },
  {
    label: 'Collect',
    options: [
      { value: 'depot', label: 'Brasov depot', icon: <Package /> },
      { value: 'field', label: 'At the field', icon: <Crosshair /> },
    ],
  },
]

export function SelectDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Placeholder">
        <Select label="Dispatch speed" options={SPEED_OPTIONS} placeholder="Choose a speed" />
      </Example>

      <Example caption="With a value">
        <Select label="Dispatch speed" options={SPEED_OPTIONS} defaultValue="priority" />
      </Example>

      <Example caption="Groups with headings and icons">
        <Select label="Delivery" groups={DELIVERY_GROUPS} placeholder="Choose delivery" />
      </Example>

      <Example caption="Sizes">
        <Select label="Terrain (small)" inputSize="sm" options={TERRAIN_OPTIONS} placeholder="Terrain" />
        <Select label="Terrain (medium)" inputSize="md" options={TERRAIN_OPTIONS} placeholder="Terrain" />
        <Select label="Terrain (large)" inputSize="lg" options={TERRAIN_OPTIONS} placeholder="Terrain" />
      </Example>

      {/* This example used to be byte-identical to "Placeholder" above and demonstrated nothing:
          a disabled OPTION is only visible once the listbox is open, which a static demo cannot
          show. The disabled control is a distinct, visible state, and SPEED_OPTIONS' own
          "Overnight" row is disabled in every example on this page — open any of them to see it.
          */}
      <Example caption="Disabled control">
        <Select label="Dispatch speed, unavailable" options={SPEED_OPTIONS} defaultValue="standard" disabled />
      </Example>

      <Example caption="Invalid">
        <Select label="Dispatch speed" options={SPEED_OPTIONS} invalid placeholder="Choose a speed" />
      </Example>

      <Example caption="Beside an Input">
        <label className="flex flex-col gap-1 text-sm">
          Call sign
          <Input placeholder="Anvil-3" />
        </label>
        {/* Deliberately NOT a <label>. A <label> associates with a labelable element — input,
            select, textarea, button among them — but Radix's trigger is a <button>, and a
            <label> wrapping a button is inert: it neither names it nor forwards a click. The
            Select's accessible name comes from its required `label` prop, and the visible text
            here matches it exactly (SC 2.5.3, label in name). Wrapping it in a <label> would
            have looked correct and done nothing. */}
        <div className="flex flex-col gap-1 text-sm">
          <span>Terrain</span>
          <Select label="Terrain" options={TERRAIN_OPTIONS} placeholder="Choose terrain" />
        </div>
      </Example>
    </ComponentDocs>
  )
}
