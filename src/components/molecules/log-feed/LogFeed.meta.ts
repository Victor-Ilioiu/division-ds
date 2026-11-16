import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'LogFeed',
  title: 'Log feed',
  tier: 'molecules',
  slug: 'log-feed',
  summary:
    'A short, read-only list of recent events in the data font: "01 name → detail", the newest line bright and the older ones at rest, with an optional prompt line on top.',
  anatomy: [
    { part: 'Log region', description: 'A div with role="log", named by label, so new lines are announced politely.' },
    { part: 'Prompt', description: 'Optional. A ">" then the prompt text and a block caret, which pulses only without reduced motion.' },
    { part: 'Entries', description: 'A numbered ordered list. The newest line is text.active; older lines text.rest; numbers text.muted.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Names the log region.' },
    { name: 'entries', type: '{ name: ReactNode; detail?: ReactNode }[]', description: 'Required. Oldest first; the last one is the newest.' },
    { name: 'prompt', type: 'ReactNode', description: 'A line above the entries, followed by a caret.' },
    { name: 'start', type: 'number', default: '1', description: 'The number of the first entry.' },
    { name: 'className', type: 'string', description: "Merged with the component's classes." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the log div.' },
  ],
  keyboard: [],
  useWhen: 'Showing the last few things that happened, such as recent sync events beside a dashboard panel.',
  notFor: 'A live shell session: use Terminal. Notifications people act on: use a List of ListItems.',
  dos: ['Keep it to the last 5 to 10 entries.', 'Write the name as the thing that acted and the detail as what it did.'],
  donts: ['Don’t put actions in it: it is read-only.', 'Don’t use it for prose. Long text belongs in the body font.'],
}
