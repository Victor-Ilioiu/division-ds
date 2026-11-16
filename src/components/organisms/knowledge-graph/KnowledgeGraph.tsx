import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { cn } from '../../../lib/cn'
import { motionAllowed, onReducedMotionChange } from '../../../fx/core/gate'
import { hasWebGL2 } from '../../../fx/core/webgl'
import { Spinner } from '../../atoms/spinner/Spinner'
import { Button } from '../../atoms/button/Button'
import { PanelHeader } from '../../molecules/panel-header/PanelHeader'
import type { GraphHandle, ScenePalette } from './scene'

export type GraphCategory = 'blue' | 'brown' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'
export type GraphNode = { id: string; label: string; group: string }
export type GraphLink = { source: string; target: string }
export type GraphGroup = { id: string; label: string; color: GraphCategory }

export type KnowledgeGraphProps = {
  /** The graph's accessible name, e.g. "Map of notes". */
  label: string
  nodes: GraphNode[]
  links: GraphLink[]
  /** One entry per group, in legend order. A node whose group is missing draws in the link grey. */
  groups: GraphGroup[]
  /** Ids to light up (search matches). Everything else dims. Null or omitted lights everything. */
  highlight?: string[] | null
  /** Drop nodes with no links, the way Obsidian's "Orphans" filter does. @default false */
  hideOrphans?: boolean
  /** A note to bring the camera to, e.g. one picked in a list beside the graph. */
  focusId?: string | null
  /** A note to light as if hovered, without moving the camera: the row under the pointer in a list. */
  previewId?: string | null
  /** A panel drawn inside the graph's frame, left of the map, at the map's height: a note list. */
  aside?: ReactNode
  /** A note was picked on the map (id), or the pick was cleared by clicking empty space (null). */
  onSelect(id: string | null): void
  /** Open a note: a double click on it, or Open in its callout. */
  onOpen?(id: string): void
  /** The title in the header bar over the map. @default 'Graph' */
  title?: string
  className?: string
  ref?: Ref<HTMLDivElement>
}

/** Reads a token through a probe in `host`'s cascade, so a section `data-theme` applies. The
 *  computed value can be any CSS colour syntax (oklch, color-mix), so a 1px canvas paints it and
 *  reports plain RGB, blended over nothing: alpha is dropped on purpose for the WebGL side. */
