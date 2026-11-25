import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { Badge, Button, Input, Textarea } from '../../atoms'
import { FormField } from '../../molecules'
import { meta } from './SidePanel.meta'
import { SidePanel } from './SidePanel'

const ORDERS = [
  { id: 'R-1042', title: 'Restock the north depot', status: 'Open' },
  { id: 'R-1043', title: 'Replace the scanner at gate 2', status: 'In review' },
  { id: 'R-1044', title: 'Count the replica shelf', status: 'Open' },
]

function BesideAListExample() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [width, setWidth] = useState(420)
  const open = ORDERS.find(order => order.id === openId)
  return (
    <div className="flex h-[28rem] w-full overflow-hidden border border-[var(--color-border-hairline)]">
      <ul role="list" className="m-0 flex min-w-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-4">
        {ORDERS.map(order => (
          <li
            key={order.id}
            aria-current={order.id === openId ? 'true' : undefined}
            className="flex items-center justify-between gap-3 border border-[var(--color-border-hairline)] p-3"
            style={order.id === openId ? { border: '2px solid var(--color-accent-signal-fill)' } : undefined}
          >
            <Button variant="link" tone="neutral" className="font-semibold" onClick={() => setOpenId(order.id)}>
              {order.title}
            </Button>
            <Badge tone={order.status === 'Open' ? 'info' : 'warning'}>{order.status}</Badge>
          </li>
        ))}
      </ul>
      <SidePanel
        key={openId ?? ''}
        open={open !== undefined}
        onOpenChange={next => { if (!next) setOpenId(null) }}
        title={open?.title ?? ''}
        eyebrow={open?.id}
        description={open?.status}
        width={width}
        onWidthChange={setWidth}
        minWidth={320}
        maxWidth={640}
        className="md:h-full"
        footer={<Button size="sm" onClick={() => setOpenId(null)}>Done</Button>}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Title"><Input defaultValue={open?.title} /></FormField>
          <FormField label="Notes" help="Saved when you leave the field."><Textarea rows={4} /></FormField>
        </div>
      </SidePanel>
    </div>
  )
}

export function SidePanelDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Beside a list: open one, then another, without closing">
        <BesideAListExample />
      </Example>
    </ComponentDocs>
  )
}
