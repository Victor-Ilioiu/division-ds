import type { ReactElement } from 'react'
import { DoorOpen, Droplets, Plug, RadioTower, Thermometer, Unplug } from 'lucide-react'
import { Badge } from '../components/atoms/badge/Badge'
import { isReporting, recentReadings, sensorById } from './data'
import {
  formatReading,
  isActive,
  isOutOfBand,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  UNIT,
  type Alert,
  type AlertKind,
  type AlertStatus,
  type Sensor,
  type Severity,
  type Site,
} from './model'
import type { Readings } from './simulator'

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge emphasis="subtle" tone={SEVERITY_TONE[severity]}>
      {SEVERITY_LABEL[severity]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  return (
    <Badge emphasis="subtle" tone={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export const ALERT_ICON: Record<AlertKind, ReactElement> = {
  'temp-high': <Thermometer />,
  'humidity-high': <Droplets />,
  'door-open': <DoorOpen />,
  'power-loss': <Unplug />,
  'gateway-offline': <RadioTower />,
  'sensor-offline': <RadioTower />,
}

export const SENSOR_ICON: Record<Sensor['kind'], ReactElement> = {
  temperature: <Thermometer />,
  humidity: <Droplets />,
  door: <DoorOpen />,
  power: <Plug />,
}

export type SiteHealth = { label: string; tone: 'ok' | 'warning' | 'hostile' }

/** A site in one word: Offline (its gateway is quiet), Alarm (an active critical alert),
 *  Warning, or OK. */
export function siteHealth(site: Site, alerts: readonly Alert[]): SiteHealth {
  if (!site.online) return { label: 'Offline', tone: 'hostile' }
  const active = alerts.filter(a => a.siteId === site.id && isActive(a))
  if (active.some(a => a.severity === 'critical')) return { label: 'Alarm', tone: 'hostile' }
  if (active.some(a => a.severity === 'warning')) return { label: 'Warning', tone: 'warning' }
  return { label: 'OK', tone: 'ok' }
}

export type SensorHealth = { label: string; tone: 'ok' | 'warning' | 'hostile' | 'neutral' }

export function sensorHealth(sensor: Sensor, value: number): SensorHealth {
  if (!isReporting(sensor)) return { label: 'No data', tone: 'neutral' }
  if (sensor.kind === 'door') return value >= 0.5 ? { label: 'Open', tone: 'warning' } : { label: 'Closed', tone: 'ok' }
  if (isOutOfBand(value, sensor.band)) return { label: 'Out of range', tone: 'hostile' }
  return { label: 'In range', tone: 'ok' }
}

/** The reading on screen: the live value for a reporting sensor, the last one it sent otherwise. */
export function currentValue(sensor: Sensor, readings: Readings): number {
  return readings[sensor.id] ?? 0
}

/** Recent readings for a sparkline, with the live value as the last point while the sensor reports. */
export function sparkValues(sensor: Sensor, readings: Readings, minutes: number, every: number): number[] {
  const values = recentReadings(sensor.id, minutes, every)
  if (isReporting(sensor)) values[values.length - 1] = currentValue(sensor, readings)
  return values
}

function trend(sensor: Sensor, values: readonly number[]): string {
  if (values.length < 2) return 'one reading'
  const change = values[values.length - 1] - values[0]
  const step = sensor.kind === 'temperature' ? 0.3 : sensor.kind === 'humidity' ? 3 : 5
  if (change > step) return 'rising'
  if (change < -step) return 'falling'
  return 'steady'
}

/** The sentence a sparkline is read as: "Cold room 2, last 6 hours: 4.5 to 9.6 °C, falling". */
export function sparkLabel(sensor: Sensor, values: readonly number[], period: string): string {
  if (values.length === 0) return `${sensor.name}, ${period}: no readings`
  if (sensor.kind === 'door') {
    const openings = values.filter((v, i) => v >= 0.5 && (i === 0 || values[i - 1] < 0.5)).length
    const now = values[values.length - 1] >= 0.5 ? 'open now' : 'closed now'
    return `${sensor.name}, ${period}: opened ${openings} ${openings === 1 ? 'time' : 'times'}, ${now}`
  }
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const unit = UNIT[sensor.kind]
  const range =
    sensor.kind === 'temperature' ? `${lo.toFixed(1)} to ${hi.toFixed(1)} ${unit}` : `${Math.round(lo)} to ${Math.round(hi)}${unit === '%' ? '%' : ` ${unit}`}`
  const quiet = isReporting(sensor) ? '' : ', no data since'
  return `${sensor.name}, ${period}: ${range}, ${trend(sensor, values)}${quiet}`
}

/** "8.4 °C", or "No data" for a quiet sensor. */
export function readingText(sensor: Sensor, readings: Readings): string {
  if (!isReporting(sensor)) return 'No data'
  return formatReading(sensor.kind, currentValue(sensor, readings))
}

export function sensorOf(alert: Alert): Sensor | undefined {
  return sensorById(alert.sensorId)
}

/** Alert lists sort newest first. */
export function newestFirst(a: Alert, b: Alert): number {
  return b.firedAt.localeCompare(a.firedAt) || b.id.localeCompare(a.id)
}

/** The mono label style the system uses for a small section in an overlay or a card. */
export const SECTION_LABEL = 'font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-label)]'
