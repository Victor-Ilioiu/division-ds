import { Compass } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Tooltip.meta'
import { Example } from '../../docs/Example'
import { Button } from '../button/Button'
import { IconButton } from '../icon-button/IconButton'
import { Tooltip } from './Tooltip'

export function TooltipDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="On a button">
        <Tooltip content="Sends the manifest to the depot; can't be undone once confirmed.">
          <Button>Dispatch</Button>
        </Tooltip>
      </Example>

      <Example caption="On an icon button">
        <Tooltip content="Uses the last known GPS fix, not live signal.">
          <IconButton label="Recalculate route">
            <Compass aria-hidden="true" className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </Example>

      <Example caption="Sides">
        <Tooltip content="Opens above the trigger." side="top">
          <Button variant="secondary">Top</Button>
        </Tooltip>
        <Tooltip content="Opens right of the trigger." side="right">
          <Button variant="secondary">Right</Button>
        </Tooltip>
        <Tooltip content="Opens below the trigger." side="bottom">
          <Button variant="secondary">Bottom</Button>
        </Tooltip>
        <Tooltip content="Opens left of the trigger." side="left">
          <Button variant="secondary">Left</Button>
        </Tooltip>
      </Example>

      <Example caption="Keyboard">
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
          Press Tab to move to the trigger and the tooltip appears. Press Escape and it goes away,
          without you moving the pointer. That's a rule in WCAG 2.2 (the Web Content Accessibility
          Guidelines, the public rulebook for making websites usable by people with disabilities).
          Its success criterion (SC) 1.4.13 says this kind of content has to stay dismissible (you
          can close it), hoverable (you can move the pointer onto it) and persistent (it stays
          until you do).
        </p>
      </Example>
    </ComponentDocs>
  )
}
