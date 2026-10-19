import { lazy, Suspense, useEffect } from 'react'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'
import { Badge } from '../../components/atoms/badge/Badge'
import { Button } from '../../components/atoms/button/Button'
import { linkVariants } from '../../components/atoms/link/Link'
import { Skeleton, SkeletonGroup } from '../../components/atoms/skeleton/Skeleton'
import { Sparkline } from '../../components/atoms/sparkline/Sparkline'
import { Alert as AlertBox } from '../../components/molecules/alert/Alert'
import { Breadcrumbs } from '../../components/molecules/breadcrumbs/Breadcrumbs'
import { DescriptionList } from '../../components/molecules/description-list/DescriptionList'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { SectionHeading } from '../../components/molecules/section-heading/SectionHeading'
import { SegmentedControl } from '../../components/molecules/segmented-control/SegmentedControl'
import { StatusTracker } from '../../components/molecules/status-tracker/StatusTracker'
import { Timeline, TimelineGroup, TimelineItem } from '../../components/molecules/timeline/Timeline'
import { DataTable, type DataTableColumn } from '../../components/organisms/data-table/DataTable'
import { ALERT_ICON, newestFirst, readingText, sensorHealth, SeverityBadge, siteHealth, sparkLabel, sparkValues, StatusBadge } from '../bits'
import { isReporting, OSTWIND_LOST, PRODUCT_NAME, sensorsOf, siteById, siteDayLabel, siteDays, uptime } from '../data'
import { formatBand, KIND_LABEL, SEVERITY_TONE, type Alert, type Sensor } from '../model'
import { consoleLink, useOpenAlert } from '../navigation'
import { useConsole } from '../store'
import { formatDay, formatTime } from '../time'
import type { Range } from './SiteChart'

const SiteChart = lazy(() => import('./SiteChart').then(m => ({ default: m.SiteChart })))

const RANGES = [
  { value: '1h', label: '1 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 d' },
]

function isRange(value: string | null): value is Range {
  return value === '1h' || value === '24h' || value === '7d'
}

function ChartFallback() {
  return (
    <SkeletonGroup label="Loading the chart" className="flex flex-col gap-3">
      <Skeleton lines={2} />
      <Skeleton shape="block" className="h-64 w-full" />
    </SkeletonGroup>
  )
}

function AlertTitle({ alert }: { alert: Alert }) {
  const openAlert = useOpenAlert()
  return (
    <button type="button" className={linkVariants()} onClick={() => openAlert(alert.id)}>
      {alert.title}
    </button>
  )
}

function SiteAlerts({ alerts, siteName }: { alerts: Alert[]; siteName: string }) {
  const days = [...new Set(alerts.map(a => a.firedAt.slice(0, 10)))]
  return (
    <Timeline label={`Alerts at ${siteName}`}>
      {days.map(day => (
        <TimelineGroup key={day} title={formatDay(`${day}T00:00`)} level={3}>
          {alerts
            .filter(a => a.firedAt.startsWith(day))
            .map(alert => (
              <TimelineItem
                key={alert.id}
                icon={ALERT_ICON[alert.kind]}
                tone={alert.status === 'resolved' ? 'ok' : alert.status === 'acknowledged' ? 'info' : SEVERITY_TONE[alert.severity]}
                title={<AlertTitle alert={alert} />}
                meta={
                  <span className="inline-flex flex-wrap gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </span>
                }
                time={`${alert.firedAt}:00`}
                timeLabel={formatTime(alert.firedAt)}
              >
                {alert.events.at(-1)?.note}
              </TimelineItem>
            ))}
        </TimelineGroup>
      ))}
    </Timeline>
  )
}

/**
 * One site: its facts, 30 days of status, its two cold rooms charted over 1 h, 24 h or 7 d
 * (`?range=`), every sensor with its live reading and a 24-hour sparkline against its safe band,
 * and the site's alerts by day, each opening its sheet.
 */
