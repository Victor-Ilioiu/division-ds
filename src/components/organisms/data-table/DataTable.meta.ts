import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'DataTable',
  title: 'Data table',
  tier: 'organisms',
  slug: 'data-table',
  summary:
    "Rows of records that people read, compare and sort. It's a real HTML table with a caption, column and row headers, and sortable columns. When there's a job to do, each row gets a checkbox.",
  anatomy: [
    { part: 'Caption', description: "Names the table and its scroll region. You can hide it visually and it still works for screen readers." },
    { part: 'Scroll region', description: 'It can take keyboard focus, so a wide table scrolls from the keyboard.' },
    {
      part: 'Column header',
      description: "A sort button when the column sorts. The sorted column carries aria-sort, an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers which way it's sorted.",
    },
    { part: 'Row header', description: "The cell from the rowHeader column. It names its row." },
    {
      part: 'Selection',
      description: "A checkbox per row, one to select all, and a count above the table. Selected rows don't get a tint.",
    },
    { part: 'Empty', description: 'One cell that spans every column.' },
  ],
  props: [
    { name: 'caption', type: 'string', description: "Required. Names the table and its scroll region." },
    { name: 'hideCaption', type: 'boolean', default: 'false', description: "Hides the caption visually. It still names the table and its scroll region for screen readers." },
    {
      name: 'columns',
      type: 'DataTableColumn<Row>[]',
      description: 'Required. Each column has key, header, cell, sortValue and numeric.',
    },
    { name: 'rows', type: 'readonly Row[]', description: 'Required.' },
    { name: 'getRowId', type: '(row: Row) => string', description: 'Required.' },
    {
      name: 'rowHeader',
      type: 'string',
      description: 'Required. The key of the column that heads each row.',
    },
    { name: 'defaultSort', type: 'DataTableSort', description: "Starts the table sorted. Uncontrolled: the table keeps track of the sort itself after that." },
    {
      name: 'sort',
      type: 'DataTableSort',
      description: "Controlled sort, meaning your code holds the sort and passes it in. Set it together with onSortChange. A header click then only reports the next sort.",
    },
    {
      name: 'onSortChange',
      type: '(sort: DataTableSort) => void',
      description: 'Called with the next sort on every header click, whether sort is controlled or not.',
    },
    { name: 'emptyMessage', type: 'ReactNode', default: "'Nothing to show.'", description: 'Shown across every column when rows is empty.' },
    { name: 'selectable', type: 'boolean', default: 'false', description: 'Turns on the checkbox column.' },
    {
      name: 'rowLabel',
      type: '(row: Row) => string',
      description: "Required when selectable. Gives each row's checkbox its name.",
    },
    { name: 'selected', type: 'ReadonlySet<string>', description: 'Controlled selection (your code holds it), keyed by getRowId.' },
    { name: 'defaultSelected', type: 'Iterable<string>', description: "The starting selection when it's uncontrolled (the table holds it)." },
    {
      name: 'onSelectedChange',
      type: '(selected: Set<string>) => void',
      description: 'Called with the next selection on every change.',
    },
    { name: 'className', type: 'string', description: 'Goes on the table element.' },
    { name: 'ref', type: 'Ref<HTMLTableElement>', description: 'Points at the table element.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to the scroll region, then to each sort button and checkbox in order.' },
    { keys: ['Enter'], does: 'Sorts by that column, or flips its direction.' },
    { keys: ['Space'], does: 'Sorts, or ticks a checkbox.' },
    { keys: ['←', '→'], does: 'Scroll the region sideways while it has focus.' },
  ],
  useWhen: 'Records people read, compare and sort across columns, with optional bulk selection.',
  notFor: 'A list people scan row by row: use ListItem. A form in every cell.',
  dos: [
    'Right-align numbers and mark their column as numeric.',
    'Say how many rows there are near the table, and put Pagination below it.',
    "Keep a bulk action's button a tab stop (a place the Tab key lands) while nothing is selected, and mark it aria-disabled so screen readers say it's unavailable.",
    "You can page or filter the rows freely. Select-all acts on the rows shown and keeps what was selected elsewhere, and the count says how many selected rows are out of view.",
  ],
  donts: [
    "Don't make every column sortable. Sort the ones people compare.",
    "Don't tint selected or hovered rows. The checkbox and the count already say it.",
    "Don't put a form in every cell. That's a different component.",
  ],
}
