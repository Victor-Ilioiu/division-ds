# KanbanBoard

> Cards in columns that people move between stages: by dragging with a pointer, by dragging with the keyboard, or from each card's Move menu. Columns can carry a colour and a card limit and, when you turn it on, people add, edit, delete and reorder them, and switch to a table of the same cards. It's controlled, meaning the board reports each change and the parent updates its columns and items.

- **Best for:** Work items that move through a few named stages, where the point is seeing every stage at once.
- **Not for:** Records compared across many fields: use DataTable. A single ordered sequence: use Stepper.
- Organism. Source: `src/components/organisms/kanban-board/KanbanBoard.tsx`
- Rendered docs page: `/components/kanban-board`

## Import

```tsx
import { KANBAN_TINT, KanbanBoard, applyKanbanColumnAdd, applyKanbanColumnDelete, applyKanbanColumnMove, applyKanbanMove, groupKanbanItems, kanbanDragOver, kanbanDrop, kanbanMessages, kanbanPosition } from 'src/components/organisms/kanban-board/KanbanBoard'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- A parent that holds items in state and applies each onMove (applyKanbanMove does the update).
- For column changes, a parent that holds columns in state too and saves each change (applyKanbanColumnMove, applyKanbanColumnAdd and applyKanbanColumnDelete do the updates).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the board's region. |
| `columns` | `readonly KanbanColumn[]` |  | Required. { id, title, meta?, color?, limit? }, in display order. color is a category colour (the same names as Badge color). limit is the most cards the column should hold. |
| `items` | `readonly T[]` |  | Required. Every card. A column shows its items in this array's order. |
| `getItemId` | `(item: T) => string` |  | Required. |
| `getColumnId` | `(item: T) => string` |  | Required. The id of the item's column. |
| `getItemLabel` | `(item: T) => string` |  | Required. The card in plain words. The Move control, its menu and every screen reader announcement use it. |
| `renderCard` | `(item: T) => ReactNode` |  | Required. The card's body. It can hold one link or button. The board draws the frame. |
| `renderCardCorner` | `(item: T) => ReactNode` |  | A small mark in the card's bottom-right corner, under the Move control, about 2rem square, such as the owner's avatar. Wrap it in aria-hidden (so screen readers skip it) when the card already prints the same name. |
| `renderCardMenu` | `(item: T, moveTo: (columnId: string) => void, columnId: string) => ReactNode` |  | Replaces the Move menu's default items (the card's name and a Move to item for each other column) with your own DropdownMenu parts, such as View, Edit or Delete. They go inside the board's menu. Call moveTo(columnId) to move the card the way the default menu does: to the end of that column, with onMove, the announcement and focus back on the Move control. columnId is the card's current column. |
| `onMove` | `(itemId: string, toColumnId: string, toIndex: number) => void` |  | Required. Called once per move. toIndex is the card's position in the destination column after the move. A move from the menu puts it last. |
| `onColumnMove` | `(columnId: string, toIndex: number) => void` |  | Turns on moving columns: a drag on the column's header, and Move left / Move right in its menu. toIndex is the column's place after the move. |
| `onColumnAdd` | `(afterColumnId: string \| null, draft: KanbanColumnDraft) => void` |  | Turns on the Add column button in each header, which asks for a name, a colour and a card limit. Make the id yourself and insert the column after afterColumnId. It is null on a board with no columns, which shows one Add column button instead. |
| `onColumnEdit` | `(columnId: string, draft: KanbanColumnDraft) => void` |  | Turns on Edit in each column's menu: the same dialog, filled in. draft is { title, color?, limit? }. |
| `onColumnDelete` | `(columnId: string, moveCardsTo: string \| null) => void` |  | Turns on Delete in each column's menu. An AlertDialog asks first, and for a column with cards, where they go: moveCardsTo is that column's id, or null when they go with it. |
| `onAddCard` | `(columnId: string) => void` |  | Turns on an Add card button at the foot of each column. Make the card in that column, or open your own form for it. |
| `addCardLabel` | `string` | `'Add card'` | The Add card button's words. The column's title is added for screen readers. |
| `tableColumns` | `readonly DataTableColumn<T>[]` |  | Turns on the table view and its Board / Table switch. The same column shape as DataTable's: { key, header, cell, sortValue?, numeric? }. |
| `tableRowHeader` | `string` | `the first table column` | The key of the table column that heads each row. |
| `statusLabel` | `string` | `'Status'` | The header of the table's own column, which holds each card's column. |
| `view` | `'board' \| 'table'` |  | The view, when your code controls it. Pass it with onViewChange. |
| `defaultView` | `'board' \| 'table'` | `'board'` | The view it starts in, when the board keeps track of it itself. |
| `onViewChange` | `(view: 'board' \| 'table') => void` |  | Called when someone switches the view. |
| `emptyColumnMessage` | `string` | `'Nothing here'` | Shown in a column with no cards, and in an empty table. |
| `columnHeadingLevel` | `2 \| 3 \| 4` | `3` | The heading level of the column titles. Pick one that sits under the page's own heading outline. |
| `selectedItemId` | `string \| null` |  | The card whose details are open beside the board, in a SidePanel. It gets a 2px accent.signal.fill border and aria-current, so the board shows which card the panel is about. |
| `className` | `string` |  | Goes on the region. |
| `applyKanbanMove()` | `(items, itemId, toColumnId, toIndex, { getItemId, getColumnId, setColumnId }) => T[]` |  | The parent's half of onMove. It returns a new items array with the card in its new column and place. |
| `applyKanbanColumnMove()` | `(columns, columnId, toIndex) => columns` |  | The parent's half of onColumnMove: the columns with that one at toIndex. |
| `applyKanbanColumnAdd()` | `(columns, afterColumnId, column) => columns` |  | The parent's half of onColumnAdd: the columns with the new one after afterColumnId, or first when that's null. |
| `applyKanbanColumnDelete()` | `(items, columnId, moveCardsTo, { getColumnId, setColumnId }) => T[]` |  | The items half of onColumnDelete: the column's cards moved to the end of moveCardsTo, or removed when it's null. Remove the column from columns yourself. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type KanbanColumn = {
  id: string
  title: string
  /** Beside the title, in mono: a count, a total. */
  meta?: ReactNode
  /** A category colour (Badge's `color`). The title takes its text colour, the column a faint tint
   *  of its fill and each card in it a little more. A colour means "this stage", never good or bad. */
  color?: CategoryColor
  /** A work-in-progress limit: the most cards the column should hold. The header shows the count
   *  against it, and says "Over limit" in the warning tone past it. Moves are never blocked. */
  limit?: number
}
```

