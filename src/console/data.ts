import {
  SEVERITY_ORDER,
  type Alert,
  type AlertEvent,
  type AlertKind,
  type AlertStatus,
  type Band,
  type Sensor,
  type SensorKind,
  type Severity,
  type Site,
  type SiteDay,
} from './model'
import { formatDuration, formatShortDay, isoAt, NOW, offsetOf } from './time'

/**
 * Halden Console's demo world: the warehouse sites Halden Systems monitors for its customers, the
 * sensors on each, seven days of readings every five minutes up to `NOW`, the alerts those
 * readings raised, and 30 days of daily status per site. Every company, person and reading is
 * invented. Deterministic: the hand-written records are literal, and the readings come from a
 * seeded generator, so two loads, two test runs and two screenshots always agree.
 *
 * The readings and the alerts are written together: an alert's row describes the excursion that
 * caused it, and the generator bends that sensor's history to match, so a chart, a sparkline and
 * the alert that names its value never disagree. `data.test.ts` holds that invariant.
 */

export const PRODUCT_NAME = 'Halden Console'
export const COMPANY = 'Halden Systems'
export const WORKSPACE = 'Halden Systems · Operations'

/** The operator signed in to the demo: the one who acknowledges and resolves. */
export const OPERATOR = { name: 'Noor Aziz', role: 'Operations engineer' }

/** Minutes between two stored readings, and how many are kept: seven days. */
export const STEP_MINUTES = 5
export const HISTORY_POINTS = 7 * 24 * (60 / STEP_MINUTES)
export const LAST_INDEX = HISTORY_POINTS - 1

/** The offset from NOW (in minutes, negative) of history index `i`. */
export function offsetOfIndex(i: number): number {
  return -(LAST_INDEX - i) * STEP_MINUTES
}

/** The history index at or just before `offset` minutes from NOW. */
export function indexAtOffset(offset: number): number {
  return Math.max(0, Math.min(LAST_INDEX, LAST_INDEX + Math.floor(offset / STEP_MINUTES)))
}

type SiteRow = [
  id: string,
  name: string,
  customer: string,
  city: string,
  gateway: string,
  contact: string,
  role: string,
  keySensor: string,
  installed: string,
  online: boolean,
]

const SITE_ROWS: SiteRow[] = [
  ['brennick', 'Brennick Pharma, Basel', 'Brennick Pharma Supply', 'Basel', 'GW-BSL-01', 'Mara Lindqvist', 'Site manager', 'cr2', '2024-03-11', true],
  ['frostline', 'Frostline Depots, Hamburg', 'Frostline Depots', 'Hamburg', 'GW-HAM-02', 'Jonas Albrecht', 'Facilities lead', 'fza', '2023-11-02', true],
  ['saltmere', 'Saltmere Foods, Aarhus', 'Saltmere Foods', 'Aarhus', 'GW-AAR-01', 'Signe Holm', 'Warehouse manager', 'cr1', '2024-06-20', true],
  ['tidewell', 'Tidewell Cold Storage, Antwerp', 'Tidewell Cold Storage', 'Antwerp', 'GW-ANR-03', 'Ruben Claes', 'Operations manager', 'cr1', '2023-04-17', true],
  ['greyhaven', 'Greyhaven Cold Chain, Gdańsk', 'Greyhaven Cold Chain', 'Gdańsk', 'GW-GDN-01', 'Agata Wróbel', 'Site manager', 'fza', '2025-01-09', true],
  ['rookfield', 'Rookfield Dairies, Cork', 'Rookfield Dairies', 'Cork', 'GW-ORK-01', 'Niamh Keane', 'Quality lead', 'cr1', '2024-09-30', true],
  ['vellmark', 'Vellmark Logistics, Rotterdam', 'Vellmark Logistics', 'Rotterdam', 'GW-RTM-04', 'Daan Visser', 'Shift supervisor', 'cr1', '2023-08-14', true],
  ['ostwind', 'Ostwind Fulfilment, Leipzig', 'Ostwind Fulfilment', 'Leipzig', 'GW-LEJ-02', 'Katrin Vogel', 'Facilities manager', 'cr1', '2025-05-26', false],
]

