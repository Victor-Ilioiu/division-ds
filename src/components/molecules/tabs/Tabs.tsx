import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { Tabs as RadixTabs } from 'radix-ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { disabledText } from '../../../lib/disabled'

export type TabsVariant = 'fill' | 'line'

export type TabsProps = ComponentPropsWithoutRef<typeof RadixTabs.Root> & {
  /** 'fill' (default) paints the active tab with the signal fill; 'line' underlines it. */
  variant?: TabsVariant
  ref?: Ref<HTMLDivElement>
}
export type TabsListProps = ComponentPropsWithoutRef<typeof RadixTabs.List> & { ref?: Ref<HTMLDivElement> }
export type TabsTriggerProps = ComponentPropsWithoutRef<typeof RadixTabs.Trigger> & {
  /** A leading glyph, aria-hidden: the label already names the tab. */
  icon?: ReactNode
  /** A number after the label, read as part of the name: "Open (12)". */
  count?: number
  ref?: Ref<HTMLButtonElement>
}
export type TabsContentProps = ComponentPropsWithoutRef<typeof RadixTabs.Content> & { ref?: Ref<HTMLDivElement> }

type TabsShape = { variant: TabsVariant; vertical: boolean }
const TabsContext = createContext<TabsShape>({ variant: 'fill', vertical: false })

/**
 * Sections of one view, one visible at a time. The default active tab takes a signal fill, not
 * an underline: it is the grammar Select's highlighted row and the sidebar's active item already
 * use, and a second selection style would be a second language.
 *
 * `variant="line"` is the exception for a tab row that sits inside a panel already full of
 * fills (a settings page, a card header), where a block of signal would out-shout the content.
 * The active tab keeps its text in `text.primary`, semibold, and a 2px `accent.signal.indicator` bar
 * slides under it, drawn inside the list's padding box rather than as a border: the list scrolls
 * sideways (`overflow-x-auto` forces `overflow-y` too), so a bar pulled over the list's hairline
 * with a negative margin would be clipped. The bar reuses the gated pairs "checked/on fill (accent.signal.indicator) on
 * surface.base" and "rating filled star (accent.signal.indicator) on surface.raised (over
 * surface.base)", so it holds 3:1 as a UI component (SC 1.4.11) on both surfaces.
 *
 * `orientation="vertical"` is Radix's own: Up and Down replace Left and Right. Here it also lays
 * the list beside the panels, with its hairline on the inline end, and in the line variant the
 * bar moves to that edge.
 *
 * Radix supplies roles, aria-selected, aria-controls, roving tabindex, arrow keys, Home/End and
 * automatic activation. Nothing here re-implements any of that. The variant and orientation reach
 * the parts through context so a TabsTrigger needs no prop of its own to match its row.
 */
export function Tabs({ variant = 'fill', orientation, className, ref, ...rest }: TabsProps) {
  const vertical = orientation === 'vertical'
  return (
    <TabsContext.Provider value={{ variant, vertical }}>
      <RadixTabs.Root
        ref={ref}
        orientation={orientation}
        className={cn('flex flex-col gap-4', vertical && 'flex-row gap-6', className)}
        {...rest}
      />
    </TabsContext.Provider>
  )
}

type Box = { x: number; y: number; w: number; h: number }

/**
 * One indicator per list, slid under the active trigger instead of painted on each trigger, so
 * a change of tab reads as the fill (or the line) travelling rather than two things swapping.
 * It is measured from the DOM (the active trigger's offset box, relative to the list, which is
 * its offsetParent and scrolls with it) and re-measured on resize, on tab changes and when web
 * fonts land, since all three change a trigger's width. The first measure is applied with
 * transitions off (`data-ready` is only set afterwards), so it appears in place instead of
 * sliding in from zero. Radix still owns roles, state and keys: this reads `data-state`.
 */
