import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Toast.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { useToast } from './Toast'

/** Four Buttons, one per tone, each raising a toast through the Toaster mounted in AppShell --
 *  the same store every other page on this site shares, so this example proves the real thing
 *  rather than a docs-only stand-in. */
function TonesExample() {
  const { toast } = useToast()

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Depot hours changed', tone: 'info' })}>
        Info
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Manifest saved', tone: 'ok' })}>
        Ok
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Depot closes early', tone: 'warning' })}>
        Warning
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Sync failed', tone: 'hostile' })}>
        Hostile
      </Button>
    </div>
  )
}

function WithActionExample() {
  const { toast } = useToast()

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() =>
        toast({
          title: 'Item removed',
          action: {
            label: 'Undo',
            altText: 'Undo from the manifest history',
            onAction: () => toast({ title: 'Item restored', tone: 'ok' }),
          },
        })
      }
    >
      Remove item
    </Button>
  )
}

function WithDescriptionExample() {
  const { toast } = useToast()

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => toast({ title: 'Manifest saved', description: 'Twelve items, filed to Brasov north.', tone: 'ok' })}
    >
      Save manifest
    </Button>
  )
}

export function ToastDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Tones">
        <TonesExample />
      </Example>

      <Example caption="With a description">
        <WithDescriptionExample />
      </Example>

      <Example caption="With an action">
        <WithActionExample />
      </Example>
    </ComponentDocs>
  )
}
