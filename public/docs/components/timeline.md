# Timeline

> Events in time order down a vertical line. Each one has a square marker with an icon, a title line, a time and an optional body. You can group them by day, or not.

- **Best for:** A record of what happened to one thing, newest or oldest first: a shipment, a depot, an account.
- **Not for:** Steps of a flow someone is going through: use Stepper. Rows people sort and compare: use DataTable.
- Molecule. Source: `src/components/molecules/timeline/Timeline.tsx`
- Rendered docs page: `/components/timeline`

## Import

```tsx
import { Timeline, TimelineGroup, TimelineItem } from 'src/components/molecules/timeline/Timeline'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label (Timeline)` | `string` |  | Required. Names the list. |
| `className (Timeline)` | `string` |  | Added to the root ol. |
| `title (TimelineGroup)` | `string` |  | Required. A day or a period, for example "Today". |
| `level (TimelineGroup)` | `2 \| 3 \| 4` | `3` | The heading level of the group title (2 means an h2, and so on). |
| `icon (TimelineItem)` | `ReactNode` |  | Required. A lucide icon, there for decoration only. |
| `tone (TimelineItem)` | `'neutral' \| 'signal' \| 'ok' \| 'warning' \| 'hostile' \| 'info'` | `'neutral'` | Colours the marker, with the same meanings as Badge. The title still says it in words. |
| `title (TimelineItem)` | `ReactNode` |  | Required. What happened, in one line. |
| `meta (TimelineItem)` | `ReactNode` |  | Beside the title: who did it, or a Badge with the outcome. |
| `time (TimelineItem)` | `string` |  | Required. An ISO datetime (a date and time written in the international standard format), used for <time dateTime>. |
| `timeLabel (TimelineItem)` | `string` |  | Required. What people see, for example "09:40" or "Mon 12 Oct". |
| `details (TimelineItem)` | `ReactNode` |  | Extra information, folded away behind a "Show details" button. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type TimelineTone = 'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Grouped by day

```tsx
<div className="w-full max-w-xl">
  <Timeline label="Activity on Depot 4">
    <TimelineGroup title="Today" level={4}>
      <TimelineItem
        icon={<Truck />}
        tone="info"
        title="Shipment SHP-204 left for Sibiu"
        meta="Dispatch"
        time="2026-10-15T09:40:00+03:00"
        timeLabel="09:40"
      >
        Nine items, 22.1 kg, with the regular courier.
      </TimelineItem>
      <TimelineItem
        icon={<Phone />}
        title="Call with Ilse Varga"
        meta={
          <>
            <span>Oskar Behn</span>
            <Badge tone="ok">Resolved</Badge>
          </>
        }
        time="2026-10-15T08:15:00+03:00"
        timeLabel="08:15"
        details="Agreed to move the Friday pickup to Thursday morning. Bay 2 stays free until noon."
      >
        The late pallet from Arad is booked for tomorrow.
      </TimelineItem>
    </TimelineGroup>
    <TimelineGroup title="Yesterday" level={4}>
      <TimelineItem
        icon={<TriangleAlert />}
        tone="warning"
        title="Floor scale out of calibration"
        time="2026-10-14T16:05:00+03:00"
        timeLabel="16:05"
      >
        Readings 0.4 kg high. Work order WO-32 opened.
      </TimelineItem>
      <TimelineItem
        icon={<PackageCheck />}
        tone="ok"
        title="Inbound delivery checked in"
        time="2026-10-14T10:30:00+03:00"
        timeLabel="10:30"
      />
    </TimelineGroup>
  </Timeline>
</div>
```

### Without groups

```tsx
<div className="w-full max-w-xl">
  <Timeline label="Work order WO-29">
    <TimelineItem icon={<Wrench />} title="Opened" time="2026-10-09T08:00:00+03:00" timeLabel="Fri 9 Oct" />
    <TimelineItem
      icon={<Wrench />}
      tone="signal"
      title="Assigned to Mara Lind"
      time="2026-10-12T11:20:00+03:00"
      timeLabel="Mon 12 Oct"
    />
    <TimelineItem
      icon={<CircleCheck />}
      tone="ok"
      title="Closed: pallet jack serviced"
      time="2026-10-13T15:45:00+03:00"
      timeLabel="Tue 13 Oct"
    />
  </Timeline>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to each "Show details" button, and to any link inside an event. |
| `Enter` `Space` | On "Show details": shows or hides the details. |

## Do

- Label the timeline for what it records, for example "Activity on Depot 4".
- Group by day once there are more than a handful of events.
- Keep the title to one line and put the rest in the body or details.
- Pick a tone for what the event means (ok for done, hostile for failed), and say it in the title too.

## Don't

- Don't use a Timeline for a flow someone is going through. That's what Stepper is for.
- Don't put the only copy of something important in details.
- Don't colour every marker. Neutral is the default for a reason.

## Anatomy

- **List**: An ol (numbered list element) named by label. It holds items, groups, or both.
- **Group**: A list item with a heading in a monospaced font, a thin line running to the edge, and its own ol.
- **Marker**: A 28px (pixel) square holding the icon, outlined and coloured by tone.
- **Rail**: A thin line from each marker to the next. There's none after the last event in a list.
- **Title line**: The title, then meta, then the time on the right inside a <time dateTime> element, which gives machines the exact date.
- **Body**: Optional text under the title.
- **Details**: Optional, hidden behind a "Show details" button. The button has aria-expanded, which tells screen readers whether the details are open.
