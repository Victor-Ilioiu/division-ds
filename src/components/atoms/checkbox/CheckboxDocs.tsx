import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Checkbox.meta'
import { Example } from '../../docs/Example'
import { Checkbox } from './Checkbox'

const KIT_ITEMS = ['Speed loader', 'Rail light', 'Spare battery', 'First aid kit']

// ids can't contain whitespace (invalid per the HTML spec) — the item labels above do, so slugify.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function GroupExample() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'Speed loader': true,
    'Rail light': true,
    'Spare battery': false,
    'First aid kit': false,
  })

  const checkedCount = KIT_ITEMS.filter(item => checkedItems[item]).length
  const parentChecked: boolean | 'indeterminate' =
    checkedCount === 0 ? false : checkedCount === KIT_ITEMS.length ? true : 'indeterminate'

  function setAll(value: boolean) {
    setCheckedItems(Object.fromEntries(KIT_ITEMS.map(item => [item, value])))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="kit-parent"
          checked={parentChecked}
          onCheckedChange={checked => setAll(checked === true)}
        />
        <label htmlFor="kit-parent" className="font-medium">
          Pack full field kit
        </label>
      </div>
      <div className="flex flex-col gap-2 pl-6">
        {KIT_ITEMS.map(item => (
          <div key={item} className="flex items-center gap-2">
            <Checkbox
              id={`kit-item-${slug(item)}`}
              checked={checkedItems[item]}
              onCheckedChange={checked =>
                setCheckedItems(prev => ({ ...prev, [item]: checked === true }))
              }
            />
            <label htmlFor={`kit-item-${slug(item)}`}>{item}</label>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CheckboxDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="States">
        <div className="flex items-center gap-2">
          <Checkbox id="state-unchecked" />
          <label htmlFor="state-unchecked">Unchecked</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="state-checked" checked />
          <label htmlFor="state-checked">Checked</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="state-indeterminate" checked="indeterminate" />
          <label htmlFor="state-indeterminate">Mixed</label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="state-disabled" disabled />
          <label htmlFor="state-disabled">Disabled</label>
        </div>
      </Example>

      <Example caption="A group">
        <GroupExample />
      </Example>

      <Example caption="Invalid">
        <div className="flex items-center gap-2">
          <Checkbox id="state-invalid" invalid />
          <label htmlFor="state-invalid">Confirm waiver on file</label>
        </div>
      </Example>
    </ComponentDocs>
  )
}
