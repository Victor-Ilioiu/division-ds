import { useEffect, useId, useRef, useState, type ReactElement } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BellRing, CircleCheck, Eye, Sparkles, StickyNote } from 'lucide-react'
import { Button } from '../components/atoms/button/Button'
import { linkVariants } from '../components/atoms/link/Link'
import { Sparkline } from '../components/atoms/sparkline/Sparkline'
import { Textarea } from '../components/atoms/textarea/Textarea'
import { DescriptionList } from '../components/molecules/description-list/DescriptionList'
import { FormField } from '../components/molecules/form-field/FormField'
import { Timeline, TimelineItem } from '../components/molecules/timeline/Timeline'
import { Sheet, SheetContent } from '../components/organisms/sheet/Sheet'
import { brennickScript, unscriptedAlertScript } from './assistant'
import { readingText, SECTION_LABEL, SeverityBadge, sparkLabel, StatusBadge } from './bits'
import { history, indexAtOffset, isReporting, LAST_INDEX, offsetOfIndex, SCRIPTED_ALERT_ID, sensorById, siteById } from './data'
import { formatBand, formatReading, SEVERITY_TONE, type Alert, type AlertEvent } from './model'
import { useCloseAlert } from './navigation'
import { CONSOLE_ASSISTANT } from './routes'
import { useAlertChange, useConsole } from './store'
import { formatTime, formatWhen, isoAt, offsetOf } from './time'
import { useConsoleUi } from './ui'

const EVENT_ICON: Record<AlertEvent['kind'], ReactElement> = {
  fired: <BellRing />,
  acknowledged: <Eye />,
  resolved: <CircleCheck />,
  note: <StickyNote />,
}

function eventTitle(event: AlertEvent): string {
  switch (event.kind) {
    case 'fired':
      return 'Raised'
    case 'acknowledged':
      return `Acknowledged by ${event.by}`
    case 'resolved':
      return event.by === 'System' ? 'Resolved on its own' : `Resolved by ${event.by}`
    case 'note':
      return `Note from ${event.by}`
  }
}

/** The readings around the alert: three hours either side of when it fired, up to now. */
function windowValues(alert: Alert, live: number | undefined): { values: number[]; from: string; to: string } {
  const sensor = sensorById(alert.sensorId)
  if (!sensor) return { values: [], from: '', to: '' }
  const fired = offsetOf(alert.firedAt)
  const first = indexAtOffset(fired - 180)
  const last = Math.min(indexAtOffset(fired + 180), sensor.lastSeen)
  const values = history(sensor.id).slice(first, last + 1)
  // A live alert fired after the stored history ends: its window is the last six hours.
  if (values.length === 0) values.push(...history(sensor.id).slice(LAST_INDEX - 72, LAST_INDEX + 1))
  if (last >= LAST_INDEX && isReporting(sensor) && live !== undefined) values[values.length - 1] = live
  const firstShown = values.length && first <= last ? first : LAST_INDEX - 72
  return {
    values,
    from: formatTime(isoAt(offsetOfIndex(firstShown))),
    to: last >= LAST_INDEX ? 'now' : formatTime(isoAt(offsetOfIndex(last))),
  }
}

