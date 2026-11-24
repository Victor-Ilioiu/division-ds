import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  closestCorners,
  defaultDropAnimation,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type Over,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, ArrowRight, Ellipsis, GripVertical, Pencil, Plus, SquareKanban, Table2, Trash2, TriangleAlert } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { readCssVar } from '../../../lib/tokens-runtime'
import type { CategoryColor } from '../../atoms/badge/Badge'
import { Button } from '../../atoms/button/Button'
import { IconButton } from '../../atoms/icon-button/IconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../molecules/dropdown-menu/DropdownMenu'
import { SegmentedControl } from '../../molecules/segmented-control/SegmentedControl'
import type { DataTableColumn } from '../data-table/DataTable'
import { KanbanColumnDeleteDialog, KanbanColumnFormDialog, type KanbanColumnDraft } from './KanbanColumnDialogs'
import { KanbanTable } from './KanbanTable'

export type { KanbanColumnDraft } from './KanbanColumnDialogs'

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

export type KanbanView = 'board' | 'table'

export type KanbanBoardProps<T> = {
  /** Required. Names the board's region: "Hiring board". */
  label: string
  columns: readonly KanbanColumn[]
  /** Every card, in order. A column shows the items whose `getColumnId` is its id, in this order. */
  items: readonly T[]
  getItemId: (item: T) => string
  getColumnId: (item: T) => string
  /** The card's name in plain words: the Move control's label, the menu and every announcement. */
  getItemLabel: (item: T) => string
  /** The card's body. The board draws the frame and the Move control; the body may hold one link
   *  or button, never the frame. */
  renderCard: (item: T) => ReactNode
  /** A small mark for the card's bottom-right corner, under the Move control: the owner's avatar,
   *  a priority icon. About 2rem square; decorative or named on its own. */
  renderCardCorner?: (item: T) => ReactNode
  /** The Move control's menu, replacing the default (the card's label and a "Move to" item per
   *  other column). Return DropdownMenu parts; they go inside the board's DropdownMenuContent.
   *  `moveTo` is the menu move: the card goes to the end of that column, `onMove` runs, the move is
   *  announced and focus returns to the card's Move control. `columnId` is the card's column now. */
  renderCardMenu?: (item: T, moveTo: (columnId: string) => void, columnId: string) => ReactNode
  /** Controlled: the board never reorders `items` itself. `toIndex` is the card's position in the
   *  destination column once it is there (0 is the top). `applyKanbanMove` does the update. */
  onMove: (itemId: string, toColumnId: string, toIndex: number) => void
  /** Turns on column moves: dragging a column by its header, and Move left / Move right in its
   *  menu. `toIndex` is the column's place once it is there. `applyKanbanColumnMove` does it. */
  onColumnMove?: (columnId: string, toIndex: number) => void
  /** Turns on the Add column button in each header (and one on an empty board). The board asks
   *  for a name, a colour and a limit in a dialog; the parent makes the id and inserts the column
   *  after `afterColumnId` (null: the board had none). `applyKanbanColumnAdd` does it. */
  onColumnAdd?: (afterColumnId: string | null, draft: KanbanColumnDraft) => void
  /** Turns on Edit in each column's menu: the same dialog, filled in. */
  onColumnEdit?: (columnId: string, draft: KanbanColumnDraft) => void
  /** Turns on Delete in each column's menu. A column with cards asks where they go first:
   *  `moveCardsTo` is that column's id, or null to delete them with it. `applyKanbanColumnDelete`
   *  does the items half. */
  onColumnDelete?: (columnId: string, moveCardsTo: string | null) => void
  /** Turns on an Add card button at the foot of each column. The parent makes the card (or opens
   *  its own form) and puts it in that column. */
  onAddCard?: (columnId: string) => void
  /** The Add card button's visible words; the column's title is added for screen readers.
   *  @default 'Add card' */
  addCardLabel?: string
  /** Turns on the table view and its Board / Table switch: the columns of the table, as
   *  DataTable's. The board adds its own column, the card's column as a Select, after the row
   *  header. */
  tableColumns?: readonly DataTableColumn<T>[]
  /** The key of the table column that heads each row. @default the first of tableColumns */
  tableRowHeader?: string
  /** The header of the table's own column, the one that holds each card's column. @default 'Status' */
  statusLabel?: string
  /** Controlled view. Set it together with onViewChange. */
  view?: KanbanView
  /** @default 'board' */
  defaultView?: KanbanView
  onViewChange?: (view: KanbanView) => void
  /** Shown in a column with no cards, where a card can still be dropped, and in an empty table.
   *  @default 'Nothing here' */
  emptyColumnMessage?: string
  /** The column titles' heading level, under the page's own outline. @default 3 */
  columnHeadingLevel?: 2 | 3 | 4
  className?: string
}

/** Column id to the ids of its cards, in order. What a drag rearranges before `onMove` runs. */
export type KanbanLayout = Record<string, string[]>

/** Where a card is being dropped: on another card (it takes that card's place), or on a column
 *  with no `itemId` (the end of it; only an empty column is a drop target of its own). */
export type KanbanTarget = { columnId: string; itemId?: string }

/** How strongly a column colour tints, as the opacity of its category fill: the column at 8%, a
 *  card on it 4% more. Chosen so every text token a card carries keeps AA in both themes; the
 *  contrast gate measures these exact numbers (`KANBAN_TINT` in scripts/lib/pairs-for-tokens.mjs,
 *  and a test holds the two equal). */
export const KANBAN_TINT = { column: 0.08, card: 0.04 } as const

export function groupKanbanItems<T>(
  columns: readonly KanbanColumn[],
  items: readonly T[],
  getItemId: (item: T) => string,
  getColumnId: (item: T) => string
): KanbanLayout {
  const layout: KanbanLayout = Object.fromEntries(columns.map(column => [column.id, [] as string[]]))
  for (const item of items) layout[getColumnId(item)]?.push(getItemId(item))
  return layout
}

function columnOf(layout: KanbanLayout, itemId: string): string | undefined {
  return Object.keys(layout).find(columnId => layout[columnId].includes(itemId))
}

/** The card's column and 0-based index in a layout, and how many cards that column holds. */
export function kanbanPosition(layout: KanbanLayout, itemId: string) {
  const columnId = columnOf(layout, itemId)
  if (columnId === undefined) return undefined
  return { columnId, index: layout[columnId].indexOf(itemId), count: layout[columnId].length }
}

