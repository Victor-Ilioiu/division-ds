import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Tag',
  title: 'Tag',
  tier: 'atoms',
  slug: 'tag',
  summary:
    "A removable chip for filters and selections. Its dismiss button is named after the thing it removes, so a row of them doesn't sound like six identical 'Remove' buttons to a screen reader.",
  anatomy: [
    { part: 'Chip', description: "28px (pixels) tall. The cut corner, the border.hairline-strong edge and the sunken fill sit on a backing layer, not on the chip itself. That layer is aria-hidden, a setting that hides it from screen readers." },
    {
      part: 'Text',
      description: "Required, and a plain string, because the dismiss name is built from it.",
    },
    {
      part: 'Dismiss button',
      description:
        "A ghost IconButton at 24×24. That's the minimum target size in WCAG 2.2 (the Web Content Accessibility Guidelines, the public rulebook for making websites usable by people with disabilities). It only appears when onDismiss is given.",
    },
  ],
  props: [
    { name: 'children', type: 'string', description: 'The tag text. Required.' },
    {
      name: 'onDismiss',
      type: '() => void',
      description:
        "Adds the dismiss button. It runs once the tag has faded out, not on the click. Remove the tag from your list here, and the tags after it slide into its place (M7, a motion token). With reduced motion turned on, it runs at once.",
    },
    {
      name: 'dismissLabel',
      type: '(text: string) => string',
      default: 't => `Remove ${t}`',
      description: "Replaces the built dismiss name, for example with another verb or another language.",
    },
    { name: 'className', type: 'string', description: "Merged with the component's classes. Later Tailwind utilities (the small styling classes this system uses) win." },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Forwarded to the span element.' },
    { name: '...rest', type: "Omit<HTMLAttributes<HTMLSpanElement>, 'children'>", description: 'Every native span attribute except children, spread onto the root span.' },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: "Moves focus to the dismiss button, if there is one. The chip itself can't take focus.",
    },
    { keys: ['Enter'], does: 'Dismisses the tag.' },
    { keys: ['Space'], does: 'Dismisses the tag.' },
  ],
  useWhen: 'A removable chip, such as an active filter or a selected value.',
  notFor: 'A status. Use Badge.',
  dos: [
    'Keep the text short enough to read as a chip.',
    "Move focus somewhere sensible after a dismissal: to the next tag, or to the container if the row is now empty.",
    "Override dismissLabel when 'Remove' is the wrong verb, for example 'Clear filter'.",
  ],
  donts: [
    "Don't make the whole chip clickable as well as its dismiss button. Two targets in one chip leaves people guessing.",
    "Don't shrink the dismiss button below 24×24.",
    "Don't use a Tag for status. That's a Badge.",
    "Don't move the bevel from the backing layer onto the chip. A Tag can hold a dismiss button that takes focus, and clip-path (the CSS, or Cascading Style Sheets, property that cuts the corner) on the chip would clip that button's focus ring, the outline that shows keyboard focus, off the corner it sits in.",
  ],
}
