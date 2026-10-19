import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'KanbanBoard',
  title: 'Kanban board',
  tier: 'organisms',
  slug: 'kanban-board',
  summary:
    "Cards in columns that people move between stages: by dragging with a pointer, by dragging with the keyboard, or from each card's Move menu. It's controlled, meaning the board reports a move and the parent updates its items.",
  useWhen: 'Work items that move through a few named stages, where the point is seeing every stage at once.',
  notFor: 'Records compared across many fields: use DataTable. A single ordered sequence: use Stepper.',
  requires: [
    'A parent that holds items in state and applies each onMove (applyKanbanMove does the update).',
  ],
  pitfalls: [
    {
      wrong: 'onMove={() => {}}  // items never change',
      right: 'onMove={(id, column, index) => setItems(items => applyKanbanMove(items, id, column, index, accessors))}',
      why: "The board is controlled. If the parent doesn't apply a move, the card snaps back where it was.",
    },
    {
      wrong: 'renderCard={job => <a href={job.url} className="block p-3">...</a>}',
      right: 'renderCard={job => <><a href={job.url}>{job.title}</a><p>{job.team}</p></>}',
      why: 'The board draws the frame and the Move control. A link wrapped around the whole body would swallow the drag and put controls inside each other.',
    },
  ],
  anatomy: [
    { part: 'Region', description: 'A section named by label that holds the board.' },
    {
      part: 'Scroll track',
      description: "Scrolls the columns sideways on a narrow screen. The page never scrolls sideways. Each column is at least 18rem wide (rem is a unit tied to the base font size), so a title, a count and a six-figure total stay on one line, and the cards in every column start at the same height.",
    },
    {
      part: 'Column',
      description: 'A crosshair frame: the title as a monospaced heading with its meta on the right, then the cards as a list named by the title.',
    },
    { part: 'Card', description: 'A panel with the body from renderCard. Down its right edge are the Move control at the top and the renderCardCorner mark, if there is one, in the bottom corner.' },
    {
      part: 'Move control',
      description: 'An IconButton named "Move <label>". Enter or a click opens the menu of other columns. Space lifts the card for a keyboard drag.',
    },
    { part: 'Empty column', description: "A dashed box with emptyColumnMessage. It's where you drop a card into an empty column." },
    {
      part: 'Lifted card',
      description: 'The copy being dragged, with a 2px (pixel) signal border, over a dashed outline showing where the card will land.',
    },
  ],
  props: [
    { name: 'label', type: 'string', description: "Required. Names the board's region." },
    { name: 'columns', type: 'readonly KanbanColumn[]', description: 'Required. { id, title, meta? }, in display order.' },
    { name: 'items', type: 'readonly T[]', description: "Required. Every card. A column shows its items in this array's order." },
    { name: 'getItemId', type: '(item: T) => string', description: 'Required.' },
    { name: 'getColumnId', type: '(item: T) => string', description: "Required. The id of the item's column." },
    {
      name: 'getItemLabel',
      type: '(item: T) => string',
      description: 'Required. The card in plain words. The Move control, its menu and every screen reader announcement use it.',
    },
    {
      name: 'renderCard',
      type: '(item: T) => ReactNode',
      description: "Required. The card's body. It can hold one link or button. The board draws the frame.",
    },
    {
      name: 'renderCardCorner',
      type: '(item: T) => ReactNode',
      description: "A small mark in the card's bottom-right corner, under the Move control, about 2rem square, such as the owner's avatar. Wrap it in aria-hidden (so screen readers skip it) when the card already prints the same name.",
    },
    {
      name: 'onMove',
      type: '(itemId: string, toColumnId: string, toIndex: number) => void',
      description: "Required. Called once per move. toIndex is the card's position in the destination column after the move. A move from the menu puts it last.",
    },
    { name: 'emptyColumnMessage', type: 'string', default: "'Nothing here'", description: 'Shown in a column with no cards.' },
    {
      name: 'columnHeadingLevel',
      type: '2 | 3 | 4',
      default: '3',
      description: "The heading level of the column titles. Pick one that sits under the page's own heading outline.",
    },
    { name: 'className', type: 'string', description: 'Goes on the region.' },
    {
      name: 'applyKanbanMove()',
      type: '(items, itemId, toColumnId, toIndex, { getItemId, getColumnId, setColumnId }) => T[]',
      description: "The parent's half of onMove. It returns a new items array with the card in its new column and place.",
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves through each card's own link or button, then its Move control." },
    { keys: ['Enter'], does: 'On a Move control, opens the menu of the other columns. On a menu item, moves the card to the end of that column. While a card is lifted, drops it.' },
    { keys: ['Space'], does: 'On a Move control, lifts the card. While it is lifted, Space drops it.' },
    { keys: ['↑', '↓', '←', '→'], does: 'While a card is lifted, move it between places in a column and between columns.' },
    { keys: ['Escape'], does: 'While a card is lifted, puts it back where it was (Tab does the same). In the menu, closes it.' },
  ],
  dos: [
    'Name each card with getItemLabel in words a screen reader listener can tell apart: the candidate, not "Card 3".',
    "Put a count or a total in each column's meta, so people can see a column's size without counting.",
    'Keep it to the stages of one process, three to six columns.',
    'Apply onMove with applyKanbanMove, or with anything that leaves the card at toIndex in its new column.',
  ],
  donts: [
    "Don't make the card body a link from edge to edge. Put one link on the card's name.",
    "Don't write instructions that only mention dragging. The Move menu is the way to move a card without dragging.",
    "Don't reorder items inside renderCard or around the board. The order in items is the order shown.",
  ],
}
