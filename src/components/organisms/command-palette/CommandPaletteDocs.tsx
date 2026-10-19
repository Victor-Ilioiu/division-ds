import { useState, type ReactNode } from 'react'
import { Inbox, Package, Plus, Settings, Box, Truck, Users } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './CommandPalette.meta'
import { Example } from '../../docs/Example'
import { Button, Kbd } from '../../atoms'
import { CommandPalette, type Command } from './CommandPalette'

function StoreCommands() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('none')
  const make = (id: string, label: string, group: string, icon: ReactNode, extra: Partial<Command> = {}): Command => ({
    id,
    label,
    group,
    icon,
    onSelect: () => setLast(label),
    ...extra,
  })
  const commands = [
    make('orders', 'Go to orders', 'Navigate', <Package />, { keywords: ['sales'] }),
    make('shipments', 'Go to shipments', 'Navigate', <Truck />),
    make('returns', 'Go to returns', 'Navigate', <Inbox />),
    make('new-shipment', 'New shipment', 'Create', <Plus />, { shortcut: 'N' }),
    make('new-product', 'New product', 'Create', <Box />),
    make('invite', 'Invite a teammate', 'Account', <Users />, { keywords: ['team', 'people'] }),
    make('settings', 'Open settings', 'Account', <Settings />),
  ]
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" aria-keyshortcuts="Control+K Meta+K" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <span aria-hidden="true" className="inline-flex gap-1">
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </span>
      <p role="status" className="font-mono text-xs text-[var(--color-text-secondary)]">
        Last command: {last}
      </p>
      <CommandPalette commands={commands} open={open} onOpenChange={setOpen} />
    </div>
  )
}

export function CommandPaletteDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Store commands">
        <StoreCommands />
      </Example>
    </ComponentDocs>
  )
}
