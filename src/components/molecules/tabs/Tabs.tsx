import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { Tabs as RadixTabs } from 'radix-ui'
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
 * The active tab keeps its text in `text.primary`, semibold, and a 2px `accent.signal.fill` bar
 * slides under it, drawn inside the list's padding box rather than as a border: the list scrolls
 * sideways (`overflow-x-auto` forces `overflow-y` too), so a bar pulled over the list's hairline
 * with a negative margin would be clipped. The bar reuses the gated pairs "checked/on fill (accent.signal.fill) on
 * surface.base" and "rating filled star (accent.signal.fill) on surface.raised (over
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

export function TabsList({ className, ref, children, ...rest }: TabsListProps) {
  const { variant, vertical } = useContext(TabsContext)
  const line = variant === 'line'
  const innerRef = useRef<HTMLDivElement | null>(null)
  const { box, ready } = useActiveBox(innerRef)
  const setRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }
  return (
    <RadixTabs.List
      ref={setRefs}
      // Scrolls sideways inside itself rather than pushing the page wide at 320px (SC 1.4.10).
      // It holds focusable tabs, so axe's scrollable-region-focusable rule is satisfied.
      className={cn(
        'relative flex overflow-x-auto border-b border-[var(--color-border-hairline-strong)]',
        vertical && 'flex-col shrink-0 overflow-x-visible border-b-0 border-e',
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
          'tabs-indicator pointer-events-none absolute left-0 top-0 z-0 motion-reduce:transition-none',
          'bg-[var(--color-accent-signal-fill)]',
          // The bar sits on the list's inner edge, exactly where the old inset shadow drew it.
          line && (vertical ? 'left-auto right-0 w-[2px]' : 'top-auto bottom-0 h-[2px]')
        )}
        style={indicatorStyle(box, line, vertical)}
      />
    </RadixTabs.List>
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
  'data-[state=active]:font-semibold data-[state=active]:text-[var(--color-accent-signal-ink)] data-[state=active]:hover:bg-transparent'
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
        !line && 'data-[state=active]:focus-visible:outline-[var(--color-accent-signal-ink)]',
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
