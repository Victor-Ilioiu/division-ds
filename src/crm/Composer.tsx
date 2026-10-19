import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '../components/atoms/button/Button'
import { Textarea } from '../components/atoms/textarea/Textarea'
import { ErrorSummary } from '../components/molecules/form-field/ErrorSummary'
import { FormField } from '../components/molecules/form-field/FormField'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/molecules/tabs/Tabs'
import { useToast } from '../components/molecules/toast/Toast'
import { useCrm, type ComposerType } from './store'

const KIND_LABEL: Record<ComposerType, string> = { note: 'Note', call: 'Call', email: 'Email' }
const FIELD_LABEL: Record<ComposerType, string> = {
  note: 'Note',
  call: 'What was said',
  email: 'What the email said',
}
const BUTTON_LABEL: Record<ComposerType, string> = { note: 'Log note', call: 'Log call', email: 'Log email' }
const LOGGED: Record<ComposerType, string> = { note: 'Note logged', call: 'Call logged', email: 'Email logged' }

type Target = { accountId: string; dealId?: string; contactId?: string }

/** One kind's form: a Textarea in a FormField, an ErrorSummary on a failed submit, and a Log button. */
function ComposerForm({ kind, target, headingLevel }: { kind: ComposerType; target: Target; headingLevel: 3 | 4 }) {
  const { run } = useCrm()
  const { toast } = useToast()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const summary = useRef<HTMLDivElement>(null)
  const fieldId = `${useId()}-${kind}`

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = body.trim()
    if (!text) {
      setError(`Write what happened before logging the ${KIND_LABEL[kind].toLowerCase()}.`)
      setAttempt(n => n + 1)
      return
    }
    setError(undefined)
    run({ type: 'addActivity', kind, ...target, body: text })
    setBody('')
    // No Undo here: the entry is now at the top of the timeline below, which is the record.
    toast({ tone: 'ok', title: LOGGED[kind], description: 'It is at the top of the activity below.' })
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3 bg-[var(--color-surface-base)]">
      {error ? (
        <ErrorSummary ref={summary} headingLevel={headingLevel} errors={[{ fieldId, message: error }]} />
      ) : null}
      <FormField label={FIELD_LABEL[kind]} error={error}>
        <Textarea
          id={fieldId}
          rows={3}
          value={body}
          onChange={event => {
            setBody(event.target.value)
            if (error && event.target.value.trim()) setError(undefined)
          }}
        />
      </FormField>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm">
          {BUTTON_LABEL[kind]}
        </Button>
      </div>
    </form>
  )
}

/**
 * Logs what just happened on a deal, an account or a contact. Tabs pick the kind when there is more
 * than one; a single kind (the contact sheet's "Log call") is the form on its own.
 */
export function Composer({
  kinds = ['note', 'call', 'email'],
  target,
  label = 'Log activity',
  headingLevel = 4,
}: {
  kinds?: ComposerType[]
  target: Target
  label?: string
  headingLevel?: 3 | 4
}) {
  if (kinds.length === 1) return <ComposerForm kind={kinds[0]} target={target} headingLevel={headingLevel} />
  return (
    <Tabs defaultValue={kinds[0]} variant="line">
      <TabsList aria-label={label}>
        {kinds.map(kind => (
          <TabsTrigger key={kind} value={kind}>
            {KIND_LABEL[kind]}
          </TabsTrigger>
        ))}
      </TabsList>
      {kinds.map(kind => (
        <TabsContent key={kind} value={kind}>
          <ComposerForm kind={kind} target={target} headingLevel={headingLevel} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