function emailFor(name: string, siteId: string): string {
  const [first, ...rest] = name.toLowerCase().split(' ')
  return `${first[0]}.${rest.join('')}@${siteId}.example`
}

export const SITES: readonly Site[] = SITE_ROWS.map(
  ([id, name, customer, city, gateway, contact, role, keySensor, installed, online]) => ({
    id,
    name,
    customer,
    city,
    gateway,
    contact: { name: contact, role, email: emailFor(contact, id) },
    installed,
    keySensorId: `${id}-${keySensor}`,
    online,
  }),
)

type SensorTemplate = [slug: string, name: string, kind: SensorKind, band?: Band]

const COLD_ROOM: Band = { from: 2, to: 8 }
const FREEZER: Band = { from: -25, to: -18 }

const TEMPLATE: SensorTemplate[] = [
  ['cr1', 'Cold room 1', 'temperature', COLD_ROOM],
  ['cr2', 'Cold room 2', 'temperature', COLD_ROOM],
  ['fza', 'Freezer aisle A', 'temperature', FREEZER],
  ['hall', 'Storage hall humidity', 'humidity', { from: 30, to: 60 }],
  ['dock1', 'Dock door 1', 'door'],
  ['cr2door', 'Cold room 2 door', 'door'],
  ['mains', 'Mains power', 'power', { from: 215, to: 245 }],
]

/** Four sites run a second freezer aisle: 8 x 7 + 4 = 60 sensors. */
const SECOND_FREEZER = new Set(['frostline', 'greyhaven', 'saltmere', 'tidewell'])

/** When a quiet sensor sent its last reading, as an offset from NOW. */
const LAST_SEEN: Record<string, number> = {
  'rookfield-dock1': offsetOf('2026-10-15T07:15'),
}
/** The Ostwind gateway stopped at 09:12. */
export const OSTWIND_LOST = '2026-10-15T09:12'

export const SENSORS: readonly Sensor[] = SITES.flatMap(site => {
  const rows = [...TEMPLATE]
  if (SECOND_FREEZER.has(site.id)) rows.splice(3, 0, ['fzb', 'Freezer aisle B', 'temperature', FREEZER])
  return rows.map(([slug, name, kind, band]) => {
    const id = `${site.id}-${slug}`
    const quietSince = !site.online ? offsetOf(OSTWIND_LOST) : LAST_SEEN[id]
    return {
      id,
      siteId: site.id,
      name,
      kind,
      band,
      lastSeen: quietSince === undefined ? LAST_INDEX : indexAtOffset(quietSince),
    }
  })
})

/* ------------------------------------------------------------------------------------------- */
/* People and alerts                                                                            */
/* ------------------------------------------------------------------------------------------- */

const OPERATORS = ['Noor Aziz', 'Pieter Smit', 'Ilka Brandvold', 'Tomas Reyes'] as const
type Operator = (typeof OPERATORS)[number]

/** The reading's shape around an alert: [minutes from firing, value or the sensor's baseline]. */
type Knot = [minutes: number, value: number | 'base']

type AlertRow = {
  id: string
  sensor: string
  kind: AlertKind
  severity: Severity
  status: AlertStatus
  firedAt: string
  value?: number
  ack?: [by: Operator, after: number, note: string]
  resolve?: [by: Operator | 'System', after: number, note: string]
  curve?: Knot[]
  /** Door alerts: how long the door stayed open in all (to now, if still open). */
  openFor?: number
}

