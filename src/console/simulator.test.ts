import { describe, expect, it } from 'vitest'
import { isReporting, LIVE_ALERTS, SENSORS } from './data'
import { alertsForTick, initialReadings, simulateTick } from './simulator'

function run(ticks: number) {
  let anchors = initialReadings()
  const seen: ReturnType<typeof simulateTick>[] = []
  for (let tick = 1; tick <= ticks; tick++) {
    const step = simulateTick(tick, anchors)
    anchors = step.anchors
    seen.push(step)
  }
  return seen
}

describe('Halden Console simulator', () => {
  it('produces the same readings and alerts for the same ticks, every time', () => {
    expect(run(30)).toEqual(run(30))
  })

  it('moves reporting sensors only, a little, and never a door or a quiet sensor', () => {
    const start = initialReadings()
    const [first] = run(1)
    let moved = 0
    for (const sensor of SENSORS) {
      const before = start[sensor.id]
      const after = first.readings[sensor.id]
      if (!isReporting(sensor) || sensor.kind === 'door') {
        expect(after, sensor.id).toBe(before)
        continue
      }
      if (after !== before) moved++
      const limit = sensor.kind === 'temperature' ? 0.11 : sensor.kind === 'humidity' ? 1.01 : 2.01
      expect(Math.abs(after - before), sensor.id).toBeLessThanOrEqual(limit)
    }
    expect(moved).toBeGreaterThan(10)
  })

  it('raises each planned alert once, at its tick, and moves its sensor to the alert reading', () => {
    const steps = run(80)
    const raised = steps.flatMap((s, i) => s.alerts.map(a => ({ tick: i + 1, id: a.id })))
    expect(raised).toEqual(LIVE_ALERTS.map(p => ({ tick: p.tick, id: p.id })))
    const first = LIVE_ALERTS[0]
    expect(steps[first.tick - 1].anchors[first.sensorId]).toBe(first.value)
    expect(alertsForTick(first.tick)[0]).toMatchObject({ status: 'open', firedAt: '2026-10-15T10:01', title: 'Cold room 2 above 8 °C' })
  })

  it('wanders around the anchor rather than drifting away from it', () => {
    const steps = run(200)
    const values = steps.map(s => s.readings['brennick-cr1'])
    const anchor = initialReadings()['brennick-cr1']
    for (const v of values) expect(Math.abs(v - anchor)).toBeLessThanOrEqual(0.11)
  })
})
