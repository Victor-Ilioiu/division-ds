import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ListItem',
  title: 'List item',
  tier: 'molecules',
  slug: 'list-item',
  summary:
    'One row of a list: something at the start (a picture or icon), a title and description, extra details on the right, and actions at the end. A row that goes somewhere is one real link or button stretched over the whole row. Its actions sit beside it, never inside it.',
  requires: ['A <List> around the rows (a ul with role="list"), or as="div" on a row that stands alone.'],
  pitfalls: [
    {
      wrong: '<li onClick={open}>…<Button>Remove</Button></li>',
      right: '<ListItem title="Ilse Varga" onActivate={open} actions={<Button>Remove</Button>} />',
      why: 'A clickable li isn\'t a control. It can\'t take keyboard focus, and screen readers read it as plain text. onActivate (or href) turns the title into a real button (or link) that covers the row, and Remove keeps its own tab stop.',
    },
    {
      wrong: '<a href="/orders/1"><ListItem title="Order shipped" actions={<Button>Archive</Button>} /></a>',
      right: '<ListItem title="Order shipped" href="/orders/1" actions={<Button>Archive</Button>} />',
      why: 'A button inside a link is invalid HTML, and screen readers announce the two as one merged control. href stretches the link over the row without wrapping the actions.',
    },
  ],
  anatomy: [
    { part: 'List', description: 'A ul with role="list" written out, so screen readers announce how many items there are even without bullets. Thin dividers between rows by default.' },
    { part: 'Media', description: 'Optional, at the start: an Avatar, an icon, a thumbnail. Centred against the text.' },
    {
      part: 'Title and description',
      description:
        'The title is primary text, semibold. With href or onActivate it becomes the row’s one link or button, stretched over the row and underlined on hover. The description is secondary text, 14px (pixels).',
    },
    { part: 'Meta', description: 'Optional, right-aligned monospaced text with tabular figures (digits all the same width, so numbers line up): a time, a price, a count.' },
    {
      part: 'Actions',
      description:
        'Optional controls at the end, layered above the stretched link, each with its own tab stop. On a narrow screen, meta and actions wrap under the text.',
    },
  ],
  props: [
    { name: 'title', type: 'ReactNode', description: 'Required. The main line, and the name screen readers give the row’s link or button.' },
    { name: 'description', type: 'ReactNode', description: 'A second line under the title, in secondary text.' },
    { name: 'media', type: 'ReactNode', description: 'Something at the start of the row: an Avatar, an icon (hidden from screen readers with aria-hidden), a thumbnail.' },
    { name: 'meta', type: 'ReactNode', description: 'Right-aligned monospaced text: a time, a price, a count.' },
    { name: 'actions', type: 'ReactNode', description: 'Controls at the end. Each one can still be focused and clicked on its own.' },
    { name: 'href', type: 'string', description: 'Makes the row one link to this address, named by the title.' },
    {
      name: 'renderLink',
      type: '(props: LinkRenderProps) => ReactNode',
      default: 'a plain <a>',
      description: 'Draws the row link when href is set. Pass your router\'s link here. It has to pass className through.',
    },
    { name: 'onActivate', type: '() => void', description: 'Makes the row one button, named by the title. Ignored when href is set.' },
    { name: 'as', type: "'li' | 'div'", default: "'li'", description: 'li inside a List. div for a row on its own.' },
    { name: 'dividers (List)', type: 'boolean', default: 'true', description: 'A thin line between rows.' },
    { name: 'className', type: 'string', description: 'Extra CSS classes, merged with the outer element\'s own classes on List or ListItem.' },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Passed through to the ul (List) or the row element (ListItem).' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to the row’s link or button, then to each of its actions, then to the next row.' },
    { keys: ['Enter'], does: 'Follows the row’s link, or presses its button.' },
    { keys: ['Space'], does: 'Presses the row’s button (a link row ignores Space, like any link).' },
  ],
  useWhen: 'A row people scan in a List: media, a title, meta and one or two actions.',
  notFor: 'Data in a table that people compare across columns: use DataTable.',
  dos: [
    'Put rows in a List, and give the List an aria-label (a name only screen readers hear) when no heading names it.',
    'Use href when the row opens a page, and onActivate when it does something right there.',
    'Keep actions to one or two. Put the rest in a DropdownMenu.',
    'When an action repeats on every row, name it after its row ("Sign out of Chrome on Windows"), with aria-label or the IconButton label.',
  ],
  donts: [
    "Don't make a row clickable with onClick on the row. Use href or onActivate.",
    "Don't wrap a ListItem in a link or a button.",
    "Don't use it for data people compare across columns. That's what DataTable is for.",
    "Don't put long paragraphs in description. People scan a row, they don't read it.",
  ],
}
