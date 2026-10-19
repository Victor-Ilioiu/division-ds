import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Input.meta'
import { Example } from '../../docs/Example'
import { Input } from './Input'
import { FormField } from '../../molecules/form-field/FormField'

export function InputDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Sizes">
        <label className="flex flex-col gap-1 text-sm">
          Small
          <Input inputSize="sm" placeholder="Call sign" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Medium
          <Input inputSize="md" placeholder="Call sign" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Large
          <Input inputSize="lg" placeholder="Call sign" />
        </label>
      </Example>

      <Example caption="States">
        <label className="flex flex-col gap-1 text-sm">
          Rest
          <Input placeholder="Call sign" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hover (try it)
          <Input placeholder="Call sign" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Invalid
          <Input invalid defaultValue="Anvil-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Disabled
          <Input disabled defaultValue="Anvil-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Read only
          <Input readOnly defaultValue="Anvil-3" />
        </label>
      </Example>

      <Example caption="Types">
        <label className="flex flex-col gap-1 text-sm">
          Text
          <Input type="text" placeholder="Site name" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <Input type="email" placeholder="scout@fieldops.example" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Number
          <Input type="number" placeholder="0" className="[font-variant-numeric:tabular-nums]" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <Input type="password" placeholder="Team radio passphrase" />
        </label>
      </Example>

      <Example caption="Password reveal">
        <div className="w-full max-w-xs">
          <FormField label="Team radio passphrase">
            <Input type="password" revealable autoComplete="current-password" defaultValue="anvil-north-3" />
          </FormField>
        </div>
      </Example>

      <Example caption="Character counter">
        <div className="w-full max-w-xs">
          <FormField label="Loadout name" help="Shown on your public profile.">
            <Input maxLength={40} showCount defaultValue="Night recon, woodland" />
          </FormField>
        </div>
      </Example>

      <Example caption="Clear button">
        <div className="w-full max-w-xs">
          <FormField label="Call sign">
            <Input clearable clearLabel="Clear call sign" defaultValue="Anvil-3" />
          </FormField>
        </div>
      </Example>

      <Example caption="Labelled the manual way">
        <div className="flex flex-col gap-1 text-sm max-w-xs">
          <label htmlFor="input-docs-callsign">Call sign</label>
          <Input id="input-docs-callsign" aria-describedby="input-docs-callsign-help" />
          <p id="input-docs-callsign-help" className="text-xs text-[var(--color-text-secondary)]">
            Letters, numbers and a hyphen. FormField will set this pattern up for you.
          </p>
        </div>
      </Example>
    </ComponentDocs>
  )
}