```ts
export type KanbanView = 'board' | 'table'
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
/** How strongly a column colour tints, as the opacity of its category fill: the column at 8%, a
 *  card on it 4% more. Chosen so every text token a card carries keeps AA in both themes; the
 *  contrast gate measures these exact numbers (`KANBAN_TINT` in scripts/lib/pairs-for-tokens.mjs,
 *  and a test holds the two equal). */
export const KANBAN_TINT = { column: 0.08, card: 0.04 } as const
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
/** The parent's half of `onColumnMove`: the columns with that one at `toIndex`. */
export function applyKanbanColumnMove<C extends { id: string }>(columns: readonly C[], columnId: string, toIndex: number): C[]
```

```ts
/** The parent's half of `onColumnAdd`: the columns with `column` after `afterColumnId` (first
 *  when that is null or not found). */
export function applyKanbanColumnAdd<C extends { id: string }>(columns: readonly C[], afterColumnId: string | null, column: C): C[]
```

```ts
/** The items half of `onColumnDelete`: the column's cards moved to the end of `moveCardsTo` in
 *  their order, or removed when it is null. Remove the column from `columns` yourself. */
export function applyKanbanColumnDelete<T>(
  items: readonly T[],
  columnId: string,
  moveCardsTo: string | null,
  { getColumnId, setColumnId }: { getColumnId: (item: T) => string; setColumnId: (item: T, columnId: string) => T }
): T[]
```

```ts
/** Every sentence the board speaks, in plain words: a card's name, a column's title and a
 *  position counted from 1. Exported so the wording is tested as wording. */
export const kanbanMessages = { …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Columns people manage: colour, card limit, order, add and delete, and a table view

```tsx
type Task = { id: string; title: string; owner: string; column: string; points: number }

const SPRINT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To do', color: 'gray' },
  { id: 'doing', title: 'In progress', color: 'blue', limit: 2 },
  { id: 'review', title: 'Review', color: 'purple', limit: 2 },
  { id: 'done', title: 'Done', color: 'green' },
]

const TASKS: Task[] = [
  { id: 't1', title: 'Restock bay 4 labels', owner: 'Dana Holm', column: 'todo', points: 2 },
  { id: 't2', title: 'Count returns crate', owner: 'Radu Mares', column: 'todo', points: 1 },
  { id: 't3', title: 'Fix scanner sync', owner: 'Ana Petrescu', column: 'doing', points: 5 },
  { id: 't4', title: 'Driver rota for May', owner: 'Dana Holm', column: 'doing', points: 3 },
  { id: 't5', title: 'Dock door checklist', owner: 'Jon Arvid', column: 'doing', points: 2 },
  { id: 't6', title: 'Pallet audit, Cluj', owner: 'Radu Mares', column: 'review', points: 3 },
  { id: 't7', title: 'Forklift service log', owner: 'Ana Petrescu', column: 'done', points: 1 },
]

