# SidePanel

> A wide panel docked beside the page's content, for reading or editing one item while the list or board it came from stays in view. It is not modal: there is no scrim (the dimmed layer a Sheet puts over the page), the page keeps working, and opening another item swaps what the panel shows. Its leading edge can be dragged, or moved with the arrow keys, to make it wider or narrower.

- **Best for:** The details of one item from a board, list or table, read and edited while that board or list stays visible and usable beside it.
- **Not for:** A task that must be finished or cancelled before anything else: use Dialog. Filters or navigation on a narrow screen: use Sheet.
- Organism. Source: `src/components/organisms/side-panel/SidePanel.tsx`
- Rendered docs page: `/components/side-panel`

## Import

```tsx
import { SIDE_PANEL_WIDTH, SidePanel } from 'src/components/organisms/side-panel/SidePanel'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- A flex row: put the page content (with min-w-0 flex-1) and the panel side by side, so the panel pushes the content aside instead of covering it.
- A height when the page scrolls inside a container: it is sticky at the top and h-dvh by default. In a padded scroll area, pass className="md:h-[calc(100dvh-4rem)]" or whatever fits.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` |  | Required. Whether the panel is shown. Closed, it renders nothing. |
| `onOpenChange` | `(open: boolean) => void` |  | Required. Called with false by the close button and by Escape inside the panel. |
| `title` | `string` |  | Required. The visible heading and the panel's accessible name. |
| `eyebrow` | `ReactNode` |  | A short line above the title: the item's key, its type, its column. |
| `description` | `string` |  | Shown under the title. Screen readers read it as the accessible description. |
| `actions` | `ReactNode` |  | Controls in the header, before the close button, such as Run or a DropdownMenu. Keep it to two or three. |
| `footer` | `ReactNode` |  | Pinned under the body, outside the scroll: a form's Cancel and Save. Laid out as a right-aligned row with a gap. |
| `width` | `number` |  | The width in pixels, when your code controls it. Pass it together with onWidthChange. |
| `defaultWidth` | `number` | `560` | The width it opens at, when it keeps track of the width itself. SIDE_PANEL_WIDTH, exported beside the component, holds the three defaults and the 32px keyboard step. |
| `minWidth` | `number` | `360` | The narrowest the handle can make it. |
| `maxWidth` | `number` | `960` | The widest the handle can make it. |
| `onWidthChange` | `(width: number) => void` |  | Called as the width changes, from a drag or a key. Store the value (in localStorage, say) to open at the same width next time. |
| `resizeLabel` | `string` | `'Resize panel'` | The resize handle's accessible name. |
| `closeLabel` | `string` | `'Close'` | The close button's accessible name. |
| `closeOnEscape` | `boolean` | `true` | Whether Escape inside the panel closes it. An Escape that closes a menu or a listbox opened from the panel never does. |
| `headingLevel` | `2 \| 3` | `2` | The title's heading level, so it carries on the page's outline. |
| `className` | `string` |  | Merged with the panel classes. When Tailwind utility classes clash, the later one wins: this is where a height goes. |
| `ref` | `Ref<HTMLElement>` |  | The aside element. |
| `aria-labelledby / aria-describedby` | `—` |  | Left out on purpose. The title and description are the only source of the name and description. |
| `...rest` | `Omit<HTMLAttributes<HTMLElement>, 'title'>` |  | Every other native attribute, onto the aside. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/**
 * A docked, non-modal side panel: the standard side sheet of Material 3, where Sheet is the modal
 * one. It sits beside the content in the page's own layout and pushes it aside, so the page stays
 * visible, scrollable and usable while the panel is open. That is the difference that matters: an
 * item opened from a board or a list can be read and edited while the board is still in view, and
 * another item can be opened from the board without closing anything first.
 *
 * Non-modal means no scrim, no focus trap and no portal. Focus moves to the panel's heading when it
 * opens, Escape inside the panel closes it, and closing returns focus to whatever opened it, when
 * focus was still in the panel.
 *
 * The leading edge is a resize handle: a vertical `separator` with a value, dragged with a pointer
 * or moved with the arrow keys, so the width is never pointer-only.
 *
 * Below the md breakpoint (768px) there is no room to dock, so it covers the screen instead,
 * edge to edge, like a full-screen Dialog.
 *
 * Contrast: the panel paints surface.base, so the title reuses "text.primary on surface.base", the
 * eyebrow, description and close glyph "text.secondary on surface.base", and focus rings "focus.ring
 * on surface.base". The handle's line at rest is the hairline (decorative, the separator's value is
 * announced); hovered, dragged or focused it is accent.signal.indicator, the board's own
 * drop-indicator colour.
 */

export const SIDE_PANEL_WIDTH = { default: 560, min: 360, max: 960, step: 32 } as const …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Beside a list: open one, then another, without closing

```tsx
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

<BesideAListExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Esc` | Inside the panel, closes it and sends focus back to whatever opened it. |
| `←` `→` | On the resize handle: wider and narrower by 32px, by 128px with Shift. |
| `Home` `End` | On the resize handle: the narrowest and the widest. |
| `Tab` | Moves through the panel and on into the page: the panel traps nothing. |

## Do

- Open it from the item itself (a card title, a row) and swap its content when another item is opened, without closing it first.
- Mark the open item in the list: KanbanBoard's selectedItemId does it for a board.
- Save a field as it is changed or left, as an issue tracker does, so closing the panel never loses work.
- Remember the width people drag it to.

## Don't

- Don't use it for a choice the page has to wait for. That is a Dialog.
- Don't open a Sheet or a second SidePanel from it. A Dialog or AlertDialog from inside it is fine.
- Don't put it over the content with position fixed on a wide screen: docked beside the content is the point.

## Anatomy

- **Panel**: An aside (a complementary landmark, which screen readers can jump to) named by the title. surface.base, a strong hairline on its leading edge, full height, sticky.
- **Resize handle**: The leading edge: a vertical separator with the width as its value. The line turns accent.signal.indicator on hover, on focus and while dragging.
- **Eyebrow**: Optional, above the title, in the data font: the item's key, type or column.
- **Title**: Required. An h2 by default, and the panel's accessible name. It takes focus when the panel opens.
- **Actions**: Optional controls in the header, before the close button.
- **Close**: A ghost icon button at the end of the header.
- **Body**: The part that scrolls. The header and the footer stay put.
- **Footer**: Optional, under the body: the buttons of a form, right-aligned.
