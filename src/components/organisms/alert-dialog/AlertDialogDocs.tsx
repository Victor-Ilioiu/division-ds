import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { Button, Input } from '../../atoms'
import { FormField, useToast } from '../../molecules'
import { meta } from './AlertDialog.meta'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from './AlertDialog'

/** Stands in for a request: resolves, or rejects when `fail` is set, after a second. */
const request = (fail = false) =>
  new Promise<void>((resolve, reject) =>
    window.setTimeout(() => (fail ? reject(new Error('The server did not answer.')) : resolve()), 1000)
  )

function DeleteExample() {
  const { toast } = useToast()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete depot</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Delete Brasov north?"
        description="Its 12 open manifests move to the unassigned queue. The depot cannot be restored."
      >
        <AlertDialogFooter>
          <AlertDialogCancel />
          <AlertDialogAction
            loadingLabel="Deleting depot"
            onClick={() => request().then(() => toast({ tone: 'ok', title: 'Depot deleted' }))}
          >
            Delete depot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FailureExample() {
  const { toast } = useToast()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary">Revoke API key</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Revoke the warehouse key?"
        description="Scripts that use it stop working at once. This demo always fails, to show the dialog staying open."
        size="sm"
      >
        <AlertDialogFooter>
          <AlertDialogCancel>Keep key</AlertDialogCancel>
          <AlertDialogAction
            loadingLabel="Revoking key"
            onClick={() =>
              request(true).catch((error: Error) => {
                toast({ tone: 'hostile', title: 'Key not revoked', description: error.message })
                throw error
              })
            }
          >
            Revoke key
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DefaultToneExample() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Publish prices</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Publish the autumn prices?"
        description="Customers see them on every replica page as soon as you publish."
        size="sm"
      >
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction tone="default">Publish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const ACCOUNT = 'northfield-supply'

function TypeToConfirmExample() {
  const [typed, setTyped] = useState('')
  const matches = typed.trim() === ACCOUNT
  return (
    <AlertDialog onOpenChange={() => setTyped('')}>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Delete the account?"
        description="Its 212 orders, saved kit lists and team access are removed for good."
      >
        <FormField label="Account name" help={`Type ${ACCOUNT} to enable Delete account.`}>
          <Input
            value={typed}
            onChange={event => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </FormField>
        <AlertDialogFooter>
          <AlertDialogCancel />
          <AlertDialogAction disabled={!matches} loadingLabel="Deleting account" onClick={() => request()}>
            Delete account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function AlertDialogDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Delete while the request is still running: the action button shows it's busy and the dialog waits">
        <DeleteExample />
      </Example>
      <Example caption="A failed request: the dialog stays open and a toast says why">
        <FailureExample />
      </Example>
      <Example caption="A safe confirm that still has consequences, with the default tone">
        <DefaultToneExample />
      </Example>
      <Example caption="Type the name to confirm, for the costliest actions">
        <TypeToConfirmExample />
      </Example>
    </ComponentDocs>
  )
}
