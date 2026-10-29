# KanbanBoard

> Cards in columns that people move between stages: by dragging with a pointer, by dragging with the keyboard, or from each card's Move menu. It's controlled, meaning the board reports a move and the parent updates its items.

- **Best for:** Work items that move through a few named stages, where the point is seeing every stage at once.
- **Not for:** Records compared across many fields: use DataTable. A single ordered sequence: use Stepper.
- Organism. Source: `src/components/organisms/kanban-board/KanbanBoard.tsx`
- Rendered docs page: `/components/kanban-board`

## Import

```tsx
import { KanbanBoard, applyKanbanMove, groupKanbanItems, kanbanDragOver, kanbanDrop, kanbanMessages, kanbanPosition } from 'src/components/organisms/kanban-board/KanbanBoard'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- A parent that holds items in state and applies each onMove (applyKanbanMove does the update).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the board's region. |
| `columns` | `readonly KanbanColumn[]` |  | Required. { id, title, meta? }, in display order. |
| `items` | `readonly T[]` |  | Required. Every card. A column shows its items in this array's order. |
| `getItemId` | `(item: T) => string` |  | Required. |
| `getColumnId` | `(item: T) => string` |  | Required. The id of the item's column. |
| `getItemLabel` | `(item: T) => string` |  | Required. The card in plain words. The Move control, its menu and every screen reader announcement use it. |
| `renderCard` | `(item: T) => ReactNode` |  | Required. The card's body. It can hold one link or button. The board draws the frame. |
| `renderCardCorner` | `(item: T) => ReactNode` |  | A small mark in the card's bottom-right corner, under the Move control, about 2rem square, such as the owner's avatar. Wrap it in aria-hidden (so screen readers skip it) when the card already prints the same name. |
| `onMove` | `(itemId: string, toColumnId: string, toIndex: number) => void` |  | Required. Called once per move. toIndex is the card's position in the destination column after the move. A move from the menu puts it last. |
| `emptyColumnMessage` | `string` | `'Nothing here'` | Shown in a column with no cards. |
| `columnHeadingLevel` | `2 \| 3 \| 4` | `3` | The heading level of the column titles. Pick one that sits under the page's own heading outline. |
| `className` | `string` |  | Goes on the region. |
| `applyKanbanMove()` | `(items, itemId, toColumnId, toIndex, { getItemId, getColumnId, setColumnId }) => T[]` |  | The parent's half of onMove. It returns a new items array with the card in its new column and place. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type KanbanColumn = {
  id: string
  title: string
  /** Beside the title, in mono: a count, a total. */
  meta?: ReactNode
}
```

```ts
/** Column id to the ids of its cards, in order. What a drag rearranges before `onMove` runs. */
export type KanbanLayout = Record<string, string[]>
```

```ts
/** Where a card is being dropped: on another card (it takes that card's place), or on a column
 *  with no `itemId` (the end of it; only an empty column is a drop target of its own). */
export type KanbanTarget = { columnId: string; itemId?: string }
```

```ts
export function groupKanbanItems<T>(
  columns: readonly KanbanColumn[],
  items: readonly T[],
  getItemId: (item: T) => string,
  getColumnId: (item: T) => string
): KanbanLayout
```

```ts
/** The card's column and 0-based index in a layout, and how many cards that column holds. */
export function kanbanPosition(layout: KanbanLayout, itemId: string)
```

```ts
/** The move into another column while the card is still held, so the cards there make room. A
 *  move inside one column is left to the sortable transforms until the drop. Returns `layout`
 *  itself when nothing changes, so a state update with it does not render. */
export function kanbanDragOver(layout: KanbanLayout, itemId: string, target: KanbanTarget): KanbanLayout
```

```ts
/** The layout a drop on `target` leaves: across columns as `kanbanDragOver`, inside one column
 *  the card takes the target card's index. Pure, and what the announcements read ahead of time. */
export function kanbanDrop(layout: KanbanLayout, itemId: string, target: KanbanTarget): KanbanLayout
```