const ALERT_ROWS: AlertRow[] = [
  // Open.
  {
    id: 'a-01',
    sensor: 'brennick-cr2',
    kind: 'temp-high',
    severity: 'critical',
    status: 'open',
    firedAt: '2026-10-15T08:02',
    value: 8.4,
    // The scripted investigation's alert: the door opened at 07:40 for a delivery and stayed open
    // 22 minutes; the room warmed from 07:45, peaked at 08:25 and is recovering.
    curve: [[-17, 'base'], [0, 8.4], [23, 9.6], [118, 8.3]],
  },
  { id: 'a-02', sensor: 'ostwind-cr1', kind: 'gateway-offline', severity: 'critical', status: 'open', firedAt: OSTWIND_LOST },
  { id: 'a-03', sensor: 'frostline-fzb', kind: 'temp-high', severity: 'warning', status: 'open', firedAt: '2026-10-15T09:20', value: -16.8 },
  { id: 'a-04', sensor: 'saltmere-hall', kind: 'humidity-high', severity: 'warning', status: 'open', firedAt: '2026-10-15T06:45', value: 66 },
  { id: 'a-05', sensor: 'tidewell-dock1', kind: 'door-open', severity: 'warning', status: 'open', firedAt: '2026-10-15T09:35', value: 18, openFor: 43 },
  { id: 'a-06', sensor: 'rookfield-dock1', kind: 'sensor-offline', severity: 'info', status: 'open', firedAt: '2026-10-15T07:15' },
  { id: 'a-07', sensor: 'greyhaven-cr1', kind: 'temp-high', severity: 'warning', status: 'open', firedAt: '2026-10-15T05:30', value: 8.6 },
  // Acknowledged.
  {
    id: 'a-08',
    sensor: 'vellmark-hall',
    kind: 'humidity-high',
    severity: 'warning',
    status: 'acknowledged',
    firedAt: '2026-10-15T03:10',
    value: 64,
    ack: ['Tomas Reyes', 14, 'Night rain, roller doors cycling. Dehumidifier on.'],
  },
  {
    id: 'a-09',
    sensor: 'frostline-cr1',
    kind: 'temp-high',
    severity: 'warning',
    status: 'acknowledged',
    firedAt: '2026-10-14T22:40',
    value: 8.7,
    ack: ['Tomas Reyes', 9, 'Defrost cycle overran. Watching the next one.'],
  },
  {
    id: 'a-10',
    sensor: 'tidewell-mains',
    kind: 'power-loss',
    severity: 'critical',
    status: 'acknowledged',
    firedAt: '2026-10-14T19:05',
    value: 0,
    ack: ['Pieter Smit', 6, 'Grid outage in the port area. Generator took over at 19:12.'],
  },
  {
    id: 'a-11',
    sensor: 'greyhaven-cr2door',
    kind: 'door-open',
    severity: 'warning',
    status: 'acknowledged',
    firedAt: '2026-10-14T16:20',
    value: 25,
    openFor: 31,
    ack: ['Ilka Brandvold', 11, 'Stock count in progress. Site asked to use the strip curtain.'],
  },
  {
    id: 'a-12',
    sensor: 'saltmere-fza',
    kind: 'temp-high',
    severity: 'warning',
    status: 'acknowledged',
    firedAt: '2026-10-14T11:50',
    value: -16.9,
    ack: ['Pieter Smit', 18, 'Loading in progress. Will resolve when it settles.'],
  },
  {
    id: 'a-13',
    sensor: 'rookfield-cr2',
    kind: 'temp-high',
    severity: 'warning',
    status: 'acknowledged',
    firedAt: '2026-10-14T09:15',
    value: 8.5,
    ack: ['Noor Aziz', 12, 'Evaporator fan noisy. Service visit booked for Friday.'],
  },
  // Resolved.
  {
    id: 'a-14',
    sensor: 'brennick-cr2door',
    kind: 'door-open',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-15T07:55',
    value: 15,
    openFor: 22,
    resolve: ['System', 7, 'Door closed after 22 min.'],
  },
  {
    id: 'a-15',
    sensor: 'vellmark-cr1',
    kind: 'temp-high',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-13T14:30',
    value: 8.9,
    ack: ['Ilka Brandvold', 8, 'Called the site.'],
    resolve: ['Ilka Brandvold', 55, 'Back in range. A pallet was blocking the return vent.'],
  },
  {
    id: 'a-16',
    sensor: 'frostline-mains',
    kind: 'power-loss',
    severity: 'critical',
    status: 'resolved',
    firedAt: '2026-10-12T02:10',
    value: 0,
    ack: ['Tomas Reyes', 4, 'Paged the site engineer.'],
    resolve: ['Tomas Reyes', 41, 'Breaker reset. Freezers held temperature.'],
  },
  {
    id: 'a-17',
    sensor: 'saltmere-cr2',
    kind: 'temp-high',
    severity: 'critical',
    status: 'resolved',
    firedAt: '2026-10-11T17:45',
    value: 10.2,
    ack: ['Pieter Smit', 5, 'Compressor tripped. Site engineer on the way.'],
    resolve: ['Pieter Smit', 95, 'Compressor restarted. Stock checked, none lost.'],
  },
  {
    id: 'a-18',
    sensor: 'tidewell-hall',
    kind: 'humidity-high',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-10T13:00',
    value: 67,
    resolve: ['Noor Aziz', 70, 'Washdown finished. Back under 60%.'],
  },
  {
    id: 'a-19',
    sensor: 'greyhaven-fza',
    kind: 'temp-high',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-09T23:20',
    value: -16.5,
    resolve: ['Tomas Reyes', 50, 'Door seal replaced the next morning.'],
  },
  {
    id: 'a-20',
    sensor: 'rookfield-hall',
    kind: 'humidity-high',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-09T08:40',
    value: 63,
    resolve: ['Ilka Brandvold', 45, 'Back in range.'],
  },
  {
    id: 'a-21',
    sensor: 'ostwind-cr1',
    kind: 'temp-high',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-13T06:10',
    value: 8.8,
    resolve: ['Noor Aziz', 40, 'Morning delivery. Back in range.'],
  },
  {
    id: 'a-22',
    sensor: 'brennick-dock1',
    kind: 'door-open',
    severity: 'info',
    status: 'resolved',
    firedAt: '2026-10-12T15:25',
    value: 16,
    openFor: 19,
    resolve: ['System', 3, 'Door closed after 19 min.'],
  },
  {
    id: 'a-23',
    sensor: 'vellmark-dock1',
    kind: 'door-open',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-14T13:05',
    value: 21,
    openFor: 26,
    resolve: ['System', 5, 'Door closed after 26 min.'],
  },
  {
    id: 'a-24',
    sensor: 'frostline-fza',
    kind: 'temp-high',
    severity: 'critical',
    status: 'resolved',
    firedAt: '2026-10-14T04:40',
    value: -14.9,
    ack: ['Tomas Reyes', 3, 'Paged the site engineer.'],
    resolve: ['Tomas Reyes', 80, 'Iced evaporator cleared. Back under -18 °C.'],
  },
  {
    id: 'a-25',
    sensor: 'saltmere-dock1',
    kind: 'door-open',
    severity: 'warning',
    status: 'resolved',
    firedAt: '2026-10-13T10:15',
    value: 19,
    openFor: 24,
    resolve: ['System', 5, 'Door closed after 24 min.'],
  },
]