/** The move into another column while the card is still held, so the cards there make room. A
 *  move inside one column is left to the sortable transforms until the drop. Returns `layout`
 *  itself when nothing changes, so a state update with it does not render. */
export function kanbanDragOver(layout: KanbanLayout, itemId: string, target: KanbanTarget): KanbanLayout {
  const from = columnOf(layout, itemId)
  const to = (target.itemId !== undefined && columnOf(layout, target.itemId)) || target.columnId
  if (from === undefined || from === to || !(to in layout)) return layout
  const destination = layout[to]
  const at = target.itemId === undefined ? -1 : destination.indexOf(target.itemId)
  const next = at < 0 ? [...destination, itemId] : [...destination.slice(0, at), itemId, ...destination.slice(at)]
  return { ...layout, [from]: layout[from].filter(id => id !== itemId), [to]: next }
}

/** The layout a drop on `target` leaves: across columns as `kanbanDragOver`, inside one column
 *  the card takes the target card's index. Pure, and what the announcements read ahead of time. */
export function kanbanDrop(layout: KanbanLayout, itemId: string, target: KanbanTarget): KanbanLayout {
  const moved = kanbanDragOver(layout, itemId, target)
  if (moved !== layout || target.itemId === undefined || target.itemId === itemId) return moved
  const columnId = columnOf(layout, itemId)
  if (columnId === undefined || columnOf(layout, target.itemId) !== columnId) return layout
  const cards = layout[columnId]
  return { ...layout, [columnId]: arrayMove(cards, cards.indexOf(itemId), cards.indexOf(target.itemId)) }
}

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
): T[] {
  const item = items.find(candidate => getItemId(candidate) === itemId)
  if (item === undefined) return [...items]
  const rest = items.filter(candidate => candidate !== item)
  const column = rest.filter(candidate => getColumnId(candidate) === toColumnId)
  const moved = setColumnId(item, toColumnId)
  const before = column[Math.max(0, toIndex)]
  const at = before !== undefined ? rest.indexOf(before) : column.length ? rest.indexOf(column[column.length - 1]) + 1 : rest.length
  return [...rest.slice(0, at), moved, ...rest.slice(at)]
}

/** The parent's half of `onColumnMove`: the columns with that one at `toIndex`. */
export function applyKanbanColumnMove<C extends { id: string }>(columns: readonly C[], columnId: string, toIndex: number): C[] {
  const from = columns.findIndex(column => column.id === columnId)
  if (from < 0) return [...columns]
  return arrayMove([...columns], from, Math.min(Math.max(0, toIndex), columns.length - 1))
}

/** The parent's half of `onColumnAdd`: the columns with `column` after `afterColumnId` (first
 *  when that is null or not found). */
export function applyKanbanColumnAdd<C extends { id: string }>(columns: readonly C[], afterColumnId: string | null, column: C): C[] {
  const at = afterColumnId === null ? -1 : columns.findIndex(other => other.id === afterColumnId)
  return [...columns.slice(0, at + 1), column, ...columns.slice(at + 1)]
}

/** The items half of `onColumnDelete`: the column's cards moved to the end of `moveCardsTo` in
 *  their order, or removed when it is null. Remove the column from `columns` yourself. */
export function applyKanbanColumnDelete<T>(
  items: readonly T[],
  columnId: string,
  moveCardsTo: string | null,
  { getColumnId, setColumnId }: { getColumnId: (item: T) => string; setColumnId: (item: T, columnId: string) => T }
): T[] {
  const leaving = items.filter(item => getColumnId(item) === columnId)
  const rest = items.filter(item => getColumnId(item) !== columnId)
  if (moveCardsTo === null) return rest
  return [...rest, ...leaving.map(item => setColumnId(item, moveCardsTo))]
}

/** Every sentence the board speaks, in plain words: a card's name, a column's title and a
 *  position counted from 1. Exported so the wording is tested as wording. */
export const kanbanMessages = {
  pickedUp: (item: string, column: string, position: number, count: number) =>
    `Picked up ${item}. It is in ${column}, position ${position} of ${count}.`,
  over: (item: string, column: string, position: number, count: number) =>
    `${item} is over ${column}, position ${position} of ${count}.`,
  moved: (item: string, column: string, position: number, count: number) =>
    `${item} moved to ${column}, position ${position} of ${count}.`,
  unchanged: (item: string, column: string, position: number, count: number) =>
    `${item} dropped where it was, in ${column}, position ${position} of ${count}.`,
  cancelled: (item: string, column: string, position: number, count: number) =>
    `Move cancelled. ${item} is back in ${column}, position ${position} of ${count}.`,
  columnPickedUp: (column: string, position: number, count: number) =>
    `Picked up the ${column} column. It is column ${position} of ${count}.`,
  columnOver: (column: string, position: number, count: number) => `The ${column} column is over column ${position} of ${count}.`,
  columnMoved: (column: string, position: number, count: number) => `The ${column} column moved to column ${position} of ${count}.`,
  columnUnchanged: (column: string, position: number, count: number) =>
    `The ${column} column dropped where it was, column ${position} of ${count}.`,
  columnCancelled: (column: string, position: number, count: number) =>
    `Move cancelled. The ${column} column is back at column ${position} of ${count}.`,
  columnAdded: (column: string) => `Added the ${column} column.`,
  columnDeleted: (column: string) => `Deleted the ${column} column.`,
}

/** Read once by the Move control through aria-describedby. */
const INSTRUCTIONS =
  'Enter opens a menu of the columns to move this card to. To drag it instead, press Space, move it with the arrow keys, and press Space or Enter to drop it. Escape or Tab cancels.'

/** Space lifts, so Enter stays free to open the Move menu (Radix's trigger key). Tab cancels
 *  rather than drops: leaving the control is not a decision about where the card goes. */
const KEYBOARD_CODES = {
  start: [KeyboardCode.Space],
  end: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc, KeyboardCode.Tab],
}

const cardKey = (itemId: string) => `card:${itemId}`
const columnKey = (columnId: string) => `column:${columnId}`
const laneKey = (columnId: string) => `lane:${columnId}`

/** `column` is an empty column's own drop target; `lane` is a whole column being moved. */
type DragData =
  | { type: 'card'; itemId: string; columnId: string }
  | { type: 'column'; columnId: string }
  | { type: 'lane'; columnId: string }

const dataOf = (active: Active) => active.data.current as DragData