```ts
/** The parent's half of `onMove`: a new `items` array with the card in its new column, placed
 *  before the card that held `toIndex` there (or after the column's last card). Other cards keep
 *  their order. `setColumnId` returns the item with its column changed, a copy. */
export function applyKanbanMove<T>(
  items: readonly T[],
  itemId: string,
  toColumnId: string,
  toIndex: number,
  {
    getItemId,
    getColumnId,
    setColumnId,
  }: { getItemId: (item: T) => string; getColumnId: (item: T) => string; setColumnId: (item: T, columnId: string) => T }
): T[]
```

```ts
/** Every sentence the board speaks, in plain words: a card's name, a column's title and a
 *  position counted from 1. Exported so the wording is tested as wording. */
export const kanbanMessages = { …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Hiring board

```tsx
type Stage = 'applied' | 'screen' | 'interview' | 'offer'

type Candidate = { id: string; name: string; role: string; stage: Stage; recruiter: string; referral?: boolean }

const STAGES: { id: Stage; title: string }[] = [
  { id: 'applied', title: 'Applied' },
  { id: 'screen', title: 'Screening' },
  { id: 'interview', title: 'Interview' },
  { id: 'offer', title: 'Offer' },
]

const CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Ilse Varga', role: 'Depot lead, Cluj', stage: 'applied', recruiter: 'Dana Holm', referral: true },
  { id: 'c2', name: 'Tomas Reyes', role: 'Forklift driver, Arad', stage: 'applied', recruiter: 'Radu Mares' },
  { id: 'c3', name: 'Mara Lind', role: 'Stock planner, Sibiu', stage: 'applied', recruiter: 'Dana Holm' },
  { id: 'c4', name: 'Oskar Behn', role: 'Depot lead, Cluj', stage: 'screen', recruiter: 'Radu Mares' },
  { id: 'c5', name: 'Ana Petrescu', role: 'Dispatcher, Brasov', stage: 'interview', recruiter: 'Dana Holm', referral: true },
  { id: 'c6', name: 'Jon Arvid', role: 'Stock planner, Sibiu', stage: 'interview', recruiter: 'Radu Mares' },
]

const accessors = {
  getItemId: (candidate: Candidate) => candidate.id,
  getColumnId: (candidate: Candidate) => candidate.stage,
  setColumnId: (candidate: Candidate, stage: string) => ({ ...candidate, stage: stage as Stage }),
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold">{candidate.name}</p>
      <p className="text-[var(--color-text-secondary)]">{candidate.role}</p>
      {candidate.referral ? (
        <Badge tone="signal" emphasis="solid" className="self-start mt-1">
          Referral
        </Badge>
      ) : null}
    </div>
  )
}

function HiringBoard() {
  const [candidates, setCandidates] = useState(CANDIDATES)
  const columns: KanbanColumn[] = STAGES.map(stage => ({
    ...stage,
    meta: candidates.filter(candidate => candidate.stage === stage.id).length,
  }))
  return (
    <div className="w-full min-w-0">
      <KanbanBoard
        label="Hiring board"
        columns={columns}
        items={candidates}
        getItemId={accessors.getItemId}
        getColumnId={accessors.getColumnId}
        getItemLabel={candidate => candidate.name}
        renderCard={candidate => <CandidateCard candidate={candidate} />}
        renderCardCorner={candidate => <Avatar name={candidate.recruiter} size="sm" />}
        onMove={(id, stage, index) => setCandidates(current => applyKanbanMove(current, id, stage, index, accessors))}
        columnHeadingLevel={4}
      />
    </div>
  )
}

<HiringBoard />
```

### Work orders, with an empty column

```tsx
type Order = { id: string; title: string; bay: string; status: 'open' | 'parts' | 'done' }

const ORDER_COLUMNS: KanbanColumn[] = [
  { id: 'open', title: 'Open' },
  { id: 'parts', title: 'Waiting for parts' },
  { id: 'done', title: 'Done' },
]

