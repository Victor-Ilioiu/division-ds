import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { IconButton } from '../../atoms'

export type CarouselProps = {
  /** Required: the carousel's accessible name, e.g. "Offers". Without it the region is one more
   *  unnamed landmark, and two carousels on a page cannot be told apart. */
  label: string
  /** Each child becomes one item of the list. */
  children: ReactNode
  /** The width of one item, any CSS length. A percentage is of the track's own width.
   *  @default 'min(18rem, 80%)': never wider than four fifths of the track, so the next item
   *  always shows its edge. */
  itemWidth?: string
  /** The space between the track's edge and its first and last item, any CSS length. Never less
   *  than 0.5rem, whatever is passed: that inset is where an edge item's focus ring is drawn.
   *  @default '0.5rem' */
  gutter?: string
  className?: string
  ref?: Ref<HTMLElement>
}

type Position = { first: number; last: number; count: number; atStart: boolean; atEnd: boolean }

const AT_REST: Position = { first: 0, last: 0, count: 0, atStart: true, atEnd: true }

/** What makes a descendant a tab stop. If the track holds one, the items are the way through it
 *  by keyboard and the track itself stays out of the tab order. */
const TAB_STOP = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** How long the track has to be still before a press on Previous or Next is announced. Longer
 *  than the gap between two scroll events of one smooth scroll, so the announcement names where
 *  the track came to rest and not a point it passed through. */
const SETTLE_MS = 160

/** The track's own content edges in viewport coordinates: its box, less the gutter on each side.
 *  Everything here is measured with `getBoundingClientRect`, never `offsetLeft`, which is
 *  relative to the nearest positioned ancestor and not to the track. */
function edges(track: HTMLElement) {
  const box = track.getBoundingClientRect()
  const style = getComputedStyle(track)
  return {
    start: box.left + (parseFloat(style.paddingLeft) || 0),
    end: box.right - (parseFloat(style.paddingRight) || 0),
  }
}

function itemRects(track: HTMLElement) {
  return Array.from(track.children, item => item.getBoundingClientRect())
}

function maxScroll(track: HTMLElement) {
  return Math.max(0, track.scrollWidth - track.clientWidth)
}

/** Which items are showing: the ones whose centre is inside the track. An item cut by the edge
 *  counts once more than half of it is in. */
function read(track: HTMLElement): Position {
  const { left, right } = track.getBoundingClientRect()
  const rects = itemRects(track)
  const centred = rects.flatMap((rect, index) => {
    const centre = rect.left + rect.width / 2
    return centre >= left - 1 && centre <= right + 1 ? [index] : []
  })
  return {
    first: centred.length > 0 ? centred[0] + 1 : 0,
    last: centred.length > 0 ? centred[centred.length - 1] + 1 : 0,
    count: rects.length,
    atStart: track.scrollLeft <= 1,
    atEnd: track.scrollLeft >= maxScroll(track) - 1,
  }
}

/**
 * Where a press on Previous or Next should bring the track to rest. Computed from the items
 * rather than "one track width along", because a width lands part-way into an item and the snap
 * then picks whichever neighbour is nearer: with four and three quarter items showing it skips
 * the fifth altogether.
 *
 * Next: the first item that is not fully in view becomes the first item. Previous: go back as
 * far as possible while the item just before the first one in view still ends up fully in view,
 * so nothing is skipped in that direction either.
 */
function pageTarget(track: HTMLElement, direction: 'previous' | 'next'): number {
  const { start, end } = edges(track)
  const rects = itemRects(track)
  const clamp = (left: number) => Math.min(Math.max(0, left), maxScroll(track))
  if (direction === 'next') {
    const next = rects.find(rect => rect.right > end + 1)
    return next ? clamp(track.scrollLeft + next.left - start) : maxScroll(track)
  }
  const firstInView = rects.findIndex(rect => rect.left >= start - 1)
  const before = rects[(firstInView === -1 ? rects.length : firstInView) - 1]
  if (!before) return 0
  const limit = before.right - (end - start)
  const target = rects.find(rect => rect.left >= limit - 1) ?? before
  return clamp(track.scrollLeft + target.left - start)
}

function positionText({ first, last, count }: Position): string {
  if (count === 0) return ''
  return first === last ? `${first} of ${count}` : `${first} to ${last} of ${count}`
}