function itemIdOf(active: Active): string {
  return (active.data.current as DragData & { type: 'card' }).itemId
}

const isLane = (active: Active) => dataOf(active)?.type === 'lane'

function targetOf(over: Over | null): KanbanTarget | undefined {
  const data = over?.data.current as DragData | undefined
  if (!data || data.type === 'lane') return undefined
  return data.type === 'card' ? { columnId: data.columnId, itemId: data.itemId } : { columnId: data.columnId }
}

function laneOf(over: Over | null): string | undefined {
  const data = over?.data.current as DragData | undefined
  return data?.type === 'lane' ? data.columnId : undefined
}

/** A card lands on cards and empty columns, by their corners; a column lands on columns, by
 *  their centres. Each drag only ever sees its own kind of target. */
const collisionDetection: CollisionDetection = args => {
  const lane = dataOf(args.active)?.type === 'lane'
  const droppableContainers = args.droppableContainers.filter(container => {
    const type = (container.data.current as DragData | undefined)?.type
    return lane ? type === 'lane' : type !== 'lane'
  })
  return (lane ? closestCenter : closestCorners)({ ...args, droppableContainers })
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(REDUCED_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_QUERY).matches,
    () => false
  )
}

/** The motion tokens, read at the moment they are used, so a changed token changes the board. */
function motionTokens() {
  const duration = Number.parseFloat(readCssVar('--duration-base'))
  return {
    duration: Number.isFinite(duration) ? duration : 180,
    easing: readCssVar('--ease-snap') || 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  }
}

type Motion = { duration: number; easing: string } | null

const FRAME = 'panel flex items-start gap-2 p-3 pr-2 font-body text-sm text-[var(--color-text-primary)]'
/** The card's right edge: the Move control at the top and, when there is one, the corner mark at
 *  the bottom, so the mark sits in the card's own corner and not at the end of a body row. */
const SIDE = 'relative flex flex-col items-center justify-between gap-2 self-stretch shrink-0'
const COLUMN = 'crosshair flex flex-col flex-1 min-w-[18rem] border border-[var(--color-border-hairline)]'
const TITLE = 'font-mono text-xs font-semibold uppercase tracking-[0.18em]'
const META = 'whitespace-nowrap font-mono text-xs tabular-nums text-[var(--color-text-secondary)]'

/** The colour's fill laid over whatever is under it at `opacity`. A layer rather than a mixed
 *  colour, so every value on screen is still a token, and the contrast gate can composite it. */
function Tint({ color, opacity }: { color?: CategoryColor; opacity: number }) {
  if (!color) return null
  return (
    <span
      aria-hidden="true"
      data-kanban-tint={color}
      className="absolute inset-0 pointer-events-none rounded-[inherit]"
      style={{ backgroundColor: `var(--color-category-${color}-fill)`, opacity }}
    />
  )
}

const titleStyle = (color?: CategoryColor) => ({
  color: color ? `var(--color-category-${color}-text)` : 'var(--color-text-primary)',
})

/** The header's count against a limit. The visible "3/5" is shorthand, so screen readers get the
 *  sentence instead. Past the limit it says so in words, in the warning tone, with an icon. */
function LimitNote({ count, limit }: { count: number; limit: number }) {
  const over = count > limit
  return (
    <span className={cn('inline-flex items-center gap-1', over && 'text-[var(--color-accent-warning-text)]')}>
      {over ? <TriangleAlert aria-hidden="true" className="w-3.5 h-3.5 shrink-0" /> : null}
      <span aria-hidden="true">
        {over ? 'Over limit ' : 'Limit '}
        {count}/{limit}
      </span>
      <span className="sr-only">
        {over ? `${count} cards, over the limit of ${limit}.` : `${count} of a limit of ${limit} cards.`}
      </span>
    </span>
  )
}

function MetaLine({ column, count }: { column: KanbanColumn; count: number }) {
  if (column.meta === undefined && column.limit === undefined) return null
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {column.meta === undefined ? null : <span>{column.meta}</span>}
      {column.limit === undefined ? null : <LimitNote count={count} limit={column.limit} />}
    </span>
  )
}

type DialogState =
  | { kind: 'add'; afterColumnId: string | null }
  | { kind: 'edit'; columnId: string }
  | { kind: 'delete'; columnId: string }

/** Where focus goes once the last column is deleted: the empty board's Add column button. */
const EMPTY_BOARD = '\u0000empty-board'

