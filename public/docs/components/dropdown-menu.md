# DropdownMenu

> A short list of actions behind a button. It uses the same background as Select, so the system's two pop-ups look like one family. The highlighted item gets a fill, as it does everywhere else.

- **Best for:** A short list of actions, under about eight, behind a button.
- **Not for:** Picking a value for a form: use Select.
- Molecule. Source: `src/components/molecules/dropdown-menu/DropdownMenu.tsx`
- Rendered docs page: `/components/dropdown-menu`

## Import

```tsx
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from 'src/components/molecules/dropdown-menu/DropdownMenu'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open (Root)` | `boolean` |  | Whether the menu is open, when the page keeps track of it (controlled). |
| `defaultOpen (Root)` | `boolean` |  | Whether it starts open, when the menu keeps track itself (uncontrolled). |
| `onOpenChange (Root)` | `(open: boolean) => void` |  | Called when the menu opens or closes. |
| `modal (Root)` | `boolean` | `true` | While open, keyboard focus stays inside the menu and the page behind can't scroll. |
| `align (Content)` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment against the trigger. |
| `side (Content)` | `'top' \| 'right' \| 'bottom' \| 'left'` |  | Preferred side of the trigger. |
| `sideOffset (Content)` | `number` | `4` | Gap between trigger and content, in pixels. |
| `onSelect (Item)` | `(event: Event) => void` |  | Called when the item is chosen. |
| `disabled (Item)` | `boolean` | `false` | The item can't be chosen, and typing letters (typeahead) skips it. |
| `tone (Item)` | `'default' \| 'hostile'` | `'default'` | Use hostile for a destructive action: hostile-coloured text at rest, the hostile fill with ink text when highlighted. |
| `icon (Item)` | `ReactNode` |  | A small icon before the text, hidden from screen readers (aria-hidden). |
| `shortcut (Item)` | `string` |  | Shown on the right and passed to screen readers as aria-keyshortcuts. It only displays the key: the menu never makes the key work. |
| `checked (Checkbox item)` | `boolean` |  | Whether the tick shows. |
| `onCheckedChange (Checkbox item)` | `(checked: boolean) => void` |  | Called when the checkbox item is toggled. |
| `value (RadioGroup)` | `string` |  | The checked radio item. |
| `onValueChange (RadioGroup)` | `(value: string) => void` |  | Called with the chosen radio item value. |
| `value (RadioItem)` | `string` |  | This radio item's own value. |
| `icon (SubTrigger)` | `ReactNode` |  | A small icon before the text, hidden from screen readers, as on Item. |
| `open / defaultOpen / onOpenChange (Sub)` | `boolean / boolean / (open: boolean) => void` |  | Whether the submenu is open, tracked by the page (controlled) or by the submenu (uncontrolled). You'll usually leave these alone. |
| `alignOffset (SubContent)` | `number` | `-5` | Shifts the submenu so its first row lines up with its trigger. |
| `className` | `string` |  | Extra CSS classes, merged with the part's own. When two Tailwind classes clash, the later one wins. Every part takes it. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the rendered element (the DOM node). On Content, Item, Checkbox item, Radio item, Sub trigger and Sub content. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Actions

```tsx
function ActionsExample() {
  const [lastAction, setLastAction] = useState('No action yet.')
  const [pinned, setPinned] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Manifest actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Manifest</DropdownMenuLabel>
          <DropdownMenuItem shortcut="D" onSelect={() => setLastAction('Duplicated.')}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={pinned}
            onCheckedChange={checked => {
              setPinned(checked)
              setLastAction(checked ? 'Pinned to top.' : 'Unpinned.')
            }}
          >
            Pin to top
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="hostile" onSelect={() => setLastAction('Archived.')}>
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className={docsProse}>{lastAction}</p>
    </div>
  )
}

<ActionsExample />
```

### With icons and shortcuts

