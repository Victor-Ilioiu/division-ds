import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { Button } from '../../components/atoms/button/Button'
import { linkVariants } from '../../components/atoms/link/Link'
import { Select } from '../../components/atoms/select/Select'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { FormField } from '../../components/molecules/form-field/FormField'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { SegmentedControl } from '../../components/molecules/segmented-control/SegmentedControl'
import { DataTable, type DataTableColumn } from '../../components/organisms/data-table/DataTable'
import { newestFirst, SeverityBadge } from '../bits'
import { sensorById, siteById, WORKSPACE } from '../data'
import { formatReading, SEVERITY_ORDER, type Alert, type AlertStatus, type Severity } from '../model'
import { useOpenAlert } from '../navigation'
import { useAlertChange, useConsole } from '../store'
import { formatWhen } from '../time'

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
]

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'Every severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

function isStatus(value: string | null): value is AlertStatus {
  return value === 'open' || value === 'acknowledged' || value === 'resolved'
}

function siteName(alert: Alert): string {
  return siteById(alert.siteId)?.name ?? alert.siteId
}

function reading(alert: Alert): string {
  const sensor = sensorById(alert.sensorId)
  if (alert.value === undefined || !sensor) return 'No data'
  return alert.kind === 'door-open' ? `${alert.value} min open` : formatReading(sensor.kind, alert.value)
}

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

/**
 * The alert inbox: Open, Acknowledged or Resolved (`?status=`), filtered by severity, with a
 * checkbox per row to acknowledge open alerts (or resolve acknowledged ones) in bulk, undoable
 * from the toast. Each alert's name opens its sheet.
 */
export function Alerts() {
  const { state } = useConsole()
  const change = useAlertChange()
  const openAlert = useOpenAlert()
  const [params, setParams] = useSearchParams()
  const status: AlertStatus = isStatus(params.get('status')) ? (params.get('status') as AlertStatus) : 'open'
  const [severity, setSeverity] = useState<'all' | Severity>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const inStatus = state.alerts.filter(a => a.status === status)
  const rows = inStatus.filter(a => severity === 'all' || a.severity === severity).sort(newestFirst)
  const visible = new Set(rows.map(a => a.id))
  const chosen = [...selected].filter(id => visible.has(id))
  const bulk = status === 'open' ? 'acknowledge' : status === 'acknowledged' ? 'resolve' : undefined

  const columns: DataTableColumn<Alert>[] = [
    {
      key: 'title',
      header: 'Alert',
      sortValue: a => a.title,
      cell: a => (
        <button type="button" className={`${linkVariants()} text-left`} onClick={() => openAlert(a.id)}>
          {a.title}
        </button>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortValue: a => SEVERITY_ORDER.indexOf(a.severity),
      cell: a => <SeverityBadge severity={a.severity} />,
    },
    { key: 'site', header: 'Site', sortValue: siteName, cell: siteName },
    { key: 'reading', header: 'When raised', numeric: true, cell: reading },
    { key: 'raised', header: 'Raised', sortValue: a => a.firedAt, cell: a => <span className="tabular-nums">{formatWhen(a.firedAt)}</span> },
  ]

  const runBulk = () => {
    if (!bulk || chosen.length === 0) return
    change({ type: bulk, alertIds: chosen })
    setSelected(new Set())
  }

  const statusWord = STATUSES.find(s => s.value === status)!.label.toLowerCase()

  return (
    <div className="flex max-w-screen-xl flex-col gap-8">
      <PageHeader eyebrow={WORKSPACE} title="Alerts" description="Every alert the sensors raised in the last seven days, and the ones raised live." />
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[auto_minmax(0,16rem)] md:justify-between">
        <SegmentedControl
          label="Alert status"
          options={STATUSES}
          value={status}
          onValueChange={value => {
            setSelected(new Set())
            const next = new URLSearchParams(params)
            next.set('status', value)
            setParams(next, { replace: true })
          }}
        />
        <FormField label="Severity">
          <Select id="alert-severity" label="Severity" options={SEVERITY_OPTIONS} value={severity} onValueChange={v => setSeverity(v as 'all' | Severity)} />
        </FormField>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="font-body text-sm font-semibold">
          {rows.length === inStatus.length
            ? `${plural(inStatus.length, `${statusWord} alert`)}`
            : `${rows.length} of ${plural(inStatus.length, `${statusWord} alert`)} match`}
          {bulk && chosen.length ? `, ${chosen.length} selected` : ''}
        </p>
        {bulk ? (
          <Button variant="secondary" size="sm" className="ml-auto" aria-disabled={chosen.length === 0 || undefined} onClick={runBulk}>
            {chosen.length
              ? `${bulk === 'acknowledge' ? 'Acknowledge' : 'Resolve'} ${plural(chosen.length, 'alert')}`
              : `${bulk === 'acknowledge' ? 'Acknowledge' : 'Resolve'} selected`}
          </Button>
        ) : null}
      </div>
      {bulk ? null : <p className="font-body text-sm text-[var(--color-text-secondary)]">Resolved alerts are the record; there is nothing left to do to them.</p>}
      <DataTable
        caption={`Alerts, ${statusWord}`}
        hideCaption
        columns={columns}
        rows={rows}
        getRowId={a => a.id}
        rowHeader="title"
        selectable={bulk !== undefined}
        rowLabel={a => `${a.title}, ${siteName(a)}`}
        selected={new Set(chosen)}
        onSelectedChange={setSelected}
        defaultSort={{ key: 'raised', direction: 'descending' }}
        emptyMessage={
          <EmptyState
            level={2}
            size="sm"
            framed={false}
            icon={<CircleCheck />}
            title={`No ${statusWord} alerts`}
            description={severity === 'all' ? 'Nothing in this list right now.' : 'None at this severity. Try every severity.'}
          />
        }
      />
    </div>
  )
}
