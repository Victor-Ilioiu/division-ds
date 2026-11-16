# KnowledgeGraph

> A 3D map of linked notes. Each note is a glowing point sized by its links and coloured by group, each link a hairline, with drifting dust behind them. Hover lights a note and its neighbours, a click makes it active in place, without moving the camera: the active note glows a little brighter and is held in a crosshair ring, with a callout tied to it by a leader line, a double click opens it. Reset view at the centre clears the pick and returns to the overview. three.js loads in its own chunk, only when a graph mounts.

- **Best for:** Showing how a few dozen to a few hundred linked notes cluster, so people can find one by its neighbours.
- **Not for:** Data with a value per item or a trend: use ChartPanel. A hierarchy: use a Sidebar or a nested List.
- Organism. Source: `src/components/organisms/knowledge-graph/KnowledgeGraph.tsx`
- Rendered docs page: `/components/knowledge-graph`

## Import

```tsx
import { KnowledgeGraph } from 'src/components/organisms/knowledge-graph/KnowledgeGraph'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- WebGL 2 for the map. Without it the component shows its note list as buttons instead, so every note stays reachable.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The graph’s accessible name, for example "Map of notes". |
| `title` | `string` | `'Graph'` | The title in the header bar over the map. |
| `nodes` | `{ id: string; label: string; group: string }[]` |  | Required. One entry per note. |
| `links` | `{ source: string; target: string }[]` |  | Required. Note ids, either direction. |
| `groups` | `{ id: string; label: string; color: CategoryColor }[]` |  | Required. One per group, in legend order. Keep it to about five; a note whose group is missing draws in the link grey. |
| `highlight` | `string[] \| null` |  | Ids to light up, such as search matches. Everything else dims. null lights everything. |
| `hideOrphans` | `boolean` | `false` | Leaves out notes with no links. |
| `focusId` | `string \| null` |  | A note to bring the camera to and make active, for example one picked in a list beside the graph. A pick on the map itself does not move the camera. |
| `previewId` | `string \| null` | `null` | A note to light as if hovered, without moving the camera: the list row under the pointer. |
| `aside` | `ReactNode` |  | A panel inside the frame, left of the map from lg up and above it below lg. |
| `onSelect` | `(id: string \| null) => void` |  | Required. A note was picked (its id), or the pick was cleared by clicking empty space or Reset view (null). |
| `onOpen` | `(id: string) => void` |  | A note was opened: a double click on it, or Open in its callout. Without it the callout has no Open button. |
| `className` | `string` |  | Merged with the root's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root div. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type GraphCategory = 'blue' | 'brown' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'
```

```ts
export type GraphNode = { id: string; label: string; group: string }
```

```ts
export type GraphLink = { source: string; target: string }
```

```ts
export type GraphGroup = { id: string; label: string; color: GraphCategory }
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Forty notes in four groups

```tsx
const GROUPS: GraphGroup[] = [
  { id: 'ops', label: 'Operations', color: 'blue' },
  { id: 'stock', label: 'Stock', color: 'teal' },
  { id: 'people', label: 'People', color: 'purple' },
  { id: 'notes', label: 'Notes', color: 'gray' },
]

const TOPICS: Record<string, string[]> = {
  ops: ['Packing guide', 'Carrier rates', 'Returns flow', 'Label printer setup', 'Pick list rules', 'Late parcel steps', 'Weekend cover', 'Courier contacts', 'Damaged goods', 'Daily close'],
  stock: ['Reorder points', 'North depot count', 'Harbour store count', 'Supplier list', 'Seasonal forecast', 'Spare parts', 'Stock audit', 'Bin layout', 'Slow movers', 'Price review'],
  people: ['Rota template', 'New starter checklist', 'Training plan', 'Holiday calendar', 'Team contacts', 'Safety briefing', 'Shift handover', 'Review notes', 'Hiring plan', 'Desk map'],
  notes: ['Meeting notes', 'Ideas list', 'Open questions', 'Reading list', 'Glossary', 'Decision log', 'Weekly summary', 'Retro notes', 'Parking lot', 'Inbox'],
}

function sampleGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = Object.entries(TOPICS).flatMap(([group, labels]) =>
    labels.map((label, index) => ({ id: `${group}-${index}`, label, group })),
  )
  const links: GraphLink[] = []
  for (const group of Object.keys(TOPICS)) {
    for (let index = 1; index < 10; index++) {
      if (index === 9 && group === 'notes') continue // one orphan, for hideOrphans
      links.push({ source: `${group}-0`, target: `${group}-${index}` })
      if (index % 3 === 0) links.push({ source: `${group}-${index}`, target: `${group}-${index - 1}` })
    }
  }
  links.push(
    { source: 'ops-0', target: 'stock-0' },
    { source: 'stock-3', target: 'ops-1' },
    { source: 'people-0', target: 'ops-6' },
    { source: 'notes-5', target: 'stock-9' },
    { source: 'notes-0', target: 'people-7' },
  )
  return { nodes, links }
}

function GraphExample({ withAside }: { withAside?: boolean }) {
  const { nodes, links } = useMemo(sampleGraph, [])
  const [selected, setSelected] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const aside = withAside ? (
    <ul className="flex flex-col p-1">
      {nodes.slice(0, 20).map(node => (
        <li key={node.id}>
          <button
            type="button"
            className="w-full px-2 py-1 text-left text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            onPointerEnter={() => setPreview(node.id)}
            onPointerLeave={() => setPreview(null)}
            onClick={() => setSelected(node.id)}
          >
            {node.label}
          </button>
        </li>
      ))}
    </ul>
  ) : undefined
  return (
    <div className="w-full">
      <KnowledgeGraph
        label="Map of notes"
        nodes={nodes}
        links={links}
        groups={GROUPS}
        focusId={selected}
        previewId={preview}
        aside={aside}
        onSelect={setSelected}
        onOpen={setSelected}
      />
      <p className="mt-2 font-data text-sm text-[var(--color-text-secondary)]" aria-live="polite">
        {selected ? `Active: ${selected}` : 'No note active'}
      </p>
    </div>
  )
}