export function siteById(id: string): Site | undefined {
  return SITES.find(site => site.id === id)
}

export function sensorById(id: string): Sensor | undefined {
  return SENSORS.find(sensor => sensor.id === id)
}

export function sensorsOf(siteId: string): Sensor[] {
  return SENSORS.filter(sensor => sensor.siteId === siteId)
}

/** The words an alert is listed under. */
export function alertTitle(kind: AlertKind, sensor: Sensor, value?: number): string {
  switch (kind) {
    case 'temp-high':
      return `${sensor.name} above ${sensor.band?.to} °C`
    case 'humidity-high':
      return `${sensor.name} above ${sensor.band?.to}%`
    case 'door-open':
      return `${sensor.name} open ${value} min`
    case 'power-loss':
      return `${sensor.name} lost`
    case 'gateway-offline':
      return 'Gateway not reporting'
    case 'sensor-offline':
      return `${sensor.name} not reporting`
  }
}

function buildAlert(row: AlertRow): Alert {
  const sensor = sensorById(row.sensor)
  if (!sensor) throw new Error(`Unknown sensor ${row.sensor} on alert ${row.id}`)
  const fired = offsetOf(row.firedAt)
  const events: AlertEvent[] = [{ id: `${row.id}-e1`, kind: 'fired', at: row.firedAt, by: 'System' }]
  if (row.ack) {
    const [by, after, note] = row.ack
    events.push({ id: `${row.id}-e2`, kind: 'acknowledged', at: isoAt(fired + after), by, note })
  }
  if (row.resolve) {
    const [by, after, note] = row.resolve
    events.push({ id: `${row.id}-e3`, kind: 'resolved', at: isoAt(fired + after), by, note })
  }
  return {
    id: row.id,
    siteId: sensor.siteId,
    sensorId: sensor.id,
    kind: row.kind,
    severity: row.severity,
    status: row.status,
    title: alertTitle(row.kind, sensor, row.value),
    firedAt: row.firedAt,
    value: row.value,
    events,
  }
}

