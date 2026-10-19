import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Stat',
  title: 'Stat',
  tier: 'molecules',
  slug: 'stat',
  summary:
    'One number that matters, and how it has moved. The number is the star of the show. The label is small, set in a monospaced font and kept quiet.',
  anatomy: [
    { part: 'Label', description: 'A dt (the "term" element of an HTML description list), in text.secondary.' },
    { part: 'Value', description: 'A dd (the matching "description" element) at 36px (pixels), set in Oxanium with tabular figures, so every digit is the same width.' },
    {
      part: 'Pad',
      description:
        'Optional leading zeros in numeral.pad. They\'re aria-hidden, so screen readers skip them, and they only appear when the width is real.',
    },
    { part: 'Unit', description: 'A short suffix beside the value, for example kg.' },
    {
      part: 'Delta',
      description:
        'The change. An arrow shows the direction, colour shows whether it\'s good or bad, and a spoken sentence says both for screen reader users.',
    },
  ],
  props: [
    { name: 'label', type: 'string', description: "The stat's name, for example \"Kits dispatched\"." },
    {
      name: 'value',
      type: 'number | string',
      description: 'Whole numbers get padded. Anything else (for example "4.2k") is shown exactly as given.',
    },
    { name: 'unit', type: 'string', description: 'Shown beside the value, for example "kg".' },
    {
      name: 'padTo',
      type: 'number',
      description: 'Pads a whole-number value to this many digits with dimmed zeros that screen readers skip (aria-hidden).',
    },
    {
      name: 'delta',
      type: '{ value: string; direction: \'up\' | \'down\'; sentiment: \'positive\' | \'negative\' | \'neutral\'; period: string }',
      description:
        'value comes already formatted (for example "12%"). direction picks the arrow. sentiment picks the colour, and it doesn\'t depend on direction: fewer failed syncs is down, and that\'s positive. period is what the number is compared with, for example "last week". It\'s both shown and spoken.',
    },
    {
      name: 'className',
      type: 'string',
      description: 'Merged with the root classes. If two Tailwind utilities clash, the later one wins.',
    },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root div.' },
    { name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'Any standard div attribute, applied to the root div.' },
  ],
  keyboard: [],
  useWhen: 'One headline number and how it has moved. Up to four in a row.',
  notFor: 'A value that only makes sense as a chart: use ChartPanel.',
  dos: [
    'Lay several Stats out in a plain div grid. Each one renders its own dl (description list), so you don\'t need a list element around them.',
    'Set sentiment by what the change means, not by its direction: fewer failed syncs is down, and that\'s positive.',
    'Say what the delta is compared with.',
    'Only pad when every value in a row has the same fixed width.',
  ],
  donts: [
    "Don't pad a value whose width isn't fixed. The zeros would be made up.",
    "Don't put more than four stats in a row.",
    "Don't use a Stat for a value that only makes sense as a chart.",
  ],
}
