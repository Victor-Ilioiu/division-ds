import type { CSSProperties, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { Badge } from '../../components/atoms/badge/Badge'
import { linkVariants } from '../../components/atoms/link/Link'
import { Sparkline } from '../../components/atoms/sparkline/Sparkline'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { List, ListItem } from '../../components/molecules/list-item/ListItem'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { SectionHeading } from '../../components/molecules/section-heading/SectionHeading'
import { Stat } from '../../components/molecules/stat/Stat'
import { StatusTracker } from '../../components/molecules/status-tracker/StatusTracker'
import { cn } from '../../lib/cn'
import {
  ALERT_ICON,
  currentValue,
  newestFirst,
  readingText,
  sensorHealth,
  SeverityBadge,
  siteHealth,
  sparkLabel,
  sparkValues,
  type SiteHealth,
} from '../bits'
import { isReporting, sensorById, SENSORS, siteById, siteDayLabel, siteDays, SITES, uptime, WORKSPACE } from '../data'
import { excursion, formatBand, formatReading, SEVERITY_ORDER, SEVERITY_TONE, type Alert, type Sensor, type Site } from '../model'
import { useOpenAlert } from '../navigation'
import type { Readings } from '../simulator'
import { useConsole } from '../store'
import { formatWhen } from '../time'

/** The reporting sensor furthest outside its safe range, as a share of the range. */
export function worstReading(readings: Readings): { sensor: Sensor; value: number; excursion: number } | undefined {
  let worst: { sensor: Sensor; value: number; excursion: number } | undefined
  for (const sensor of SENSORS) {
    if (!sensor.band || !isReporting(sensor)) continue
    const value = readings[sensor.id]
    const out = excursion(value, sensor.band)
    if (!worst || out > worst.excursion) worst = { sensor, value, excursion: out }
  }
  return worst
}

/** Sites in the order an engineer triages them: offline and in alarm first, then warning, then
 *  OK. Stable within a rank, so the seed order holds among equals. */
export function triageOrder(sites: readonly Site[], alerts: readonly Alert[]): { site: Site; health: SiteHealth }[] {
  const rank = (health: SiteHealth) => (health.tone === 'hostile' ? 0 : health.tone === 'warning' ? 1 : 2)
  return sites
    .map((site, index) => ({ site, health: siteHealth(site, alerts), index }))
    .sort((a, b) => rank(a.health) - rank(b.health) || a.index - b.index)
    .map(({ site, health }) => ({ site, health }))
}

/* The bento grid. Cells draw their own right and bottom hairlines; the grid is pulled 1px past
   its clipping wrapper on both of those sides, so the outermost lines fall under the panel's own
   border and only the lines between cells show, whatever the column count at this width. The
   clip lives on a wrapper because `.crosshair` draws its corner marks outside the panel. */
function Bento({ className, children, ...rest }: { className?: string; children: ReactNode; 'aria-label'?: string }) {
  return (
    <section className="panel crosshair" {...rest}>
      <div className="overflow-hidden">
        <div className={cn('-mr-px -mb-px grid grid-cols-1', className)}>{children}</div>
      </div>
    </section>
  )
}

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-4 border-r border-b border-[var(--color-border-hairline)] p-5', className)}>
      {children}
    </div>
  )
}

const TONE_FILL: Record<'ok' | 'warning' | 'hostile' | 'info', string> = {
  ok: 'var(--color-accent-ok-fill)',
  warning: 'var(--color-accent-warning-fill)',
  hostile: 'var(--color-accent-hostile-fill)',
  info: 'var(--color-accent-info-fill)',
}

const TONE_TEXT: Record<SiteHealth['tone'], string> = {
  ok: 'text-[var(--color-accent-ok-text)]',
  warning: 'text-[var(--color-accent-warning-text)]',
  hostile: 'text-[var(--color-accent-hostile-text)]',
}

/** One row per site: its health in a word, then a pip per sensor (filled while it reports,
 *  coloured by its own state, hollow once it has gone quiet) and the count that reports. The
 *  pips are a picture of the count beside them, so they are hidden from assistive tech and the
 *  row is read as one sentence instead. */