const taskAccessors = {
  getItemId: (task: Task) => task.id,
  getColumnId: (task: Task) => task.column,
  setColumnId: (task: Task, column: string) => ({ ...task, column }),
}

function SprintBoard() {
  const [columns, setColumns] = useState(SPRINT_COLUMNS)
  const [tasks, setTasks] = useState(TASKS)
  const [added, setAdded] = useState(0)
  return (
    <div className="w-full min-w-0">
      <KanbanBoard
        label="Sprint board"
        columns={columns.map(column => ({
          ...column,
          meta: `${tasks.filter(task => task.column === column.id).reduce((sum, task) => sum + task.points, 0)} pts`,
        }))}
        items={tasks}
        getItemId={taskAccessors.getItemId}
        getColumnId={taskAccessors.getColumnId}
        getItemLabel={task => task.title}
        renderCard={task => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{task.title}</p>
            <p className="text-[var(--color-text-secondary)]">{task.points === 1 ? '1 point' : `${task.points} points`}</p>
          </div>
        )}
        renderCardCorner={task => <Avatar name={task.owner} size="sm" />}
        onMove={(id, column, index) => setTasks(current => applyKanbanMove(current, id, column, index, taskAccessors))}
        onColumnMove={(id, index) => setColumns(current => applyKanbanColumnMove(current, id, index))}
        onColumnAdd={(after, draft) =>
          setColumns(current => applyKanbanColumnAdd(current, after, { id: `column-${Date.now()}`, ...draft }))
        }
        onColumnEdit={(id, draft) => setColumns(current => current.map(column => (column.id === id ? { ...column, ...draft } : column)))}
        onColumnDelete={(id, moveTo) => {
          setColumns(current => current.filter(column => column.id !== id))
          setTasks(current => applyKanbanColumnDelete(current, id, moveTo, taskAccessors))
        }}
        onAddCard={column => {
          const n = added + 1
          setAdded(n)
          setTasks(current => [...current, { id: `new-${n}`, title: `New task ${n}`, owner: 'Dana Holm', column, points: 1 }])
        }}
        tableColumns={[
          { key: 'title', header: 'Task', cell: task => task.title, sortValue: task => task.title },
          { key: 'owner', header: 'Owner', cell: task => task.owner, sortValue: task => task.owner },
          { key: 'points', header: 'Points', cell: task => task.points, sortValue: task => task.points, numeric: true },
        ]}
        columnHeadingLevel={4}
      />
    </div>
  )
}

