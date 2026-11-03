import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './MultiSelect.meta'
import { Example } from '../../docs/Example'
import { FormField } from '../form-field/FormField'
import { MultiSelect } from './MultiSelect'

const LOADOUT = [
  { value: 'mags', label: 'Spare magazines' },
  { value: 'goggles', label: 'Full-seal goggles' },
  { value: 'mesh', label: 'Mesh face guard' },
  { value: 'radio', label: 'Team radio', disabled: true },
  { value: 'gloves', label: 'Gloves' },
  { value: 'loader', label: 'Speed loader' },
  { value: 'tracer', label: 'Tracer unit' },
  { value: 'pouch', label: 'Dump pouch' },
]

/** Controlled, with the value printed under it, so the order of the array is visible. */
function ControlledExample() {
  const [kit, setKit] = useState<string[]>(['mags', 'goggles', 'gloves'])
  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      <FormField label="Loadout" help="Remove a tag and watch the others close the gap.">
        <MultiSelect options={LOADOUT} value={kit} onValueChange={setKit} />
      </FormField>
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">value: [{kit.join(', ')}]</span>
    </div>
  )
}

const LABELS = [
  { value: 'bug', label: 'Bug' },
  { value: 'design', label: 'Design' },
  { value: 'docs', label: 'Docs' },
]

/** creatable: the page owns both lists, so onCreate adds the new option and chooses it. */
function CreatableExample() {
  const [options, setOptions] = useState(LABELS)
  const [labels, setLabels] = useState<string[]>(['design'])
  return (
    <div className="w-full max-w-md">
      <FormField label="Labels" help="Type a label that is not in the list, then press Enter to create it.">
        <MultiSelect
          options={options}
          value={labels}
          onValueChange={setLabels}
          creatable
          onCreate={text => {
            setOptions(current => [...current, { value: text, label: text }])
            setLabels(current => [...current, text])
          }}
        />
      </FormField>
    </div>
  )
}

export function MultiSelectDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <div className="w-full max-w-md">
          <FormField label="Loadout">
            <MultiSelect options={LOADOUT} placeholder="Choose your kit…" />
          </FormField>
        </div>
      </Example>

      <Example caption="Controlled: the page holds the chosen options">
        <ControlledExample />
      </Example>

      <Example caption="Creatable: pick or create labels">
        <CreatableExample />
      </Example>

      <Example caption="Invalid">
        <div className="w-full max-w-md">
          <FormField label="Loadout" error="Pick eye protection.">
            <MultiSelect options={LOADOUT} defaultValue={['mags']} />
          </FormField>
        </div>
      </Example>

      <Example caption="Sizes">
        <div className="flex flex-col gap-3 w-full max-w-md">
          <MultiSelect label="Small loadout" inputSize="sm" options={LOADOUT} defaultValue={['mags']} />
          <MultiSelect label="Medium loadout" inputSize="md" options={LOADOUT} defaultValue={['mags']} />
          <MultiSelect label="Large loadout" inputSize="lg" options={LOADOUT} defaultValue={['mags']} />
        </div>
      </Example>

      <Example caption="Disabled">
        <div className="w-full max-w-md">
          <MultiSelect label="Locked loadout" options={LOADOUT} defaultValue={['mags', 'gloves']} disabled />
        </div>
      </Example>
    </ComponentDocs>
  )
}