function useActiveBox(listRef: RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState<Box | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const tab = list.querySelector<HTMLElement>(':scope > [role="tab"][data-state="active"]')
      if (!tab || tab.offsetWidth === 0) {
        setBox((prev) => (prev === null ? prev : null))
        return
      }
      const next = { x: tab.offsetLeft, y: tab.offsetTop, w: tab.offsetWidth, h: tab.offsetHeight }
      setBox((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h ? p : next))
    }
    measure()
    const mo = new MutationObserver(measure)
    mo.observe(list, { attributes: true, attributeFilter: ['data-state'], subtree: true, childList: true })
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure)
      ro.observe(list)
      list.querySelectorAll('[role="tab"]').forEach((t) => ro?.observe(t))
    }
    void document.fonts?.ready.then(measure)
    // Two frames: the in-place first paint must land before transitions are switched on.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      mo.disconnect()
      ro?.disconnect()
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [listRef])

  return { box, ready }
}

function indicatorStyle(box: Box | null, line: boolean, vertical: boolean): CSSProperties {
  if (!box) return { opacity: 0 }
  if (!line) return { opacity: 1, transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }
  return vertical
    ? { opacity: 1, transform: `translateY(${box.y}px)`, height: box.h }
    : { opacity: 1, transform: `translateX(${box.x}px)`, width: box.w }
}

type Edges = { start: boolean; end: boolean }

/**
 * Which ends of a horizontal list still hide tabs. Re-read on scroll, on resize and when tabs
 * are added, since all three move the edges. A 1px tolerance absorbs fractional scroll widths,
 * which would otherwise leave the end flagged as "more to see" with nothing there.
 */
function useScrollEdges(listRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [edges, setEdges] = useState<Edges>({ start: false, end: false })
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || !enabled) return
    const read = () => {
      const max = list.scrollWidth - list.clientWidth
      // scrollLeft is negative in right-to-left layouts, so compare its magnitude.
      const pos = Math.abs(list.scrollLeft)
      const next = { start: pos > 1, end: max - pos > 1 }
      setEdges((p) => (p.start === next.start && p.end === next.end ? p : next))
    }
    read()
    list.addEventListener('scroll', read, { passive: true })
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(read)
      ro.observe(list)
    }
    const mo = new MutationObserver(read)
    mo.observe(list, { childList: true })
    void document.fonts?.ready.then(read)
    return () => {
      list.removeEventListener('scroll', read)
      ro?.disconnect()
      mo.disconnect()
    }
  }, [listRef, enabled])
  return edges
}

type Side = 'prev' | 'next'
/** How far a clicked tab lands from the chevron it was under. */
const CLEAR_GAP = 8

/**
 * A desktop-only scroll button over one faded edge. It is out of the tab order and hidden from
 * screen readers: arrow keys already reach every tab, and Radix's roving focus scrolls each one
 * into view (clear of this button, through the list's scroll-padding).
 *
 * The misclick guard: when the list reaches this end while the pointer is still on the button,
 * the button stays where it is, disabled and dim, instead of vanishing and letting the next
 * click land on whatever was underneath. It leaves once the pointer does.
 */
