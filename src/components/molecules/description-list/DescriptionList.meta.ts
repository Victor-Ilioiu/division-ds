import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'DescriptionList',
  title: 'Description list',
  tier: 'molecules',
  slug: 'description-list',
  summary:
    'Pairs of a term and its value, all about one thing, in one to three columns. The columns drop away as the space they get narrows. It\'s a real dl (the HTML description list element): a label in a monospaced font over each value, and a thin line above each pair.',
  useWhen: 'The fixed fields of one record: serial, firmware, owner, dates.',
  notFor: 'Many records: use DataTable; one headline number: use Stat.',
  anatomy: [
    { part: 'Container', description: 'A div with @container (a container query), so the columns follow the width of this box, not of the screen.' },
    { part: 'List', description: 'A dl laid out as a grid: one column, two from 28rem wide, three from 42rem (as far as columns allows). A rem is the base text size, usually 16 pixels.' },
    { part: 'Pair', description: 'A div holding one dt (the term) and one dd (its value), with a thin line above.' },
    { part: 'Term', description: 'The dt, styled as a label: monospaced, uppercase, 11px (pixels).' },
    { part: 'Description', description: 'The dd, in body text. It holds text, a Badge or a Link.' },
  ],
  props: [
    { name: 'items', type: 'readonly DescriptionListItem[]', description: 'Required. The pairs, in the order people read them.' },
    { name: 'columns', type: '1 | 2 | 3', default: '1', description: 'How many columns at full width. It drops to one when the container is narrower than 28rem.' },
    { name: 'className', type: 'string', description: 'On the container.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Forwarded to the container.' },
    { name: 'term (DescriptionListItem)', type: 'string', description: 'Required. The field name: "Serial".' },
    { name: 'description (DescriptionListItem)', type: 'ReactNode', description: 'Required. Its value.' },
  ],
  keyboard: [{ keys: ['Tab'], does: 'Moves to any link or button inside a description.' }],
  dos: [
    'Order pairs the way someone reads the record: identity first, then state, then dates.',
    'Say "None" or "Not set" for an empty value rather than leaving the description blank.',
    'Use two or three columns only for short values; long text reads better in one.',
  ],
  donts: [
    "Don't use it for a list of records. That's what DataTable is for.",
    "Don't put a form field in a description. A record people can edit is a form.",
    "Don't repeat a term inside one list.",
  ],
}
