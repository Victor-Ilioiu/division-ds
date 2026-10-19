import {
  useEffect,
  useId,
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
  closestCorners,
  defaultDropAnimation,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type Over,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { readCssVar } from '../../../lib/tokens-runtime'
import { IconButton } from '../../atoms/icon-button/IconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../molecules/dropdown-menu/DropdownMenu'

export type KanbanColumn = {
  id: string
  title: string
  /** Beside the title, in mono: a count, a total. */
  meta?: ReactNode
}

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
  /** Controlled: the board never reorders `items` itself. `toIndex` is the card's position in the
   *  destination column once it is there (0 is the top). `applyKanbanMove` does the update. */
  onMove: (itemId: string, toColumnId: string, toIndex: number) => void
  /** Shown in a column with no cards, where a card can still be dropped. @default 'Nothing here' */
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

type DragData = { type: 'card'; itemId: string; columnId: string } | { type: 'column'; columnId: string }

function itemIdOf(active: Active): string {
  return (active.data.current as DragData & { type: 'card' }).itemId
}

function targetOf(over: Over | null): KanbanTarget | undefined {
  const data = over?.data.current as DragData | undefined
  if (!data) return undefined
  return data.type === 'card' ? { columnId: data.columnId, itemId: data.itemId } : { columnId: data.columnId }
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

const FRAME = 'panel flex items-start gap-2 p-3 pr-2 font-body text-sm text-[var(--color-text-primary)]'
/** The card's right edge: the Move control at the top and, when there is one, the corner mark at
 *  the bottom, so the mark sits in the card's own corner and not at the end of a body row. */
const SIDE = 'flex flex-col items-center justify-between gap-2 self-stretch shrink-0'

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
 *   Movements).
 *
 * The Move control is one IconButton doing two jobs: the menu's trigger and the keyboard drag's
 * activator. They share it by key: dnd-kit is set to start on Space only and calls
 * preventDefault, which Radix's trigger reads as "not mine"; while a drag is live every key on
 * the control is prevented for Radix, so an arrow moves the card and never opens the menu. A
 * pointer press on the control is kept from the card's drag listener, so it only opens the menu.
 *
 * Controlled: during a drag the board holds a preview layout (the card shown in the column it is
 * over), and on the drop it calls `onMove` once and drops the preview; the card stays where the
 * parent's next `items` put it. A drop where it started calls nothing.
 *
 * The dragged card is drawn by a DragOverlay in a portal on `document.body` (the routed view
 * carries a transform, which would offset a fixed overlay inside it); the copy is aria-hidden and
 * inert, so nothing is read or reached twice. Its place in the column is a dashed outline.
 *
 * Announcements are dnd-kit's live region, written with the card's label, the column titles and
 * a position counted from one; a menu move speaks through the board's own status region, and
 * focus goes to the moved card's Move control, wherever it now is.
 *
 * Motion: the cards making room and the drop settle on `--duration-base` and `--ease-snap`;
 * under reduced motion both are off and a card lands at once.
 *
 * Contrast rows, by exact name. Column titles: "text.primary on surface.base" and "text.primary
 * on surface.raised (over surface.base)"; column meta and the empty message: "text.secondary on
 * surface.base" and "alert body and ghost dismiss (text.secondary) on surface.raised (over
 * surface.base)". Card text: "text.primary on surface.raised (over surface.base)" and "text.primary
 * on surface.raised nested in surface.raised (over surface.base)". The lifted card's border and an
 * empty column's border while a card is over it: "checked/on fill (accent.signal.fill) on
 * surface.base". The placeholder's dashed outline: "rating empty star (border.selection) on
 * surface.base". The hairlines are decorative dividers, not gated, as everywhere else.
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
  onMove,
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
  const [status, setStatus] = useState('')
  const layout = preview ?? base

  // The announcements run inside dnd-kit's event dispatch, before this component renders again,
  // so they read the current layout and names through a ref rather than a stale closure.
  const live = useRef({ layout, origin: base, byId, columns, getItemLabel })
  live.current.layout = layout
  live.current.byId = byId
  live.current.columns = columns
  live.current.getItemLabel = getItemLabel
  // The position a drag starts from, and what a cancel returns to: the parent's layout, frozen
  // while a card is held.
  if (activeId === null) live.current.origin = base

  const moveButtons = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocus = useRef<string | null>(null)
  const keyboardDrag = useRef(false)
  useEffect(() => {
    // A keyboard drag into another column remounts the card there, and focus falls to the body
    // with the old Move control. Put it on the new one, so a screen reader stays on the card.
    if (keyboardDrag.current && activeId !== null && document.activeElement === document.body) {
      moveButtons.current.get(activeId)?.focus({ preventScroll: true })
    }
    const itemId = pendingFocus.current
    if (itemId === null) return
    const button = moveButtons.current.get(itemId)
    if (button) {
      button.focus()
      pendingFocus.current = null
    }
  })

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
    const say = (message: (typeof kanbanMessages)[keyof typeof kanbanMessages], itemId: string, layoutNow: KanbanLayout) => {
      const position = kanbanPosition(layoutNow, itemId)
      return position ? message(labelOf(itemId), titleOf(position.columnId), position.index + 1, position.count) : undefined
    }
    const dropped = (itemId: string, over: Over | null) => {
      const target = targetOf(over)
      return target ? kanbanDrop(live.current.layout, itemId, target) : live.current.layout
    }
    return {
      onDragStart: ({ active }) => say(kanbanMessages.pickedUp, itemIdOf(active), live.current.origin),
      // Over its own place is where every drag begins, a moment after the pickup: saying so would
      // only replace "Picked up" in the live region before it is read.
      onDragOver: ({ active, over }) =>
        over && targetOf(over)?.itemId !== itemIdOf(active)
          ? say(kanbanMessages.over, itemIdOf(active), dropped(itemIdOf(active), over))
          : undefined,
      onDragEnd: ({ active, over }) => {
        const itemId = itemIdOf(active)
        const final = dropped(itemId, over)
        const before = kanbanPosition(live.current.origin, itemId)
        const after = kanbanPosition(final, itemId)
        const same = before?.columnId === after?.columnId && before?.index === after?.index
        return say(same ? kanbanMessages.unchanged : kanbanMessages.moved, itemId, final)
      },
      onDragCancel: ({ active }) => say(kanbanMessages.cancelled, itemIdOf(active), live.current.origin),
    }
  }, [])

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    keyboardDrag.current = activatorEvent instanceof KeyboardEvent
    live.current.layout = base
    setActiveId(itemIdOf(active))
    setPreview(base)
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const target = targetOf(over)
    if (!target) return
    const next = kanbanDragOver(live.current.layout, itemIdOf(active), target)
    if (next === live.current.layout) return
    live.current.layout = next
    setPreview(next)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
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
  }

  const moveByMenu = (itemId: string, toColumnId: string) => {
    const toIndex = layout[toColumnId]?.length ?? 0
    const item = byId.get(itemId)
    const title = columns.find(column => column.id === toColumnId)?.title ?? toColumnId
    pendingFocus.current = itemId
    setStatus(kanbanMessages.moved(item === undefined ? itemId : getItemLabel(item), title, toIndex + 1, toIndex + 1))
    onMove(itemId, toColumnId, toIndex)
  }

  const motion = reduced ? null : motionTokens()
  const dropAnimation: DropAnimation | null = motion ? { ...defaultDropAnimation, ...motion } : null
  const activeItem = activeId === null ? undefined : byId.get(activeId)
  const Heading = `h${columnHeadingLevel}` as const

  return (
    <section aria-label={label} className={cn('min-w-0 max-w-full', className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {/* 6px of padding so the columns' crosshair arms, drawn 5px outside them, are not cut by
            the scroll container. */}
        <div className="overflow-x-auto p-1.5">
          <ol role="list" className="flex gap-4 list-none m-0 p-0">
            {columns.map(column => {
              const ids = layout[column.id] ?? []
              return (
                <KanbanColumnView
                  key={column.id}
                  column={column}
                  count={ids.length}
                  sortableIds={ids.map(cardKey)}
                  Heading={Heading}
                  emptyMessage={emptyColumnMessage}
                >
                  {ids.map(itemId => {
                    const item = byId.get(itemId)
                    if (item === undefined) return null
                    const itemLabel = getItemLabel(item)
                    return (
                      <KanbanCard
                        key={itemId}
                        itemId={itemId}
                        columnId={column.id}
                        label={itemLabel}
                        dragging={activeId !== null}
                        motion={motion}
                        buttonRef={button => {
                          if (button) moveButtons.current.set(itemId, button)
                          else if (moveButtons.current.get(itemId)?.isConnected === false) moveButtons.current.delete(itemId)
                        }}
                        menu={
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
                        }
                        onMenuCloseAutoFocus={event => {
                          if (pendingFocus.current === itemId) event.preventDefault()
                        }}
                        corner={renderCardCorner?.(item)}
                      >
                        {renderCard(item)}
                      </KanbanCard>
                    )
                  })}
                </KanbanColumnView>
              )
            })}
          </ol>
        </div>
        {typeof document === 'undefined'
          ? null
          : createPortal(
              <DragOverlay dropAnimation={dropAnimation}>
                {activeItem === undefined ? null : (
                  <div
                    aria-hidden="true"
                    inert
                    className={cn(FRAME, 'cursor-grabbing w-full h-full')}
                    style={{ border: '2px solid var(--color-accent-signal-fill)' }}
                  >
                    <div className="min-w-0 grow">{renderCard(activeItem)}</div>
                    <div className={SIDE}>
                      <span className="inline-flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)]">
                        <GripVertical className="w-4 h-4" />
                      </span>
                      {renderCardCorner?.(activeItem)}
                    </div>
                  </div>
                )}
              </DragOverlay>,
              document.body
            )}
      </DndContext>
      <div role="status" className="sr-only">
        {status}
      </div>
    </section>
  )
}

function KanbanColumnView({
  column,
  count,
  sortableIds,
  Heading,
  emptyMessage,
  children,
}: {
  column: KanbanColumn
  count: number
  sortableIds: string[]
  Heading: 'h2' | 'h3' | 'h4'
  emptyMessage: string
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
  return (
    // 18rem: the longest title here with its count and a six-figure total ("Negotiation", "5 deals ·
    // €112,720") is about 270px on one line. Narrower, the meta wraps in that one column, its
    // header grows a line and every card in it sits lower than its neighbours'.
    <li className="crosshair flex flex-col flex-1 min-w-[18rem] border border-[var(--color-border-hairline)]">
      <div className="flex items-baseline justify-between gap-3 px-3 py-2.5 border-b border-[var(--color-border-hairline)]">
        <Heading
          id={headingId}
          className="whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-primary)]"
        >
          {column.title}
        </Heading>
        {column.meta === undefined ? null : (
          <div className="whitespace-nowrap font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">{column.meta}</div>
        )}
      </div>
      <div ref={setNodeRef} className="flex flex-col grow p-2 min-h-24">
        <SortableContext id={column.id} items={sortableIds} strategy={verticalListSortingStrategy}>
          {count === 0 ? (
            <p
              className="grow flex items-center justify-center p-4 text-center font-body text-sm text-[var(--color-text-secondary)] border border-dashed"
              style={{ borderColor: isOver ? 'var(--color-accent-signal-fill)' : 'var(--color-border-hairline-strong)' }}
            >
              {emptyMessage}
            </p>
          ) : (
            <ul role="list" aria-labelledby={headingId} className="flex flex-col gap-2 list-none m-0 p-0">
              {children}
            </ul>
          )}
        </SortableContext>
      </div>
    </li>
  )
}

function KanbanCard({
  itemId,
  columnId,
  label,
  dragging,
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
  dragging: boolean
  motion: { duration: number; easing: string } | null
  buttonRef: (button: HTMLButtonElement | null) => void
  menu: ReactNode
  onMenuCloseAutoFocus: (event: Event) => void
  corner?: ReactNode
  children: ReactNode
}) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({
    id: cardKey(itemId),
    data: { type: 'card', itemId, columnId } satisfies DragData,
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
        <div className={cn('min-w-0 grow', isDragging && 'opacity-0')}>{children}</div>
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