function ScrollButton({
  side,
  can,
  hovered,
  onHover,
  onScroll,
}: {
  side: Side
  can: boolean
  hovered: boolean
  onHover: (side: Side | null) => void
  onScroll: (side: Side) => void
}) {
  const state = can ? 'on' : hovered ? 'spent' : 'off'
  const Icon = side === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-tabs-scroll={side}
      data-state={state}
      // aria-disabled, not disabled: a disabled button fires no pointer events, so the pointer
      // leaving it would never be seen and the dim button would stay forever.
      aria-disabled={can ? undefined : true}
      onPointerEnter={() => onHover(side)}
      onPointerLeave={() => onHover(null)}
      onClick={() => can && onScroll(side)}
      className={cn(
        'tabs-scroll-btn absolute top-1/2 z-[2] -translate-y-1/2',
        side === 'prev' ? 'start-1' : 'end-1',
        // Display comes from motion.css: the buttons exist only for a fine pointer that can hover.
        'h-8 w-8 items-center justify-center',
        'border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-raised)]',
        'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  )
}

export function TabsList({ className, ref, children, onClick, ...rest }: TabsListProps) {
  const { variant, vertical } = useContext(TabsContext)
  const line = variant === 'line'
  const innerRef = useRef<HTMLDivElement | null>(null)
  const { box, ready } = useActiveBox(innerRef)
  const edges = useScrollEdges(innerRef, !vertical)
  const [hovered, setHovered] = useState<Side | null>(null)
  const setRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }
  const scrollBySide = (side: Side) => {
    const list = innerRef.current
    if (!list) return
    const rtl = getComputedStyle(list).direction === 'rtl'
    const step = list.clientWidth * 0.8 * (side === 'next' ? 1 : -1) * (rtl ? -1 : 1)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    list.scrollBy({ left: step, behavior: reduce ? 'auto' : 'smooth' })
  }

  // A clicked tab half-hidden under a chevron is scrolled just clear of it (CLEAR_GAP past the
  // button's inner edge), not all the way past the fade: the smallest move that uncovers it.
  // Keyboard focus needs none of this; scroll-padding already handles it.
  const revealClicked = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e)
    const list = innerRef.current
    const tab = (e.target as HTMLElement).closest<HTMLElement>('[role="tab"]')
    if (vertical || !list || !tab || !list.contains(tab)) return
    const t = tab.getBoundingClientRect()
    let delta = 0
    for (const side of ['prev', 'next'] as const) {
      const btn = list.parentElement?.querySelector<HTMLElement>(`[data-tabs-scroll="${side}"][data-state="on"]`)
      if (!btn) continue
      const b = btn.getBoundingClientRect()
      if (b.width === 0) continue
      if (t.left < b.right && t.right > b.left) {
        delta = side === 'prev' ? t.left - (b.right + CLEAR_GAP) : t.right - (b.left - CLEAR_GAP)
      }
    }
    if (delta === 0) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    list.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' })
  }

  const list = (
    <RadixTabs.List
      ref={setRefs}
      onClick={revealClicked}
      data-overflow-start={!vertical && edges.start ? '' : undefined}
      data-overflow-end={!vertical && edges.end ? '' : undefined}
      // Scrolls sideways inside itself rather than pushing the page wide at 320px (SC 1.4.10).
      // It holds focusable tabs, so axe's scrollable-region-focusable rule is satisfied. The
      // scrollbar is hidden (tabs-scroll); the faded edges and, on desktop, the chevrons say
      // there is more instead.
      className={cn(
        'relative flex',
        vertical ? 'flex-col shrink-0 border-e border-[var(--color-border-hairline-strong)]' : 'tabs-scroll overflow-x-auto',
        className
      )}
      {...rest}
    >
      {children}
      <span
        aria-hidden="true"
        data-tabs-indicator={line ? 'line' : 'fill'}
        data-ready={ready && box ? '' : undefined}
        className={cn(
          'tabs-indicator pointer-events-none absolute left-0 top-0 z-0 motion-reduce:transition-none',          'bg-[var(--color-accent-signal-indicator)]',
          // The bar sits on the list's inner edge, exactly where the old inset shadow drew it.
          line && (vertical ? 'left-auto right-0 w-[2px]' : 'top-auto bottom-0 h-[2px]')
        )}
        style={indicatorStyle(box, line, vertical)}
      />
    </RadixTabs.List>
  )

  if (vertical) return list
  // The hairline lives on this wrapper, not on the list: the list is masked at its scrolling
  // edges, and a border on it would fade out with the tabs.
  return (
    <div
      data-tabs-scroller=""
      data-hover-side={hovered ?? undefined}
      className="relative border-b border-[var(--color-border-hairline-strong)]"
    >
      {list}
      <ScrollButton side="prev" can={edges.start} hovered={hovered === 'prev'} onHover={setHovered} onScroll={scrollBySide} />
      <ScrollButton side="next" can={edges.end} hovered={hovered === 'next'} onHover={setHovered} onScroll={scrollBySide} />
    </div>
  )
}

