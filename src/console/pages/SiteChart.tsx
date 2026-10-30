import { ChartPanel } from '../../components/organisms/chart-panel/ChartPanel'
import { history, isReporting, LAST_INDEX, offsetOfIndex, sensorById, STEP_MINUTES } from '../data'
import type { Sensor } from '../model'
import type { Readings } from '../simulator'
import { formatTime, formatWeekday, isoAt } from '../time'

export type Range = '1h' | '24h' | '7d'

export const RANGE_LABEL: Record<Range, string> = { '1h': 'the last hour', '24h': 'the last 24 hours', '7d': 'the last 7 days' }

type Row = { time: string; a: number; b: number }

/** How each range is read: how many minutes it covers and how many minutes one point averages. */
const BUCKET: Record<Range, { span: number; every: number }> = {
  '1h': { span: 60, every: 5 },
  '24h': { span: 24 * 60, every: 60 },
  '7d': { span: 7 * 24 * 60, every: 6 * 60 },
}

function average(sensor: Sensor, endIndex: number, points: number, live: number | undefined): number | undefined {
  const values = history(sensor.id)
  let sum = 0
  let count = 0
  for (let i = endIndex - points + 1; i <= endIndex; i++) {
    if (i < 0 || i > sensor.lastSeen) continue
    sum += i === LAST_INDEX && live !== undefined && isReporting(sensor) ? live : values[i]
    count++
  }
  return count ? Math.round((sum / count) * 10) / 10 : undefined
}

/** The two sensors' readings over `range`, one row per point, oldest first. */
export function chartRows(a: Sensor, b: Sensor, range: Range, readings: Readings): Row[] {
  const { span, every } = BUCKET[range]
  const per = every / STEP_MINUTES
  const rows: Row[] = []
  for (let k = span / every - 1; k >= 0; k--) {
    const end = LAST_INDEX - k * per
    // A point is drawn at its bucket's end time, so it needs both sensors to have been reporting
    // then. An offline gateway's last hour would otherwise average its readings from before the
    // loss and plot them at "10:00", a reading it never sent.
    if (end > a.lastSeen || end > b.lastSeen) continue
    const va = average(a, end, per, readings[a.id])
    const vb = average(b, end, per, readings[b.id])
    if (va === undefined || vb === undefined) continue
    const iso = isoAt(offsetOfIndex(end))
    rows.push({ time: range === '7d' ? `${formatWeekday(iso)} ${formatTime(iso)}` : formatTime(iso), a: va, b: vb })
  }
  return rows
}

function describe(sensor: Sensor, values: number[]): string {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return `${sensor.name} read ${lo.toFixed(1)} to ${hi.toFixed(1)} °C`
}

export function chartSummary(a: Sensor, b: Sensor, rows: Row[], range: Range): string {
  if (rows.length === 0) return `No readings from ${a.name} or ${b.name} in ${RANGE_LABEL[range]}.`
  const as = rows.map(r => r.a)
  const bs = rows.map(r => r.b)
  const over = [a, b].filter((s, i) => s.band && Math.max(...(i === 0 ? as : bs)) > s.band.to).map(s => s.name)
  const tail = over.length ? ` ${over.join(' and ')} went above ${a.band?.to} °C.` : ' Both stayed inside 2 to 8 °C.'
  const quiet = [a, b].filter(s => !isReporting(s))
  const stopped = quiet.length
    ? ` No readings since ${formatTime(isoAt(offsetOfIndex(Math.min(...quiet.map(s => s.lastSeen)))))}.`
    : ''
  return `${describe(a, as)} and ${describe(b, bs)} over ${RANGE_LABEL[range]}.${tail}${stopped}`
}

/**
 * The site's two cold rooms over the chosen range, in a ChartPanel. Its own module, loaded with
 * `lazy()` by the site page, so Recharts arrives with the chart and the page above it renders
 * without waiting for it.
 */
export function SiteChart({ siteId, range, readings }: { siteId: string; range: Range; readings: Readings }) {
  const a = sensorById(`${siteId}-cr1`)!
  const b = sensorById(`${siteId}-cr2`)!
  const rows = chartRows(a, b, range, readings)
  return (
    <ChartPanel<Row>
      title="Cold rooms"
      headingLevel={2}
      summary={chartSummary(a, b, rows, range)}
      kind="line"
      area
      curve="smooth"
      data={rows}
      xKey="time"
      xLabel="Time"
      series={[
        { key: 'a', label: a.name },
        { key: 'b', label: b.name },
      ]}
      formatValue={value => `${value.toFixed(1)} °C`}
      formatAxisValue={value => `${Math.round(value)}`}
      axisWidth={32}
    />
  )
}

export default SiteChart
