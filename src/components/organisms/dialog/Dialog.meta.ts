import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Dialog',
  title: 'Dialog',
  tier: 'organisms',
  slug: 'dialog',
  summary:
    "A panel for one focused task, shown on top of the page. The page dims and goes inert, meaning it can't be clicked or focused. Keyboard focus moves inside the dialog and stays there. Escape or the close button hands focus back to whatever opened the dialog.",
  anatomy: [
    {
      part: 'Scrim',
      description:
        "The dimmed layer over the page, coloured surface.scrim. The page under it is hidden from screen readers and can't take focus. Clicking the scrim closes the dialog.",
    },
    {
      part: 'Surface',
      description:
        "surface.base, a strong hairline border and the corner crosshair. It's opaque, so every colour on it is measured against the page. Its motion is M7: it settles in with M1, and when it closes it shrinks slightly as it fades while the scrim fades behind it.",
    },
    {
      part: 'Title',
      description:
        "Required. An h2 (a second-level heading), and the dialog's accessible name, the name screen readers say for it.",
    },
    { part: 'Description', description: 'Optional. The accessible description, which screen readers read after the name.' },
    { part: 'Body', description: 'Anything: fields, text, a list.' },
    { part: 'Footer', description: 'The actions, with the safe one first.' },
    {
      part: 'Close',
      description: 'A ghost icon button (no fill, just the icon) in the top right. It comes last when you move through with Tab.',
    },
  ],
  props: [
    { name: 'open (Dialog)', type: 'boolean', description: 'Whether it is open, when your code controls that (controlled mode).' },
    {
      name: 'defaultOpen (Dialog)',
      type: 'boolean',
      default: 'false',
      description: 'Whether it starts open, when the component tracks its own state (uncontrolled mode).',
    },
    {
      name: 'onOpenChange (Dialog)',
      type: '(open: boolean) => void',
      description: 'Called on every open and close, including Escape and a click on the scrim.',
    },
    {
      name: 'asChild (Trigger)',
      type: 'boolean',
      description: 'Uses its single child as the trigger instead of adding its own button. Pass a Button.',
    },
    {
      name: 'title (Content)',
      type: 'string',
      description: 'Required. The visible heading, and the name screen readers say.',
    },
    {
      name: 'description (Content)',
      type: 'string',
      description: 'Shown under the title. Screen readers read it as the accessible description.',
    },
    {
      name: 'size (Content)',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: 'Maximum width: 24rem, 32rem or 42rem (rem is a unit based on the root text size, usually 16 pixels).',
    },
    {
      name: 'closeLabel (Content)',
      type: 'string',
      default: "'Close'",
      description: 'What screen readers call the close button.',
    },
    {
      name: 'className (Content)',
      type: 'string',
      description: 'Added to the root classes. Where two Tailwind utility classes clash, the later one wins.',
    },
    { name: 'ref (Content)', type: 'Ref<HTMLDivElement>', description: 'The element with the role dialog.' },
    { name: 'ref (Trigger)', type: 'Ref<HTMLButtonElement>', description: 'The trigger button.' },
    {
      name: 'asChild (Close)',
      type: 'boolean',
      description: 'Uses its single child as a control that closes the dialog.',
    },
    {
      name: 'className (Footer)',
      type: 'string',
      description: 'Added to the root classes. Where two Tailwind utility classes clash, the later one wins.',
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to the next control inside the dialog, looping from the last back to the first.' },
    { keys: ['Shift', 'Tab'], does: 'Moves back, looping from the first to the last.' },
    { keys: ['Esc'], does: 'Closes it and sends focus back to whatever opened it.' },
  ],
  useWhen: 'A focused task on top of the page, such as an edit form.',
  notFor: "A destructive confirm: use AlertDialog. A message that doesn't need a decision: use Toast.",
  dos: [
    'Put the actions in DialogFooter. It lays them out in a row, aligned right, with the gap between buttons already set.',
    "Write the body as plain elements inside DialogContent. It adds the padding and sets the body text (14px, meaning 14 pixels, in text.primary), so a bare paragraph already looks right.",
    "Write the title as the task: 'Edit depot', not 'Edit'.",
    'Put the safe action first in the footer.',
    'Open it from a button, a trigger or a shortcut. Focus goes back to that control when it closes.',
    "For long content with no field at the top, focus the panel itself when it opens (onOpenAutoFocus, tabIndex={-1}), not whatever button happens to come first.",
  ],
  donts: [
    "Don't open a dialog from a dialog. Finish or replace the first one.",
    "Don't open one from a dropdown menu item. The item is gone by the time the dialog closes, so focus has nowhere to go back to.",
    "Don't use one for a message that doesn't need a decision. That's a toast.",
    "Don't check an untouched field on blur (when focus leaves it) in a dialog's form, and don't show ErrorSummary before a submit. The first field has focus when the dialog opens, so pressing Cancel blurs it first. An error appearing at that moment pushes the footer down mid-click, and Cancel never closes the dialog.",
  ],
}