/** The scripted investigation's alert, its site and its contact. */
export const SCRIPTED_ALERT_ID = 'a-01'

/* ------------------------------------------------------------------------------------------- */
/* Readings                                                                                     */
/* ------------------------------------------------------------------------------------------- */

/** A small seeded generator (mulberry32): the same sequence on every run. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const DAY = 24 * 60

/** The sensor's ordinary reading at `offset`, before any incident. */
function baselineFn(sensor: Sensor): (offset: number, noise: number) => number {
  const rand = seeded(hashString(`${sensor.id}:phase`))
  const phase = rand() * Math.PI * 2
  const level = rand() - 0.5
  const wave = (offset: number) => Math.sin((offset / DAY) * Math.PI * 2 + phase)
  if (sensor.kind === 'temperature' && sensor.band === FREEZER) {
    return (offset, noise) => -21.2 + level * 0.8 + 0.6 * wave(offset) + noise * 0.25
  }
  switch (sensor.kind) {
    case 'temperature':
      return (offset, noise) => 4.6 + level * 0.6 + 0.45 * wave(offset) + noise * 0.15
    case 'humidity':
      return (offset, noise) => 46 + level * 6 + 5 * wave(offset) + noise * 1.4
    case 'power':
      return (_offset, noise) => 231 + noise * 1.6
    case 'door':
      return () => 0
  }
}

function round(kind: SensorKind, value: number): number {
  if (kind === 'temperature') return Math.round(value * 10) / 10
  if (kind === 'door') return value >= 0.5 ? 1 : 0
  return Math.round(value)
}

/** The knots for an alert with no hand-written curve, from its kind and how it ended. */
function defaultCurve(row: AlertRow): Knot[] {
  const value = row.value ?? 0
  const recovered = row.resolve ? row.resolve[1] : row.status === 'acknowledged' ? 120 : 600
  switch (row.kind) {
    case 'temp-high':
    case 'humidity-high': {
      const peak = row.kind === 'temp-high' ? value + 0.4 : value + 2
      return [[-20, 'base'], [0, value], [Math.max(10, recovered / 3), peak], [recovered + 20, 'base']]
    }
    case 'power-loss': {
      const back = row.resolve ? row.resolve[1] : 35
      return [[-1, 'base'], [0, 0], [back, 0], [back + 1, 'base']]
    }
    default:
      return []
  }
}

