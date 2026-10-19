import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Sheet',
  title: 'Sheet',
  tier: 'organisms',
  slug: 'sheet',
  summary:
    "A dialog that slides in from the side and runs the full height of the screen. Use it for filters, a menu on a narrow screen, or the details of one item next to a list.",
  anatomy: [
    {
      part: 'Scrim',
      description:
        "The dimmed layer over the page, coloured surface.scrim. The page under it is hidden from screen readers and can't take focus. Clicking the scrim closes the sheet.",
    },
    {
      part: 'Surface',
      description:
        "surface.base with a strong hairline border on its inner edge. It's full height, and 24rem wide or the width of the viewport (the visible browser area) minus 2rem. A rem is a unit based on the root text size, usually 16 pixels. Its motion is M7: when it closes, it slides back off its own edge while the scrim fades.",
    },
    {
      part: 'Title',
      description:
        "Required. An h2 (a second-level heading), and the sheet's accessible name, the name screen readers say for it.",
    },
    { part: 'Description', description: 'Optional. The accessible description, which screen readers read after the name.' },
    {
      part: 'Body',
      description:
        'The part that scrolls. When it is taller than the screen it scrolls on its own, while the title and close button stay put.',
    },
    {
      part: 'Close',
      description: 'A ghost icon button (no fill, just the icon) in the top right. It comes last when you move through with Tab.',
    },
  ],
  props: [
    { name: 'open (Sheet)', type: 'boolean', description: 'Whether it is open, when your code controls that (controlled mode).' },
    {
      name: 'defaultOpen (Sheet)',
      type: 'boolean',
      default: 'false',
      description: 'Whether it starts open, when the component tracks its own state (uncontrolled mode).',
    },
    {
      name: 'onOpenChange (Sheet)',
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
      name: 'side (Content)',
      type: "'left' | 'right'",
      default: "'right'",
      description: 'Which edge the sheet slides in from and stays attached to.',
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
      description: 'Uses its single child as a control that closes the sheet.',
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to the next control inside the sheet, looping from the last back to the first.' },
    { keys: ['Shift', 'Tab'], does: 'Moves back, looping from the first to the last.' },
    { keys: ['Esc'], does: 'Closes it and sends focus back to whatever opened it.' },
  ],
  useWhen: "Filters, navigation on a narrow screen, or one item's details next to a list, sliding in from the side.",
  notFor: 'A short confirmation: use Dialog or AlertDialog.',
  dos: [
    'Use the right side for tools that act on the page, and the left for navigation.',
    'Keep the apply action at the end of the body, which is where a keyboard user gets to last.',
    'Close it after a choice that goes to another page.',
    "Show a toast from inside a sheet when it helps. It appears inside the sheet, screen readers can reach it, and Escape still closes the sheet.",
  ],
  donts: [
    "Don't put a second sheet on top of a sheet.",
    "Don't use a sheet for a two-line confirmation. That's a dialog.",
    "Don't hide the only way to reach a page inside a sheet on wide screens.",
  ],
}