/**
 * Cards in columns, moved between them: a hiring pipeline, a depot's work orders. Built on
 * dnd-kit, with three ways to move a card, all ending in the same `onMove`:
 *
 * - a pointer drag from anywhere on the card (6px of travel first, so a click on the link inside
 *   is still a click; on touch, a 250ms press, so the board still scrolls);
 * - a keyboard drag from the card's Move control: Space lifts, the arrow keys move, Space or Enter
 *   drops, Escape or Tab cancels;
 * - the Move control's menu (Enter, or a click), which lists the other columns and puts the card
 *   at the end of the one chosen. The path that needs no drag at all (SC 2.5.7, Dragging
 *   Movements). `renderCardMenu` replaces that menu with the app's own (View, Edit, Delete) and
 *   hands it the same move as `moveTo`.
 *
 * The Move control is one IconButton doing two jobs: the menu's trigger and the keyboard drag's
 * activator. They share it by key: dnd-kit is set to start on Space only and calls
 * preventDefault, which Radix's trigger reads as "not mine"; while a drag is live every key on
 * the control is prevented for Radix, so an arrow moves the card and never opens the menu. A
 * pointer press on the control is kept from the card's drag listener, so it only opens the menu.
 *
 * Columns people manage (each turned on by its callback): a column moves by a pointer drag on its
 * header, cards and all, with the same motion as a card, or by Move left / Move right in its
 * More menu (the path with no drag, so no keyboard drag is needed for columns). The header's Add
 * column button and the menu's Edit open one dialog (name, colour, card limit); Delete confirms
 * in an AlertDialog that asks where the column's cards go. Those dialogs open after the menu has
 * closed and focus is back on the More button, so the More button is the opener a dialog returns
 * focus to (the system's rule against opening an overlay from a menu item is about the item
 * vanishing; here the trigger stays). A deleted column's cards move only once the dialog has
 * closed onto that button, and focus then goes to the next column's More button.
 *
 * A column colour is a category colour (Badge's `color`): the title in its text token, and its
 * fill laid over the column at 8% and over each card at 4% more (`KANBAN_TINT`), as layers, so
 * every value stays a token. In dark theme the raised card is translucent and the column's tint
 * shows through it as well.
 *
 * With `tableColumns`, a Board / Table switch sits above the board; the table is a DataTable of
 * the same items in board order, with a column of the board's own holding each card's column as
 * a Select (a menu move: the card goes to the end of that column).
 *
 * Controlled: during a drag the board holds a preview layout (the card shown in the column it is
 * over), and on the drop it calls `onMove` once and drops the preview; the card stays where the
 * parent's next `items` put it. A drop where it started calls nothing. Columns are the same: the
 * board reports `onColumnMove` and the parent's next `columns` decide.
 *
 * The dragged card or column is drawn by a DragOverlay in a portal on `document.body` (the routed
 * view carries a transform, which would offset a fixed overlay inside it); the copy is aria-hidden
 * and inert, so nothing is read or reached twice. Its place is a dashed outline.
 *
 * Announcements are dnd-kit's live region, written with the card's label, the column titles and
 * a position counted from one; a menu move speaks through the board's own status region, and
 * focus goes to the moved card's Move control (or the moved column's More button).
 *
 * Motion: the cards and columns making room and the drop settle on `--duration-base` and
 * `--ease-snap`; under reduced motion both are off and a card or column lands at once.
 *
 * Contrast rows, by exact name. Column titles: "text.primary on surface.base" and "text.primary
 * on surface.raised (over surface.base)"; a coloured title "kanban title (category.<c>.text) on a
 * <c> column"; column meta, the ghost buttons and the empty message: "text.secondary on
 * surface.base", "kanban text.secondary on a <c> column" and "alert body and ghost dismiss
 * (text.secondary) on surface.raised (over surface.base)"; the over-limit note "kanban
 * accent.warning.text on a <c> column". Card text: "text.primary on surface.raised (over
 * surface.base)", "text.primary on surface.raised nested in surface.raised (over surface.base)" and,
 * on a coloured column, the "kanban <token> on a <c> card" rows (text.primary, text.secondary, the
 * accent texts and the category texts; text.muted is not gated there, so a card on a coloured
 * column does not use it). The lifted card's border and an empty column's border while a card is
 * over it: "checked/on fill (accent.signal.indicator) on surface.base" and "kanban
 * accent.signal.indicator on a <c> column". The placeholder's dashed outline: "rating empty star
 * (border.selection) on surface.base" and "kanban border.selection on a <c> column". Focus rings:
 * "kanban focus.ring on a <c> column" and "on a <c> card". The hairlines are decorative dividers,
 * not gated, as everywhere else.
 */
