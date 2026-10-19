import { alertTitle, hashString, lastReading, LIVE_ALERTS, seeded, sensorById, SENSORS, isReporting } from './data'
import type { Alert, Sensor } from './model'
import { isoAt } from './time'

/**
 * The live feed, simulated. Every five seconds the console calls `simulateTick` with the tick
 * number; it returns each reporting sensor's new reading and any alert planned for that tick.
 * Pure and seeded by the tick number alone, so tick 12 reads the same in every session, in every
 * test, and after a pause: pausing stops calling it, and resuming carries on from the next tick.
 *
 * A reading wanders a little around the sensor's last stored value; a door keeps its state. An
 * alert planned in `LIVE_ALERTS` fires at its tick and moves its sensor to the reading it names,
 * so the new alert and the number beside it agree.
 */

export const TICK_MS = 5000
export const TICK_SECONDS = TICK_MS / 1000

export type Readings = Record<string, number>

/** Each reporting sensor's reading before the first tick: its last stored value. */
export function initialReadings(): Readings {
  const readings: Readings = {}
  for (const sensor of SENSORS) readings[sensor.id] = lastReading(sensor.id)
  return readings
}

const AMPLITUDE: Record<Sensor['kind'], number> = { temperature: 0.1, humidity: 1, power: 1.5, door: 0 }

function roundFor(sensor: Sensor, value: number): number {
  return sensor.kind === 'temperature' ? Math.round(value * 10) / 10 : Math.round(value)
}

/** The planned alerts that fire at `tick`, as alert records. */
export function alertsForTick(tick: number): Alert[] {
  return LIVE_ALERTS.filter(plan => plan.tick === tick).map(plan => {
    const sensor = sensorById(plan.sensorId)!
    const firedAt = isoAt(Math.ceil((tick * TICK_SECONDS) / 60))
    return {
      id: plan.id,
      siteId: sensor.siteId,
      sensorId: sensor.id,
      kind: plan.kind,
      severity: plan.severity,
      status: 'open',
      title: alertTitle(plan.kind, sensor, plan.value),
      firedAt,
      value: plan.value,
      events: [{ id: `${plan.id}-e1`, kind: 'fired', at: firedAt, by: 'System' }],
    }
  })
}

/**
 * The readings after `tick` (1 for the first tick). `anchors` are the values readings wander
 * around: each sensor's last stored value, or the reading a live alert moved it to.
 */
export function simulateTick(tick: number, anchors: Readings): { readings: Readings; anchors: Readings; alerts: Alert[] } {
  const rand = seeded(hashString(`tick:${tick}`))
  const alerts = alertsForTick(tick)
  const nextAnchors = { ...anchors }
  for (const plan of LIVE_ALERTS) if (plan.tick === tick) nextAnchors[plan.sensorId] = plan.kind === 'door-open' ? 1 : plan.value
  const readings: Readings = {}
  for (const sensor of SENSORS) {
    const anchor = nextAnchors[sensor.id]
    const noise = rand() * 2 - 1
    if (!isReporting(sensor) || sensor.kind === 'door') {
      readings[sensor.id] = anchor
      continue
    }
    readings[sensor.id] = roundFor(sensor, anchor + noise * AMPLITUDE[sensor.kind])
  }
  return { readings, anchors: nextAnchors, alerts }
}
