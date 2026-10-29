# ListItem

> One row of a list: something at the start (a picture or icon), a title and description, extra details on the right, and actions at the end. A row that goes somewhere is one real link or button stretched over the whole row. Its actions sit beside it, never inside it.

- **Best for:** A row people scan in a List: media, a title, meta and one or two actions.
- **Not for:** Data in a table that people compare across columns: use DataTable.
- **Also on this page:** `List`
- Molecule. Source: `src/components/molecules/list-item/ListItem.tsx`
- Rendered docs page: `/components/list-item`

## Import

```tsx
import { List, ListItem } from 'src/components/molecules/list-item/ListItem'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Requires

- A <List> around the rows (a ul with role="list"), or as="div" on a row that stands alone.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `ReactNode` |  | Required. The main line, and the name screen readers give the row’s link or button. |
| `description` | `ReactNode` |  | A second line under the title, in secondary text. |
| `media` | `ReactNode` |  | Something at the start of the row: an Avatar, an icon (hidden from screen readers with aria-hidden), a thumbnail. |
| `meta` | `ReactNode` |  | Right-aligned monospaced text: a time, a price, a count. |
| `actions` | `ReactNode` |  | Controls at the end. Each one can still be focused and clicked on its own. |
| `href` | `string` |  | Makes the row one link to this address, named by the title. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` | `a plain <a>` | Draws the row link when href is set. Pass your router's link here. It has to pass className through. |
| `onActivate` | `() => void` |  | Makes the row one button, named by the title. Ignored when href is set. |
| `as` | `'li' \| 'div'` | `'li'` | li inside a List. div for a row on its own. |
| `dividers (List)` | `boolean` | `true` | A thin line between rows. |
| `className` | `string` |  | Extra CSS classes, merged with the outer element's own classes on List or ListItem. |
| `ref` | `Ref<HTMLElement>` |  | Passed through to the ul (List) or the row element (ListItem). |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Sessions: plain rows with one action each

```tsx
function DeviceIcon({ icon: Icon }: { icon: typeof Monitor }) {
  return (
    <span className="flex size-9 items-center justify-center border border-[var(--color-border-hairline-strong)] text-[var(--color-text-secondary)]">
      <Icon aria-hidden="true" className="size-4" />
    </span>
  )
}

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

<SessionsExample />
```

### Notifications: each row one link, with an archive action beside it

```tsx
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
```

### Team members: avatars, the whole row a button

```tsx
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

<TeamExample />
```

### A standalone row, outside a List

```tsx
<div className="w-full max-w-xl">
  <ListItem as="div" title="Spare magazine, 120 rounds" description="Mid-cap, steel" meta="€14.90" />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the row’s link or button, then to each of its actions, then to the next row. |
| `Enter` | Follows the row’s link, or presses its button. |
| `Space` | Presses the row’s button (a link row ignores Space, like any link). |

## Do

- Put rows in a List, and give the List an aria-label (a name only screen readers hear) when no heading names it.
- Use href when the row opens a page, and onActivate when it does something right there.
- Keep actions to one or two. Put the rest in a DropdownMenu.
- When an action repeats on every row, name it after its row ("Sign out of Chrome on Windows"), with aria-label or the IconButton label.

## Don't

- Don't make a row clickable with onClick on the row. Use href or onActivate.
- Don't wrap a ListItem in a link or a button.
- Don't use it for data people compare across columns. That's what DataTable is for.
- Don't put long paragraphs in description. People scan a row, they don't read it.

## Common mistakes

Wrong:

```tsx
<li onClick={open}>…<Button>Remove</Button></li>
```

Right:

```tsx
<ListItem title="Ilse Varga" onActivate={open} actions={<Button>Remove</Button>} />
```

A clickable li isn't a control. It can't take keyboard focus, and screen readers read it as plain text. onActivate (or href) turns the title into a real button (or link) that covers the row, and Remove keeps its own tab stop.

Wrong:

```tsx
<a href="/orders/1"><ListItem title="Order shipped" actions={<Button>Archive</Button>} /></a>
```

Right:

```tsx
<ListItem title="Order shipped" href="/orders/1" actions={<Button>Archive</Button>} />
```

A button inside a link is invalid HTML, and screen readers announce the two as one merged control. href stretches the link over the row without wrapping the actions.

## Anatomy

- **List**: A ul with role="list" written out, so screen readers announce how many items there are even without bullets. Thin dividers between rows by default.
- **Media**: Optional, at the start: an Avatar, an icon, a thumbnail. Centred against the text.
- **Title and description**: The title is primary text, semibold. With href or onActivate it becomes the row’s one link or button, stretched over the row and underlined on hover. The description is secondary text, 14px (pixels).
- **Meta**: Optional, right-aligned monospaced text with tabular figures (digits all the same width, so numbers line up): a time, a price, a count.
- **Actions**: Optional controls at the end, layered above the stretched link, each with its own tab stop. On a narrow screen, meta and actions wrap under the text.
