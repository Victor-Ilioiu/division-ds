# AlertDialog

> Asks for confirmation before something with real consequences. It shows a question, says what will happen, and offers Cancel and the action. Screen readers announce it as an alert, a click outside won't dismiss it, and focus starts on Cancel. If the action returns a promise (a value that finishes later, such as a server call), the dialog stays open and shows it's busy until that work is done.

- **Best for:** Confirming an action that matters and can't be undone, such as a delete.
- **Not for:** Something that can be undone: just do it and offer Undo in a Toast. A form or a task: use Dialog.
- Organism. Source: `src/components/organisms/alert-dialog/AlertDialog.tsx`
- Rendered docs page: `/components/alert-dialog`

## Import

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogTrigger } from 'src/components/organisms/alert-dialog/AlertDialog'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open (AlertDialog)` | `boolean` |  | Whether it is open, when your code controls that (controlled mode). |
| `defaultOpen (AlertDialog)` | `boolean` | `false` | Whether it starts open, when the component tracks its own state (uncontrolled mode). |
| `onOpenChange (AlertDialog)` | `(open: boolean) => void` |  | Called on every open and close. It isn't called when someone tries to close it while the action is busy. |
| `asChild (Trigger)` | `boolean` |  | Uses its single child as the trigger instead of adding its own button. Pass a Button. |
| `ref (Trigger)` | `Ref<HTMLButtonElement>` |  | The trigger button. |
| `title (Content)` | `string` |  | Required. The question, and the name screen readers say. |
| `description (Content)` | `string` |  | Required. What confirming does. Screen readers read it as the accessible description. |
| `size (Content)` | `'sm' \| 'md'` | `'md'` | Maximum width: 24rem or 32rem (rem is a unit based on the root text size, usually 16 pixels). |
| `className (Content)` | `string` |  | Added to the panel classes. Where two Tailwind utility classes clash, the later one wins. |
| `ref (Content)` | `Ref<HTMLDivElement>` |  | The element with the role alertdialog. |
| `onPointerDownOutside / onInteractOutside (Content)` | `—` |  | Not available: a click outside never dismisses an alert dialog. |
| `className (Footer)` | `string` |  | Added to the button row classes. |
| `children (Cancel)` | `ReactNode` | `'Cancel'` | The label. Name what the person keeps, for example Keep editing. |
| `ref (Cancel)` | `Ref<HTMLButtonElement>` |  | The Cancel button, which gets focus when the dialog opens. |
| `tone (Action)` | `'hostile' \| 'default'` | `'hostile'` | hostile (the danger button) for something that can't be undone. default (the primary button) for a confirm that's safe but still matters. |
| `onClick (Action)` | `(event) => void \| Promise<unknown>` |  | Runs on confirm, then closes the dialog. If it returns a promise, the dialog stays open and busy until the promise settles: success closes it, failure keeps it open. Calling event.preventDefault() also keeps it open. |
| `loading (Action)` | `boolean` | `false` | Marks it busy from outside, for work you track yourself. It holds the dialog open the same way a pending promise does. |
| `loadingLabel (Action)` | `string` | `'Working'` | Text you can't see that screen readers announce while it's busy. |
| `ref (Action)` | `Ref<HTMLButtonElement>` |  | The action button. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Delete while the request is still running: the action button shows it's busy and the dialog waits

```tsx
const request = (fail = false) =>
  new Promise<void>((resolve, reject) =>
    window.setTimeout(() => (fail ? reject(new Error('The server did not answer.')) : resolve()), 1000)
  )

