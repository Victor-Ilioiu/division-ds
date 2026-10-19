import { ArrowRight, Download, Plus } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Button.meta'
import { Example } from '../../docs/Example'
import { Button } from './Button'

export function ButtonDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Variants">
        <Button variant="primary">Dispatch team</Button>
        <Button variant="secondary">Save draft</Button>
        <Button variant="danger">Abort</Button>
        <Button variant="ghost">Cancel</Button>
      </Example>

      <Example caption="Sizes">
        <Button size="xs">Dispatch team</Button>
        <Button size="sm">Dispatch team</Button>
        <Button size="md">Dispatch team</Button>
        <Button size="lg">Dispatch team</Button>
      </Example>

      <Example caption="States">
        <Button>Dispatch team</Button>
        <Button loading loadingLabel="Dispatching">
          Dispatch team
        </Button>
        <Button disabled>Dispatch team</Button>
      </Example>

      <Example caption="With icons">
        <Button iconStart={<Plus />}>Add to loadout</Button>
        <Button variant="secondary" iconEnd={<ArrowRight />}>
          Continue
        </Button>
        <Button variant="ghost" size="sm" iconStart={<Download />}>
          Export
        </Button>
        <Button loading loadingLabel="Adding" iconStart={<Plus />}>
          Add to loadout
        </Button>
      </Example>

      <Example caption="Link variant">
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
          No replicas match these filters.{' '}
          <Button variant="link">
            Reset filters
          </Button>{' '}
          to see the full catalogue.
        </p>
      </Example>

      <Example caption="Full width">
        <div className="w-80">
          <Button fullWidth>Dispatch team</Button>
        </div>
      </Example>

      <Example caption="As a link">
        <Button asChild>
          <a href="/kits">Browse kits</a>
        </Button>
      </Example>

      <Example caption="Focus ring is never clipped">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
            Press Tab to focus the button below, in either theme. The focus ring (the outline
            that shows which element the keyboard is on) draws a clean rectangle around the whole
            bevelled shape. You'll never see it cut off, because the component draws it on the
            outer wrapper, which isn't clipped, and not on the bevelled button itself.
          </p>
          <Button variant="primary">Dispatch team</Button>
        </div>
      </Example>
    </ComponentDocs>
  )
}