const pixel = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d', { willReadFrequently: true })
function token(host: Element, name: string) {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.style.color = `var(${name})`
  host.appendChild(probe)
  const css = getComputedStyle(probe).color
  probe.remove()
  if (!pixel) throw new Error('KnowledgeGraph: no 2D canvas to read colours')
  pixel.clearRect(0, 0, 1, 1)
  pixel.fillStyle = css
  pixel.fillRect(0, 0, 1, 1)
  const [r, g, b] = pixel.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function readGraphPalette(host: Element, groups: GraphGroup[]): ScenePalette {
  return {
    groups: Object.fromEntries(groups.map((g) => [g.id, token(host, `--color-category-${g.color}-fill`)])),
    link: token(host, '--color-border-control'),
    accent: token(host, '--color-accent-signal-fill'),
    bg: token(host, '--color-surface-sunken'),
  }
}

/**
 * A 3D map of linked notes: one dot per note, sized by its links and coloured by group, one
 * hairline per link. Drag to orbit, scroll to zoom, hover to light a note's neighbours, click to
 * open it. Under reduced motion the layout settles before the first frame and never auto-rotates.
 * Without WebGL 2 it falls back to the visually hidden note list, shown.
 */
export function KnowledgeGraph({ label, title = 'Graph', nodes, links, groups, highlight, hideOrphans = false, focusId, previewId = null, aside, onSelect, onOpen, className, ref }: KnowledgeGraphProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const calloutRef = useRef<HTMLDivElement>(null)
  const leaderRef = useRef<SVGLineElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const hubRef = useRef<HTMLButtonElement>(null)
  // The last note picked on the map itself. A map pick selects in place, so when it comes back
  // as focusId it must not fly the camera; a pick from outside the map (a sidebar) still does.
  const mapPick = useRef<string | null>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef(new Map<string, HTMLElement>())
  const openRef = useRef(onOpen)
  openRef.current = onOpen
  const [active, setActive] = useState<string | null>(null)
  const graph = useRef<GraphHandle | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  const [animate, setAnimate] = useState(() => motionAllowed())
  const [ready, setReady] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const webgl = useMemo(() => hasWebGL2(), [])
  useEffect(() => onReducedMotionChange((reduced) => setAnimate(motionAllowed(reduced))), [])

  const shown = useMemo(() => {
    if (!hideOrphans) return { nodes, links }
    const linked = new Set(links.flatMap((l) => [l.source, l.target]))
    return { nodes: nodes.filter((n) => linked.has(n.id)), links }
  }, [nodes, links, hideOrphans])
  // Rebuild only when the graph's shape changes, not on every poll that returns the same notes.
  const shape = useMemo(() => JSON.stringify([shown.nodes.map((n) => n.id), shown.links]), [shown])

  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current, layer = layerRef.current, cursor = cursorRef.current
    const callout = calloutRef.current, leader = leaderRef.current, readout = readoutRef.current, hub = hubRef.current, marker = markerRef.current
    if (!webgl || !host || !canvas || !layer || !cursor || !callout || !leader || !readout || !hub || !marker) return
    let cancelled = false
    import('./scene').then(({ mountGraph }) => {
      if (cancelled) return
      graph.current = mountGraph(canvas, {
        nodes: shown.nodes, links: shown.links, animate,
        palette: readGraphPalette(host, groups),
        labelLayer: layer,
        cursor, callout, leader, readout, hub, marker,
        groupLabels: pillRefs.current,
        labelClass: 'absolute left-0 top-0 whitespace-nowrap text-sm leading-none text-[var(--color-text-secondary)] [text-shadow:0_0_4px_var(--color-surface-sunken)] will-change-transform opacity-0 transition-opacity duration-[var(--duration-base)] motion-reduce:transition-none data-[shown=true]:opacity-100 data-[active=true]:text-[var(--color-text-primary)] data-[active=true]:font-medium',
        onHover: setHovered,
        onSelect: (id) => { mapPick.current = id; setActive(id); selectRef.current(id) },
        onOpen: (id) => openRef.current?.(id),
      })
      setReady(true)
    })
    return () => { cancelled = true; graph.current?.dispose(); graph.current = null; setReady(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, animate, webgl])

  useEffect(() => {
    if (!focusId) return
    if (focusId === mapPick.current) graph.current?.select(focusId)
    else graph.current?.focus(focusId)
    setActive(focusId)
  }, [focusId, ready])
  const resetView = () => { mapPick.current = null; graph.current?.reset(); setActive(null); selectRef.current(null) }
  useEffect(() => { graph.current?.setPreview(previewId) }, [previewId, ready])
  useEffect(() => { graph.current?.setHighlight(highlight ? new Set(highlight) : null) }, [highlight, ready])

  // A theme flip changes the tokens; repaint from the new values.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const mo = new MutationObserver(() => graph.current?.setPalette(readGraphPalette(host, groups)))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    if (typeof matchMedia !== 'function') return () => mo.disconnect()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => graph.current?.setPalette(readGraphPalette(host, groups))
    mq.addEventListener('change', onScheme)
    return () => { mo.disconnect(); mq.removeEventListener('change', onScheme) }
  }, [groups])

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const n of shown.nodes) out[n.group] = (out[n.group] ?? 0) + 1
    return out
  }, [shown.nodes])
  const linkCount = useMemo(() => {
    const out: Record<string, number> = {}
    for (const l of shown.links) { out[l.source] = (out[l.source] ?? 0) + 1; out[l.target] = (out[l.target] ?? 0) + 1 }
    return out
  }, [shown.links])
  const byId = useMemo(() => new Map(shown.nodes.map((n) => [n.id, n])), [shown.nodes])
  const groupLabel = (id: string) => groups.find((g) => g.id === id)?.label ?? id
  // The callout follows the note under the pointer, else the row under the pointer, else the active note.
  const calloutId = hovered ?? previewId ?? active
  const calloutNode = calloutId ? byId.get(calloutId) : undefined
  const calloutIsActive = Boolean(calloutNode && calloutId === active)
  const activeNode = active ? byId.get(active) : undefined

  return (
    <div ref={ref} className={cn('flex flex-col gap-3', className)}>
      <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden border border-[var(--color-border-hairline)] bg-[var(--color-surface-sunken)] lg:flex-row">
        {aside && (
          <div className="max-h-48 shrink-0 overflow-y-auto overflow-x-hidden border-b border-[var(--color-border-hairline)] lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r">
            {aside}
          </div>
        )}
      <div
        ref={hostRef}
        role="img"
        aria-label={`${label}: ${shown.nodes.length} notes, ${shown.links.length} links`}
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        hidden={!webgl}
      >
        <canvas ref={canvasRef} className="block h-full w-full cursor-none touch-none" />
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
          <line ref={leaderRef} stroke="var(--color-accent-signal-fill)" strokeWidth="1" opacity="0" />
        </svg>
        <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />
        {/* Cluster pills and the hub: placed by the scene over each folder's centre and the origin. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {groups.filter((g) => counts[g.id]).map((g) => (
            <span
              key={g.id}
              ref={(el) => { if (el) pillRefs.current.set(g.id, el); else pillRefs.current.delete(g.id) }}
              className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-[var(--color-border-control)] bg-[var(--color-surface-overlay)] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]"
            >
              {g.label}
            </span>
          ))}
        </div>
        {/* The hub: the map's centre, and a button that clears the selection and flies back to
            the starting overview. */}
        <button
          ref={hubRef}
          type="button"
          onClick={resetView}
          aria-hidden
          tabIndex={-1}
          className="group/hub absolute left-0 top-0 flex flex-col items-center gap-1 rounded-sm p-1 focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <span className="grid size-5 place-items-center rounded-full border border-[var(--color-accent-signal-fill)]">
              <span className="size-1.5 rounded-full bg-[var(--color-accent-signal-fill)]" />
            </span>
          <span className="font-data whitespace-nowrap text-[11px] text-[var(--color-text-secondary)] opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover/hub:opacity-100 motion-reduce:transition-none">Reset view</span>
        </button>
        {/* Callout: title, a state tag, and a sub-line on an orange left bar, tied to its note by
            the leader line. Open appears on the active note only. */}
        <div
          ref={calloutRef}
          data-visible="false"
          className="absolute left-0 top-0 w-64 border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-overlay)] opacity-0 transition-opacity duration-[var(--duration-fast)] motion-reduce:transition-none data-[visible=true]:opacity-100 [&[data-visible=false]]:pointer-events-none"
        >
          {calloutNode && (
            <>
              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border-hairline)] px-3 py-2">
                <span className="font-data truncate text-sm font-semibold text-[var(--color-text-primary)]">{calloutNode.label}</span>
                <span className="font-data shrink-0 text-[11px] uppercase text-[var(--color-accent-signal-text)]">/ {calloutIsActive ? 'active' : 'note'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="font-data border-l-2 border-[var(--color-accent-signal-fill)] pl-2 text-[11px] uppercase text-[var(--color-text-secondary)]">
                  {groupLabel(calloutNode.group)} · {linkCount[calloutNode.id] ?? 0} links
                </span>
                {calloutIsActive && onOpen && (
                  <Button size="sm" variant="secondary" onClick={() => onOpen(calloutNode.id)}>Open</Button>
                )}
              </div>
            </>
          )}
        </div>
        {/* Active marker: the cursor's crosshair ring, held round the active note in signal orange. */}
        <div
          ref={markerRef}
          aria-hidden
          data-visible="false"
          className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-[var(--duration-base)] motion-reduce:transition-none data-[visible=true]:opacity-100"
        >
          <span className="absolute inset-0 rounded-full border border-[var(--color-accent-signal-fill)]" />
          <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--color-accent-signal-fill)]" />
          <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 translate-y-1/2 bg-[var(--color-accent-signal-fill)]" />
          <span className="absolute left-0 top-1/2 h-px w-2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-accent-signal-fill)]" />
          <span className="absolute right-0 top-1/2 h-px w-2 -translate-y-1/2 translate-x-1/2 bg-[var(--color-accent-signal-fill)]" />
        </div>
        {/* The cursor: a thin circle with four ticks and a centre dot. It trails the pointer, closes
            round a note in signal orange on hover, and tightens while dragging. */}
        <div
          ref={cursorRef}
          aria-hidden
          data-visible="false"
          data-state="idle"
          className="group/cursor pointer-events-none absolute left-0 top-0 size-[18px] opacity-0 transition-opacity duration-[var(--duration-fast)] data-[visible=true]:opacity-100"
        >
          <span className="absolute inset-0 rounded-full border border-[var(--color-text-secondary)] transition-colors group-data-[state=node]/cursor:border-[var(--color-accent-signal-fill)]" />
          <span className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--color-text-secondary)] group-data-[state=node]/cursor:bg-[var(--color-accent-signal-fill)]" />
          <span className="absolute bottom-0 left-1/2 h-1.5 w-px -translate-x-1/2 translate-y-1/2 bg-[var(--color-text-secondary)] group-data-[state=node]/cursor:bg-[var(--color-accent-signal-fill)]" />
          <span className="absolute left-0 top-1/2 h-px w-1.5 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-text-secondary)] group-data-[state=node]/cursor:bg-[var(--color-accent-signal-fill)]" />
          <span className="absolute right-0 top-1/2 h-px w-1.5 -translate-y-1/2 translate-x-1/2 bg-[var(--color-text-secondary)] group-data-[state=node]/cursor:bg-[var(--color-accent-signal-fill)]" />
          <span className="absolute left-1/2 top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-text-primary)] transition-opacity group-data-[state=node]/cursor:opacity-0" />
        </div>
        {!ready && <div className="absolute inset-0 grid place-items-center"><Spinner label="Loading map" /></div>}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-4">
          <div aria-hidden><PanelHeader title={title} meta={`${shown.nodes.length} notes · ${shown.links.length} links`} level={3} /></div>
          <div className="flex items-center gap-3">
            <span aria-hidden ref={readoutRef} className="font-data whitespace-nowrap text-[11px] uppercase text-[var(--color-text-muted)]" />
            <Button size="sm" variant="secondary" className="pointer-events-auto" onClick={resetView}>Reset view</Button>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-between gap-4 font-data text-[11px] uppercase text-[var(--color-text-muted)]">
          <span className="truncate">{activeNode ? `${activeNode.label} :: active` : 'drag to orbit · scroll to zoom · double-click to open'}</span>
          {activeNode && <span className="shrink-0">{groupLabel(activeNode.group)} · {linkCount[activeNode.id] ?? 0} links</span>}
        </div>
      </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]" aria-label="Groups">
        {groups.filter((g) => counts[g.id]).map((g) => (
          <li key={g.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: `var(--color-category-${g.color}-fill)` }} />
            {g.label} <span className="font-data text-[var(--color-text-muted)]">{counts[g.id]}</span>
          </li>
        ))}
      </ul>
      {/* The same notes as buttons: the keyboard and screen-reader route, and the no-WebGL view. */}
      <ul className={webgl ? 'sr-only' : 'flex flex-col gap-1 text-sm'} aria-label={label}>
        {shown.nodes.map((n) => (
          <li key={n.id}><button type="button" className="text-left text-[var(--color-text-primary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]" onClick={() => onSelect(n.id)}>{n.label}</button></li>
        ))}
      </ul>
    </div>
  )
}
