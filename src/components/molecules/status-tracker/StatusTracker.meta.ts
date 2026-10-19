import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'StatusTracker',
  title: 'Status tracker',
  tier: 'molecules',
  slug: 'status-tracker',
  summary:
    'Health over time, drawn as a row of thin bars with one bar per period. The oldest is on the left. Each bar says its status in words and shows them in a tooltip when you hover over it or reach it with the keyboard. The whole row is a single Tab stop, and the arrow keys move along it.',
  useWhen: 'The health history of one service or device, such as uptime over 30 or 90 days.',
  notFor: 'A current status: use Badge. A measured value: use Sparkline.',
  requires: ['The root TooltipProvider (AppShell and DemoLayout mount it).'],
  anatomy: [
    { part: 'Label row', description: 'The label in a monospaced font on the left, and the optional summary on the right.' },
    { part: 'List', description: 'A ul (bulleted list element) named by the label, with one li (list item) per bar, so a screen reader hears how many bars there are and where each one sits.' },
    {
      part: 'Bar',
      description:
        'A block 32px (pixels) tall in the status colour. It has role="img" and aria-roledescription="status bar", which tell screen readers what it is, and its name is the status word plus the label.',
    },
    { part: 'Tooltip', description: 'The same text as the name, shown on hover and on keyboard focus.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Names the row, for example "Uptime, last 30 days".' },
    { name: 'items', type: 'readonly StatusTrackerItem[]', description: 'Required. Oldest first.' },
    { name: 'summary', type: 'ReactNode', description: 'Shown on the right of the label row, for example "99.2% up".' },
    {
      name: 'statusLabels',
      type: 'Partial<Record<StatusTrackerStatus, string>>',
      description: 'Replaces the status words: Operational, Degraded, Down, No data.',
    },
    { name: 'className', type: 'string', description: 'Added to the root.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root.' },
    { name: 'id (StatusTrackerItem)', type: 'string', description: 'Required. A key that never changes for that item.' },
    {
      name: 'status (StatusTrackerItem)',
      type: "'ok' | 'warning' | 'hostile' | 'neutral'",
      description: 'Required. ok means up. warning means degraded. hostile means down or failed. neutral means no data.',
    },
    {
      name: 'label (StatusTrackerItem)',
      type: 'string',
      description: 'Required. The period and what happened, for example "12 Oct: 2 alerts, 14 min degraded".',
    },
    {
      name: 'statusTrackerText()',
      type: '(item, words?) => string',
      description: 'Builds the text a bar uses for its name and tooltip, for example "Degraded. 12 Oct: 2 alerts".',
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves into the row, landing on the last bar that had focus (the newest one the first time), and moves out again.' },
    { keys: ['ArrowLeft', 'ArrowRight'], does: 'Moves one bar older or newer and shows its tooltip.' },
    { keys: ['Home', 'End'], does: 'Jumps to the oldest or the newest bar.' },
    { keys: ['Escape'], does: 'Hides the tooltip. Focus stays on the bar.' },
  ],
  dos: [
    'Write each item label with its period and what happened, not just the status. The status word is added for you.',
    'Put the headline figure in summary, so the row has a number people can read before they explore it.',
    'Use neutral for periods with no data, so a gap looks like a gap and not like a healthy day.',
  ],
  donts: [
    "Don't start an item label with the status word as well. It's already said first.",
    "Don't use it for more than about 90 bars. At a 320px-wide screen the bars get thinner than 2px.",
    "Don't make a bar do anything when clicked. It's a reading, not a control.",
  ],
}
