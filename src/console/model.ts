/** Halden Console's record types, and the small rules every page shares about them. */

export type SensorKind = 'temperature' | 'humidity' | 'door' | 'power'

export type Band = { from: number; to: number }

export type Site = {
  id: string
  name: string
  customer: string
  city: string
  /** The gateway that relays the site's sensors. */
  gateway: string
  contact: { name: string; role: string; email: string }
  installed: string
  /** The sensor shown on the overview card and first on the site page. */
  keySensorId: string
  /** False when the gateway has stopped reporting: every sensor on the site goes quiet. */
  online: boolean
}

export type Sensor = {
  id: string
  siteId: string
  name: string
  kind: SensorKind
  /** The safe range. A door has none: open longer than 15 minutes is its alarm. */
  band?: Band
  /** The history index of the last reading received; earlier than the last index means the
   *  sensor has gone quiet. */
  lastSeen: number
}

export type Severity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'
export type AlertKind = 'temp-high' | 'humidity-high' | 'door-open' | 'power-loss' | 'gateway-offline' | 'sensor-offline'

export type AlertEvent = {
  id: string
  kind: 'fired' | 'acknowledged' | 'resolved' | 'note'
  at: string
  by: string
  note?: string
}

export type Alert = {
  id: string
  siteId: string
  sensorId: string
  kind: AlertKind
  severity: Severity
  status: AlertStatus
  title: string
  firedAt: string
  /** The reading when it fired, in the sensor's unit (minutes open for a door). */
  value?: number
  events: AlertEvent[]
}

export type DayStatus = 'ok' | 'warning' | 'hostile' | 'neutral'

export type SiteDay = { day: string; status: DayStatus; alerts: number; degradedMinutes: number }

export const UNIT: Record<SensorKind, string> = {
  temperature: '°C',
  humidity: '%',
  door: '',
  power: 'V',
}

export const KIND_LABEL: Record<SensorKind, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  door: 'Door',
  power: 'Mains power',
}

export const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Critical', warning: 'Warning', info: 'Info' }
export const SEVERITY_TONE: Record<Severity, 'hostile' | 'warning' | 'info'> = {
  critical: 'hostile',
  warning: 'warning',
  info: 'info',
}
export const SEVERITY_ORDER: Severity[] = ['critical', 'warning', 'info']

export const STATUS_LABEL: Record<AlertStatus, string> = { open: 'Open', acknowledged: 'Acknowledged', resolved: 'Resolved' }
export const STATUS_TONE: Record<AlertStatus, 'hostile' | 'info' | 'ok'> = {
  open: 'hostile',
  acknowledged: 'info',
  resolved: 'ok',
}

/** A reading as people read it: "8.4 °C", "64%", "231 V", "Open", "Closed". */
export function formatReading(kind: SensorKind, value: number): string {
  switch (kind) {
    case 'temperature':
      return `${value.toFixed(1)} °C`
    case 'humidity':
      return `${Math.round(value)}%`
    case 'power':
      return `${Math.round(value)} V`
    case 'door':
      return value >= 0.5 ? 'Open' : 'Closed'
  }
}

/** "2 to 8 °C", "30 to 60%". */
export function formatBand(kind: SensorKind, band: Band | undefined): string {
  if (!band) return kind === 'door' ? 'Closed, or open under 15 min' : 'None'
  const unit = UNIT[kind]
  const join = unit === '%' ? '%' : ` ${unit}`
  return `${band.from} to ${band.to}${join}`
}

/** How far outside its band a reading is, as a share of the band's width: 0 inside it. */
export function excursion(value: number, band: Band | undefined): number {
  if (!band) return 0
  const width = band.to - band.from || 1
  if (value > band.to) return (value - band.to) / width
  if (value < band.from) return (band.from - value) / width
  return 0
}

export function isOutOfBand(value: number, band: Band | undefined): boolean {
  return excursion(value, band) > 0
}

export function isActive(alert: Alert): boolean {
  return alert.status !== 'resolved'
}
