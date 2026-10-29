# Dialog

> A panel for one focused task, shown on top of the page. The page dims and goes inert, meaning it can't be clicked or focused. Keyboard focus moves inside the dialog and stays there. Escape or the close button hands focus back to whatever opened the dialog.

- **Best for:** A focused task on top of the page, such as an edit form.
- **Not for:** A destructive confirm: use AlertDialog. A message that doesn't need a decision: use Toast.
- Organism. Source: `src/components/organisms/dialog/Dialog.tsx`
- Rendered docs page: `/components/dialog`

## Import

```tsx
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from 'src/components/organisms/dialog/Dialog'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open (Dialog)` | `boolean` |  | Whether it is open, when your code controls that (controlled mode). |
| `defaultOpen (Dialog)` | `boolean` | `false` | Whether it starts open, when the component tracks its own state (uncontrolled mode). |
| `onOpenChange (Dialog)` | `(open: boolean) => void` |  | Called on every open and close, including Escape and a click on the scrim. |
| `asChild (Trigger)` | `boolean` |  | Uses its single child as the trigger instead of adding its own button. Pass a Button. |
| `title (Content)` | `string` |  | Required. The visible heading, and the name screen readers say. |
| `description (Content)` | `string` |  | Shown under the title. Screen readers read it as the accessible description. |
| `size (Content)` | `'sm' \| 'md' \| 'lg'` | `'md'` | Maximum width: 24rem, 32rem or 42rem (rem is a unit based on the root text size, usually 16 pixels). |
| `closeLabel (Content)` | `string` | `'Close'` | What screen readers call the close button. |
| `className (Content)` | `string` |  | Added to the root classes. Where two Tailwind utility classes clash, the later one wins. |
| `ref (Content)` | `Ref<HTMLDivElement>` |  | The element with the role dialog. |
| `ref (Trigger)` | `Ref<HTMLButtonElement>` |  | The trigger button. |
| `asChild (Close)` | `boolean` |  | Uses its single child as a control that closes the dialog. |
| `className (Footer)` | `string` |  | Added to the root classes. Where two Tailwind utility classes clash, the later one wins. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A form in a dialog

```tsx
function FormInDialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit depot</Button>
      </DialogTrigger>
      <DialogContent title="Edit depot" description="Changes apply to every open manifest.">
        <div className="flex flex-col gap-4">
          <FormField label="Depot name">
            <Input defaultValue="Brasov north" />
          </FormField>
          <FormField label="Notes">
            <Textarea placeholder="Anything the driver should know." />
          </FormField>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

<FormInDialogExample />
```

### Confirm a destructive action, opened without a trigger

```tsx
function ArchiveExample() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="danger"
        onClick={() => {
          setStatus('')
          setOpen(true)
        }}
      >
        Archive manifest
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Archive manifest?" size="sm">
          {/* token-discipline: allow, a manifest number in copy, not a colour */}
          <p>Manifest #482 moves to the archive. It stays recoverable there for 30 days.</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep it</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                setStatus('Manifest archived.')
                setOpen(false)
              }}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p role="status" className={docsProse}>
        {status}
      </p>
    </div>
  )
}

<ArchiveExample />
```

### Long content

```tsx
function LongContentExample() {
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Read shipping terms</Button>
      </DialogTrigger>
      <DialogContent
        ref={contentRef}
        title="Shipping terms"
        size="lg"
        tabIndex={-1}
        onOpenAutoFocus={event => {
          event.preventDefault()
          contentRef.current?.focus()
        }}
      >
        <div className="flex flex-col gap-4">
          <p>Orders placed before 14:00 local time ship the same day; anything after ships the next business day.</p>
          <p>Every parcel leaves in double-walled board with corner protection; ask for crate packaging on anything over 30kg.</p>
          <p>Photograph the box before opening and report damage within 48 hours; we replace or refund, never both.</p>
          <p>Unopened stock returns within 30 days for a full refund; opened stock returns for store credit only.</p>
          <p>Depots outside the primary freight lanes add one to three business days and a remote-area surcharge.</p>
          <p>A single parcel tops out at 40kg; heavier loads split automatically at checkout.</p>
          <p>Cross-border shipments carry the recipient's own duties and taxes, billed separately by the carrier.</p>
          <p>Reach the shipping desk at shipping@example.com for anything this page does not answer.</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

<LongContentExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the next control inside the dialog, looping from the last back to the first. |
| `Shift` `Tab` | Moves back, looping from the first to the last. |
| `Esc` | Closes it and sends focus back to whatever opened it. |

## Do

- Put the actions in DialogFooter. It lays them out in a row, aligned right, with the gap between buttons already set.
- Write the body as plain elements inside DialogContent. It adds the padding and sets the body text (14px, meaning 14 pixels, in text.primary), so a bare paragraph already looks right.
- Write the title as the task: 'Edit depot', not 'Edit'.
- Put the safe action first in the footer.
- Open it from a button, a trigger or a shortcut. Focus goes back to that control when it closes.
- For long content with no field at the top, focus the panel itself when it opens (onOpenAutoFocus, tabIndex={-1}), not whatever button happens to come first.

## Don't

- Don't open a dialog from a dialog. Finish or replace the first one.
- Don't open one from a dropdown menu item. The item is gone by the time the dialog closes, so focus has nowhere to go back to.
- Don't use one for a message that doesn't need a decision. That's a toast.
- Don't check an untouched field on blur (when focus leaves it) in a dialog's form, and don't show ErrorSummary before a submit. The first field has focus when the dialog opens, so pressing Cancel blurs it first. An error appearing at that moment pushes the footer down mid-click, and Cancel never closes the dialog.

## Anatomy

- **Scrim**: The dimmed layer over the page, coloured surface.scrim. The page under it is hidden from screen readers and can't take focus. Clicking the scrim closes the dialog.
- **Surface**: surface.base, a strong hairline border and the corner crosshair. It's opaque, so every colour on it is measured against the page. Its motion is M7: it settles in with M1, and when it closes it shrinks slightly as it fades while the scrim fades behind it.
- **Title**: Required. An h2 (a second-level heading), and the dialog's accessible name, the name screen readers say for it.
- **Description**: Optional. The accessible description, which screen readers read after the name.
- **Body**: Anything: fields, text, a list.
- **Footer**: The actions, with the safe one first.
- **Close**: A ghost icon button (no fill, just the icon) in the top right. It comes last when you move through with Tab.