function interpolate(knots: Knot[], offset: number, fired: number, base: (offset: number) => number): number | undefined {
  for (let k = 0; k < knots.length - 1; k++) {
    const [m0, v0] = knots[k]
    const [m1, v1] = knots[k + 1]
    const t0 = fired + m0
    const t1 = fired + m1
    if (offset < t0 || offset > t1) continue
    const a = v0 === 'base' ? base(t0) : v0
    const b = v1 === 'base' ? base(t1) : v1
    return t1 === t0 ? b : a + ((b - a) * (offset - t0)) / (t1 - t0)
  }
  return undefined
}

function generateHistory(sensor: Sensor): number[] {
  const rand = seeded(hashString(sensor.id))
  const base = baselineFn(sensor)
  const smooth = (offset: number) => base(offset, 0)
  const incidents = ALERT_ROWS.filter(row => row.sensor === sensor.id)
  const values: number[] = new Array(HISTORY_POINTS)
  for (let i = 0; i < HISTORY_POINTS; i++) {
    const offset = offsetOfIndex(i)
    const noise = rand() * 2 - 1
    let value = base(offset, noise)
    if (sensor.kind === 'door') {
      // Short openings in the working day, one five-minute reading each.
      const hour = Math.floor((((offset % DAY) + DAY + 10 * 60) % DAY) / 60)
      value = hour >= 6 && hour < 20 && rand() < 0.05 ? 1 : 0
    }
    for (const row of incidents) {
      const fired = offsetOf(row.firedAt)
      if (row.kind === 'door-open') {
        const opened = fired - (row.value ?? 15)
        if (offset >= opened && offset < opened + (row.openFor ?? 20)) value = 1
        continue
      }
      const bent = interpolate(row.curve ?? defaultCurve(row), offset, fired, smooth)
      if (bent !== undefined) value = row.kind === 'power-loss' ? bent : Math.max(value, bent + noise * 0.05)
    }
    values[i] = round(sensor.kind, value)
  }
  return values
}

const historyCache = new Map<string, readonly number[]>()

/** Seven days of the sensor's readings, every five minutes, oldest first, ending at NOW. A quiet
 *  sensor's array still runs to NOW; read it only up to `lastSeen`. */
export function history(sensorId: string): readonly number[] {
  let values = historyCache.get(sensorId)
  if (!values) {
    const sensor = sensorById(sensorId)
    if (!sensor) throw new Error(`Unknown sensor ${sensorId}`)
    values = generateHistory(sensor)
    historyCache.set(sensorId, values)
  }
  return values
}

/** The readings a sensor actually sent in the last `minutes`, every `every` minutes. */
export function recentReadings(sensorId: string, minutes: number, every = STEP_MINUTES): number[] {
  const sensor = sensorById(sensorId)
  if (!sensor) return []
  const values = history(sensorId)
  const stride = Math.max(1, Math.round(every / STEP_MINUTES))
  const first = Math.max(0, LAST_INDEX - Math.round(minutes / STEP_MINUTES))
  const out: number[] = []
  for (let i = LAST_INDEX; i >= first; i -= stride) if (i <= sensor.lastSeen) out.unshift(values[i])
  return out
}

/** The last reading a sensor sent. */
export function lastReading(sensorId: string): number {
  const sensor = sensorById(sensorId)
  return sensor ? history(sensorId)[sensor.lastSeen] : 0
}

export function isReporting(sensor: Sensor): boolean {
  return sensor.lastSeen === LAST_INDEX
}

/* ------------------------------------------------------------------------------------------- */
/* Daily status, 30 days                                                                        */
/* ------------------------------------------------------------------------------------------- */

const SITE_DAYS = 30

function resolvedOffset(alert: Alert): number {
  const end = alert.events.find(e => e.kind === 'resolved')
  return end ? offsetOf(end.at) : 0
}

/** Thirty days per site, oldest first: today's and the last week's from the alerts, older ones
 *  from a seeded background of the same kind of day. */
