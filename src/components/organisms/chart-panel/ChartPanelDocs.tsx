import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './ChartPanel.meta'
import { Example } from '../../docs/Example'
import { ChartPanel } from './ChartPanel'

type Week = { week: string; online: number; store: number }
type Category = { category: string; returns: number }
type Day = { day: string; visits: number; orders: number }
type Slice = { channel: string; orders: number }
type Hour = { hour: string; pm25: number }
type Profile = { measure: string; m4: number; ak: number }

const WEEKS: Week[] = [
  { week: 'W1', online: 120, store: 160 },
  { week: 'W2', online: 131, store: 158 },
  { week: 'W3', online: 142, store: 163 },
  { week: 'W4', online: 150, store: 155 },
  { week: 'W5', online: 171, store: 162 },
  { week: 'W6', online: 188, store: 159 },
  { week: 'W7', online: 197, store: 166 },
  { week: 'W8', online: 214, store: 161 },
]

const RETURNS: Category[] = [
  { category: 'Replicas', returns: 18 },
  { category: 'Optics', returns: 11 },
  { category: 'Parts', returns: 26 },
  { category: 'Ammo', returns: 7 },
  { category: 'Tactical', returns: 4 },
]

const DAYS: Day[] = [
  { day: 'Mon', visits: 1840, orders: 61 },
  { day: 'Tue', visits: 2210, orders: 74 },
  { day: 'Wed', visits: 1960, orders: 58 },
  { day: 'Thu', visits: 2650, orders: 92 },
  { day: 'Fri', visits: 3120, orders: 118 },
  { day: 'Sat', visits: 3890, orders: 141 },
  { day: 'Sun', visits: 3370, orders: 126 },
]

const CHANNELS: Slice[] = [
  { channel: 'Web shop', orders: 412 },
  { channel: 'Field store', orders: 236 },
  { channel: 'Club orders', orders: 148 },
  { channel: 'Marketplace', orders: 87 },
  { channel: 'Phone', orders: 41 },
]

const PM25 = [9, 8, 7, 7, 8, 11, 17, 26, 31, 24, 18, 15, 14, 13, 14, 16, 21, 29, 34, 27, 19, 14, 11, 10]
const HOURS: Hour[] = PM25.map((pm25, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, pm25 }))

const PROFILES: Profile[] = [
  { measure: 'Range', m4: 78, ak: 64 },
  { measure: 'Accuracy', m4: 82, ak: 70 },
  { measure: 'Rate of fire', m4: 74, ak: 86 },
  { measure: 'Weight', m4: 58, ak: 44 },
  { measure: 'Reliability', m4: 70, ak: 90 },
  { measure: 'Upgrades', m4: 92, ak: 62 },
]

export function ChartPanelDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Line, two series" className="block">
        <ChartPanel<Week>
          title="Weekly orders"
          summary="Online orders rose from 120 to 214 over eight weeks and passed in-store orders in week 5."
          kind="line"
          data={WEEKS}
          xKey="week"
          xLabel="Week"
          series={[
            { key: 'online', label: 'Online' },
            { key: 'store', label: 'In store' },
          ]}
          headingLevel={4}
        />
      </Example>

      <Example caption="Bar, one series" className="block">
        <ChartPanel<Category>
          title="Returns by category"
          summary="Parts have the most returns (26), then replicas (18); tactical equipment has the fewest (4)."
          kind="bar"
          data={RETURNS}
          xKey="category"
          xLabel="Category"
          series={[{ key: 'returns', label: 'Returns' }]}
          headingLevel={4}
        />
      </Example>
      <Example caption="Area under a smooth line" className="block">
        <ChartPanel<Day>
          title="Visits this week"
          summary="Visits climbed from 1,840 on Monday to a Saturday peak of 3,890."
          kind="line"
          area
          curve="smooth"
          data={DAYS}
          xKey="day"
          xLabel="Day"
          series={[{ key: 'visits', label: 'Visits' }]}
          headline="19,040"
          headingLevel={4}
        />
      </Example>

      <Example caption="No grid lines: only the labels along the axes" className="block">
        <ChartPanel<Week>
          title="Weekly orders, gridless"
          summary="Online orders rose from 120 to 214 over eight weeks and passed in-store orders in week 5."
          kind="line"
          area
          curve="smooth"
          grid={false}
          data={WEEKS}
          xKey="week"
          xLabel="Week"
          series={[
            { key: 'online', label: 'Online' },
            { key: 'store', label: 'In store' },
          ]}
          headingLevel={4}
        />
      </Example>

      <Example caption="A shaded band: night hours on a 24-hour series (the band wraps past midnight)" className="block">
        <ChartPanel<Hour>
          title="Fine particles today"
          summary="PM2.5 peaked at the morning and evening rush hours, 31 and 34 µg/m³, and stayed lowest overnight."
          kind="line"
          area
          curve="smooth"
          data={HOURS}
          xKey="hour"
          xLabel="Hour"
          series={[{ key: 'pm25', label: 'PM2.5 (µg/m³)' }]}
          bands={[{ from: '22:00', to: '06:00', label: 'Night' }]}
          headingLevel={4}
        />
      </Example>

      <Example caption="Small: stat cards, each with a sparkline (a tiny line chart with no axes)" className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
        <ChartPanel<Day>
          title="Visits"
          headline="19,040"
          summary="Up every day but Wednesday and Sunday."
          kind="line"
          area
          curve="smooth"
          size="sm"
          data={DAYS}
          xKey="day"
          xLabel="Day"
          series={[{ key: 'visits', label: 'Visits' }]}
          headingLevel={4}
        />
        <ChartPanel<Day>
          title="Orders"
          headline="670"
          summary="Saturday took 141, the most of the week."
          kind="bar"
          size="sm"
          data={DAYS}
          xKey="day"
          xLabel="Day"
          series={[{ key: 'orders', label: 'Orders' }]}
          headingLevel={4}
        />
        <ChartPanel<Week>
          title="Online orders"
          headline="214"
          summary="Eight weeks of growth, from 120 a week."
          kind="line"
          curve="smooth"
          size="sm"
          data={WEEKS}
          xKey="week"
          xLabel="Week"
          series={[{ key: 'online', label: 'Online' }]}
          headingLevel={4}
        />
      </Example>

      <Example caption="Donut with a centre total" className="block">
        <ChartPanel<Slice>
          title="Orders by channel"
          summary="The web shop took 412 of 924 orders this month, nearly half; phone orders are 4%."
          kind="donut"
          data={CHANNELS}
          xKey="channel"
          xLabel="Channel"
          series={[{ key: 'orders', label: 'Orders' }]}
          centerLabel="Orders"
          headingLevel={4}
        />
      </Example>

      <Example caption="Radar, two series" className="block">
        <ChartPanel<Profile>
          title="Replica profiles"
          summary="The M4 replica leads on range, accuracy and upgrades; the AK replica on rate of fire and reliability."
          kind="radar"
          data={PROFILES}
          xKey="measure"
          xLabel="Measure"
          series={[
            { key: 'm4', label: 'M4 replica' },
            { key: 'ak', label: 'AK replica' },
          ]}
          headingLevel={4}
        />
      </Example>
    </ComponentDocs>
  )
}