export function KanbanBoard<T>({
  label,
  columns,
  items,
  getItemId,
  getColumnId,
  getItemLabel,
  renderCard,
  renderCardCorner,
  renderCardMenu,
  onMove,
  onColumnMove,
  onColumnAdd,
  onColumnEdit,
  onColumnDelete,
  onAddCard,
  addCardLabel = 'Add card',
  tableColumns,
  tableRowHeader,
  statusLabel = 'Status',
  view: viewProp,
  defaultView = 'board',
  onViewChange,
  emptyColumnMessage = 'Nothing here',
  columnHeadingLevel = 3,
  className,
}: KanbanBoardProps<T>) {
  const reduced = useReducedMotion()
  const base = useMemo(
    () => groupKanbanItems(columns, items, getItemId, getColumnId),
    [columns, items, getItemId, getColumnId]
  )
  const byId = useMemo(() => new Map(items.map(item => [getItemId(item), item])), [items, getItemId])
  const [preview, setPreview] = useState<KanbanLayout | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeLane, setActiveLane] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [internalView, setInternalView] = useState<KanbanView>(defaultView)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  /** Remounts the dialog's form on every opening, so it starts from the column as it is now. */
  const [dialogSerial, setDialogSerial] = useState(0)
  const layout = preview ?? base
  const view: KanbanView = tableColumns === undefined ? 'board' : (viewProp ?? internalView)

  // The announcements run inside dnd-kit's event dispatch, before this component renders again,
  // so they read the current layout and names through a ref rather than a stale closure.
  // Written in a layout effect, not during render (React's rules, and a fresh project's linter,
  // flag render-time ref writes): it runs after every render, before any later pointer or key
  // event, so dnd-kit's handlers still see this render's values.
  const live = useRef({ layout, origin: base, byId, columns, getItemLabel })
  useLayoutEffect(() => {
    live.current.layout = layout
    live.current.byId = byId
    live.current.columns = columns
    live.current.getItemLabel = getItemLabel
    // The position a drag starts from, and what a cancel returns to: the parent's layout, frozen
    // while a card is held.
    if (activeId === null) live.current.origin = base
  })

  const moveButtons = useRef(new Map<string, HTMLButtonElement>())
  const moreButtons = useRef(new Map<string, HTMLButtonElement>())
  const emptyBoardButton = useRef<HTMLButtonElement | null>(null)
  const pendingFocus = useRef<string | null>(null)
  const pendingColumnFocus = useRef<string | null>(null)
  const pendingDialog = useRef<DialogState | null>(null)
  const pendingDelete = useRef<{ columnId: string; moveCardsTo: string | null; timer: number } | null>(null)
  const keyboardDrag = useRef(false)
  useEffect(() => {
    // A keyboard drag into another column remounts the card there, and focus falls to the body
    // with the old Move control. Put it on the new one, so a screen reader stays on the card.
    if (keyboardDrag.current && activeId !== null && document.activeElement === document.body) {
      moveButtons.current.get(activeId)?.focus({ preventScroll: true })
    }
    const itemId = pendingFocus.current
    if (itemId !== null) {
      const button = moveButtons.current.get(itemId)
      if (button) {
        button.focus()
        pendingFocus.current = null
      }
    }
    const columnId = pendingColumnFocus.current
    if (columnId !== null) {
      const button = columnId === EMPTY_BOARD ? emptyBoardButton.current : moreButtons.current.get(columnId)
      if (button) {
        button.focus()
        pendingColumnFocus.current = null
      }
    }
  })
  useEffect(() => () => window.clearTimeout(pendingDelete.current?.timer), [])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES })
  )

  const announcements = useMemo<Announcements>(() => {
    const titleOf = (columnId: string) => live.current.columns.find(column => column.id === columnId)?.title ?? columnId
    const labelOf = (itemId: string) => {
      const item = live.current.byId.get(itemId)
      return item === undefined ? itemId : live.current.getItemLabel(item)
    }
    const say = (message: (typeof kanbanMessages)['moved'], itemId: string, layoutNow: KanbanLayout) => {
      const position = kanbanPosition(layoutNow, itemId)
      return position ? message(labelOf(itemId), titleOf(position.columnId), position.index + 1, position.count) : undefined
    }
    const dropped = (itemId: string, over: Over | null) => {
      const target = targetOf(over)
      return target ? kanbanDrop(live.current.layout, itemId, target) : live.current.layout
    }
    const laneIndex = (columnId: string | undefined) => live.current.columns.findIndex(column => column.id === columnId)
    const sayLane = (message: (typeof kanbanMessages)['columnMoved'], columnId: string, index: number) =>
      message(titleOf(columnId), index + 1, live.current.columns.length)
    return {
      onDragStart: ({ active }) => {
        if (isLane(active)) return sayLane(kanbanMessages.columnPickedUp, dataOf(active).columnId, laneIndex(dataOf(active).columnId))
        return say(kanbanMessages.pickedUp, itemIdOf(active), live.current.origin)
      },
      // Over its own place is where every drag begins, a moment after the pickup: saying so would
      // only replace "Picked up" in the live region before it is read.
      onDragOver: ({ active, over }) => {
        if (isLane(active)) {
          const to = laneOf(over)
          return to === undefined || to === dataOf(active).columnId
            ? undefined
            : sayLane(kanbanMessages.columnOver, dataOf(active).columnId, laneIndex(to))
        }
        return over && targetOf(over)?.itemId !== itemIdOf(active)
          ? say(kanbanMessages.over, itemIdOf(active), dropped(itemIdOf(active), over))
          : undefined
      },
      onDragEnd: ({ active, over }) => {
        if (isLane(active)) {
          const columnId = dataOf(active).columnId
          const from = laneIndex(columnId)
          const to = laneOf(over) === undefined ? from : laneIndex(laneOf(over))
          return sayLane(from === to ? kanbanMessages.columnUnchanged : kanbanMessages.columnMoved, columnId, to)
        }
        const itemId = itemIdOf(active)
        const final = dropped(itemId, over)
        const before = kanbanPosition(live.current.origin, itemId)
        const after = kanbanPosition(final, itemId)
        const same = before?.columnId === after?.columnId && before?.index === after?.index
        return say(same ? kanbanMessages.unchanged : kanbanMessages.moved, itemId, final)
      },
      onDragCancel: ({ active }) => {
        if (isLane(active)) return sayLane(kanbanMessages.columnCancelled, dataOf(active).columnId, laneIndex(dataOf(active).columnId))
        return say(kanbanMessages.cancelled, itemIdOf(active), live.current.origin)
      },
    }
  }, [])

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    if (isLane(active)) {
      setActiveLane(dataOf(active).columnId)
      return
    }
    keyboardDrag.current = activatorEvent instanceof KeyboardEvent
    live.current.layout = base
    setActiveId(itemIdOf(active))
    setPreview(base)
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (isLane(active)) return
    const target = targetOf(over)
    if (!target) return
    const next = kanbanDragOver(live.current.layout, itemIdOf(active), target)
    if (next === live.current.layout) return
    live.current.layout = next
    setPreview(next)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (isLane(active)) {
      setActiveLane(null)
      const columnId = dataOf(active).columnId
      const to = laneOf(over)
      const from = columns.findIndex(column => column.id === columnId)
      const toIndex = columns.findIndex(column => column.id === to)
      if (to !== undefined && toIndex >= 0 && toIndex !== from) onColumnMove?.(columnId, toIndex)
      return
    }
    const itemId = itemIdOf(active)
    const target = targetOf(over)
    const final = target ? kanbanDrop(live.current.layout, itemId, target) : live.current.layout
    const before = kanbanPosition(live.current.origin, itemId)
    const after = kanbanPosition(final, itemId)
    setPreview(null)
    setActiveId(null)
    if (after && (before?.columnId !== after.columnId || before.index !== after.index)) {
      onMove(itemId, after.columnId, after.index)
    }
  }

  const onDragCancel = () => {
    setPreview(null)
    setActiveId(null)
    setActiveLane(null)
  }

  const titleOf = (columnId: string) => columns.find(column => column.id === columnId)?.title ?? columnId

  const moveByMenu = (itemId: string, toColumnId: string) => {
    const toIndex = layout[toColumnId]?.length ?? 0
    const item = byId.get(itemId)
    pendingFocus.current = itemId
    setStatus(kanbanMessages.moved(item === undefined ? itemId : getItemLabel(item), titleOf(toColumnId), toIndex + 1, toIndex + 1))
    onMove(itemId, toColumnId, toIndex)
  }

  const moveColumnByMenu = (columnId: string, toIndex: number) => {
    pendingColumnFocus.current = columnId
    setStatus(kanbanMessages.columnMoved(titleOf(columnId), toIndex + 1, columns.length))
    onColumnMove?.(columnId, toIndex)
  }

  const openDialog = (next: DialogState) => {
    setDialog(next)
    setDialogSerial(serial => serial + 1)
    setDialogOpen(true)
  }

  /** The delete, once its dialog has closed onto the column's More button (or, if focus never
   *  got there, a moment after). Focus then goes to the next column, or the previous one. */
  const flushDelete = () => {
    const pending = pendingDelete.current
    if (pending === null) return
    pendingDelete.current = null
    window.clearTimeout(pending.timer)
    const index = columns.findIndex(column => column.id === pending.columnId)
    const neighbour = columns[index + 1] ?? columns[index - 1]
    pendingColumnFocus.current = neighbour?.id ?? (onColumnAdd ? EMPTY_BOARD : null)
    setStatus(kanbanMessages.columnDeleted(titleOf(pending.columnId)))
    onColumnDelete?.(pending.columnId, pending.moveCardsTo)
  }

  const columnMenu = (column: KanbanColumn, index: number) => (
    <>
      <DropdownMenuLabel>{column.title}</DropdownMenuLabel>
      {onColumnEdit ? (
        <DropdownMenuItem icon={<Pencil />} onSelect={() => (pendingDialog.current = { kind: 'edit', columnId: column.id })}>
          Edit
        </DropdownMenuItem>
      ) : null}
      {onColumnMove && index > 0 ? (
        <DropdownMenuItem icon={<ArrowLeft />} onSelect={() => moveColumnByMenu(column.id, index - 1)}>
          Move left
        </DropdownMenuItem>
      ) : null}
      {onColumnMove && index < columns.length - 1 ? (
        <DropdownMenuItem icon={<ArrowRight />} onSelect={() => moveColumnByMenu(column.id, index + 1)}>
          Move right
        </DropdownMenuItem>
      ) : null}
      {onColumnDelete ? (
        <>
          {onColumnEdit || (onColumnMove && columns.length > 1) ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            tone="hostile"
            icon={<Trash2 />}
            onSelect={() => (pendingDialog.current = { kind: 'delete', columnId: column.id })}
          >
            Delete
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  )

  const onColumnMenuCloseAutoFocus = (columnId: string, event: Event) => {
    const next = pendingDialog.current
    if (next !== null) {
      // The dialog opens once the menu has handed focus back to the More button, so that button
      // is what the dialog records as its opener and returns focus to.
      pendingDialog.current = null
      event.preventDefault()
      moreButtons.current.get(columnId)?.focus()
      openDialog(next)
      return
    }
    if (pendingColumnFocus.current === columnId) event.preventDefault()
  }

  const hasMenu = Boolean(onColumnEdit || onColumnDelete || onColumnMove)
  const hasHeaderActions = hasMenu || Boolean(onColumnAdd)
  const metaRow = hasHeaderActions && columns.some(column => column.meta !== undefined || column.limit !== undefined)

  const motion: Motion = reduced ? null : motionTokens()
  const dropAnimation: DropAnimation | null = motion ? { ...defaultDropAnimation, ...motion } : null
  const activeItem = activeId === null ? undefined : byId.get(activeId)
  const activeColumn = activeId === null ? undefined : columns.find(column => layout[column.id]?.includes(activeId))
  const draggedLane = activeLane === null ? undefined : columns.find(column => column.id === activeLane)
  const Heading = `h${columnHeadingLevel}` as const

  const dialogColumn = dialog && dialog.kind !== 'add' ? columns.find(column => column.id === dialog.columnId) : undefined
  const dialogIndex = dialogColumn ? columns.indexOf(dialogColumn) : -1
  const closeDialog = (open: boolean) => {
    setDialogOpen(open)
    if (!open && pendingDelete.current) {
      const pending = pendingDelete.current
      window.clearTimeout(pending.timer)
      pending.timer = window.setTimeout(flushDelete, 600)
    }
  }

  const setView = (next: KanbanView) => {
    if (viewProp === undefined) setInternalView(next)
    onViewChange?.(next)
  }

  const card = (item: T, itemId: string, column: KanbanColumn) => {
    const itemLabel = getItemLabel(item)
    return (
      <KanbanCard
        key={itemId}
        itemId={itemId}
        columnId={column.id}
        label={itemLabel}
        color={column.color}
        dragging={activeId !== null}
        laneDragging={activeLane !== null}
        motion={motion}
        buttonRef={button => {
          if (button) moveButtons.current.set(itemId, button)
          else if (moveButtons.current.get(itemId)?.isConnected === false) moveButtons.current.delete(itemId)
        }}
        menu={
          renderCardMenu ? (
            renderCardMenu(item, toColumnId => moveByMenu(itemId, toColumnId), column.id)
          ) : (
            <>
              <DropdownMenuLabel>{itemLabel}</DropdownMenuLabel>
              {columns
                .filter(other => other.id !== column.id)
                .map(other => (
                  <DropdownMenuItem key={other.id} onSelect={() => moveByMenu(itemId, other.id)}>
                    Move to {other.title}
                  </DropdownMenuItem>
                ))}
            </>
          )
        }
        onMenuCloseAutoFocus={event => {
          if (pendingFocus.current === itemId) event.preventDefault()
        }}
        corner={renderCardCorner?.(item)}
      >
        {renderCard(item)}
      </KanbanCard>
    )
  }

  return (
    <section aria-label={label} className={cn('min-w-0 max-w-full flex flex-col gap-3', className)}>
      {tableColumns === undefined ? null : (
        <SegmentedControl
          label="View"
          size="sm"
          className="self-start"
          value={view}
          onValueChange={next => setView(next as KanbanView)}
          options={[
            { value: 'board', label: 'Board', icon: <SquareKanban /> },
            { value: 'table', label: 'Table', icon: <Table2 /> },
          ]}
        />
      )}
      {view === 'table' && tableColumns !== undefined ? (
        <KanbanTable
          label={label}
          columns={columns}
          layout={base}
          byId={byId}
          getItemLabel={getItemLabel}
          tableColumns={tableColumns}
          rowHeader={tableRowHeader ?? tableColumns[0]?.key ?? ''}
          statusLabel={statusLabel}
          emptyMessage={emptyColumnMessage}
          onMoveTo={(itemId, columnId) => {
            const toIndex = base[columnId]?.length ?? 0
            const item = byId.get(itemId)
            setStatus(kanbanMessages.moved(item === undefined ? itemId : getItemLabel(item), titleOf(columnId), toIndex + 1, toIndex + 1))
            onMove(itemId, columnId, toIndex)
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          {/* 6px of padding so the columns' crosshair arms, drawn 5px outside them, are not cut by
              the scroll container. */}
          <div className="overflow-x-auto p-1.5">
            {columns.length === 0 && onColumnAdd ? (
              <div className="flex items-center justify-center min-h-40 border border-dashed border-[var(--color-border-hairline-strong)] p-6">
                <Button
                  ref={emptyBoardButton}
                  variant="secondary"
                  size="sm"
                  iconStart={<Plus />}
                  onClick={() => openDialog({ kind: 'add', afterColumnId: null })}
                >
                  Add column
                </Button>
              </div>
            ) : null}
            <SortableContext id="kanban-lanes" items={columns.map(column => laneKey(column.id))} strategy={horizontalListSortingStrategy}>
              <ol role="list" className="flex gap-4 list-none m-0 p-0">
                {columns.map((column, index) => {
                  const ids = layout[column.id] ?? []
                  return (
                    <KanbanColumnView
                      key={column.id}
                      column={column}
                      count={ids.length}
                      sortableIds={ids.map(cardKey)}
                      Heading={Heading}
                      emptyMessage={emptyColumnMessage}
                      motion={motion}
                      movable={Boolean(onColumnMove)}
                      cardDragging={activeId !== null}
                      metaRow={metaRow}
                      actions={
                        hasHeaderActions ? (
                          <>
                            {onColumnAdd ? (
                              <IconButton
                                label={`Add a column after ${column.title}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => openDialog({ kind: 'add', afterColumnId: column.id })}
                              >
                                <Plus aria-hidden="true" className="w-4 h-4" />
                              </IconButton>
                            ) : null}
                            {hasMenu ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton
                                    ref={button => {
                                      if (button) moreButtons.current.set(column.id, button)
                                      else if (moreButtons.current.get(column.id)?.isConnected === false) moreButtons.current.delete(column.id)
                                    }}
                                    label={`${column.title} column options`}
                                    variant="ghost"
                                    size="sm"
                                    onFocus={() => {
                                      if (pendingDelete.current?.columnId === column.id) flushDelete()
                                    }}
                                  >
                                    <Ellipsis aria-hidden="true" className="w-4 h-4" />
                                  </IconButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onCloseAutoFocus={event => onColumnMenuCloseAutoFocus(column.id, event)}>
                                  {columnMenu(column, index)}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </>
                        ) : null
                      }
                      footer={
                        onAddCard ? (
                          // The name starts with the visible words (SC 2.5.3), then says which column.
                          <Button
                            variant="ghost"
                            size="sm"
                            fullWidth
                            iconStart={<Plus />}
                            aria-label={`${addCardLabel} to ${column.title}`}
                            onClick={() => onAddCard(column.id)}
                          >
                            {addCardLabel}
                          </Button>
                        ) : null
                      }
                    >
                      {ids.map(itemId => {
                        const item = byId.get(itemId)
                        return item === undefined ? null : card(item, itemId, column)
                      })}
                    </KanbanColumnView>
                  )
                })}
              </ol>
            </SortableContext>
          </div>
          {typeof document === 'undefined'
            ? null
            : createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                  {activeItem !== undefined ? (
                    <CardCopy color={activeColumn?.color} corner={renderCardCorner?.(activeItem)} lifted>
                      {renderCard(activeItem)}
                    </CardCopy>
                  ) : draggedLane !== undefined ? (
                    <div aria-hidden="true" inert className="h-full w-full">
                      <div
                        className={cn(COLUMN, 'h-full cursor-grabbing bg-[var(--color-surface-base)]')}
                        style={{ border: '2px solid var(--color-accent-signal-indicator)' }}
                      >
                        <Tint color={draggedLane.color} opacity={KANBAN_TINT.column} />
                        <div
                          className={cn(
                            'relative px-3 py-2.5 border-b border-[var(--color-border-hairline)]',
                            metaRow ? 'flex flex-col gap-1' : 'flex items-baseline justify-between gap-3'
                          )}
                        >
                          <span className={cn(TITLE, 'whitespace-nowrap leading-8')} style={titleStyle(draggedLane.color)}>
                            {draggedLane.title}
                          </span>
                          <span className={META}>
                            <MetaLine column={draggedLane} count={layout[draggedLane.id]?.length ?? 0} />
                          </span>
                        </div>
                        <div className="relative flex flex-col gap-2 p-2">
                          {(layout[draggedLane.id] ?? []).map(itemId => {
                            const item = byId.get(itemId)
                            return item === undefined ? null : (
                              <CardCopy key={itemId} color={draggedLane.color} corner={renderCardCorner?.(item)}>
                                {renderCard(item)}
                              </CardCopy>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body
              )}
        </DndContext>
      )}
      <div role="status" className="sr-only">
        {status}
      </div>
      {dialog?.kind === 'add' ? (
        <KanbanColumnFormDialog
          key={dialogSerial}
          open={dialogOpen}
          onOpenChange={closeDialog}
          title="New column"
          submitLabel="Add column"
          initial={{ title: '' }}
          onSubmit={draft => {
            setDialogOpen(false)
            setStatus(kanbanMessages.columnAdded(draft.title))
            onColumnAdd?.(dialog.afterColumnId, draft)
          }}
        />
      ) : null}
      {dialog?.kind === 'edit' && dialogColumn ? (
        <KanbanColumnFormDialog
          key={dialogSerial}
          open={dialogOpen}
          onOpenChange={closeDialog}
          title={`Edit ${dialogColumn.title}`}
          submitLabel="Save"
          initial={{ title: dialogColumn.title, color: dialogColumn.color, limit: dialogColumn.limit }}
          onSubmit={draft => {
            setDialogOpen(false)
            onColumnEdit?.(dialogColumn.id, draft)
          }}
        />
      ) : null}
      {dialog?.kind === 'delete' && dialogColumn ? (
        <KanbanColumnDeleteDialog
          key={dialogSerial}
          open={dialogOpen}
          onOpenChange={closeDialog}
          columnTitle={dialogColumn.title}
          cardCount={base[dialogColumn.id]?.length ?? 0}
          others={[...columns.slice(dialogIndex + 1), ...columns.slice(0, dialogIndex).reverse()]}
          onConfirm={moveCardsTo => {
            pendingDelete.current = { columnId: dialogColumn.id, moveCardsTo, timer: 0 }
          }}
        />
      ) : null}
    </section>
  )
}

function KanbanColumnView({
  column,
  count,
  sortableIds,
  Heading,
  emptyMessage,
  motion,
  movable,
  cardDragging,
  metaRow,
  actions,
  footer,
  children,
}: {
  column: KanbanColumn
  count: number
  sortableIds: string[]
  Heading: 'h2' | 'h3' | 'h4'
  emptyMessage: string
  motion: Motion
  movable: boolean
  cardDragging: boolean
  metaRow: boolean
  actions: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  // A column is a drop target of its own only while it is empty: with cards in it, a card lands
  // on a card, and the keyboard's arrow keys step between cards rather than onto the column.
  const { setNodeRef, isOver } = useDroppable({
    id: columnKey(column.id),
    data: { type: 'column', columnId: column.id } satisfies DragData,
    disabled: count > 0,
  })
  // The whole column as a sortable item in the row of columns. While a card is held it is no
  // target at all, so a card's keyboard drag never steps onto a column.
  const lane = useSortable({
    id: laneKey(column.id),
    data: { type: 'lane', columnId: column.id } satisfies DragData,
    disabled: { draggable: !movable, droppable: cardDragging },
    transition: motion,
  })
  const { onKeyDown: _laneKey, ...laneListeners } = lane.listeners ?? {}
  void _laneKey
  const keepFromDrag = (event: SyntheticEvent) => event.stopPropagation()
  const placeholder = lane.isDragging

  return (
    // 18rem: the longest title here with its count and a six-figure total ("Negotiation", "5 deals ·
    // €112,720") is about 270px on one line. Narrower, the meta wraps in that one column, its
    // header grows a line and every card in it sits lower than its neighbours'. With header
    // buttons, the meta takes a second line in every column instead, for the same reason.
    <li
      ref={lane.setNodeRef}
      data-kanban-column={column.id}
      className={COLUMN}
      style={{
        transform: CSS.Translate.toString(lane.transform),
        transition: lane.transition,
        ...(placeholder ? { borderStyle: 'dashed', borderColor: 'var(--color-border-selection)' } : null),
      }}
    >
      {placeholder ? null : <Tint color={column.color} opacity={KANBAN_TINT.column} />}
      <div
        ref={movable ? lane.setActivatorNodeRef : undefined}
        {...(movable ? laneListeners : null)}
        className={cn(
          'relative px-3 py-2.5 border-b border-[var(--color-border-hairline)]',
          actions ? 'flex flex-col gap-1 py-1.5 pr-1.5' : 'flex items-baseline justify-between gap-3',
          movable && 'cursor-grab',
          placeholder && 'opacity-0'
        )}
      >
        {actions ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <Heading id={headingId} className={cn(TITLE, 'min-w-0 truncate')} style={titleStyle(column.color)}>
                {column.title}
              </Heading>
              <div className="flex items-center shrink-0" onMouseDown={keepFromDrag} onTouchStart={keepFromDrag}>
                {actions}
              </div>
            </div>
            {metaRow ? (
              <div className={cn(META, 'min-h-4 pb-1')}>
                <MetaLine column={column} count={count} />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <Heading id={headingId} className={cn(TITLE, 'whitespace-nowrap')} style={titleStyle(column.color)}>
              {column.title}
            </Heading>
            {column.meta === undefined && column.limit === undefined ? null : (
              <div className={META}>
                <MetaLine column={column} count={count} />
              </div>
            )}
          </>
        )}
      </div>
      <div ref={setNodeRef} className={cn('relative flex flex-col grow gap-2 p-2 min-h-24', placeholder && 'opacity-0')}>
        <SortableContext id={column.id} items={sortableIds} strategy={verticalListSortingStrategy}>
          {count === 0 ? (
            <p
              className="grow flex items-center justify-center p-4 text-center font-body text-sm text-[var(--color-text-secondary)] border border-dashed"
              style={{ borderColor: isOver ? 'var(--color-accent-signal-indicator)' : 'var(--color-border-hairline-strong)' }}
            >
              {emptyMessage}
            </p>
          ) : (
            <ul role="list" aria-labelledby={headingId} className="flex flex-col gap-2 list-none m-0 p-0">
              {children}
            </ul>
          )}
        </SortableContext>
        {footer}
      </div>
    </li>
  )
}

/** A card drawn outside the board (the lifted card, or a card in a lifted column): the same frame
 *  and tint, a grip where the Move control is, nothing focusable. */
function CardCopy({
  color,
  corner,
  lifted = false,
  children,
}: {
  color?: CategoryColor
  corner?: ReactNode
  lifted?: boolean
  children: ReactNode
}) {
  return (
    <div
      aria-hidden="true"
      inert
      className={cn(FRAME, lifted && 'cursor-grabbing w-full h-full')}
      style={lifted ? { border: '2px solid var(--color-accent-signal-indicator)' } : undefined}
    >
      <Tint color={color} opacity={KANBAN_TINT.card} />
      <div className="relative min-w-0 grow">{children}</div>
      <div className={SIDE}>
        <span className="inline-flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)]">
          <GripVertical className="w-4 h-4" />
        </span>
        {corner}
      </div>
    </div>
  )
}

function KanbanCard({
  itemId,
  columnId,
  label,
  color,
  dragging,
  laneDragging,
  motion,
  buttonRef,
  menu,
  onMenuCloseAutoFocus,
  corner,
  children,
}: {
  itemId: string
  columnId: string
  label: string
  color?: CategoryColor
  dragging: boolean
  laneDragging: boolean
  motion: Motion
  buttonRef: (button: HTMLButtonElement | null) => void
  menu: ReactNode
  onMenuCloseAutoFocus: (event: Event) => void
  corner?: ReactNode
  children: ReactNode
}) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({
    id: cardKey(itemId),
    data: { type: 'card', itemId, columnId } satisfies DragData,
    // While a column is held, cards are no targets: the column lands on columns only.
    disabled: { draggable: false, droppable: laneDragging },
    transition: motion,
  })
  // The pointer listeners go on the frame, the keyboard one on the Move control only.
  const { onKeyDown: onDragKey, ...pointerListeners } = listeners ?? {}
  const keepFromDrag = (event: SyntheticEvent) => event.stopPropagation()

  return (
    <li
      ref={setNodeRef}
      data-kanban-card={itemId}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="relative"
    >
      <div
        {...pointerListeners}
        className={cn(FRAME, 'cursor-grab')}
        style={isDragging ? { borderStyle: 'dashed', borderColor: 'var(--color-border-selection)' } : undefined}
      >
        {isDragging ? null : <Tint color={color} opacity={KANBAN_TINT.card} />}
        <div className={cn('relative min-w-0 grow', isDragging && 'opacity-0')}>{children}</div>
        <div className={SIDE}>
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onKeyDown={(event: ReactKeyboardEvent) => {
                // While a drag is live, every key belongs to it: the menu must not open on an arrow.
                if (dragging) event.preventDefault()
              }}
            >
              <IconButton
                ref={button => {
                  setActivatorNodeRef(button)
                  buttonRef(button)
                }}
                label={`Move ${label}`}
                variant="ghost"
                size="sm"
                aria-describedby={attributes['aria-describedby']}
                onKeyDown={onDragKey as ((event: ReactKeyboardEvent) => void) | undefined}
                onMouseDown={keepFromDrag}
                onTouchStart={keepFromDrag}
                className="cursor-pointer"
              >
                <GripVertical aria-hidden="true" className="w-4 h-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={onMenuCloseAutoFocus}>
              {menu}
            </DropdownMenuContent>
          </DropdownMenu>
          {corner === undefined ? null : <div className={cn(isDragging && 'opacity-0')}>{corner}</div>}
        </div>
      </div>
    </li>
  )
}
