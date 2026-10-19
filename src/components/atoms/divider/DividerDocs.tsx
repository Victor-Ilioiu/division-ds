import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Divider.meta'
import { Example } from '../../docs/Example'
import { Button } from '../button/Button'
import { Divider } from './Divider'

export function DividerDocs() {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <ComponentDocs meta={meta}>
      <Example caption="Plain rule">
        <div className="w-full max-w-sm">
          <Divider />
        </div>
      </Example>

      <Example caption="With a legend">
        <div className="w-full max-w-sm">
          <Divider label="Section 02" />
        </div>
      </Example>

      <Example caption="Vertical, between inline items">
        <span className="flex items-center gap-3 h-6">
          <span className="text-sm">Kit list</span>
          <Divider orientation="vertical" />
          <span className="text-sm">Load-out</span>
        </span>
      </Example>

      <Example caption="Drawing on">
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {/* The Button atom, not a bare <button>: a hand-rolled one here had no system focus
              ring at all (the UA default, rgb(16, 16, 16) auto 1px) and no type, so it defaulted
              to submit. */}
          <Button variant="secondary" size="sm" wrapperClassName="w-fit" onClick={() => setReplayKey(k => k + 1)}>
            Replay
          </Button>
          <Divider key={replayKey} className="anim-draw-on" />
          <p className="text-xs text-[var(--color-text-muted)]">
            This animation is switched off completely when someone has asked their device for
            less motion (the prefers-reduced-motion: reduce setting).
          </p>
        </div>
      </Example>
    </ComponentDocs>
  )
}