/**
 * A horizontal slider of anything: a row of items that scrolls sideways, with Previous and Next.
 *
 * **Scrolling is the browser's.** The track is a native scroll container with CSS scroll snap, so
 * touch, a trackpad, shift and the wheel, and the arrow keys all move it with no JavaScript at
 * all. The two buttons are a convenience on top: each sets `scrollLeft` to the start of the next
 * (or previous) page of items and lets the same snap points do the rest. Nothing here advances on
 * a timer. There is no autoplay and no prop that adds one: content that moves on its own needs a
 * pause control (SC 2.2.2) and takes the page away from someone reading it.
 *
 * **What it is to assistive tech.** A region with `aria-roledescription="carousel"`, named by
 * the required `label`; Previous and Next ahead of the items, as the WAI-ARIA carousel pattern
 * orders them; the items as a list, so a screen reader announces "2 of 8" itself. The pattern's
 * rotation control, its `aria-live` switching and its slide-picker tabs do not apply: nothing
 * rotates. A press on Previous or Next is announced through a status region ("4 to 6 of 8") once
 * the track has come to rest; scrolling by hand is not announced, because the person doing it
 * already knows.
 *
 * **Keyboard.** The items are the tab stops when they hold anything focusable, and the browser
 * scrolls each one into view as it takes focus. Only a track with nothing focusable in it becomes
 * a tab stop itself (`tabindex="0"`), so its arrow keys can scroll it: a scroll container nobody
 * can reach by keyboard fails SC 2.1.1, and one that is a tab stop in front of eight more tab
 * stops is a stop that does nothing.
 *
 * **The edge item's focus ring is not clipped.** A scroll container clips at its padding box, so
 * the track carries its inset as padding (`gutter` at the sides, at least 0.5rem): a ring drawn
 * 4px outside an item, and a Card's crosshair arms 5px outside it, both land inside the track.
 * `overflow: visible` is not an option on a scroll container. The matching `scroll-padding` makes
 * an item snap to the gutter and not to the track's own edge.
 *
 * **Nor is an interactive card's lift.** Above and below, the track is padded 1.5rem and
 * pulled back by a 1rem negative margin: the layout is what 0.5rem of padding gave, and the clip
 * edge is 24px away from the items. That is the room an interactive Card needs (it lifts 4px and
 * its crosshair arms reach 5px past that); 0.5rem would cut the arms off in a straight line above
 * every raised card. The track therefore overlaps the last 16px of the row above it, which is why
 * that row is raised (`relative z-10`): its buttons stay on top and take their own clicks. The
 * lift is a transform, so it moves no item and no snap point.
 *
 * **No scrollbar is drawn.** The track still scrolls every way a scroll container does; what is
 * hidden is the bar. What says "there is more" is the position text, the buttons and the edge of
 * the next item, which the default item width keeps in view.
 *
 * **Ends.** Previous at the start and Next at the end are `aria-disabled`, never `disabled`: each
 * stays a tab stop, so focus does not fall to the page when the button it is on goes inert
 * (Pagination's rule, for the same reason). Both are inert when everything fits.
 *
 * **Reduced motion.** The glide is CSS `scroll-behavior: smooth` on the track, switched to `auto`
 * under `prefers-reduced-motion: reduce`. The buttons only ever assign `scrollLeft`, so there is
 * no second, scripted animation to forget to turn off.
 *
 * A closed prop set: `aria-label`, `aria-roledescription` and the track's `tabindex` are computed
 * here and there is no `rest` for a caller to override them through.
 *
 * Not handled: a right-to-left page. The start and end tests read `scrollLeft` as running from 0
 * upward, which is the left-to-right case.
 *
 * Contrast rows, by exact name: position text "text.secondary on surface.base"; the buttons
 * "button secondary border on surface.base" and "text.primary on surface.base"; the track's own
 * ring, and the buttons', "focus.ring on surface.base".
 */