const ORDERS: Order[] = [
  { id: 'wo-31', title: 'Replace dock door seal', bay: 'Bay 2', status: 'open' },
  { id: 'wo-32', title: 'Recalibrate floor scale', bay: 'Bay 5', status: 'open' },
  { id: 'wo-29', title: 'Service pallet jack', bay: 'Bay 1', status: 'done' },
]

const orderAccessors = {
  getItemId: (order: Order) => order.id,
  getColumnId: (order: Order) => order.status,
  setColumnId: (order: Order, status: string) => ({ ...order, status: status as Order['status'] }),
}

function WorkOrders() {
  const [orders, setOrders] = useState(ORDERS)
  return (
    <div className="w-full min-w-0">
      <KanbanBoard
        label="Depot work orders"
        columns={ORDER_COLUMNS}
        items={orders}
        getItemId={orderAccessors.getItemId}
        getColumnId={orderAccessors.getColumnId}
        getItemLabel={order => order.title}
        renderCard={order => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{order.title}</p>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">{order.bay}</p>
          </div>
        )}
        onMove={(id, status, index) => setOrders(current => applyKanbanMove(current, id, status, index, orderAccessors))}
        emptyColumnMessage="No orders waiting"
        columnHeadingLevel={4}
      />
    </div>
  )
}

<WorkOrders />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through each card's own link or button, then its Move control. |
| `Enter` | On a Move control, opens the menu of the other columns. On a menu item, moves the card to the end of that column. While a card is lifted, drops it. |
| `Space` | On a Move control, lifts the card. While it is lifted, Space drops it. |
| `↑` `↓` `←` `→` | While a card is lifted, move it between places in a column and between columns. |
| `Escape` | While a card is lifted, puts it back where it was (Tab does the same). In the menu, closes it. |

## Do

- Name each card with getItemLabel in words a screen reader listener can tell apart: the candidate, not "Card 3".
- Put a count or a total in each column's meta, so people can see a column's size without counting.
- Keep it to the stages of one process, three to six columns.
- Apply onMove with applyKanbanMove, or with anything that leaves the card at toIndex in its new column.

## Don't

- Don't make the card body a link from edge to edge. Put one link on the card's name.
- Don't write instructions that only mention dragging. The Move menu is the way to move a card without dragging.
- Don't reorder items inside renderCard or around the board. The order in items is the order shown.

## Common mistakes

Wrong:

```tsx
onMove={() => {}}  // items never change
```

Right:

```tsx
onMove={(id, column, index) => setItems(items => applyKanbanMove(items, id, column, index, accessors))}
```

The board is controlled. If the parent doesn't apply a move, the card snaps back where it was.

Wrong:

```tsx
renderCard={job => <a href={job.url} className="block p-3">...</a>}
```

Right:

```tsx
renderCard={job => <><a href={job.url}>{job.title}</a><p>{job.team}</p></>}
```

The board draws the frame and the Move control. A link wrapped around the whole body would swallow the drag and put controls inside each other.

## Anatomy

- **Region**: A section named by label that holds the board.
- **Scroll track**: Scrolls the columns sideways on a narrow screen. The page never scrolls sideways. Each column is at least 18rem wide (rem is a unit tied to the base font size), so a title, a count and a six-figure total stay on one line, and the cards in every column start at the same height.
- **Column**: A crosshair frame: the title as a monospaced heading with its meta on the right, then the cards as a list named by the title.
- **Card**: A panel with the body from renderCard. Down its right edge are the Move control at the top and the renderCardCorner mark, if there is one, in the bottom corner.
- **Move control**: An IconButton named "Move <label>". Enter or a click opens the menu of other columns. Space lifts the card for a keyboard drag.
- **Empty column**: A dashed box with emptyColumnMessage. It's where you drop a card into an empty column.
- **Lifted card**: The copy being dragged, with a 2px (pixel) signal border, over a dashed outline showing where the card will land.