function DeleteExample() {
  const { toast } = useToast()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete depot</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Delete Brasov north?"
        description="Its 12 open manifests move to the unassigned queue. The depot cannot be restored."
      >
        <AlertDialogFooter>
          <AlertDialogCancel />
          <AlertDialogAction
            loadingLabel="Deleting depot"
            onClick={() => request().then(() => toast({ tone: 'ok', title: 'Depot deleted' }))}
          >
            Delete depot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

<DeleteExample />
```

### A failed request: the dialog stays open and a toast says why

```tsx
const request = (fail = false) =>
  new Promise<void>((resolve, reject) =>
    window.setTimeout(() => (fail ? reject(new Error('The server did not answer.')) : resolve()), 1000)
  )

function FailureExample() {
  const { toast } = useToast()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary">Revoke API key</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Revoke the warehouse key?"
        description="Scripts that use it stop working at once. This demo always fails, to show the dialog staying open."
        size="sm"
      >
        <AlertDialogFooter>
          <AlertDialogCancel>Keep key</AlertDialogCancel>
          <AlertDialogAction
            loadingLabel="Revoking key"
            onClick={() =>
              request(true).catch((error: Error) => {
                toast({ tone: 'hostile', title: 'Key not revoked', description: error.message })
                throw error
              })
            }
          >
            Revoke key
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

<FailureExample />
```

### A safe confirm that still has consequences, with the default tone

```tsx
function DefaultToneExample() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Publish prices</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Publish the autumn prices?"
        description="Customers see them on every replica page as soon as you publish."
        size="sm"
      >
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction tone="default">Publish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

<DefaultToneExample />
```

### Type the name to confirm, for the costliest actions

```tsx
const request = (fail = false) =>
  new Promise<void>((resolve, reject) =>
    window.setTimeout(() => (fail ? reject(new Error('The server did not answer.')) : resolve()), 1000)
  )

const ACCOUNT = 'northfield-supply'

function TypeToConfirmExample() {
  const [typed, setTyped] = useState('')
  const matches = typed.trim() === ACCOUNT
  return (
    <AlertDialog onOpenChange={() => setTyped('')}>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Delete the account?"
        description="Its 212 orders, saved kit lists and team access are removed for good."
      >
        <FormField label="Account name" help={`Type ${ACCOUNT} to enable Delete account.`}>
          <Input
            value={typed}
            onChange={event => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </FormField>
        <AlertDialogFooter>
          <AlertDialogCancel />
          <AlertDialogAction disabled={!matches} loadingLabel="Deleting account" onClick={() => request()}>
            Delete account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

<TypeToConfirmExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves between Cancel, the action and any field, looping around inside the dialog. |
| `Enter` | Presses the focused button. Focus starts on Cancel, so an accidental Enter cancels. |
| `Esc` | Cancels and sends focus back to whatever opened it. It waits while the action is busy. |

## Do

- Write the title as the question, with the thing it's about: 'Delete Brasov north?', not 'Are you sure?'.
- Say in the description exactly what will be lost or changed, with numbers where you have them.
- Label the action with the verb and the thing: 'Delete depot', never 'OK' or 'Yes'.
- Return the promise from onClick for anything that calls a server.
- For something very costly, add a field asking for the name, and disable the action until it matches (see the last example).

## Don't

- Don't use it for something that can be undone. Do the thing and offer Undo in a toast.
- Don't use it for a form or a task. That's a Dialog.
- Don't add a close button or close it on a click outside. The only choices are Cancel or the action.
- Don't open one from a dropdown menu item. The item is gone by the time the dialog closes, so focus has nowhere to go back to.

## Common mistakes

Wrong:

```tsx
<Dialog>
  <DialogContent title="Delete depot?">
    <DialogFooter>
      <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      <Button variant="danger" onClick={remove}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Right:

```tsx
<AlertDialog>
  <AlertDialogContent title="Delete depot?" description="Its open manifests move to the unassigned queue.">
    <AlertDialogFooter>
      <AlertDialogCancel />
      <AlertDialogAction onClick={remove}>Delete depot</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Dialog has the role dialog (the label screen readers use to describe it), closes when someone clicks the scrim behind it, and focuses the first control. A destructive confirm needs the role alertdialog, no dismissal from outside, and focus on Cancel. AlertDialog does all three.

Wrong:

```tsx
const [busy, setBusy] = useState(false)
<AlertDialog open={open} onOpenChange={next => { if (!busy) setOpen(next) }}>
  ...
  <AlertDialogAction loading={busy} onClick={async event => {
    event.preventDefault(); setBusy(true); await remove(); setBusy(false); setOpen(false)
  }}>Delete</AlertDialogAction>
```

Right:

```tsx
<AlertDialogAction onClick={() => remove()}>Delete</AlertDialogAction>
```

Return the promise. The action goes busy, Cancel and Escape wait, and the dialog closes when the work succeeds or stays open when it fails. You don't need any state of your own.

Wrong:

```tsx
<AlertDialogAction onClick={() => remove()}>Delete</AlertDialogAction>
// remove() rejects, and nothing tells the person
```

Right:

```tsx
<AlertDialogAction onClick={() => remove().catch(error => {
  toast({ tone: 'hostile', title: 'Not deleted', description: error.message })
  throw error
})}>Delete</AlertDialogAction>
```

When the promise fails, the dialog stays open but shows nothing on its own. Report the failure, then throw the error again so the dialog stays open for a retry or a Cancel.

## Anatomy

- **Scrim**: The dimmed layer over the page, coloured surface.scrim. The page under it is inert (it can't be clicked or focused) and hidden from screen readers. Unlike Dialog, clicking it does nothing: the person has to choose.
- **Surface**: The same panel as Dialog: surface.base, a strong hairline border, the corner crosshair and the M7 motion for opening and closing. Its role is alertdialog.
- **Title**: Required. The question. It's an h2 (a second-level heading) and the dialog's accessible name, the name screen readers say for it.
- **Description**: Required. What confirming does. Screen readers announce it with the title.
- **Body**: Optional. A list of what will be lost, or a field to type a name into.
- **Footer**: Cancel first, then the action. There's no close button.
