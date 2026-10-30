import { Link as RouterLink } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Panel.meta'
import { Example } from '../../docs/Example'
import { Panel } from './Panel'

export function PanelDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Tones" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel tone="base">
          <p className="font-display font-semibold">Base</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Flush with the page.</p>
        </Panel>
        <Panel tone="raised">
          <p className="font-display font-semibold">Raised</p>
          <p className="text-sm text-[var(--color-text-secondary)]">One step up.</p>
        </Panel>
        <Panel tone="signal">
          <p className="font-display font-semibold">Signal</p>
          <p className="text-sm text-[var(--color-text-secondary)]">The one that leads.</p>
        </Panel>
      </Example>

      <Example caption="Padding">
        <Panel padding="none">none</Panel>
        <Panel padding="sm">sm</Panel>
        <Panel padding="md">md</Panel>
        <Panel padding="lg">lg</Panel>
      </Example>

      <Example caption="Crosshair and cut corner" className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Panel crosshair>Crosshair</Panel>
        <Panel cut>Cut corner</Panel>
        <Panel crosshair cut tone="signal">Both</Panel>
      </Example>

      <Example caption="Interactive, as a router link" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel interactive cut padding="lg" asChild>
          <RouterLink to="/components/card" className="flex flex-col gap-3">
            <span className="font-display text-lg font-semibold">Card</span>
            <span className="text-sm text-[var(--color-text-secondary)]">A panel with a title, a body and a footer.</span>
            <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-accent-signal-text)]">
              Open <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </RouterLink>
        </Panel>
      </Example>
    </ComponentDocs>
  )
}