const FILL_TRIGGER = cn(
  'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-accent-signal-wash)]',
  // The ring is inset, so on a hovered inactive tab it would land on the wash, where it
  // measures under 3:1 in light theme. Reachable only with activationMode="manual" (automatic
  // activation selects a tab the moment it takes focus), and dropped for that case.
  'data-[state=inactive]:focus-visible:bg-transparent',
  // Selection is fill: the grammar Select's highlighted row and the sidebar already speak. The
  // fill itself is the list's sliding indicator behind the trigger, so the trigger only switches
  // its text to the ink colour (and drops the hover wash, which would paint over the indicator).
  'data-[state=active]:font-semibold data-[state=active]:text-[var(--color-accent-signal-indicator-ink)] data-[state=active]:hover:bg-transparent'
)

// No hover wash and no fill: the line variant exists for rows that must stay quiet, and the
// focus ring therefore always lands on the page, where the default ring colour already reads.
const LINE_TRIGGER = cn(
  'hover:text-[var(--color-text-primary)]',
  'data-[state=active]:font-semibold data-[state=active]:text-[var(--color-text-primary)]'
)

export function TabsTrigger({ className, icon, count, children, ref, ...rest }: TabsTriggerProps) {
  const { variant, vertical } = useContext(TabsContext)
  const line = variant === 'line'
  const extras = icon !== undefined || count !== undefined
  return (
    <RadixTabs.Trigger
      ref={ref}
      data-variant={line ? 'line' : undefined}
      className={cn(
        'shrink-0 min-h-[40px] px-4 font-mono text-xs uppercase tracking-[0.12em]',
        'text-[var(--color-text-secondary)] transition-control',
        line ? LINE_TRIGGER : FILL_TRIGGER,
        // Above the list's indicator (z-0), which is the last child and would otherwise paint over.
        'relative z-[1]',
        (extras || vertical) && 'inline-flex items-center gap-2',
        vertical && 'justify-start text-left',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        // The active fill tab is already a signal fill, so the default focus-ring colour (also
        // signal) is invisible against it — checked in the browser, both themes. The ink colour
        // reads against the fill instead; only the active tab needs the override. See BUILD-LOG.
        !line && 'data-[state=active]:focus-visible:outline-[var(--color-accent-signal-indicator-ink)]',
        disabledText,
        !line && 'disabled:hover:bg-transparent',
        className
      )}
      {...rest}
    >
      {icon !== undefined ? (
        <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:w-4 [&>svg]:h-4">
          {icon}
        </span>
      ) : null}
      {children}
      {count !== undefined ? (
        <>
          {/* Seen as a bare figure, heard as "(12)" after the label: a screen reader announcing
              "Open 12" runs the two together into something that sounds like a name. */}
          <span aria-hidden="true" className="tabular-nums">
            {count}
          </span>
          {/* The space sits outside the sr-only span: name computation trims inside an
              element, and the name would come out as "Open(12)". A whitespace-only text node in
              the inline-flex trigger renders nothing, so the visible gap stays the gap-2. */}
          {' '}
          <span className="sr-only">({count})</span>
        </>
      ) : null}
    </RadixTabs.Trigger>
  )
}

export function TabsContent({ className, ref, ...rest }: TabsContentProps) {
  const { vertical } = useContext(TabsContext)
  return (
    <RadixTabs.Content
      ref={ref}
      className={cn(
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]',
        vertical && 'grow min-w-0',
        className
      )}
      {...rest}
    />
  )
}
