import { Link as RouterLink } from 'react-router-dom'
import { Badge } from '../../components/atoms/badge/Badge'
import { linkVariants } from '../../components/atoms/link/Link'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { DataTable, type DataTableColumn } from '../../components/organisms/data-table/DataTable'
import { siteHealth } from '../bits'
import { isReporting, sensorsOf, siteDays, SITES, uptime, WORKSPACE } from '../data'
import type { Site } from '../model'
import { useConsole } from '../store'

const HEALTH_ORDER = ['Offline', 'Alarm', 'Warning', 'OK']

/** Every site with its status, how many sensors report, its open alerts and 30-day uptime. */
export function Sites() {
  const { state } = useConsole()
  const open = (site: Site) => state.alerts.filter(a => a.siteId === site.id && a.status === 'open').length

  const columns: DataTableColumn<Site>[] = [
    {
      key: 'name',
      header: 'Site',
      sortValue: s => s.name,
      cell: s => (
        <RouterLink to={`/console/sites/${s.id}`} className={linkVariants()}>
          {s.name}
        </RouterLink>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: s => HEALTH_ORDER.indexOf(siteHealth(s, state.alerts).label),
      cell: s => {
        const health = siteHealth(s, state.alerts)
        return (
          <Badge emphasis="subtle" tone={health.tone}>
            {health.label}
          </Badge>
        )
      },
    },
    {
      key: 'sensors',
      header: 'Sensors reporting',
      numeric: true,
      sortValue: s => sensorsOf(s.id).filter(isReporting).length,
      cell: s => `${sensorsOf(s.id).filter(isReporting).length} of ${sensorsOf(s.id).length}`,
    },
    { key: 'open', header: 'Open alerts', numeric: true, sortValue: open, cell: s => String(open(s)) },
    {
      key: 'uptime',
      header: 'Uptime, 30 days',
      numeric: true,
      sortValue: s => uptime(siteDays(s.id)),
      cell: s => `${uptime(siteDays(s.id)).toFixed(1)}%`,
    },
    { key: 'gateway', header: 'Gateway', cell: s => <span className="font-mono">{s.gateway}</span> },
  ]

  return (
    <div className="flex max-w-screen-xl flex-col gap-8">
      <PageHeader eyebrow={WORKSPACE} title="Sites" description="The warehouses Halden Systems monitors, one row per site." />
      <p className="font-body text-sm font-semibold">{SITES.length} sites</p>
      <DataTable
        caption="Sites"
        hideCaption
        columns={columns}
        rows={SITES}
        getRowId={s => s.id}
        rowHeader="name"
        defaultSort={{ key: 'status', direction: 'ascending' }}
      />
    </div>
  )
}
