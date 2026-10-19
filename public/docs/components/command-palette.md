# CommandPalette

> Every action in one place. Press Ctrl+K anywhere, type a few letters, move with the arrow keys and press Enter. Focus (where keyboard input goes) returns to where it was, and then the command runs.

- **Best for:** Every action in one place behind Ctrl+K, with a visible button that opens it too.
- **Not for:** Searching page content: use Search. A few actions on one control: use DropdownMenu.
- Organism. Source: `src/components/organisms/command-palette/CommandPalette.tsx`
- Rendered docs page: `/components/command-palette`

## Import

```tsx
import { CommandPalette, filterCommands, groupCommands } from 'src/components/organisms/command-palette/CommandPalette'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `commands` | `Command[]` |  | Required. Each has id, label, group, keywords, shortcut, icon and onSelect. |
| `open` | `boolean` |  | Open state when controlled, meaning your code decides whether it is open. |
| `defaultOpen` | `boolean` | `false` | Starting open state when uncontrolled, meaning the palette keeps track of it itself. |
| `onOpenChange` | `(open: boolean) => void` |  | Called on every open and close, including Escape and a click on the scrim (the dimmed backdrop). If you refuse the close, the chosen command stays ready to run until the user does anything else in the palette. Closing it yourself later counts as accepting it. |
| `shortcut` | `boolean` | `true` | Ctrl+K or Cmd+K opens and closes the palette from anywhere. |
| `label` | `string` | `'Command palette'` | The dialog's accessible name (what a screen reader announces), hidden from view. |
| `searchLabel` | `string` | `'Search commands'` | The search field's accessible name. |
| `placeholder` | `string` | `'Type a command or search'` | Shown in the empty search field. |
| `emptyMessage` | `string` | `'No matching commands'` | Shown when nothing matches the search. |
| `ref` | `Ref<HTMLInputElement>` |  | The search field, while the palette is open. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type Command = {
  id: string
  label: string
  /** Commands with the same group are drawn together under its heading. */
  group?: string
  /** Extra words a search matches on. */
  keywords?: string[]
  /** A hint shown on the option, e.g. "N". Display only: the palette does not bind it. */
  shortcut?: string
  /** Drawn aria-hidden; the label carries the meaning. */
  icon?: ReactNode
  onSelect: () => void
}
```

```ts
export type CommandGroup = { group?: string; commands: Command[] }
```

```ts
/** Every whitespace-separated term must appear in the label, the group or a keyword, ignoring case.
 *  A label that starts with the first term ranks first; otherwise the given order holds. */
export function filterCommands(commands: readonly Command[], query: string): Command[]
```

```ts
/** Groups in the order each group first appears; order within a group is kept. */
export function groupCommands(commands: readonly Command[]): CommandGroup[]
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Store commands

```tsx
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

<StoreCommands />
```

## Keyboard

| Keys | Result |
|---|---|
| `Ctrl` `K` | Opens or closes it from anywhere on the page (Cmd+K on macOS). |
| `↓` | Next command, wrapping round to the first. |
| `↑` | Previous command, wrapping round to the last. |
| `Home` | First command. |
| `End` | Last command. |
| `Enter` | Runs the active command. |
| `Esc` | Closes without running anything. |

## Do

- Name commands as verbs: 'Go to orders', 'New shipment'.
- Add keywords for the words people actually type.
- Give it a visible button that opens it too. People won't find a shortcut on its own.

## Don't

- Don't put destructive commands in it without a dialog that asks for confirmation.
- Don't show a shortcut hint the app doesn't actually set up.
- Don't put more than one palette on a page. Each one listens for the same Ctrl+K/Cmd+K across the whole page, so a second one fights the first for the shortcut.

## Anatomy

- **Dialog**: Named 'Command palette', with the name hidden from view. Drawn on surface.base with the corner crosshair.
- **Search field**: A combobox, a text field tied to a list of choices. Focus stays here the whole time.
- **Listbox**: Named 'Commands'. It's not there at all when nothing matches.
- **Group**: Named by its heading.
- **Option**: The active one gets the fill, and the search field points to it as its active descendant, so screen readers announce it while focus stays in the field.
- **Count**: A status line hidden from view but read by screen readers: '2 commands'.
- **Shortcut hint**: A Kbd that's hidden from assistive technology (screen readers and similar tools). It's for display only.