<GraphExample />
```

### With a note list beside the map: hovering a row lights its note, clicking it brings the camera there

```tsx
const GROUPS: GraphGroup[] = [
  { id: 'ops', label: 'Operations', color: 'blue' },
  { id: 'stock', label: 'Stock', color: 'teal' },
  { id: 'people', label: 'People', color: 'purple' },
  { id: 'notes', label: 'Notes', color: 'gray' },
]

const TOPICS: Record<string, string[]> = {
  ops: ['Packing guide', 'Carrier rates', 'Returns flow', 'Label printer setup', 'Pick list rules', 'Late parcel steps', 'Weekend cover', 'Courier contacts', 'Damaged goods', 'Daily close'],
  stock: ['Reorder points', 'North depot count', 'Harbour store count', 'Supplier list', 'Seasonal forecast', 'Spare parts', 'Stock audit', 'Bin layout', 'Slow movers', 'Price review'],
  people: ['Rota template', 'New starter checklist', 'Training plan', 'Holiday calendar', 'Team contacts', 'Safety briefing', 'Shift handover', 'Review notes', 'Hiring plan', 'Desk map'],
  notes: ['Meeting notes', 'Ideas list', 'Open questions', 'Reading list', 'Glossary', 'Decision log', 'Weekly summary', 'Retro notes', 'Parking lot', 'Inbox'],
}

function sampleGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = Object.entries(TOPICS).flatMap(([group, labels]) =>
    labels.map((label, index) => ({ id: `${group}-${index}`, label, group })),
  )
  const links: GraphLink[] = []
  for (const group of Object.keys(TOPICS)) {
    for (let index = 1; index < 10; index++) {
      if (index === 9 && group === 'notes') continue // one orphan, for hideOrphans
      links.push({ source: `${group}-0`, target: `${group}-${index}` })
      if (index % 3 === 0) links.push({ source: `${group}-${index}`, target: `${group}-${index - 1}` })
    }
  }
  links.push(
    { source: 'ops-0', target: 'stock-0' },
    { source: 'stock-3', target: 'ops-1' },
    { source: 'people-0', target: 'ops-6' },
    { source: 'notes-5', target: 'stock-9' },
    { source: 'notes-0', target: 'people-7' },
  )
  return { nodes, links }
}

function GraphExample({ withAside }: { withAside?: boolean }) {
  const { nodes, links } = useMemo(sampleGraph, [])
  const [selected, setSelected] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const aside = withAside ? (
    <ul className="flex flex-col p-1">
      {nodes.slice(0, 20).map(node => (
        <li key={node.id}>
          <button
            type="button"
            className="w-full px-2 py-1 text-left text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            onPointerEnter={() => setPreview(node.id)}
            onPointerLeave={() => setPreview(null)}
            onClick={() => setSelected(node.id)}
          >
            {node.label}
          </button>
        </li>
      ))}
    </ul>
  ) : undefined
  return (
    <div className="w-full">
      <KnowledgeGraph
        label="Map of notes"
        nodes={nodes}
        links={links}
        groups={GROUPS}
        focusId={selected}
        previewId={preview}
        aside={aside}
        onSelect={setSelected}
        onOpen={setSelected}
      />
      <p className="mt-2 font-data text-sm text-[var(--color-text-secondary)]" aria-live="polite">
        {selected ? `Active: ${selected}` : 'No note active'}
      </p>
    </div>
  )
}

<GraphExample withAside />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the note list, which is visually hidden while the map is shown. |
| `Enter` | Selects the focused note, the same as a click on the map. |

## Do

- Load the screen that holds it lazily, like a chart: three.js is a few hundred kB.
- Pair it with a searchable list in aside, and pass the row under the pointer as previewId.
- Use one category colour per group, about five at most.

## Don't

- Don’t animate it on its own: it moves when people drag or a note is focused, and under reduced motion it settles before the first frame.
- Don’t make the map the only way to a note. The note list is the route for keyboards and screen readers.

## Anatomy

- **Frame**: A bordered surface.sunken box, up to 640px tall, with an optional aside panel on the left (a note list) at the map’s height.
- **Map**: role="img", named by label with the note and link counts. Points in the category fills, links in border.control, the hub and active note in the accent.
- **Header and readout**: A PanelHeader with the counts at top left; the camera’s azimuth and elevation (AZ/EL) at top right, in 11px uppercase mono.
- **Callout**: A surface.overlay box beside the hovered or active note: its label, a "/ ACTIVE" or "/ NOTE" tag, its group and link count, and Open on the active note.
- **Active marker**: The active note glows a little brighter and is held in a crosshair ring in the accent, sized to the note.
- **Cursor**: A thin crosshair ring that follows the pointer and closes round a note in the accent.
- **Cluster pills**: A pill over each group’s centre, decorative.
- **Reset view**: A secondary Button at top right, beside the readout, that clears the active note and flies the camera back to the starting overview. The ringed dot at the map’s centre does the same on click and names itself on hover; it is skipped by Tab, since the Button is always in reach.
- **Legend and note list**: Groups with counts under the map, and every note as a button: visually hidden with WebGL, shown without it. This is the keyboard and screen-reader route.