function AlertBody({ alert }: { alert: Alert }) {
  const { state, startScript } = useConsole()
  const change = useAlertChange()
  const { wide, setAssistantOpen } = useConsoleUi()
  const close = useCloseAlert()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [note, setNote] = useState('')
  const ids = useId()
  const statusRef = useRef<HTMLParagraphElement>(null)
  const [refocus, setRefocus] = useState(0)
  const sensor = sensorById(alert.sensorId)
  const site = siteById(alert.siteId)
  const live = sensor ? state.readings[sensor.id] : undefined
  const { values, from, to } = windowValues(alert, live)
  const busy = state.conversation.run?.status === 'running' || state.conversation.run?.status === 'awaiting'
  const last = alert.events.at(-1)

  // An action replaces the buttons that ran it, so focus moves to the line that says what happened.
  useEffect(() => {
    if (refocus) statusRef.current?.focus()
  }, [refocus])

  const act = (type: 'acknowledge' | 'resolve') => {
    change({ type, alertIds: [alert.id], note })
    setNote('')
    setRefocus(n => n + 1)
  }

  const investigate = () => {
    if (!busy) {
      startScript(
        alert.id === SCRIPTED_ALERT_ID
          ? brennickScript(state.readings, 'Why is Cold room 2 at Brennick warm?')
          : unscriptedAlertScript(alert),
      )
    }
    if (pathname === CONSOLE_ASSISTANT) {
      close()
    } else if (wide) {
      close()
      setAssistantOpen(true)
    } else {
      navigate(CONSOLE_ASSISTANT)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={alert.severity} />
        <StatusBadge status={alert.status} />
      </div>

      {sensor ? (
        <section aria-labelledby={`${ids}-reading`} className="flex flex-col gap-3">
          <h3 id={`${ids}-reading`} className={SECTION_LABEL}>
            Reading, {from} to {to}
          </h3>
          <Sparkline
            values={values}
            band={sensor.band}
            tone={SEVERITY_TONE[alert.severity] === 'hostile' ? 'hostile' : 'warning'}
            showLast
            height={56}
            className="w-full"
            label={sparkLabel(sensor, values, `${from} to ${to}`)}
          />
        </section>
      ) : null}

      <DescriptionList
        columns={2}
        items={[
          {
            term: 'Site',
            description: site ? (
              <RouterLink to={`/console/sites/${site.id}`} className={linkVariants()}>
                {site.name}
              </RouterLink>
            ) : (
              alert.siteId
            ),
          },
          { term: 'Sensor', description: sensor?.name ?? alert.sensorId },
          { term: 'Raised', description: formatWhen(alert.firedAt) },
          {
            term: 'When raised',
            description:
              alert.value === undefined || !sensor
                ? 'No reading: the sensor went quiet'
                : alert.kind === 'door-open'
                  ? `Open ${alert.value} min`
                  : formatReading(sensor.kind, alert.value),
          },
          { term: 'Now', description: sensor ? readingText(sensor, state.readings) : 'No data' },
          { term: 'Safe range', description: sensor ? formatBand(sensor.kind, sensor.band) : 'None' },
        ]}
      />

      <p ref={statusRef} tabIndex={-1} className="font-body text-sm focus:outline-none">
        {alert.status === 'open'
          ? 'Open: nobody has acknowledged it yet.'
          : `${alert.status === 'acknowledged' ? 'Acknowledged' : 'Resolved'} by ${last?.by ?? 'someone'}, ${last ? formatWhen(last.at) : ''}.`}
      </p>

      {alert.status !== 'resolved' ? (
        <section aria-labelledby={`${ids}-act`} className="flex flex-col gap-3">
          <h3 id={`${ids}-act`} className={SECTION_LABEL}>
            Act on it
          </h3>
          <FormField label="Note" help="Optional. Saved in the alert's history.">
            <Textarea id={`${ids}-note`} rows={2} value={note} onChange={event => setNote(event.target.value)} />
          </FormField>
          <div className="flex flex-wrap gap-3">
            {alert.status === 'open' ? <Button onClick={() => act('acknowledge')}>Acknowledge</Button> : null}
            <Button variant={alert.status === 'open' ? 'secondary' : 'primary'} onClick={() => act('resolve')}>
              Resolve
            </Button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" iconStart={<Sparkles />} onClick={investigate}>
            Investigate with Assistant
          </Button>
        </div>
        {busy ? (
          <p className="font-body text-sm text-[var(--color-text-secondary)]">
            The assistant is busy with another investigation; this opens it where it is.
          </p>
        ) : null}
      </div>

      <section aria-labelledby={`${ids}-history`} className="flex flex-col gap-3">
        <h3 id={`${ids}-history`} className={SECTION_LABEL}>
          History
        </h3>
        <Timeline label={`History of ${alert.title}`}>
          {alert.events.map(event => (
            <TimelineItem
              key={event.id}
              icon={EVENT_ICON[event.kind]}
              tone={event.kind === 'fired' ? SEVERITY_TONE[alert.severity] : event.kind === 'resolved' ? 'ok' : 'info'}
              title={eventTitle(event)}
              time={`${event.at}:00`}
              timeLabel={formatWhen(event.at)}
            >
              {event.note}
            </TimelineItem>
          ))}
        </Timeline>
      </section>
    </div>
  )
}

/**
 * One alert's detail, beside whatever page opened it: a Sheet, because the list behind it stays
 * the context. Opened by `?alert=<id>` from anywhere in the console, so it is linkable and Back
 * closes it. Mounted once, in the shell.
 */
export function AlertSheet() {
  const [params] = useSearchParams()
  const { state } = useConsole()
  const close = useCloseAlert()
  const id = params.get('alert')
  const alert = id ? state.alerts.find(a => a.id === id) : undefined
  const site = alert ? siteById(alert.siteId) : undefined

  return (
    <Sheet
      open={id !== null}
      onOpenChange={open => {
        if (!open) close()
      }}
    >
      {id !== null ? (
        <SheetContent
          title={alert ? alert.title : 'Alert not found'}
          description={alert ? `${site?.name ?? alert.siteId} · ${formatWhen(alert.firedAt)}` : undefined}
          closeLabel="Close alert"
          className="w-[min(36rem,calc(100vw-1rem))]"
        >
          {alert ? (
            <AlertBody key={alert.id} alert={alert} />
          ) : (
            <p className="font-body text-sm">No alert has the id “{id}”. Alerts raised live start again when the page reloads.</p>
          )}
        </SheetContent>
      ) : null}
    </Sheet>
  )
}
