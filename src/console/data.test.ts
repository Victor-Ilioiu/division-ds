import { describe, expect, it } from 'vitest'
import {
  history,
  HISTORY_POINTS,
  indexAtOffset,
  isReporting,
  LAST_INDEX,
  LIVE_ALERTS,
  recentReadings,
  SCRIPTED_ALERT_ID,
  seedAlerts,
  sensorById,
  SENSORS,
  siteById,
  siteDays,
  SITES,
  uptime,
} from './data'
import { isOutOfBand } from './model'
import { offsetOf } from './time'

const alerts = seedAlerts()

function unique(ids: string[]) {
  return new Set(ids).size === ids.length
}

describe('Halden Console demo data', () => {
  it('has the sizes the demo promises', () => {
    expect(SITES).toHaveLength(8)
    expect(SENSORS).toHaveLength(60)
    expect(alerts).toHaveLength(25)
    expect(alerts.filter(a => a.status === 'open')).toHaveLength(7)
    expect(alerts.filter(a => a.status === 'acknowledged')).toHaveLength(6)
    expect(alerts.filter(a => a.status === 'resolved')).toHaveLength(12)
    expect(HISTORY_POINTS).toBe(2016)
  })

  it('uses unique ids, and points every reference at a record that exists', () => {
    expect(unique(SITES.map(s => s.id))).toBe(true)
    expect(unique(SENSORS.map(s => s.id))).toBe(true)
    expect(unique([...alerts.map(a => a.id), ...LIVE_ALERTS.map(a => a.id)])).toBe(true)
    for (const site of SITES) expect(sensorById(site.keySensorId)?.siteId).toBe(site.id)
    for (const sensor of SENSORS) expect(siteById(sensor.siteId)).toBeDefined()
    for (const alert of alerts) {
      expect(sensorById(alert.sensorId)?.siteId).toBe(alert.siteId)
      for (const event of alert.events) expect(offsetOf(event.at)).toBeLessThanOrEqual(0)
    }
    for (const plan of LIVE_ALERTS) expect(sensorById(plan.sensorId)).toBeDefined()
  })

  it('keeps every alert inside the seven days of history, and its events in order', () => {
    for (const alert of alerts) {
      const fired = offsetOf(alert.firedAt)
      expect(fired).toBeLessThanOrEqual(0)
      expect(fired).toBeGreaterThan(-7 * 24 * 60)
      const times = alert.events.map(e => offsetOf(e.at))
      expect([...times].sort((a, b) => a - b)).toEqual(times)
      expect(alert.events[0].kind).toBe('fired')
      const last = alert.events.at(-1)!.kind
      expect(alert.status === 'open' ? 'fired' : alert.status).toBe(last)
    }
  })

  it('bends the readings to match every alert: the history crosses the band where it fired', () => {
    for (const alert of alerts.filter(a => a.kind === 'temp-high' || a.kind === 'humidity-high')) {
      const sensor = sensorById(alert.sensorId)!
      const at = indexAtOffset(offsetOf(alert.firedAt))
      const around = history(sensor.id).slice(at - 1, at + 2)
      expect(Math.max(...around), alert.id).toBeGreaterThan(sensor.band!.to)
    }
    for (const alert of alerts.filter(a => a.kind === 'door-open')) {
      const at = indexAtOffset(offsetOf(alert.firedAt))
      expect(history(alert.sensorId)[at], alert.id).toBe(1)
    }
    for (const alert of alerts.filter(a => a.kind === 'power-loss')) {
      const at = indexAtOffset(offsetOf(alert.firedAt)) + 1
      expect(history(alert.sensorId)[at], alert.id).toBe(0)
    }
  })

  it('tells the scripted story: Cold room 2 at Brennick peaks near 9.6 °C and is still warm now', () => {
    const scripted = alerts.find(a => a.id === SCRIPTED_ALERT_ID)!
    expect(scripted).toMatchObject({ siteId: 'brennick', sensorId: 'brennick-cr2', status: 'open', severity: 'critical' })
    const values = history('brennick-cr2')
    expect(Math.max(...values.slice(LAST_INDEX - 36))).toBeCloseTo(9.6, 0)
    expect(isOutOfBand(values[LAST_INDEX], { from: 2, to: 8 })).toBe(true)
    // The door opened at 07:40 for 22 minutes.
    expect(history('brennick-cr2door')[indexAtOffset(offsetOf('2026-10-15T07:45'))]).toBe(1)
    expect(history('brennick-cr2door')[indexAtOffset(offsetOf('2026-10-15T08:05'))]).toBe(0)
  })

  it('has quiet sensors where the story says: Ostwind since 09:12, one Rookfield door', () => {
    const quiet = SENSORS.filter(s => !isReporting(s)).map(s => s.id)
    expect(quiet).toHaveLength(8)
    expect(quiet.filter(id => id.startsWith('ostwind-'))).toHaveLength(7)
    expect(quiet).toContain('rookfield-dock1')
    expect(recentReadings('ostwind-cr1', 60).length).toBeLessThan(recentReadings('brennick-cr1', 60).length)
  })

  it('is deterministic', () => {
    expect(seedAlerts()).toEqual(alerts)
    expect(history('saltmere-hall').slice(0, 50)).toEqual(history('saltmere-hall').slice(0, 50))
  })

  it('gives every site 30 days of status, today last, with the offline site down today', () => {
    for (const site of SITES) {
      const days = siteDays(site.id)
      expect(days).toHaveLength(30)
      expect(days.at(-1)!.day.slice(0, 10)).toBe('2026-10-15')
      expect(uptime(days)).toBeGreaterThan(90)
      expect(uptime(days)).toBeLessThanOrEqual(100)
    }
    expect(siteDays('ostwind').at(-1)!.status).toBe('hostile')
    expect(siteDays('brennick').at(-1)!.status).toBe('hostile')
  })
})
