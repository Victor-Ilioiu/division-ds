# Sheet

> A dialog that slides in from the side and runs the full height of the screen. Use it for filters, a menu on a narrow screen, or the details of one item next to a list.

- **Best for:** Filters, navigation on a narrow screen, or one item's details next to a list, sliding in from the side.
- **Not for:** A short confirmation: use Dialog or AlertDialog.
- Organism. Source: `src/components/organisms/sheet/Sheet.tsx`
- Rendered docs page: `/components/sheet`

## Import

```tsx
import { Sheet, SheetClose, SheetContent, SheetTrigger } from 'src/components/organisms/sheet/Sheet'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open (Sheet)` | `boolean` |  | Whether it is open, when your code controls that (controlled mode). |
| `defaultOpen (Sheet)` | `boolean` | `false` | Whether it starts open, when the component tracks its own state (uncontrolled mode). |
| `onOpenChange (Sheet)` | `(open: boolean) => void` |  | Called on every open and close, including Escape and a click on the scrim. |
| `asChild (Trigger)` | `boolean` |  | Uses its single child as the trigger instead of adding its own button. Pass a Button. |
| `title (Content)` | `string` |  | Required. The visible heading, and the name screen readers say. |
| `description (Content)` | `string` |  | Shown under the title. Screen readers read it as the accessible description. |
| `side (Content)` | `'left' \| 'right'` | `'right'` | Which edge the sheet slides in from and stays attached to. |
| `closeLabel (Content)` | `string` | `'Close'` | What screen readers call the close button. |
| `className (Content)` | `string` |  | Added to the root classes. Where two Tailwind utility classes clash, the later one wins. |
| `ref (Content)` | `Ref<HTMLDivElement>` |  | The element with the role dialog. |
| `ref (Trigger)` | `Ref<HTMLButtonElement>` |  | The trigger button. |
| `asChild (Close)` | `boolean` |  | Uses its single child as a control that closes the sheet. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Filters on the right

```tsx
function FiltersOnTheRightExample() {
  const { toast } = useToast()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Filter depots</Button>
      </SheetTrigger>
      <SheetContent title="Filters" description="Narrow the depot list.">
        <fieldset className="flex flex-col gap-3">
          <legend className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-label)] mb-2">
            Region
          </legend>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> North
          </label>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> South
          </label>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> East
          </label>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> West
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'Filters saved',
                description: 'New depot lists open with these regions.',
                tone: 'ok',
              })
            }
          >
            Save as default
          </Button>
          <SheetClose asChild>
            <Button>Apply</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

<FiltersOnTheRightExample />
```

### From the left

```tsx
const DEPOTS = ['Brasov north', 'Brasov south', 'Sibiu', 'Cluj', 'Timisoara', 'Oradea']

function FromTheLeftExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open depot list</Button>
      </SheetTrigger>
      <SheetContent side="left" title="Depots">
        <ul role="list" className="flex flex-col gap-2">
          {DEPOTS.map(depot => (
            <li key={depot}>{depot}</li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

<FromTheLeftExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the next control inside the sheet, looping from the last back to the first. |
| `Shift` `Tab` | Moves back, looping from the first to the last. |
| `Esc` | Closes it and sends focus back to whatever opened it. |

## Do

- Use the right side for tools that act on the page, and the left for navigation.
- Keep the apply action at the end of the body, which is where a keyboard user gets to last.
- Close it after a choice that goes to another page.
- Show a toast from inside a sheet when it helps. It appears inside the sheet, screen readers can reach it, and Escape still closes the sheet.

## Don't

- Don't put a second sheet on top of a sheet.
- Don't use a sheet for a two-line confirmation. That's a dialog.
- Don't hide the only way to reach a page inside a sheet on wide screens.

## Anatomy

- **Scrim**: The dimmed layer over the page, coloured surface.scrim. The page under it is hidden from screen readers and can't take focus. Clicking the scrim closes the sheet.
- **Surface**: surface.base with a strong hairline border on its inner edge. It's full height, and 24rem wide or the width of the viewport (the visible browser area) minus 2rem. A rem is a unit based on the root text size, usually 16 pixels. Its motion is M7: when it closes, it slides back off its own edge while the scrim fades.
- **Title**: Required. An h2 (a second-level heading), and the sheet's accessible name, the name screen readers say for it.
- **Description**: Optional. The accessible description, which screen readers read after the name.
- **Body**: The part that scrolls. When it is taller than the screen it scrolls on its own, while the title and close button stay put.
- **Close**: A ghost icon button (no fill, just the icon) in the top right. It comes last when you move through with Tab.
