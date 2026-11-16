import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'PanelHeader',
  title: 'Panel header',
  tier: 'molecules',
  slug: 'panel-header',
  summary:
    'The header bar of a dense panel: an optional numbered tag in the accent, a tracked uppercase title in the display font, and a quiet readout at the right in the data font.',
  anatomy: [
    { part: 'Index tag', description: 'Optional. The panel number on accent.signal.fill in accent.signal.ink (the primary Button’s gated pair). A number is padded to two digits.' },
    { part: 'Title', description: 'A real heading (h2 by default): Oxanium, 14px, uppercase, tracked. It truncates before it pushes the readout out.' },
    { part: 'Readout', description: 'Optional. Counts, a time or an id in the data font, text.secondary.' },
  ],
  props: [
    { name: 'title', type: 'ReactNode', description: 'Required. The panel’s title.' },
    { name: 'index', type: 'number | string', description: 'The panel number shown in the tag. A number is padded to two digits ("01").' },
    { name: 'meta', type: 'ReactNode', description: 'The right-aligned readout: "42 notes", "12:04".' },
    { name: 'level', type: '2 | 3 | 4 | 5 | 6', default: '2', description: 'The heading level of the title. Pick it from the page outline, not from the size.' },
    { name: 'className', type: 'string', description: "Merged with the component's classes." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root div.' },
    { name: '...rest', type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>", description: 'Every native div attribute except title.' },
  ],
  keyboard: [],
  useWhen: 'Heading a panel in a dense, data-heavy screen where several panels sit side by side and are referred to by number.',
  notFor: 'A page title: use PageHeader. A card’s own title: use CardHeader.',
  dos: ['Number panels only when the numbers are stable and people refer to them.', 'Keep the readout to one short value.'],
  donts: ['Don’t use the index tag as a status: it is always the accent, and it is the panel’s name.', 'Don’t skip heading levels to get a smaller title.'],
}
