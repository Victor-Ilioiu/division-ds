import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Search',
  title: 'Search',
  tier: 'molecules',
  slug: 'search',
  summary:
    "A search field inside a search landmark (a region of the page that screen readers can jump straight to). Enter submits, Escape clears, and a one-key shortcut can move focus to it from anywhere on the page.",
  anatomy: [
    {
      part: 'Landmark',
      description:
        'A form with role=search, named by label, so people using a screen reader can jump to it.',
    },
    { part: 'Icon', description: "Decoration only. It's aria-hidden, so screen readers skip it." },
    {
      part: 'Field',
      description:
        "An Input of type search. The browser's own clear button is hidden, because you can't reach it with the keyboard.",
    },
    {
      part: 'Clear button',
      description: "Only shows while there's text. It puts focus back in the field.",
    },
    {
      part: 'Shortcut hint',
      description:
        "A Kbd (the keyboard-key badge), aria-hidden, and only shown while the field is empty. Screen readers get the shortcut from aria-keyshortcuts on the field instead.",
    },
  ],
  props: [
    {
      name: 'label',
      type: 'string',
      description: "Required. The name screen readers use for the field, and for the search landmark.",
    },
    { name: 'value', type: 'string', description: 'The value, when your page holds it (controlled).' },
    { name: 'defaultValue', type: 'string', default: "''", description: 'Starting value when the component holds it itself (uncontrolled).' },
    {
      name: 'onValueChange',
      type: '(value: string) => void',
      description: 'Called whenever the value changes, clearing included.',
    },
    {
      name: 'onSearch',
      type: '(query: string) => void',
      description: "Called on Enter with the value, spaces trimmed from both ends. It isn't called for an empty query.",
    },
    { name: 'placeholder', type: 'string', default: "'Search'", description: '' },
    {
      name: 'shortcut',
      type: 'string',
      description:
        'One printable key, for example "/". It moves focus to the field from anywhere on the page, except while someone is typing in another text field. While the field is empty, it shows as a Kbd hint.',
    },
    { name: 'inputSize', type: "'sm' | 'md' | 'lg'", default: "'md'", description: '' },
    {
      name: 'className',
      type: 'string',
      description: 'Combined with the root classes. Where Tailwind utility classes clash, the later one wins.',
    },
    { name: 'ref', type: 'Ref<HTMLInputElement>', description: 'Passed through to the input element.' },
  ],
  keyboard: [
    { keys: ['Enter'], does: 'Submits the query, spaces trimmed.' },
    { keys: ['Escape'], does: 'Clears the field.' },
    {
      keys: ['/'],
      does: "Moves focus to the field, unless another text field has focus. It works for whichever key the shortcut prop names.",
    },
    { keys: ['Tab'], does: 'Moves between the field and the clear button.' },
  ],
  useWhen: 'Searching the content of the page that shows the results, inside a search landmark.',
  notFor: 'Suggestions that appear as you type, or jumping to an action: use CommandPalette.',
  dos: [
    "Name what's being searched: 'Search the catalogue', not 'Search'.",
    "Pick a shortcut that isn't a letter people type in forms; '/' is the usual one.",
    'Keep results on the page that owns the search, not in a popup under the field.',
  ],
  donts: [
    "Don't add suggestions that appear as you type. That's the command palette's job, and it has a listbox built for it.",
    "Don't search on every keystroke without saying so. Results that shift while someone types are hard to follow with a screen reader.",
    "Don't put two search landmarks on one page without giving them different labels.",
  ],
}