export function siteDays(siteId: string, alerts: readonly Alert[] = seedAlerts()): SiteDay[] {
  const rand = seeded(hashString(`${siteId}:days`))
  const site = siteById(siteId)
  const todayStart = offsetOf(`${NOW.slice(0, 10)}T00:00`)
  const days: SiteDay[] = []
  for (let d = SITE_DAYS - 1; d >= 0; d--) {
    const start = todayStart - d * DAY
    const end = Math.min(start + DAY, 0)
    const day = isoAt(start)
    const roll = rand()
    const inAlertWindow = start >= offsetOf('2026-10-09T00:00')
    if (!inAlertWindow) {
      // Before the alert history: most days quiet, a few with a warning, a rare critical one.
      if (roll < 0.03) days.push({ day, status: 'hostile', alerts: 1 + Math.floor(rand() * 2), degradedMinutes: 60 + Math.floor(rand() * 120) })
      else if (roll < 0.15) days.push({ day, status: 'warning', alerts: 1, degradedMinutes: 10 + Math.floor(rand() * 40) })
      else days.push({ day, status: 'ok', alerts: 0, degradedMinutes: 0 })
      continue
    }
    const fired = alerts.filter(a => a.siteId === siteId && offsetOf(a.firedAt) >= start && offsetOf(a.firedAt) < start + DAY)
    let degraded = 0
    for (const alert of alerts.filter(a => a.siteId === siteId && a.severity !== 'info')) {
      const from = Math.max(offsetOf(alert.firedAt), start)
      const to = Math.min(resolvedOffset(alert), end)
      if (to > from) degraded += to - from
    }
    if (site && !site.online && d === 0) degraded += -offsetOf(OSTWIND_LOST)
    const worst = SEVERITY_ORDER.find(sev => fired.some(a => a.severity === sev))
    const status = worst === 'critical' ? 'hostile' : worst === 'warning' ? 'warning' : 'ok'
    days.push({ day, status, alerts: fired.length, degradedMinutes: Math.min(degraded, DAY) })
  }
  return days
}

/** "12 Oct: 2 alerts, 48 min degraded", or "12 Oct: no alerts". */
export function siteDayLabel(day: SiteDay): string {
  const date = formatShortDay(day.day)
  if (day.alerts === 0 && day.degradedMinutes === 0) return `${date}: no alerts`
  const alerts = `${day.alerts} ${day.alerts === 1 ? 'alert' : 'alerts'}`
  return day.degradedMinutes ? `${date}: ${alerts}, ${formatDuration(day.degradedMinutes)} degraded` : `${date}: ${alerts}`
}

/** The share of the last 30 days the site was not degraded, as a percentage to one decimal. */
export function uptime(days: readonly SiteDay[]): number {
  const degraded = days.reduce((sum, d) => sum + d.degradedMinutes, 0)
  return Math.round((1 - degraded / (days.length * DAY)) * 1000) / 10
}

/* ------------------------------------------------------------------------------------------- */
/* Seed                                                                                         */
/* ------------------------------------------------------------------------------------------- */

export function seedAlerts(): Alert[] {
  return ALERT_ROWS.map(buildAlert)
}

/** Alerts the live simulator raises while the demo is open: at which tick (one every five
 *  seconds), on which sensor, with what reading. Fixed, so every session sees the same three. */
export type LiveAlertPlan = { tick: number; id: string; sensorId: string; kind: AlertKind; severity: Severity; value: number }

export const LIVE_ALERTS: readonly LiveAlertPlan[] = [
  { tick: 6, id: 'a-26', sensorId: 'saltmere-cr2', kind: 'temp-high', severity: 'warning', value: 8.3 },
  { tick: 24, id: 'a-27', sensorId: 'greyhaven-hall', kind: 'humidity-high', severity: 'warning', value: 63 },
  { tick: 72, id: 'a-28', sensorId: 'vellmark-dock1', kind: 'door-open', severity: 'warning', value: 16 },
]

export { OPERATORS }