<SprintBoard />
```

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

### Your own card menu, with renderCardMenu

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

const ORDER_LABELS = ['Urgent', 'Safety', 'Contractor'] as const

function WorkOrdersWithMenu() {
  const [orders, setOrders] = useState(ORDERS)
  const [labels, setLabels] = useState<Record<string, string[]>>({ 'wo-31': ['Safety'] })
  const [note, setNote] = useState('')
  const toggleLabel = (id: string, label: string, on: boolean) =>
    setLabels(current => ({
      ...current,
      [id]: on ? [...(current[id] ?? []), label] : (current[id] ?? []).filter(other => other !== label),
    }))
  return (
    <div className="w-full min-w-0 flex flex-col gap-3">
      <KanbanBoard
        label="Depot work orders, with a card menu"
        columns={ORDER_COLUMNS}
        items={orders}
        getItemId={orderAccessors.getItemId}
        getColumnId={orderAccessors.getColumnId}
        getItemLabel={order => order.title}
        renderCard={order => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{order.title}</p>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              {[order.bay, ...(labels[order.id] ?? [])].join(' · ')}
            </p>
          </div>
        )}
        renderCardMenu={(order, moveTo, columnId) => (
          <>
            <DropdownMenuItem icon={<Eye />} onSelect={() => setNote(`Opened ${order.title}.`)}>
              View
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Pencil />} onSelect={() => setNote(`Editing ${order.title}.`)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger icon={<Tag />}>Labels</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {ORDER_LABELS.map(label => (
                  <DropdownMenuCheckboxItem
                    key={label}
                    checked={(labels[order.id] ?? []).includes(label)}
                    onCheckedChange={on => toggleLabel(order.id, label, on === true)}
                    onSelect={event => event.preventDefault()}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger icon={<ArrowRightLeft />}>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {ORDER_COLUMNS.filter(column => column.id !== columnId).map(column => (
                  <DropdownMenuItem key={column.id} onSelect={() => moveTo(column.id)}>
                    {column.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              tone="hostile"
              icon={<Trash2 />}
              onSelect={() => {
                setOrders(current => current.filter(other => other.id !== order.id))
                setNote(`Deleted ${order.title}.`)
              }}
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
        onMove={(id, status, index) => setOrders(current => applyKanbanMove(current, id, status, index, orderAccessors))}
        emptyColumnMessage="No orders waiting"
        columnHeadingLevel={4}
      />
      <p className={docsProse}>{note}</p>
    </div>
  )
}

<WorkOrdersWithMenu />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through each card's own link or button, then its Move control. |
| `Enter` | On a Move control, opens the menu of the other columns. On a menu item, moves the card to the end of that column. While a card is lifted, drops it. |
| `Space` | On a Move control, lifts the card. While it is lifted, Space drops it. |
| `↑` `↓` `←` `→` | While a card is lifted, move it between places in a column and between columns. |
| `Escape` | While a card is lifted, puts it back where it was (Tab does the same). In the menu, closes it. |
| `Enter` `Space` | On a column's More button, opens its menu: Edit, Move left, Move right and Delete. Columns move from this menu, so they need no keyboard drag, and focus stays on the moved column's More button. |

## Do

- Name each card with getItemLabel in words a screen reader listener can tell apart: the candidate, not "Card 3".
- Put a count or a total in each column's meta, so people can see a column's size without counting.
- Keep it to the stages of one process, three to six columns.
- Apply onMove with applyKanbanMove, or with anything that leaves the card at toIndex in its new column.
- Save every column change as it happens (order, name, colour, limit). The board has no Save button of its own.
- Set a card limit on the columns where work piles up, such as In progress or Review.

## Don't

- Don't make the card body a link from edge to edge. Put one link on the card's name.
- Don't write instructions that only mention dragging. The Move menu is the way to move a card without dragging.
- Don't reorder items inside renderCard or around the board. The order in items is the order shown.
- Don't use text.muted on a card in a coloured column. In dark theme it drops under 4.5:1 there, so use text.secondary.
- Don't let a column colour carry the meaning. It groups, the way a category colour does, and the title still has to say what the stage is.

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

Wrong:

```tsx
onColumnDelete={id => setColumns(cs => cs.filter(c => c.id !== id))}
```

Right:

```tsx
onColumnDelete={(id, moveTo) => { setColumns(cs => cs.filter(c => c.id !== id)); setItems(items => applyKanbanColumnDelete(items, id, moveTo, accessors)) }}
```

The confirm asks where the column's cards go. If the parent drops only the column, its cards are left pointing at a column that no longer exists, and they vanish from the board.

## Anatomy

- **Region**: A section named by label that holds the board.
- **Scroll track**: Scrolls the columns sideways on a narrow screen. The page never scrolls sideways. Each column is at least 18rem wide (rem is a unit tied to the base font size), so a title, a count and a six-figure total stay on one line, and the cards in every column start at the same height.
- **Column**: A crosshair frame: the title as a monospaced heading with its meta on the right, then the cards as a list named by the title. With header buttons, the meta and the card limit move to a second line in every column, so the cards still start at the same height.
- **Column colour**: A category colour. The title takes its text token, and the colour's fill is laid over the column at 8% and over each card in it at 4% more (KANBAN_TINT). Every text token a card uses keeps AA contrast on it in both themes, except text.muted, which a card on a coloured column does not use.
- **Header buttons**: Add a column after this one (with onColumnAdd), and the More button, named "<title> column options". Its menu holds Edit, Move left, Move right and Delete, each only when its callback is passed.
- **Card limit**: With limit set, "Limit 2/3" under the title, read out as a sentence. Past the limit it says "Over limit" in the warning tone, with an icon. A move past the limit is never blocked.
- **Column dialog**: A Dialog with Name, Colour and Card limit, for a new column and for Edit. Delete is an AlertDialog that, for a column with cards, asks which column they move to, or whether they go with it.
- **Add card**: With onAddCard, a ghost button at the foot of each column, named "Add card to <title>".
- **View switch**: With tableColumns, a SegmentedControl named View above the board: Board or Table. The table is a DataTable of the same cards, plus a Status column of the board's own that holds each card's column as a Select.
- **Card**: A panel with the body from renderCard. Down its right edge are the Move control at the top and the renderCardCorner mark, if there is one, in the bottom corner.
- **Move control**: An IconButton named "Move <label>". Enter or a click opens the menu of other columns. Space lifts the card for a keyboard drag.
- **Empty column**: A dashed box with emptyColumnMessage. It's where you drop a card into an empty column.
- **Lifted card**: The copy being dragged, with a 2px (pixel) signal border, over a dashed outline showing where the card will land.
- **Lifted column**: With onColumnMove, a press on a column header lifts the whole column, cards and all, with the same signal border and dashed outline. The other columns make room as it passes.
