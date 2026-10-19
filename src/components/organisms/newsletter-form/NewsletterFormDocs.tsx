import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './NewsletterForm.meta'
import { Example } from '../../docs/Example'
import { NewsletterForm } from './NewsletterForm'

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

const CONSENT = 'One email a month. Every one has an unsubscribe link.'

/** A stand-in for a server: it waits, then accepts any address. */
async function accept() {
  await wait(700)
}

/** A stand-in for a server that is down: it waits, then rejects. */
async function refuse() {
  await wait(700)
  throw new Error('The demo server is switched off.')
}

export function NewsletterFormDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A sign-up that succeeds">
        <div className="flex w-full flex-col gap-3">
          <p className="font-body text-sm text-[var(--color-text-secondary)]">
            Demo: any address is accepted after a short wait. Nothing is sent.
          </p>
          <NewsletterForm label="Field notes by email" consent={CONSENT} onSubmit={accept} headingLevel={4} />
        </div>
      </Example>

      <Example caption="A sign-up that fails">
        <div className="flex w-full flex-col gap-3">
          <p className="font-body text-sm text-[var(--color-text-secondary)]">
            Demo: this one rejects every address, so you can see the alert, and the address you typed stays in the field.
          </p>
          <NewsletterForm
            label="Restock alerts by email"
            consent="An email when a sold-out replica is back. Nothing else."
            submitLabel="Notify me"
            busyLabel="Signing you up"
            onSubmit={refuse}
            headingLevel={4}
          />
        </div>
      </Example>
    </ComponentDocs>
  )
}
