import { CircleCheck, PackageCheck, Phone, TriangleAlert, Truck, Wrench } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Timeline.meta'
import { Example } from '../../docs/Example'
import { Badge } from '../../atoms'
import { Timeline, TimelineGroup, TimelineItem } from './Timeline'

export function TimelineDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Grouped by day">
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
      </Example>

      <Example caption="Without groups">
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
      </Example>
    </ComponentDocs>
  )
}
