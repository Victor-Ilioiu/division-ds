import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'KanbanBoard',
  title: 'Kanban board',
  tier: 'organisms',
  slug: 'kanban-board',
  summary:
    "Cards in columns that people move between stages: by dragging with a pointer, by dragging with the keyboard, or from each card's Move menu. Columns can carry a colour and a card limit and, when you turn it on, people add, edit, delete and reorder them, and switch to a table of the same cards. It's controlled, meaning the board reports each change and the parent updates its columns and items.",
  useWhen: 'Work items that move through a few named stages, where the point is seeing every stage at once.',
  notFor: 'Records compared across many fields: use DataTable. A single ordered sequence: use Stepper.',
  requires: [
    'A parent that holds items in state and applies each onMove (applyKanbanMove does the update).',
    'For column changes, a parent that holds columns in state too and saves each change (applyKanbanColumnMove, applyKanbanColumnAdd and applyKanbanColumnDelete do the updates).',
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
    {
      wrong: 'onColumnDelete={id => setColumns(cs => cs.filter(c => c.id !== id))}',
      right: 'onColumnDelete={(id, moveTo) => { setColumns(cs => cs.filter(c => c.id !== id)); setItems(items => applyKanbanColumnDelete(items, id, moveTo, accessors)) }}',
      why: "The confirm asks where the column's cards go. If the parent drops only the column, its cards are left pointing at a column that no longer exists, and they vanish from the board.",
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
      description: 'A crosshair frame: the title as a monospaced heading with its meta on the right, then the cards as a list named by the title. With header buttons, the meta and the card limit move to a second line in every column, so the cards still start at the same height.',
    },
    {
      part: 'Column colour',
      description: "A category colour. The title takes its text token, and the colour's fill is laid over the column at 8% and over each card in it at 4% more (KANBAN_TINT). Every text token a card uses keeps AA contrast on it in both themes, except text.muted, which a card on a coloured column does not use.",
    },
    {
      part: 'Header buttons',
      description: 'Add a column after this one (with onColumnAdd), and the More button, named "<title> column options". Its menu holds Edit, Move left, Move right and Delete, each only when its callback is passed.',
    },
    {
      part: 'Card limit',
      description: 'With limit set, "Limit 2/3" under the title, read out as a sentence. Past the limit it says "Over limit" in the warning tone, with an icon. A move past the limit is never blocked.',
    },
    {
      part: 'Column dialog',
      description: 'A Dialog with Name, Colour and Card limit, for a new column and for Edit. Delete is an AlertDialog that, for a column with cards, asks which column they move to, or whether they go with it.',
    },
    {
      part: 'Add card',
      description: 'With onAddCard, a ghost button at the foot of each column, named "Add card to <title>".',
    },
    {
      part: 'View switch',
      description: "With tableColumns, a SegmentedControl named View above the board: Board or Table. The table is a DataTable of the same cards, plus a Status column of the board's own that holds each card's column as a Select.",
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
    {
      part: 'Lifted column',
      description: 'With onColumnMove, a press on a column header lifts the whole column, cards and all, with the same signal border and dashed outline. The other columns make room as it passes.',
    },
  ],
  props: [
    { name: 'label', type: 'string', description: "Required. Names the board's region." },
    {
      name: 'columns',
      type: 'readonly KanbanColumn[]',
      description: 'Required. { id, title, meta?, color?, limit? }, in display order. color is a category colour (the same names as Badge color). limit is the most cards the column should hold.',
    },
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
      name: 'renderCardMenu',
      type: '(item: T, moveTo: (columnId: string) => void, columnId: string) => ReactNode',
      description:
        "Replaces the Move menu's default items (the card's name and a Move to item for each other column) with your own DropdownMenu parts, such as View, Edit or Delete. They go inside the board's menu. Call moveTo(columnId) to move the card the way the default menu does: to the end of that column, with onMove, the announcement and focus back on the Move control. columnId is the card's current column.",
    },
    {
      name: 'onMove',
      type: '(itemId: string, toColumnId: string, toIndex: number) => void',
      description: "Required. Called once per move. toIndex is the card's position in the destination column after the move. A move from the menu puts it last.",
    },
    {
      name: 'onColumnMove',
      type: '(columnId: string, toIndex: number) => void',
      description: "Turns on moving columns: a drag on the column's header, and Move left / Move right in its menu. toIndex is the column's place after the move.",
    },
    {
      name: 'onColumnAdd',
      type: '(afterColumnId: string | null, draft: KanbanColumnDraft) => void',
      description: 'Turns on the Add column button in each header, which asks for a name, a colour and a card limit. Make the id yourself and insert the column after afterColumnId. It is null on a board with no columns, which shows one Add column button instead.',
    },
    {
      name: 'onColumnEdit',
      type: '(columnId: string, draft: KanbanColumnDraft) => void',
      description: "Turns on Edit in each column's menu: the same dialog, filled in. draft is { title, color?, limit? }.",
    },
    {
      name: 'onColumnDelete',
      type: '(columnId: string, moveCardsTo: string | null) => void',
      description: "Turns on Delete in each column's menu. An AlertDialog asks first, and for a column with cards, where they go: moveCardsTo is that column's id, or null when they go with it.",
    },
    {
      name: 'onAddCard',
      type: '(columnId: string) => void',
      description: 'Turns on an Add card button at the foot of each column. Make the card in that column, or open your own form for it.',
    },
    { name: 'addCardLabel', type: 'string', default: "'Add card'", description: "The Add card button's words. The column's title is added for screen readers." },
    {
      name: 'tableColumns',
      type: 'readonly DataTableColumn<T>[]',
      description: "Turns on the table view and its Board / Table switch. The same column shape as DataTable's: { key, header, cell, sortValue?, numeric? }.",
    },
    { name: 'tableRowHeader', type: 'string', default: 'the first table column', description: 'The key of the table column that heads each row.' },
    { name: 'statusLabel', type: 'string', default: "'Status'", description: "The header of the table's own column, which holds each card's column." },
    { name: 'view', type: "'board' | 'table'", description: 'The view, when your code controls it. Pass it with onViewChange.' },
    { name: 'defaultView', type: "'board' | 'table'", default: "'board'", description: 'The view it starts in, when the board keeps track of it itself.' },
    { name: 'onViewChange', type: "(view: 'board' | 'table') => void", description: 'Called when someone switches the view.' },
    { name: 'emptyColumnMessage', type: 'string', default: "'Nothing here'", description: 'Shown in a column with no cards, and in an empty table.' },
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
    {
      name: 'applyKanbanColumnMove()',
      type: '(columns, columnId, toIndex) => columns',
      description: "The parent's half of onColumnMove: the columns with that one at toIndex.",
    },
    {
      name: 'applyKanbanColumnAdd()',
      type: '(columns, afterColumnId, column) => columns',
      description: "The parent's half of onColumnAdd: the columns with the new one after afterColumnId, or first when that's null.",
    },
    {
      name: 'applyKanbanColumnDelete()',
      type: '(items, columnId, moveCardsTo, { getColumnId, setColumnId }) => T[]',
      description: "The items half of onColumnDelete: the column's cards moved to the end of moveCardsTo, or removed when it's null. Remove the column from columns yourself.",
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves through each card's own link or button, then its Move control." },
    { keys: ['Enter'], does: 'On a Move control, opens the menu of the other columns. On a menu item, moves the card to the end of that column. While a card is lifted, drops it.' },
    { keys: ['Space'], does: 'On a Move control, lifts the card. While it is lifted, Space drops it.' },
    { keys: ['↑', '↓', '←', '→'], does: 'While a card is lifted, move it between places in a column and between columns.' },
    { keys: ['Escape'], does: 'While a card is lifted, puts it back where it was (Tab does the same). In the menu, closes it.' },
    {
      keys: ['Enter', 'Space'],
      does: "On a column's More button, opens its menu: Edit, Move left, Move right and Delete. Columns move from this menu, so they need no keyboard drag, and focus stays on the moved column's More button.",
    },
  ],
  dos: [
    'Name each card with getItemLabel in words a screen reader listener can tell apart: the candidate, not "Card 3".',
    "Put a count or a total in each column's meta, so people can see a column's size without counting.",
    'Keep it to the stages of one process, three to six columns.',
    'Apply onMove with applyKanbanMove, or with anything that leaves the card at toIndex in its new column.',
    'Save every column change as it happens (order, name, colour, limit). The board has no Save button of its own.',
    'Set a card limit on the columns where work piles up, such as In progress or Review.',
  ],
  donts: [
    "Don't make the card body a link from edge to edge. Put one link on the card's name.",
    "Don't write instructions that only mention dragging. The Move menu is the way to move a card without dragging.",
    "Don't reorder items inside renderCard or around the board. The order in items is the order shown.",
    "Don't use text.muted on a card in a coloured column. In dark theme it drops under 4.5:1 there, so use text.secondary.",
    "Don't let a column colour carry the meaning. It groups, the way a category colour does, and the title still has to say what the stage is.",
  ],
}