function FleetMatrix({ rows, readings }: { rows: { site: Site; health: SiteHealth }[]; readings: Readings }) {
  return (
    <ul role="list" aria-label="Sensors by site" className="flex flex-col">
      {rows.map(({ site, health }) => {
        const sensors = SENSORS.filter(s => s.siteId === site.id)
        const live = sensors.filter(isReporting).length
        return (
          <li
            key={site.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-[var(--color-border-hairline)] py-2 first:border-t-0 @md:grid-cols-[minmax(0,1fr)_5.5rem_auto_3rem]"
          >
            <span className="sr-only">{`${site.name}: ${health.label}, ${live} of ${sensors.length} sensors reporting.`}</span>
            <span aria-hidden="true" className="truncate font-body text-sm text-[var(--color-text-primary)]">
              {site.name}
            </span>
            <span aria-hidden="true" className={cn('font-mono text-xs font-semibold uppercase tracking-[0.12em]', TONE_TEXT[health.tone])}>
              {health.label}
            </span>
            <span aria-hidden="true" className="col-span-2 flex flex-wrap gap-1 @md:col-span-1">
              {sensors.map(sensor => {
                const state = sensorHealth(sensor, currentValue(sensor, readings))
                const quiet = state.tone === 'neutral'
                return (
                  <span
                    key={sensor.id}
                    className="block h-2.5 w-2.5 border border-[var(--color-border-hairline-strong)]"
                    style={quiet ? undefined : { background: TONE_FILL[state.tone as keyof typeof TONE_FILL], borderColor: 'transparent' }}
                  />
                )
              })}
            </span>
            <span aria-hidden="true" className="hidden text-right font-mono text-xs tabular-nums text-[var(--color-text-secondary)] @md:block">
              {live}/{sensors.length}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Open alerts as one bar split by severity, each part as wide as its share. Drawn on once when
 *  the page arrives (M2, `anim-draw-on`), still under reduced motion. The badges below carry
 *  the counts in words; the bar is named with the same sentence. */
function SeverityBar({ open }: { open: readonly Alert[] }) {
  const parts = SEVERITY_ORDER.map(severity => ({ severity, count: open.filter(a => a.severity === severity).length }))
  const words = parts.map(p => `${p.count} ${p.severity}`).join(', ')
  return (
    <div className="flex flex-col gap-3">
      <div role="img" aria-label={`Open alerts by severity: ${words}.`} className="anim-draw-on flex h-3 gap-0.5">
        {open.length === 0 ? (
          <span className="block h-full w-full border border-[var(--color-border-hairline-strong)]" />
        ) : (
          parts
            .filter(p => p.count > 0)
            .map(p => <span key={p.severity} className="block h-full" style={{ flexGrow: p.count, background: TONE_FILL[SEVERITY_TONE[p.severity]] }} />)
        )}
      </div>
      <p className="flex flex-wrap gap-2">
        {parts.map(p => (
          <Badge key={p.severity} emphasis="subtle" tone={SEVERITY_TONE[p.severity]}>
            {`${p.count} ${p.severity}`}
          </Badge>
        ))}
      </p>
    </div>
  )
}

function NeedsAttention({ alerts }: { alerts: Alert[] }) {
  const openAlert = useOpenAlert()
  if (alerts.length === 0) {
    return (
      <EmptyState
        level={3}
        size="sm"
        icon={<CircleCheck />}
        title="Nothing needs attention"
        description="Every alert is acknowledged or resolved."
      />
    )
  }
  return (
    <List>
      {alerts.map(alert => (
        <ListItem
          key={alert.id}
          media={<span aria-hidden="true">{ALERT_ICON[alert.kind]}</span>}
          title={alert.title}
          description={`${siteById(alert.siteId)?.name ?? alert.siteId} · ${formatWhen(alert.firedAt)}`}
          meta={<SeverityBadge severity={alert.severity} />}
          onActivate={() => openAlert(alert.id)}
        />
      ))}
    </List>
  )
}

/** A site's card. A site that is offline or in alarm takes two columns and a larger chart, and
 *  its frame takes the hostile accent (with the health word beside it, never colour alone). */
function SiteCard({ site, health, alerts, readings }: { site: Site; health: SiteHealth; alerts: readonly Alert[]; readings: Readings }) {
  const sensor = sensorById(site.keySensorId)!
  const values = sparkValues(sensor, readings, 6 * 60, 15)
  const days = siteDays(site.id)
  const open = alerts.filter(a => a.siteId === site.id && a.status === 'open').length
  const urgent = health.tone === 'hostile'
  const frame: CSSProperties | undefined = urgent ? { borderColor: 'var(--color-accent-hostile-fill)' } : undefined
  return (
    <article className="panel crosshair flex h-full flex-col gap-4 p-5" style={frame}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">
          <RouterLink to={`/console/sites/${site.id}`} className={linkVariants()}>
            {site.name}
          </RouterLink>
        </h3>
        <Badge emphasis={urgent ? 'solid' : 'subtle'} tone={health.tone}>
          {health.label}
        </Badge>
      </div>
      <div className={cn('flex gap-4', urgent ? 'flex-col @lg/site:flex-row @lg/site:items-end' : 'items-end justify-between')}>
        <div className="flex min-w-0 shrink-0 flex-col gap-1">
          <span className="font-body text-sm text-[var(--color-text-secondary)]">{sensor.name}</span>
          <span className={cn('font-display font-semibold tabular-nums', urgent ? 'text-3xl' : 'text-xl')}>{readingText(sensor, readings)}</span>
          <span className="font-body text-sm text-[var(--color-text-secondary)]">
            {open === 0 ? 'No open alerts' : `${open} open ${open === 1 ? 'alert' : 'alerts'}`}
          </span>
        </div>
        <div className={urgent ? 'min-w-0 flex-1' : 'shrink-0'}>
          <Sparkline
            values={values}
            band={sensor.band}
            tone={health.tone === 'ok' ? 'neutral' : health.tone}
            showLast
            width={urgent ? 320 : 112}
            height={urgent ? 64 : 32}
            className={urgent ? 'w-full' : undefined}
            label={sparkLabel(sensor, values, 'last 6 hours')}
          />
        </div>
      </div>
      <StatusTracker
        className="mt-auto"
        label="Last 30 days"
        items={days.map(day => ({ id: day.day, status: day.status, label: siteDayLabel(day) }))}
        summary={`${uptime(days)}% up`}
      />
    </article>
  )
}

/* Column spans at four columns: a site offline or in alarm takes two. When that leaves the last
   row short, the last card widens to close it, so the grid never ends on an empty slot. */
const SPAN = ['', '@5xl:col-span-2', '@5xl:col-span-3', '@5xl:col-span-4'] as const
function siteSpan(triage: { health: SiteHealth }[], index: number): string {
  const width = (i: number) => (triage[i].health.tone === 'hostile' ? 2 : 1)
  let span = width(index)
  if (index === triage.length - 1) {
    const used = triage.reduce((sum, _, i) => sum + width(i), 0)
    span += (4 - (used % 4)) % 4
  }
  return SPAN[span - 1]
}

/**
 * Every site at a glance, as a triage board. A bento of readouts first: the fleet as a matrix
 * (a row per site, a pip per sensor), the open alerts as one bar split by severity, and the worst
 * reading with its own six hours. Then the open alerts newest first, each opening its sheet; then
 * a card per site in triage order, where a site offline or in alarm takes two columns. Numbers
 * update with the live feed and never animate; the only motion is the severity bar drawing on
 * once when the page arrives.
 */
export function ConsoleOverview() {
  const { state } = useConsole()
  const online = SITES.filter(s => s.online).length
  const reporting = SENSORS.filter(isReporting).length
  const open = state.alerts.filter(a => a.status === 'open').sort(newestFirst)
  const worst = worstReading(state.readings)
  const worstSite = worst ? siteById(worst.sensor.siteId) : undefined
  const worstText = worst ? formatReading(worst.sensor.kind, worst.value) : ''
  const worstValues = worst ? sparkValues(worst.sensor, state.readings, 6 * 60, 15) : []
  const triage = triageOrder(SITES, state.alerts)

  return (
    <div className="@container flex max-w-screen-xl flex-col gap-10">
      <PageHeader eyebrow={WORKSPACE} title="Overview" description="Every warehouse site Halden Systems monitors, as it reads now." />

      <Bento aria-label="Now" className="@3xl:grid-cols-12">
        <Cell className="@3xl:col-span-7 @3xl:row-span-2">
          <div className="grid grid-cols-2 gap-6">
            <Stat label="Sites online" value={online} unit={`of ${SITES.length}`} />
            <Stat label="Sensors reporting" value={reporting} unit={`of ${SENSORS.length}`} />
          </div>
          <FleetMatrix rows={triage} readings={state.readings} />
        </Cell>
        <Cell className="@3xl:col-span-5">
          <Stat label="Open alerts" value={open.length} />
          <SeverityBar open={open} />
        </Cell>
        <Cell className="@3xl:col-span-5">
          {worst ? (
            <>
              <Stat label="Worst reading" value={worstText.split(' ')[0]} unit={worstText.split(' ')[1]} />
              <Sparkline
                values={worstValues}
                band={worst.sensor.band}
                tone={worst.excursion > 0 ? 'hostile' : 'neutral'}
                showLast
                width={320}
                height={56}
                className="w-full"
                label={sparkLabel(worst.sensor, worstValues, 'last 6 hours')}
              />
              <p className="font-body text-sm text-[var(--color-text-secondary)]">
                {worst.sensor.name}, {worstSite?.name}. Safe {formatBand(worst.sensor.kind, worst.sensor.band)}
                {worst.excursion > 0 ? ': outside it.' : ': inside it.'}
              </p>
            </>
          ) : (
            <p className="font-body text-sm text-[var(--color-text-secondary)]">No sensor with a safe range is reporting.</p>
          )}
        </Cell>
      </Bento>

      <section aria-labelledby="attention-heading" className="flex flex-col gap-4">
        <SectionHeading
          id="attention-heading"
          level={2}
          title="Needs attention"
          description="Open alerts, newest first. Each opens beside this page."
          action={
            <RouterLink to="/console/alerts" className={linkVariants()}>
              Every alert
            </RouterLink>
          }
        />
        <NeedsAttention alerts={open} />
      </section>

      <section aria-labelledby="sites-heading" className="flex flex-col gap-4">
        <SectionHeading id="sites-heading" level={2} title="Sites" description="Offline and in alarm first. Each site's key sensor over six hours, and its last 30 days." />
        <ul role="list" className="grid grid-flow-row-dense grid-cols-1 gap-6 @3xl:grid-cols-2 @5xl:grid-cols-4">
          {triage.map(({ site, health }, index) => (
            <li key={site.id} className={cn('@container/site', siteSpan(triage, index))}>
              <SiteCard site={site} health={health} alerts={state.alerts} readings={state.readings} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
