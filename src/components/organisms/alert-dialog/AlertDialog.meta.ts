import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'AlertDialog',
  title: 'Alert dialog',
  tier: 'organisms',
  slug: 'alert-dialog',
  summary:
    "Asks for confirmation before something with real consequences. It shows a question, says what will happen, and offers Cancel and the action. Screen readers announce it as an alert, a click outside won't dismiss it, and focus starts on Cancel. If the action returns a promise (a value that finishes later, such as a server call), the dialog stays open and shows it's busy until that work is done.",
  pitfalls: [
    {
      wrong: `<Dialog>
  <DialogContent title="Delete depot?">
    <DialogFooter>
      <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      <Button variant="danger" onClick={remove}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
      right: `<AlertDialog>
  <AlertDialogContent title="Delete depot?" description="Its open manifests move to the unassigned queue.">
    <AlertDialogFooter>
      <AlertDialogCancel />
      <AlertDialogAction onClick={remove}>Delete depot</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`,
      why: "Dialog has the role dialog (the label screen readers use to describe it), closes when someone clicks the scrim behind it, and focuses the first control. A destructive confirm needs the role alertdialog, no dismissal from outside, and focus on Cancel. AlertDialog does all three.",
    },
    {
      wrong: `const [busy, setBusy] = useState(false)
<AlertDialog open={open} onOpenChange={next => { if (!busy) setOpen(next) }}>
  ...
  <AlertDialogAction loading={busy} onClick={async event => {
    event.preventDefault(); setBusy(true); await remove(); setBusy(false); setOpen(false)
  }}>Delete</AlertDialogAction>`,
      right: `<AlertDialogAction onClick={() => remove()}>Delete</AlertDialogAction>`,
      why: "Return the promise. The action goes busy, Cancel and Escape wait, and the dialog closes when the work succeeds or stays open when it fails. You don't need any state of your own.",
    },
    {
      wrong: `<AlertDialogAction onClick={() => remove()}>Delete</AlertDialogAction>
// remove() rejects, and nothing tells the person`,
      right: `<AlertDialogAction onClick={() => remove().catch(error => {
  toast({ tone: 'hostile', title: 'Not deleted', description: error.message })
  throw error
})}>Delete</AlertDialogAction>`,
      why: "When the promise fails, the dialog stays open but shows nothing on its own. Report the failure, then throw the error again so the dialog stays open for a retry or a Cancel.",
    },
  ],
  anatomy: [
    {
      part: 'Scrim',
      description:
        "The dimmed layer over the page, coloured surface.scrim. The page under it is inert (it can't be clicked or focused) and hidden from screen readers. Unlike Dialog, clicking it does nothing: the person has to choose.",
    },
    {
      part: 'Surface',
      description:
        'The same panel as Dialog: surface.base, a strong hairline border, the corner crosshair and the M7 motion for opening and closing. Its role is alertdialog.',
    },
    {
      part: 'Title',
      description:
        "Required. The question. It's an h2 (a second-level heading) and the dialog's accessible name, the name screen readers say for it.",
    },
    { part: 'Description', description: 'Required. What confirming does. Screen readers announce it with the title.' },
    { part: 'Body', description: 'Optional. A list of what will be lost, or a field to type a name into.' },
    { part: 'Footer', description: "Cancel first, then the action. There's no close button." },
  ],
  props: [
    {
      name: 'open (AlertDialog)',
      type: 'boolean',
      description: 'Whether it is open, when your code controls that (controlled mode).',
    },
    {
      name: 'defaultOpen (AlertDialog)',
      type: 'boolean',
      default: 'false',
      description: 'Whether it starts open, when the component tracks its own state (uncontrolled mode).',
    },
    {
      name: 'onOpenChange (AlertDialog)',
      type: '(open: boolean) => void',
      description: "Called on every open and close. It isn't called when someone tries to close it while the action is busy.",
    },
    {
      name: 'asChild (Trigger)',
      type: 'boolean',
      description: 'Uses its single child as the trigger instead of adding its own button. Pass a Button.',
    },
    { name: 'ref (Trigger)', type: 'Ref<HTMLButtonElement>', description: 'The trigger button.' },
    { name: 'title (Content)', type: 'string', description: 'Required. The question, and the name screen readers say.' },
    {
      name: 'description (Content)',
      type: 'string',
      description: 'Required. What confirming does. Screen readers read it as the accessible description.',
    },
    {
      name: 'size (Content)',
      type: "'sm' | 'md'",
      default: "'md'",
      description: 'Maximum width: 24rem or 32rem (rem is a unit based on the root text size, usually 16 pixels).',
    },
    {
      name: 'className (Content)',
      type: 'string',
      description: 'Added to the panel classes. Where two Tailwind utility classes clash, the later one wins.',
    },
    { name: 'ref (Content)', type: 'Ref<HTMLDivElement>', description: 'The element with the role alertdialog.' },
    {
      name: 'onPointerDownOutside / onInteractOutside (Content)',
      type: '—',
      description: "Not available: a click outside never dismisses an alert dialog.",
    },
    { name: 'className (Footer)', type: 'string', description: 'Added to the button row classes.' },
    {
      name: 'children (Cancel)',
      type: 'ReactNode',
      default: "'Cancel'",
      description: 'The label. Name what the person keeps, for example Keep editing.',
    },
    { name: 'ref (Cancel)', type: 'Ref<HTMLButtonElement>', description: 'The Cancel button, which gets focus when the dialog opens.' },
    {
      name: 'tone (Action)',
      type: "'hostile' | 'default'",
      default: "'hostile'",
      description:
        "hostile (the danger button) for something that can't be undone. default (the primary button) for a confirm that's safe but still matters.",
    },
    {
      name: 'onClick (Action)',
      type: '(event) => void | Promise<unknown>',
      description:
        "Runs on confirm, then closes the dialog. If it returns a promise, the dialog stays open and busy until the promise settles: success closes it, failure keeps it open. Calling event.preventDefault() also keeps it open.",
    },
    {
      name: 'loading (Action)',
      type: 'boolean',
      default: 'false',
      description: "Marks it busy from outside, for work you track yourself. It holds the dialog open the same way a pending promise does.",
    },
    {
      name: 'loadingLabel (Action)',
      type: 'string',
      default: "'Working'",
      description: "Text you can't see that screen readers announce while it's busy.",
    },
    { name: 'ref (Action)', type: 'Ref<HTMLButtonElement>', description: 'The action button.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves between Cancel, the action and any field, looping around inside the dialog.' },
    { keys: ['Enter'], does: 'Presses the focused button. Focus starts on Cancel, so an accidental Enter cancels.' },
    { keys: ['Esc'], does: "Cancels and sends focus back to whatever opened it. It waits while the action is busy." },
  ],
  useWhen: "Confirming an action that matters and can't be undone, such as a delete.",
  notFor: 'Something that can be undone: just do it and offer Undo in a Toast. A form or a task: use Dialog.',
  dos: [
    "Write the title as the question, with the thing it's about: 'Delete Brasov north?', not 'Are you sure?'.",
    'Say in the description exactly what will be lost or changed, with numbers where you have them.',
    "Label the action with the verb and the thing: 'Delete depot', never 'OK' or 'Yes'.",
    'Return the promise from onClick for anything that calls a server.',
    'For something very costly, add a field asking for the name, and disable the action until it matches (see the last example).',
  ],
  donts: [
    "Don't use it for something that can be undone. Do the thing and offer Undo in a toast.",
    "Don't use it for a form or a task. That's a Dialog.",
    "Don't add a close button or close it on a click outside. The only choices are Cancel or the action.",
    "Don't open one from a dropdown menu item. The item is gone by the time the dialog closes, so focus has nowhere to go back to.",
  ],
}