export function SiteDetail() {
  const { id = '' } = useParams()
  const site = siteById(id)
  const { state } = useConsole()
  const [params, setParams] = useSearchParams()
  const range: Range = isRange(params.get('range')) ? (params.get('range') as Range) : '24h'

  useEffect(() => {
    document.title = `${PRODUCT_NAME} — ${site ? site.name : 'site not found'}`
  }, [site])

  if (!site) {
    return (
      <div className="flex max-w-screen-md flex-col gap-8">
        <PageHeader
          breadcrumbs={<Breadcrumbs items={[{ label: 'Sites', href: '/console/sites' }, { label: 'Not found' }]} renderLink={consoleLink} />}
          title="Site not found"
          description={`No site has the id “${id}”.`}
        />
        <EmptyState
          level={2}
          icon={<MapPinOff />}
          title="This site does not exist"
          description="Every site Halden Systems monitors is on the sites page."
          actions={
            <Button asChild>
              <RouterLink to="/console/sites">All sites</RouterLink>
            </Button>
          }
        />
      </div>
    )
  }

  const sensors = sensorsOf(site.id)
  const reporting = sensors.filter(isReporting).length
  const days = siteDays(site.id)
  const health = siteHealth(site, state.alerts)
  const alerts = state.alerts.filter(a => a.siteId === site.id).sort(newestFirst)

  const columns: DataTableColumn<Sensor>[] = [
    { key: 'name', header: 'Sensor', sortValue: s => s.name, cell: s => s.name },
    { key: 'kind', header: 'Kind', sortValue: s => s.kind, cell: s => KIND_LABEL[s.kind] },
    {
      key: 'now',
      header: 'Now',
      numeric: true,
      cell: s => <span className="tabular-nums">{readingText(s, state.readings)}</span>,
    },
    { key: 'band', header: 'Safe range', cell: s => formatBand(s.kind, s.band) },
    {
      key: 'spark',
      header: 'Last 24 h',
      cell: s => {
        const values = sparkValues(s, state.readings, 24 * 60, 30)
        return <Sparkline values={values} band={s.band} width={120} height={28} label={sparkLabel(s, values, 'last 24 hours')} />
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: s => sensorHealth(s, state.readings[s.id]).label,
      cell: s => {
        const h = sensorHealth(s, state.readings[s.id])
        return (
          <Badge emphasis="subtle" tone={h.tone}>
            {h.label}
          </Badge>
        )
      },
    },
  ]

  return (
    <div className="flex max-w-screen-xl flex-col gap-10">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: 'Sites', href: '/console/sites' }, { label: site.name }]} renderLink={consoleLink} />}
        eyebrow={site.customer}
        title={site.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge emphasis="subtle" tone={health.tone}>
              {health.label}
            </Badge>
            <span>
              {reporting} of {sensors.length} sensors reporting through {site.gateway}.
            </span>
          </span>
        }
      />

      {!site.online ? (
        <AlertBox tone="hostile" title="Gateway not reporting">
          {site.gateway} has sent nothing since {formatTime(OSTWIND_LOST)}. Every reading on this page stops there.
        </AlertBox>
      ) : null}

      <section aria-label="Site facts" className="flex flex-col gap-6">
        <DescriptionList
          columns={3}
          items={[
            { term: 'Customer', description: site.customer },
            { term: 'City', description: site.city },
            { term: 'Gateway', description: <span className="font-mono">{site.gateway}</span> },
            { term: 'Sensors', description: `${reporting} of ${sensors.length} reporting` },
            {
              term: 'Site contact',
              description: (
                <span className="flex flex-col">
                  <span>
                    {site.contact.name}, {site.contact.role.toLowerCase()}
                  </span>
                  <a href={`mailto:${site.contact.email}`} className={linkVariants()}>
                    {site.contact.email}
                  </a>
                </span>
              ),
            },
            { term: 'Monitored since', description: formatDay(`${site.installed}T00:00`) + ` ${site.installed.slice(0, 4)}` },
          ]}
        />
        <StatusTracker
          label="Status, last 30 days"
          items={days.map(day => ({ id: day.day, status: day.status, label: siteDayLabel(day) }))}
          summary={`${uptime(days).toFixed(1)}% up`}
        />
      </section>

      <section aria-label="Cold room readings" className="flex flex-col gap-4">
        <SegmentedControl
          label="Chart range"
          options={RANGES}
          value={range}
          onValueChange={value => {
            const next = new URLSearchParams(params)
            next.set('range', value)
            setParams(next, { replace: true })
          }}
        />
        <Suspense fallback={<ChartFallback />}>
          <SiteChart siteId={site.id} range={range} readings={state.readings} />
        </Suspense>
      </section>

      <section aria-labelledby="sensors-heading" className="flex flex-col gap-4">
        <SectionHeading id="sensors-heading" level={2} title="Sensors" description="Live readings, with the last 24 hours drawn against each safe range." />
        <DataTable caption={`Sensors at ${site.name}`} hideCaption columns={columns} rows={sensors} getRowId={s => s.id} rowHeader="name" />
      </section>

      <section aria-labelledby="alerts-heading" className="flex flex-col gap-4">
        <SectionHeading id="alerts-heading" level={2} title="Alerts" description="The last seven days of alerts at this site, newest first." />
        {alerts.length ? (
          <SiteAlerts alerts={alerts} siteName={site.name} />
        ) : (
          <p className="font-body text-sm text-[var(--color-text-secondary)]">No alerts in the last seven days.</p>
        )}
      </section>
    </div>
  )
}
