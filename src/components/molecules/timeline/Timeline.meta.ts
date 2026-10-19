import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Timeline',
  title: 'Timeline',
  tier: 'molecules',
  slug: 'timeline',
  summary:
    'Events in time order down a vertical line. Each one has a square marker with an icon, a title line, a time and an optional body. You can group them by day, or not.',
  useWhen: 'A record of what happened to one thing, newest or oldest first: a shipment, a depot, an account.',
  notFor: 'Steps of a flow someone is going through: use Stepper. Rows people sort and compare: use DataTable.',
  anatomy: [
    { part: 'List', description: 'An ol (numbered list element) named by label. It holds items, groups, or both.' },
    { part: 'Group', description: 'A list item with a heading in a monospaced font, a thin line running to the edge, and its own ol.' },
    { part: 'Marker', description: 'A 28px (pixel) square holding the icon, outlined and coloured by tone.' },
    { part: 'Rail', description: 'A thin line from each marker to the next. There\'s none after the last event in a list.' },
    { part: 'Title line', description: 'The title, then meta, then the time on the right inside a <time dateTime> element, which gives machines the exact date.' },
    { part: 'Body', description: 'Optional text under the title.' },
    { part: 'Details', description: 'Optional, hidden behind a "Show details" button. The button has aria-expanded, which tells screen readers whether the details are open.' },
  ],
  props: [
    { name: 'label (Timeline)', type: 'string', description: 'Required. Names the list.' },
    { name: 'className (Timeline)', type: 'string', description: 'Added to the root ol.' },
    { name: 'title (TimelineGroup)', type: 'string', description: 'Required. A day or a period, for example "Today".' },
    { name: 'level (TimelineGroup)', type: '2 | 3 | 4', default: '3', description: "The heading level of the group title (2 means an h2, and so on)." },
    { name: 'icon (TimelineItem)', type: 'ReactNode', description: 'Required. A lucide icon, there for decoration only.' },
    {
      name: 'tone (TimelineItem)',
      type: "'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'",
      default: "'neutral'",
      description: "Colours the marker, with the same meanings as Badge. The title still says it in words.",
    },
    { name: 'title (TimelineItem)', type: 'ReactNode', description: 'Required. What happened, in one line.' },
    { name: 'meta (TimelineItem)', type: 'ReactNode', description: 'Beside the title: who did it, or a Badge with the outcome.' },
    { name: 'time (TimelineItem)', type: 'string', description: 'Required. An ISO datetime (a date and time written in the international standard format), used for <time dateTime>.' },
    { name: 'timeLabel (TimelineItem)', type: 'string', description: 'Required. What people see, for example "09:40" or "Mon 12 Oct".' },
    { name: 'details (TimelineItem)', type: 'ReactNode', description: 'Extra information, folded away behind a "Show details" button.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to each "Show details" button, and to any link inside an event.' },
    { keys: ['Enter', 'Space'], does: 'On "Show details": shows or hides the details.' },
  ],
  dos: [
    'Label the timeline for what it records, for example "Activity on Depot 4".',
    'Group by day once there are more than a handful of events.',
    'Keep the title to one line and put the rest in the body or details.',
    'Pick a tone for what the event means (ok for done, hostile for failed), and say it in the title too.',
  ],
  donts: [
    "Don't use a Timeline for a flow someone is going through. That's what Stepper is for.",
    "Don't put the only copy of something important in details.",
    "Don't colour every marker. Neutral is the default for a reason.",
  ],
}