```tsx
function IconsAndShortcutsExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">Depot manifest</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem icon={<Copy />} shortcut="⌘C">
          Copy
        </DropdownMenuItem>
        <DropdownMenuItem icon={<CopyPlus />} shortcut="⌘D">
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Download />} shortcut="⌘E">
          Export
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

<IconsAndShortcutsExample />
```

### Radio items and a submenu

```tsx
function RadioAndSubmenuExample() {
  const [sort, setSort] = useState('newest')
  const [moved, setMoved] = useState('Not moved.')

  return (
    <div className="flex flex-col items-start gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Replica options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="price">Price</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="weight">Weight</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger icon={<FolderInput />}>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => setMoved('Moved to the armoury.')}>Armoury</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMoved('Moved to the workshop.')}>Workshop</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMoved('Moved to the depot.')}>Depot</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className={docsProse}>
        Sorted by {sort}. {moved}
      </p>
    </div>
  )
}

<RadioAndSubmenuExample />
```

### From an icon button

```tsx
function IconButtonTriggerExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Depot actions" variant="secondary">
          <MoreHorizontal aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>View manifest</DropdownMenuItem>
        <DropdownMenuItem>Reassign</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="hostile">Decommission</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

<IconButtonTriggerExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Enter` `Space` `ArrowDown` | On the trigger: opens, highlighting the first item. |
| `ArrowUp` `ArrowDown` | Moves the highlight. |
| `Home` `End` | Jumps to the first or last item. |
| `Enter` `Space` | Runs the highlighted item. |
| `Escape` | Closes the menu and puts focus back on the trigger. |
| `ArrowRight` | On a sub trigger: opens the submenu, highlighting its first item. |
| `ArrowLeft` | In a submenu: closes it, and you're back on its trigger. |
| `A–Z` | Typeahead: jumps to the next item that starts with the letters you type. |

## Do

- Keep menus under about eight items.
- Put the destructive item last, after a separator, with the hostile tone.
- Name an icon-only trigger for what the menu holds: 'Manifest actions', not 'More'.
- Use a radio group for a setting the menu shows the current value of: sort order, density.
- Name a sub trigger for what it holds: 'Move to', 'Export as'.

## Don't

- Don't use a menu to pick a value for a form. That's what Select is for.
- Don't put a submenu inside a submenu. One level at most.
- Don't use radio items to run actions. A radio item sets a value, and the menu keeps showing it.
- Don't make every item hostile to add weight. Hostile means it destroys something.

## Anatomy

- **Trigger**: A Button or IconButton, passed in through asChild. Radix (the library underneath) adds aria-haspopup and aria-expanded. These are ARIA (Accessible Rich Internet Applications) attributes that tell screen readers the button opens a menu and whether it's open.
- **Content**: Rendered in a portal, at the end of the page, so nothing clips it. Sunken surface, a strong thin border, crosshair corners. M7: it slides down out of the trigger to open and back up into it to close (the other way round when it opens above).
- **Item**: 36px (pixels) tall. When highlighted: the signal fill with ink-coloured text.
- **Hostile item**: For a destructive action. Hostile-coloured text at rest, and the hostile fill with ink text when highlighted.
- **Checkbox item**: Shows a tick when on. Screen readers get it as a menuitemcheckbox with aria-checked.
- **Label**: Uses text.secondary, so it reads as a heading over the items. It doesn't use text.label: on this background (surface.sunken) that token fails SC 1.4.3, the contrast rule in WCAG (the Web Content Accessibility Guidelines).
- **Separator**: A thin line.
- **Radio item**: One choice in a RadioGroup. Screen readers get it as a menuitemradio with aria-checked. Its mark is a small filled square, never a dot.
- **Sub trigger**: An item with a chevron that opens a submenu. While the highlight is inside the submenu, the sub trigger keeps a 1px strong line just inside its edge.
- **Sub content**: The submenu: the same surface and M7 slide as Content, aligned so its first row sits level with its trigger.
- **Shortcut**: Text on the right that screen readers skip (aria-hidden), plus aria-keyshortcuts on the item so they announce it once. It only displays the key: the page has to make the key work.
