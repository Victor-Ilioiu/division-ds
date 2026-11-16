import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'KnowledgeGraph',
  title: 'Knowledge graph',
  tier: 'organisms',
  slug: 'knowledge-graph',
  summary:
    'A 3D map of linked notes. Each note is a glowing point sized by its links and coloured by group, each link a hairline, with drifting dust behind them. Hover lights a note and its neighbours, a click makes it active in place, without moving the camera: the active note glows a little brighter and is held in a crosshair ring, with a callout tied to it by a leader line, a double click opens it. Reset view at the centre clears the pick and returns to the overview. three.js loads in its own chunk, only when a graph mounts.',
  requires: [
    'WebGL 2 for the map. Without it the component shows its note list as buttons instead, so every note stays reachable.',
  ],
  anatomy: [
    { part: 'Frame', description: 'A bordered surface.sunken box, up to 640px tall, with an optional aside panel on the left (a note list) at the map’s height.' },
    { part: 'Map', description: 'role="img", named by label with the note and link counts. Points in the category fills, links in border.control, the hub and active note in the accent.' },
    { part: 'Header and readout', description: 'A PanelHeader with the counts at top left; the camera’s azimuth and elevation (AZ/EL) at top right, in 11px uppercase mono.' },
    { part: 'Callout', description: 'A surface.overlay box beside the hovered or active note: its label, a "/ ACTIVE" or "/ NOTE" tag, its group and link count, and Open on the active note.' },
    { part: 'Active marker', description: 'The active note glows a little brighter and is held in a crosshair ring in the accent, sized to the note.' },
    { part: 'Cursor', description: 'A thin crosshair ring that follows the pointer and closes round a note in the accent.' },
    { part: 'Cluster pills', description: 'A pill over each group’s centre, decorative.' },
    { part: 'Reset view', description: 'A secondary Button at top right, beside the readout, that clears the active note and flies the camera back to the starting overview. The ringed dot at the map’s centre does the same on click and names itself on hover; it is skipped by Tab, since the Button is always in reach.' },
    { part: 'Legend and note list', description: 'Groups with counts under the map, and every note as a button: visually hidden with WebGL, shown without it. This is the keyboard and screen-reader route.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. The graph’s accessible name, for example "Map of notes".' },
    { name: 'title', type: 'string', default: "'Graph'", description: 'The title in the header bar over the map.' },
    { name: 'nodes', type: '{ id: string; label: string; group: string }[]', description: 'Required. One entry per note.' },
    { name: 'links', type: '{ source: string; target: string }[]', description: 'Required. Note ids, either direction.' },
    { name: 'groups', type: '{ id: string; label: string; color: CategoryColor }[]', description: 'Required. One per group, in legend order. Keep it to about five; a note whose group is missing draws in the link grey.' },
    { name: 'highlight', type: 'string[] | null', description: 'Ids to light up, such as search matches. Everything else dims. null lights everything.' },
    { name: 'hideOrphans', type: 'boolean', default: 'false', description: 'Leaves out notes with no links.' },
    { name: 'focusId', type: 'string | null', description: 'A note to bring the camera to and make active, for example one picked in a list beside the graph. A pick on the map itself does not move the camera.' },
    { name: 'previewId', type: 'string | null', default: 'null', description: 'A note to light as if hovered, without moving the camera: the list row under the pointer.' },
    { name: 'aside', type: 'ReactNode', description: 'A panel inside the frame, left of the map from lg up and above it below lg.' },
    { name: 'onSelect', type: '(id: string | null) => void', description: 'Required. A note was picked (its id), or the pick was cleared by clicking empty space or Reset view (null).' },
    { name: 'onOpen', type: '(id: string) => void', description: 'A note was opened: a double click on it, or Open in its callout. Without it the callout has no Open button.' },
    { name: 'className', type: 'string', description: "Merged with the root's classes." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root div.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves through the note list, which is visually hidden while the map is shown.' },
    { keys: ['Enter'], does: 'Selects the focused note, the same as a click on the map.' },
  ],
  useWhen: 'Showing how a few dozen to a few hundred linked notes cluster, so people can find one by its neighbours.',
  notFor: 'Data with a value per item or a trend: use ChartPanel. A hierarchy: use a Sidebar or a nested List.',
  dos: [
    'Load the screen that holds it lazily, like a chart: three.js is a few hundred kB.',
    'Pair it with a searchable list in aside, and pass the row under the pointer as previewId.',
    'Use one category colour per group, about five at most.',
  ],
  donts: [
    'Don’t animate it on its own: it moves when people drag or a note is focused, and under reduced motion it settles before the first frame.',
    'Don’t make the map the only way to a note. The note list is the route for keyboards and screen readers.',
  ],
}
