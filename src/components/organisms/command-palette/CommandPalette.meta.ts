import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'CommandPalette',
  title: 'Command palette',
  tier: 'organisms',
  slug: 'command-palette',
  summary:
    "Every action in one place. Press Ctrl+K anywhere, type a few letters, move with the arrow keys and press Enter. Focus (where keyboard input goes) returns to where it was, and then the command runs.",
  anatomy: [
    {
      part: 'Dialog',
      description: "Named 'Command palette', with the name hidden from view. Drawn on surface.base with the corner crosshair.",
    },
    { part: 'Search field', description: 'A combobox, a text field tied to a list of choices. Focus stays here the whole time.' },
    { part: 'Listbox', description: "Named 'Commands'. It's not there at all when nothing matches." },
    { part: 'Group', description: 'Named by its heading.' },
    { part: 'Option', description: "The active one gets the fill, and the search field points to it as its active descendant, so screen readers announce it while focus stays in the field." },
    { part: 'Count', description: "A status line hidden from view but read by screen readers: '2 commands'." },
    { part: 'Shortcut hint', description: "A Kbd that's hidden from assistive technology (screen readers and similar tools). It's for display only." },
  ],
  props: [
    { name: 'commands', type: 'Command[]', description: 'Required. Each has id, label, group, keywords, shortcut, icon and onSelect.' },
    { name: 'open', type: 'boolean', description: 'Open state when controlled, meaning your code decides whether it is open.' },
    { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Starting open state when uncontrolled, meaning the palette keeps track of it itself.' },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      description:
        "Called on every open and close, including Escape and a click on the scrim (the dimmed backdrop). If you refuse the close, the chosen command stays ready to run until the user does anything else in the palette. Closing it yourself later counts as accepting it.",
    },
    {
      name: 'shortcut',
      type: 'boolean',
      default: 'true',
      description: 'Ctrl+K or Cmd+K opens and closes the palette from anywhere.',
    },
    { name: 'label', type: 'string', default: "'Command palette'", description: "The dialog's accessible name (what a screen reader announces), hidden from view." },
    { name: 'searchLabel', type: 'string', default: "'Search commands'", description: "The search field's accessible name." },
    { name: 'placeholder', type: 'string', default: "'Type a command or search'", description: 'Shown in the empty search field.' },
    { name: 'emptyMessage', type: 'string', default: "'No matching commands'", description: 'Shown when nothing matches the search.' },
    { name: 'ref', type: 'Ref<HTMLInputElement>', description: 'The search field, while the palette is open.' },
  ],
  keyboard: [
    { keys: ['Ctrl', 'K'], does: 'Opens or closes it from anywhere on the page (Cmd+K on macOS).' },
    { keys: ['↓'], does: 'Next command, wrapping round to the first.' },
    { keys: ['↑'], does: 'Previous command, wrapping round to the last.' },
    { keys: ['Home'], does: 'First command.' },
    { keys: ['End'], does: 'Last command.' },
    { keys: ['Enter'], does: 'Runs the active command.' },
    { keys: ['Esc'], does: 'Closes without running anything.' },
  ],
  useWhen: 'Every action in one place behind Ctrl+K, with a visible button that opens it too.',
  notFor: 'Searching page content: use Search. A few actions on one control: use DropdownMenu.',
  dos: [
    "Name commands as verbs: 'Go to orders', 'New shipment'.",
    'Add keywords for the words people actually type.',
    "Give it a visible button that opens it too. People won't find a shortcut on its own.",
  ],
  donts: [
    "Don't put destructive commands in it without a dialog that asks for confirmation.",
    "Don't show a shortcut hint the app doesn't actually set up.",
    "Don't put more than one palette on a page. Each one listens for the same Ctrl+K/Cmd+K across the whole page, so a second one fights the first for the shortcut.",
  ],
}
