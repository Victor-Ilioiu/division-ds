import { useMemo, useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './KnowledgeGraph.meta'
import { Example } from '../../docs/Example'
import { KnowledgeGraph, type GraphGroup, type GraphLink, type GraphNode } from './KnowledgeGraph'

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

/** About forty sample notes in four groups, linked within each group and a few across, built
 *  from a fixed pattern so the page is the same on every load. No backend. */
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

export function KnowledgeGraphDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Forty notes in four groups" className="block">
        <GraphExample />
      </Example>

      <Example caption="With a note list beside the map: hovering a row lights its note, clicking it brings the camera there" className="block">
        <GraphExample withAside />
      </Example>
    </ComponentDocs>
  )
}
