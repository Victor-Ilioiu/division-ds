import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'SectionHeading',
  title: 'Section heading',
  tier: 'molecules',
  slug: 'section-heading',
  summary:
    "The heading that opens a section of a page: a title under a hairline, with an optional description and an optional action. The page tells it which heading level to use, because only the page knows its own outline.",
  anatomy: [
    {
      part: 'Rule',
      description: 'A hairline along the top, in border.hairline-strong. It marks where the section starts.',
    },
    {
      part: 'Index',
      description:
        "Optional. A two-digit number in monospace type, on its own line above the title, and aria-hidden so screen readers skip it. The leading zero is in numeral.pad and the digit in accent.signal.text. It sits above the title, not in front, so the title keeps the same left edge as its description and its section.",
    },
    {
      part: 'Title',
      description:
        'The heading element, h2 to h4 (heading levels 2 to 4). Oxanium, uppercase, 20px (pixels), going up to 24px when the heading has 42rem or more of width.',
    },
    { part: 'Description', description: 'Optional. Body text in text.secondary, at most 60 characters a line.' },
    {
      part: 'Action',
      description: "Optional. One control at the far end of the row. It drops under the text when there isn't room.",
    },
  ],
  props: [
    { name: 'title', type: 'string', description: 'Required. The heading text.' },
    {
      name: 'level',
      type: '2 | 3 | 4',
      description:
        "Required, with no default. The heading level the page outline needs at this point. Leave it out and the code won't compile.",
    },
    { name: 'description', type: 'ReactNode', description: 'One or two sentences under the title.' },
    {
      name: 'action',
      type: 'ReactNode',
      description: 'A single control at the end of the row, usually a link to the full list.',
    },
    {
      name: 'index',
      type: 'number',
      description: "The section's position in a numbered run of sections, drawn above the title. It's decoration and never part of the heading's name.",
    },
    {
      name: 'id',
      type: 'string',
      description:
        'Goes on the heading element, not the wrapper, so a section can point aria-labelledby at it (that\'s how the section gets its name for screen readers).',
    },
    { name: 'className', type: 'string', description: 'Added to the root. Where Tailwind utility classes clash, the later one wins.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root element.' },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: "Moves to the action, if there is one. The heading itself isn't a Tab stop.",
    },
  ],
  useWhen: 'Opening a section of a page, at the level that carries on the outline.',
  notFor: 'The page title: use PageHeader.',
  dos: [
    'Pass the level that carries on the page outline: h2 under the page h1, h3 inside an h2 section.',
    'Give the heading an id and point the section at it with aria-labelledby, so the region has a name.',
    'Name the action after where it goes: "All replicas", not "View all" four times on one page.',
    'Number every section in a run, or none of them.',
  ],
  donts: [
    "Don't use it as the page title. A page has one h1, and that isn't a section opener.",
    "Don't pick a level for its size. The size is the same at every level; the level is about the outline.",
    "Don't put more than one control in the action slot. A second one belongs in the section body.",
    "Don't stack one straight under another. A section heading opens content, not a second heading.",
  ],
}
