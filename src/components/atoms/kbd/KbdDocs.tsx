import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Kbd.meta'
import { Example } from '../../docs/Example'
import { Kbd } from './Kbd'

export function KbdDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Single keys">
        <Kbd>Esc</Kbd>
        <Kbd>Tab</Kbd>
        <Kbd>Enter</Kbd>
        <Kbd>Space</Kbd>
        <Kbd>/</Kbd>
      </Example>

      <Example caption="A chord: one cap per key">
        <span className="flex items-center gap-1">
          <Kbd>Ctrl</Kbd>
          <span className="text-[var(--color-text-muted)] text-sm">+</span>
          <Kbd>K</Kbd>
        </span>
        <span className="text-sm text-[var(--color-text-secondary)]">Open the command palette</span>
      </Example>
    </ComponentDocs>
  )
}
