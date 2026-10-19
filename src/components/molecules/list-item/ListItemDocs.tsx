import { useState } from 'react'
import { Archive, Monitor, Smartphone, Tablet } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { Avatar, Badge, Button, IconButton } from '../../atoms'
import { meta } from './ListItem.meta'
import { List, ListItem } from './ListItem'

/** The icon box every device row shares, so the text column lines up down the list. */
function DeviceIcon({ icon: Icon }: { icon: typeof Monitor }) {
  return (
    <span className="flex size-9 items-center justify-center border border-[var(--color-border-hairline-strong)] text-[var(--color-text-secondary)]">
      <Icon aria-hidden="true" className="size-4" />
    </span>
  )
}

/** Sessions: plain rows, a time in meta, one action per row named after its row. */
function SessionsExample() {
  const [sessions, setSessions] = useState([
    { id: 'win', device: 'Chrome on Windows', where: 'Brasov, Romania', when: 'Now', icon: Monitor },
    { id: 'ios', device: 'Safari on iPhone', where: 'Brasov, Romania', when: '2 h ago', icon: Smartphone },
    { id: 'tab', device: 'Firefox on Android tablet', where: 'Cluj-Napoca, Romania', when: '3 d ago', icon: Tablet },
  ])
  return (
    <div className="w-full max-w-xl">
      <List aria-label="Signed-in sessions">
        {sessions.map(session => (
          <ListItem
            key={session.id}
            media={<DeviceIcon icon={session.icon} />}
            title={session.device}
            description={session.where}
            meta={session.when}
            actions={
              session.id === 'win' ? (
                <Badge tone="ok">This device</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Sign out of ${session.device}`}
                  onClick={() => setSessions(all => all.filter(s => s.id !== session.id))}
                >
                  Sign out
                </Button>
              )
            }
          />
        ))}
      </List>
    </div>
  )
}

/** Team: Avatar media, the whole row a button (onActivate), the role in meta. */
function TeamExample() {
  const [chosen, setChosen] = useState<string | null>(null)
  const team = [
    { name: 'Ilse Varga', email: 'ilse@hexline.example', role: 'Captain' },
    { name: 'Tomas Reyes', email: 'tomas@hexline.example', role: 'Medic' },
    { name: 'Ana Popescu', email: 'ana@hexline.example', role: 'Scout' },
  ]
  return (
    <div className="w-full max-w-xl">
      <List aria-label="Squad members">
        {team.map(member => (
          <ListItem
            key={member.email}
            className="px-2"
            media={<Avatar name={member.name} />}
            title={member.name}
            description={member.email}
            meta={member.role}
            onActivate={() => setChosen(member.name)}
          />
        ))}
      </List>
      <p className="mt-3 text-sm text-[var(--color-text-secondary)]" aria-live="polite">
        {chosen ? `Opened ${chosen}.` : 'Choose a member to open their profile.'}
      </p>
    </div>
  )
}

export function ListItemDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Sessions: plain rows with one action each">
        <SessionsExample />
      </Example>

      <Example caption="Notifications: each row one link, with an archive action beside it">
        <div className="w-full max-w-xl">
          <List aria-label="Notifications">
            <ListItem
              className="px-2"
              title="Order 1042 shipped"
              description="Your carbine replica left the depot."
              meta="09:14"
              href="#order-1042"
              actions={
                <IconButton label="Archive: Order 1042 shipped" variant="ghost" size="sm">
                  <Archive />
                </IconButton>
              }
            />
            <ListItem
              className="px-2"
              title="Back in stock"
              description="The holo sight on your wishlist is available again."
              meta="Yesterday"
              href="#wishlist"
              actions={
                <IconButton label="Archive: Back in stock" variant="ghost" size="sm">
                  <Archive />
                </IconButton>
              }
            />
            <ListItem
              className="px-2"
              title="Training moved"
              description="Saturday’s training starts at 10:00, not 09:00."
              meta="Mon"
              href="#events"
              actions={
                <IconButton label="Archive: Training moved" variant="ghost" size="sm">
                  <Archive />
                </IconButton>
              }
            />
          </List>
        </div>
      </Example>

      <Example caption="Team members: avatars, the whole row a button">
        <TeamExample />
      </Example>

      <Example caption="A standalone row, outside a List">
        <div className="w-full max-w-xl">
          <ListItem as="div" title="Spare magazine, 120 rounds" description="Mid-cap, steel" meta="€14.90" />
        </div>
      </Example>
    </ComponentDocs>
  )
}