export function Carousel({ label, children, itemWidth = 'min(18rem, 80%)', gutter = '0.5rem', className, ref }: CarouselProps) {
  const track = useRef<HTMLUListElement>(null)
  const [position, setPosition] = useState<Position>(AT_REST)
  const [trackIsTabStop, setTrackIsTabStop] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  /** Set by a press on Previous or Next, cleared once that press has been announced. */
  const announcePending = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const items = Children.toArray(children)

  const measure = useCallback(() => {
    const node = track.current
    if (!node) return
    const next = read(node)
    setPosition(current =>
      current.first === next.first &&
      current.last === next.last &&
      current.count === next.count &&
      current.atStart === next.atStart &&
      current.atEnd === next.atEnd
        ? current
        : next
    )
    setTrackIsTabStop(node.querySelector(TAB_STOP) === null)
  }, [])

  // After every render, before paint: the children are the caller's and can change what is
  // showing, or whether anything in the track is focusable, without this component knowing why.
  useLayoutEffect(measure)

  useEffect(() => {
    const node = track.current
    if (!node) return
    // The track's own box changing (a resize, a container that grew) changes which items fit.
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [measure])

  useEffect(() => () => clearTimeout(settleTimer.current), [])

  const announceWhenStill = () => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      announcePending.current = false
      if (track.current) setAnnouncement(positionText(read(track.current)))
    }, SETTLE_MS)
  }

  const onScroll = () => {
    measure()
    // Every scroll event of the glide a button started pushes the announcement back, so it is
    // made once, about where the track stopped.
    if (announcePending.current) announceWhenStill()
  }

  const page = (direction: 'previous' | 'next') => {
    const node = track.current
    if (!node) return
    if (direction === 'previous' ? position.atStart : position.atEnd) return
    // An assignment, not `scrollTo({ behavior })`: the glide, and its absence under reduced
    // motion, are the track's own CSS `scroll-behavior`.
    node.scrollLeft = pageTarget(node, direction)
    announcePending.current = true
    announceWhenStill()
    measure()
  }

  const text = positionText(position)

  return (
    <section
      ref={ref}
      aria-roledescription="carousel"
      aria-label={label}
      style={
        {
          '--carousel-item-width': itemWidth,
          '--carousel-gutter': `max(0.5rem, ${gutter})`,
        } as CSSProperties
      }
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
    >
      <div className="relative z-10 flex items-center justify-between gap-4 px-[var(--carousel-gutter)]">
        {/* Two nodes, never the same words at the same moment to the same reader. This one is
            what a sighted person reads and follows every scroll; it is not a live region, or a
            swipe would be narrated item by item. */}
        <p className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">{text}</p>
        {/* Mounted from the start and only its text changes: a live region has to exist before a
            change to it is announced. Written only after a press on Previous or Next. */}
        <p role="status" className="sr-only">
          {announcement}
        </p>
        <div className="flex items-center gap-2">
          <IconButton
            label="Previous items"
            variant="secondary"
            size="sm"
            aria-disabled={position.atStart || undefined}
            onClick={() => page('previous')}
          >
            <ChevronLeft aria-hidden="true" className="w-4 h-4" />
          </IconButton>
          <IconButton
            label="Next items"
            variant="secondary"
            size="sm"
            aria-disabled={position.atEnd || undefined}
            onClick={() => page('next')}
          >
            <ChevronRight aria-hidden="true" className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
      {/* role="list": `list-none` takes list semantics away in VoiceOver/Safari, not only the
          bullet (the pattern Pagination and Breadcrumbs carry). */}
      <ul
        ref={track}
        role="list"
        tabIndex={trackIsTabStop ? 0 : undefined}
        // A tab stop needs a name of its own; otherwise the region's name is enough and a second
        // copy of it on the list would be read twice.
        aria-label={trackIsTabStop ? label : undefined}
        onScroll={onScroll}
        className={cn(
          'flex list-none gap-4 overflow-x-auto overscroll-x-contain',
          'snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto',
          'px-[var(--carousel-gutter)] py-6 -my-4 scroll-px-[var(--carousel-gutter)]',
          // No scrollbar: the position text, the two buttons and the next item's edge already say
          // there is more, and a bar under a row of cards is a fourth way to say it. Scrolling
          // itself is untouched. Both spellings, because an engine honours one or the other.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // Inset, because the track can run to the viewport's edge, where a ring drawn outside
          // it would be off screen.
          'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
        )}
      >
        {items.map((item, index) => (
          // The child's own key where it has one (`Children.toArray` keeps it), so an item that
          // holds state stays with its content when the caller reorders the list.
          <li
            key={isValidElement(item) && item.key !== null ? item.key : index}
            className="w-[var(--carousel-item-width)] shrink-0 snap-start"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
