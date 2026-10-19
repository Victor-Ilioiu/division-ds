import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Alert.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { Alert } from './Alert'

/** A dismissible alert that can be restored, so the docs page demonstrates the whole dismiss
 *  round trip rather than a one-way disappearance. It carries no `live` prop: the alert is
 *  present from the moment this example mounts, not inserted in response to something the person
 *  did, so it is ordinary content with no role: never role="alert" on content present at
 *  load. */
function DismissibleExample() {
  const [dismissed, setDismissed] = useState(false)

  return dismissed ? (
    <Button variant="secondary" size="sm" onClick={() => setDismissed(false)}>
      Restore alert
    </Button>
  ) : (
    <Alert
      tone="warning"
      title="Depot closes early"
      onDismiss={() => setDismissed(true)}
      dismissLabel="Dismiss depot notice"
    >
      The Brasov depot closes at 4pm today for maintenance.
    </Alert>
  )
}

/** A Button that inserts a `live` hostile alert on click, so the docs page shows one actually
 *  being announced rather than only describing the mapping in prose. */
function LiveExample() {
  const [shown, setShown] = useState(false)

  return (
    <div className="flex flex-col gap-3 w-full">
      <Button
        variant="secondary"
        size="sm"
        wrapperClassName="self-start"
        onClick={() => setShown(true)}
      >
        Trigger a live alert
      </Button>
      {shown ? (
        <Alert live tone="hostile" title="Sync failed" onDismiss={() => setShown(false)}>
          The last manifest sync could not reach the server.
        </Alert>
      ) : null}
    </div>
  )
}

export function AlertDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Tones">
        <div className="flex flex-col gap-4 w-full">
          <Alert tone="info" title="Depot hours changed">
            Weekend pickup now opens at 8am.
          </Alert>
          <Alert tone="ok" title="Manifest saved" />
          <Alert tone="warning" title="Depot closes early">
            The Brasov depot closes at 4pm today for maintenance.
          </Alert>
          <Alert tone="hostile" title="Sync failed">
            The last manifest sync could not reach the server.
          </Alert>
        </div>
      </Example>

      <Example caption="With body and action">
        <Alert
          title="Offline"
          action={
            <Button variant="secondary" size="sm">
              Retry
            </Button>
          }
        >
          Changes are kept on this device.
        </Alert>
      </Example>

      <Example caption="Compact">
        <div className="flex flex-col gap-3 w-full">
          <Alert compact tone="info" title="Depot hours changed">
            Weekend pickup opens at 8am.
          </Alert>
          <Alert
            compact
            tone="warning"
            title="Low stock"
            action={
              <Button variant="secondary" size="sm">
                Reorder
              </Button>
            }
          >
            Three replicas left.
          </Alert>
        </div>
      </Example>

      <Example caption="Dismissible (it has a close button), without the live prop, because it was on the page from the start">
        <DismissibleExample />
      </Example>

      <Example caption="Live: it appears after a click, and a screen reader announces it straight away">
        <LiveExample />
      </Example>
    </ComponentDocs>
  )
}
