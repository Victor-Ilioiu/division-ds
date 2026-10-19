import { useRef, useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Dialog.meta'
import { Example } from '../../docs/Example'
import { Button, Input, Textarea } from '../../atoms'
import { FormField } from '../../molecules'
import { docsProse } from '../../docs/PageChrome'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from './Dialog'

function FormInDialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit depot</Button>
      </DialogTrigger>
      <DialogContent title="Edit depot" description="Changes apply to every open manifest.">
        <div className="flex flex-col gap-4">
          <FormField label="Depot name">
            <Input defaultValue="Brasov north" />
          </FormField>
          <FormField label="Notes">
            <Textarea placeholder="Anything the driver should know." />
          </FormField>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Opened by ordinary state, with no DialogTrigger anywhere -- the `<p role="status">` proves
 *  the choice under the dialog, not just inside it, actually ran. */
function ArchiveExample() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="danger"
        onClick={() => {
          setStatus('')
          setOpen(true)
        }}
      >
        Archive manifest
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Archive manifest?" size="sm">
          {/* token-discipline: allow, a manifest number in copy, not a colour */}
          <p>Manifest #482 moves to the archive. It stays recoverable there for 30 days.</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep it</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                setStatus('Manifest archived.')
                setOpen(false)
              }}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p role="status" className={docsProse}>
        {status}
      </p>
    </div>
  )
}

/** No field sits before the footer, so Radix's default open-focus (the first tabbable element)
 *  would land on the footer's "Done" button, below the fold on a short viewport. Focusing the
 *  content itself instead means Tab from there reaches the first thing a reader can act on. */
function LongContentExample() {
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Read shipping terms</Button>
      </DialogTrigger>
      <DialogContent
        ref={contentRef}
        title="Shipping terms"
        size="lg"
        tabIndex={-1}
        onOpenAutoFocus={event => {
          event.preventDefault()
          contentRef.current?.focus()
        }}
      >
        <div className="flex flex-col gap-4">
          <p>Orders placed before 14:00 local time ship the same day; anything after ships the next business day.</p>
          <p>Every parcel leaves in double-walled board with corner protection; ask for crate packaging on anything over 30kg.</p>
          <p>Photograph the box before opening and report damage within 48 hours; we replace or refund, never both.</p>
          <p>Unopened stock returns within 30 days for a full refund; opened stock returns for store credit only.</p>
          <p>Depots outside the primary freight lanes add one to three business days and a remote-area surcharge.</p>
          <p>A single parcel tops out at 40kg; heavier loads split automatically at checkout.</p>
          <p>Cross-border shipments carry the recipient's own duties and taxes, billed separately by the carrier.</p>
          <p>Reach the shipping desk at shipping@example.com for anything this page does not answer.</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DialogDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A form in a dialog">
        <FormInDialogExample />
      </Example>

      <Example caption="Confirm a destructive action, opened without a trigger">
        <ArchiveExample />
      </Example>

      <Example caption="Long content" className="block">
        <LongContentExample />
      </Example>
    </ComponentDocs>
  )
}
