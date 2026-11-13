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

// Thirty months, newest first: longer than any screen, so the list scrolls.
const MONTH_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 10 - i, 1))
  const label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return { value: date.toISOString().slice(0, 7), label }
})

// Real flag colours, drawn here for the example only: they are not interface colour and do not
// ship with the system. Simplified (no crests). Each flag is 20x14 with a hairline frame, so a
// white band still reads on the light theme.
type Stripes = { dir: 'v' | 'h'; colors: string[] }
const FLAGS: Record<string, Stripes> = {
  at: { dir: 'h', colors: ['#c8102e', '#ffffff', '#c8102e'] }, // token-discipline: allow, Austria's flag colours, not interface colour
  be: { dir: 'v', colors: ['#000000', '#fdda24', '#ef3340'] }, // token-discipline: allow, Belgium's flag colours, not interface colour
  de: { dir: 'h', colors: ['#000000', '#dd0000', '#ffce00'] }, // token-discipline: allow, Germany's flag colours, not interface colour
  es: { dir: 'h', colors: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] }, // token-discipline: allow, Spain's flag colours, not interface colour
  fr: { dir: 'v', colors: ['#0055a4', '#ffffff', '#ef4135'] }, // token-discipline: allow, France's flag colours, not interface colour
  ie: { dir: 'v', colors: ['#169b62', '#ffffff', '#ff883e'] }, // token-discipline: allow, Ireland's flag colours, not interface colour
  it: { dir: 'v', colors: ['#009246', '#ffffff', '#ce2b37'] }, // token-discipline: allow, Italy's flag colours, not interface colour
  nl: { dir: 'h', colors: ['#ae1c28', '#ffffff', '#21468b'] }, // token-discipline: allow, the Netherlands' flag colours, not interface colour
  pl: { dir: 'h', colors: ['#ffffff', '#dc143c'] }, // token-discipline: allow, Poland's flag colours, not interface colour
  ro: { dir: 'v', colors: ['#002b7f', '#fcd116', '#ce1126'] }, // token-discipline: allow, Romania's flag colours, not interface colour
}

function Flag({ code }: { code: string }) {
  const { dir, colors } = FLAGS[code]
  const n = colors.length
  return (
    <svg viewBox="0 0 20 14" style={{ width: 20, height: 14 }} className="block">
      {colors.map((fill, i) =>
        dir === 'v' ? (
          <rect key={i} x={(20 / n) * i} y={0} width={20 / n} height={14} fill={fill} />
        ) : (
          <rect key={i} x={0} y={(14 / n) * i} width={20} height={14 / n} fill={fill} />
        )
      )}
      <rect x={0.5} y={0.5} width={19} height={13} fill="none" stroke="var(--color-border-hairline-strong)" />
    </svg>
  )
}

const COUNTRY_OPTIONS = [
  ['at', 'Austria'], ['be', 'Belgium'], ['fr', 'France'], ['de', 'Germany'], ['ie', 'Ireland'],
  ['it', 'Italy'], ['nl', 'Netherlands'], ['pl', 'Poland'], ['ro', 'Romania'], ['es', 'Spain'],
].map(([value, label]) => ({ value, label, icon: <Flag code={value} /> }))

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

      <Example caption="Countries">
        <Select label="Country" options={COUNTRY_OPTIONS} iconInTrigger defaultValue="ro" />
      </Example>

      <Example caption="Long list">
        <Select label="Billing month" options={MONTH_OPTIONS} placeholder="Choose a month" />
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
