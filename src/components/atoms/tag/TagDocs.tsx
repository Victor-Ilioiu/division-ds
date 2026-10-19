import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Tag.meta'
import { Example } from '../../docs/Example'
import { Button } from '../button/Button'
import { Tag } from './Tag'

const FIELD_KIT = ['Holo sight', 'Spare magazine', 'Speed loader', 'Field goggles']

function RemovableExample() {
  const [tags, setTags] = useState(FIELD_KIT)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-sm text-[var(--color-text-secondary)]">No filters applied.</span>
        ) : (
          tags.map(tag => (
            <Tag key={tag} onDismiss={() => setTags(current => current.filter(t => t !== tag))}>
              {tag}
            </Tag>
          ))
        )}
      </div>
      {/* The Button atom, not a bare <button>: a hand-rolled one here had no system focus ring
          at all, only the UA default. `ghost` is the existing variant for a text-weight action. */}
      <Button variant="ghost" size="sm" wrapperClassName="self-start" onClick={() => setTags(FIELD_KIT)}>
        Reset
      </Button>
    </div>
  )
}

export function TagDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Static tags">
        <Tag>Holo sight</Tag>
        <Tag>Spare magazine</Tag>
        <Tag>Speed loader</Tag>
      </Example>

      <Example caption="Removable">
        <RemovableExample />
      </Example>

      {/* The one demo panel that scrolls sideways, and only because Tag's chip is
          `whitespace-nowrap` by design: at a 320px viewport a chip this long is wider than the
          page, which would fail SC 1.4.10 for the whole document. A data-or-layout region that
          scrolls inside itself is the sanctioned exception; changing Tag's own wrapping rules is
          a deliberate choice, not a reflow fix. It is applied HERE rather than on every
          `Example`, because axe's `scrollable-region-focusable` rule (wcag2a) fires on a
          scrollable region with no focusable content — this one has the dismiss button, most
          demo panels do not. */}
      <Example caption="Long text" className="overflow-x-auto">
        <Tag onDismiss={() => {}}>Stick battery 11.1 V, 1300 mAh, lithium polymer</Tag>
      </Example>
    </ComponentDocs>
  )
}
