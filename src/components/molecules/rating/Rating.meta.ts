import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Rating',
  title: 'Rating',
  tier: 'molecules',
  slug: 'rating',
  summary:
    "A score out of five, either shown or collected. The display is one image that a screen reader reads as one sentence. The input is a radio group, because picking a rating means picking one value.",
  anatomy: [
    {
      part: 'Rating',
      description: 'Has role=img and the name "4.5 out of 5", so a screen reader treats it as one picture. The stars are aria-hidden (screen readers skip them).',
    },
    {
      part: 'Star',
      description:
        'Full, half or empty. Filled ones use the signal colour; empty ones are a border.selection outline.',
    },
    {
      part: 'Value',
      description: "An optional printed number. It's aria-hidden because the name already says it.",
    },
    {
      part: 'RatingInput',
      description:
        'A radiogroup named by label, built straight on Radix RadioGroup (Radix is the library of ' +
        'unstyled, accessible building blocks this system uses) instead of the Radio atom. Radio ' +
        'draws a 20px (pixel) square box with a filled inner square to show it\'s selected, and a ' +
        'star can\'t be drawn inside a square without either cropping it or leaving the box empty ' +
        'around it.',
    },
    { part: 'Star option', description: 'A 28px radio named "3 stars".' },
  ],
  props: [
    { name: 'value (Rating)', type: 'number', description: 'From 0 up to max, rounded to the nearest half for both the drawing and what screen readers say.' },
    { name: 'max (Rating)', type: 'number', default: '5', description: 'Number of stars.' },
    { name: 'label (Rating)', type: 'string', description: 'What is being rated, read out as "<label> rated 4.5 out of 5".' },
    { name: 'showValue (Rating)', type: 'boolean', default: 'false', description: 'Prints the rounded value beside the stars, aria-hidden.' },
    { name: 'size (Rating)', type: "'sm' | 'md'", default: "'md'", description: 'Star size.' },
    { name: 'className (Rating)', type: 'string', description: 'Combined with the root classes. Where Tailwind utility classes clash, the later one wins.' },
    { name: 'ref (Rating)', type: 'Ref<HTMLSpanElement>', description: 'Passed through to the root span.' },
    { name: 'label (RatingInput)', type: 'string', description: 'Required. The radiogroup\'s name, for example "Rate the Prism holo sight".' },
    { name: 'value (RatingInput)', type: 'number', description: 'The selected value, when your page holds it (controlled).' },
    { name: 'defaultValue (RatingInput)', type: 'number', description: 'Starting value when the component holds it itself (uncontrolled).' },
    { name: 'onValueChange (RatingInput)', type: '(value: number) => void', description: 'Fires when a star is picked by click or arrow key.' },
    { name: 'max (RatingInput)', type: 'number', default: '5', description: 'Number of stars.' },
    { name: 'disabled (RatingInput)', type: 'boolean', description: 'Disables every star.' },
    { name: 'className (RatingInput)', type: 'string', description: 'Combined with the root classes.' },
    { name: 'ref (RatingInput)', type: 'Ref<HTMLDivElement>', description: 'Passed through to the Radix radiogroup root. It\'s built straight on that, not on the Radio atom: see the anatomy row above.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves into the group, onto the selected star, or the first one.' },
    {
      keys: ['←', '↑', '→', '↓'],
      does:
        'One star less (Left or Up) or more (Right or Down), selecting as it goes. It wraps round: ' +
        'past the last star goes to the first, and past the first goes to the last.',
    },
    { keys: ['Space'], does: 'Selects the focused star.' },
  ],
  useWhen: 'Showing or collecting a score out of five.',
  notFor: "Anything that isn't a rating, such as a difficulty grade.",
  dos: [
    'Name what is rated in the display\'s label when the surrounding page doesn\'t.',
    'Show the number of reviews next to the stars: "4.5 (212)".',
    'Label an input with the action: "Rate the Prism holo sight".',
  ],
  donts: [
    "Don't use more than five stars.",
    "Don't let hovering over a star select anything.",
    "Don't use stars for anything that isn't a rating, such as a difficulty grade.",
  ],
}
