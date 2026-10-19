import { useEffect, useId, useRef, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Badge } from '../components/atoms/badge/Badge'
import { Button } from '../components/atoms/button/Button'
import { Checkbox } from '../components/atoms/checkbox/Checkbox'
import { IconButton } from '../components/atoms/icon-button/IconButton'
import { Input } from '../components/atoms/input/Input'
import { linkVariants } from '../components/atoms/link/Link'
import { Progress } from '../components/atoms/progress/Progress'
import { Select } from '../components/atoms/select/Select'
import { FormField } from '../components/molecules/form-field/FormField'
import { QuantityStepper } from '../components/molecules/quantity-stepper/QuantityStepper'
import { Stepper } from '../components/molecules/stepper/Stepper'
import { useToast } from '../components/molecules/toast/Toast'
import { Sheet, SheetContent } from '../components/organisms/sheet/Sheet'
import { formatEuros } from './money'
import { ActivityTimeline } from './ActivityTimeline'
import { Composer } from './Composer'
import { accountById, REPS, repById } from './data'
import { formatDate, TODAY, daysBetween } from './dates'
import {
  dealValue,
  hasSlipped,
  isOpen,
  isStage,
  isStalled,
  LOST_REASONS,
  OPEN_STAGES,
  PROBABILITY,
  PRODUCTS,
  productById,
  STAGE_LABEL,
  STAGES,
  type Deal,
  type LostReason,
  type ProductId,
} from './model'
import { useCloseSheet } from './navigation'
import { useCrm, type CrmAction } from './store'

const SECTION = 'font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-label)]'

const STEPS = [...OPEN_STAGES.map(stage => ({ label: STAGE_LABEL[stage] })), { label: 'Closed' }]

function stepIndex(deal: Deal): number {
  if (deal.stage === 'won') return STEPS.length
  if (deal.stage === 'lost') return STEPS.length - 1
  return OPEN_STAGES.indexOf(deal.stage)
}

const OWNER_OPTIONS = REPS.map(rep => ({ value: rep.id, label: rep.name }))
const STAGE_OPTIONS = STAGES.map(stage => ({ value: stage, label: STAGE_LABEL[stage] }))
const REASON_OPTIONS = LOST_REASONS.filter(reason => reason !== 'Not recorded').map(reason => ({
  value: reason,
  label: reason,
}))

/** Runs a change and confirms it in a toast with Undo. The toast is never the only record: the
 *  sheet shows the new value the moment it changes. */
function useUndoable() {
  const { run } = useCrm()
  const { toast } = useToast()
  return (action: CrmAction, title: string, description?: string) => {
    const { undo } = run(action)
    toast({
      tone: 'ok',
      title,
      description,
      action: { label: 'Undo', altText: 'Change it back from the deal sheet.', onAction: undo },
    })
  }
}

function LostForm({ deal, onDone }: { deal: Deal; onDone: () => void }) {
  const change = useUndoable()
  const [reason, setReason] = useState<LostReason | ''>('')
  const [error, setError] = useState<string>()
  const id = useId()
  // The form replaces the button that revealed it, so focus moves to its first control.
  useEffect(() => {
    document.getElementById(id)?.focus()
  }, [id])
  return (
    <div
      role="group"
      aria-label="Mark this deal lost"
      className="flex flex-col gap-3 border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-base)] p-4"
    >
      <p className="font-body text-sm">Say why it was lost. The reason goes into the forecast's loss review.</p>
      <FormField label="Reason" error={error} required>
        <Select
          id={id}
          label="Reason"
          placeholder="Choose a reason"
          options={REASON_OPTIONS}
          value={reason}
          onValueChange={value => {
            setReason(value as LostReason)
            setError(undefined)
          }}
        />
      </FormField>
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            if (!reason) {
              setError('Choose why the deal was lost.')
              document.getElementById(id)?.focus()
              return
            }
            change({ type: 'markLost', dealId: deal.id, reason }, `${deal.name} marked lost`, `Reason: ${reason}.`)
            onDone()
          }}
        >
          Confirm lost
        </Button>
        <Button size="sm" variant="secondary" onClick={onDone}>
          Keep it open
        </Button>
      </div>
    </div>
  )
}

function LineItems({ deal }: { deal: Deal }) {
  const { run } = useCrm()
  const change = useUndoable()
  const [adding, setAdding] = useState<ProductId | ''>('')
  const addId = useId()
  const available = PRODUCTS.filter(product => !deal.lineItems.some(item => item.productId === product.id))
  return (
    <section aria-labelledby={`${addId}-h`} className="flex flex-col gap-3">
      <h3 id={`${addId}-h`} className={SECTION}>
        Line items
      </h3>
      {deal.lineItems.length === 0 ? (
        <p className="font-body text-sm text-[var(--color-text-secondary)]">No products on this deal yet.</p>
      ) : (
        <ul role="list" className="flex flex-col divide-y divide-[var(--color-border-hairline)]">
          {deal.lineItems.map(item => {
            const product = productById(item.productId)
            return (
              <li key={item.productId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                <span className="min-w-0 flex-1 basis-40 font-body text-sm">
                  {product.name}
                  <span className="block text-[var(--color-text-secondary)]">{formatEuros(product.unitPrice)} each</span>
                </span>
                <QuantityStepper
                  label={`Quantity of ${product.name}`}
                  inputSize="sm"
                  min={1}
                  max={500}
                  value={item.quantity}
                  onValueChange={quantity =>
                    run({ type: 'setQuantity', dealId: deal.id, productId: item.productId, quantity })
                  }
                />
                <span className="w-24 text-right font-mono text-sm tabular-nums">
                  {formatEuros(product.unitPrice * item.quantity)}
                </span>
                <IconButton
                  label={`Remove ${product.name}`}
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    change(
                      { type: 'removeLineItem', dealId: deal.id, productId: item.productId },
                      `${product.name} removed`,
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}
      <p className="flex items-baseline justify-between border-t border-[var(--color-border-hairline-strong)] pt-2 font-body text-sm font-semibold">
        <span>Total</span>
        <span className="font-mono tabular-nums">{formatEuros(dealValue(deal))}</span>
      </p>
      {available.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Add a product" className="min-w-0 flex-1 basis-48">
            <Select
              id={addId}
              label="Add a product"
              placeholder="Choose a product"
              options={available.map(product => ({ value: product.id, label: product.name }))}
              value={adding}
              onValueChange={value => setAdding(value as ProductId)}
            />
          </FormField>
          <Button
            variant="secondary"
            aria-disabled={!adding || undefined}
            onClick={() => {
              if (!adding) return
              run({ type: 'addLineItem', dealId: deal.id, productId: adding })
              setAdding('')
            }}
          >
            Add
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function DealBody({ deal }: { deal: Deal }) {
  const { state, run } = useCrm()
  const change = useUndoable()
  const [losing, setLosing] = useState(false)
  const ids = useId()
  // Closing the lost form (either way) removes the control that had focus; hand it to the first
  // button in the row that replaces it.
  const actions = useRef<HTMLDivElement>(null)
  const [refocus, setRefocus] = useState(0)
  useEffect(() => {
    if (refocus > 0) actions.current?.querySelector('button')?.focus()
  }, [refocus])
  const account = accountById(deal.accountId)
  const tasks = state.tasks.filter(task => task.dealId === deal.id)
  const activities = state.activities.filter(activity => activity.dealId === deal.id)
  const stalled = isStalled(deal, state.activities)
  const slipped = hasSlipped(deal)
  const open = isOpen(deal)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {account ? (
          <RouterLink to={`/crm/accounts/${account.id}`} className={linkVariants()}>
            {account.name}
          </RouterLink>
        ) : null}
        <p className="font-display text-3xl font-semibold tabular-nums">{formatEuros(dealValue(deal))}</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={deal.stage === 'won' ? 'ok' : deal.stage === 'lost' ? 'hostile' : 'info'}>
            {STAGE_LABEL[deal.stage]}
          </Badge>
          {deal.stage === 'lost' && deal.lostReason ? <Badge tone="neutral">Reason: {deal.lostReason}</Badge> : null}
          {stalled ? <Badge tone="warning">Stalled</Badge> : null}
          {open && !deal.nextStep ? <Badge tone="warning">No next step</Badge> : null}
        </div>
        {deal.nextStep ? (
          <p className="font-body text-sm">
            <span className="text-[var(--color-text-secondary)]">Next step: </span>
            {deal.nextStep}
          </p>
        ) : null}
      </div>

      <Stepper label="Deal stage" steps={STEPS} current={stepIndex(deal)} orientation="vertical" />

      <Progress label="Win probability" value={PROBABILITY[deal.stage]} showValue tone="signal" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Stage">
          <Select
            id={`${ids}-stage`}
            label="Stage"
            options={STAGE_OPTIONS}
            value={deal.stage}
            onValueChange={value => {
              if (!isStage(value) || value === deal.stage) return
              // Lost needs a reason: the form below asks for it instead of moving the deal now.
              if (value === 'lost') {
                setLosing(true)
                return
              }
              change(
                { type: 'moveStage', dealId: deal.id, stage: value },
                `${deal.name} moved to ${STAGE_LABEL[value]}`,
              )
            }}
          />
        </FormField>
        <FormField label="Owner">
          <Select
            id={`${ids}-owner`}
            label="Owner"
            options={OWNER_OPTIONS}
            value={deal.ownerId}
            onValueChange={value =>
              change(
                { type: 'setOwner', dealIds: [deal.id], ownerId: value },
                `${deal.name} assigned to ${repById(value).name}`,
              )
            }
          />
        </FormField>
        <FormField
          label="Close date"
          help={
            slipped
              ? `Passed ${daysBetween(deal.closeDate, TODAY)} days ago. Move it, or close the deal.`
              : `Closes ${formatDate(deal.closeDate)}.`
          }
          className="sm:col-span-2"
        >
          <Input
            id={`${ids}-close`}
            type="date"
            value={deal.closeDate}
            onChange={event => {
              const value = event.target.value
              if (/^\d{4}-\d{2}-\d{2}$/.test(value)) run({ type: 'setCloseDate', dealId: deal.id, closeDate: value })
            }}
          />
        </FormField>
      </div>

      {open ? (
        losing ? (
          <LostForm
            deal={deal}
            onDone={() => {
              setLosing(false)
              setRefocus(n => n + 1)
            }}
          />
        ) : (
          <div ref={actions} className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                change({ type: 'markWon', dealId: deal.id }, `${deal.name} marked won`, 'Closed today.')
                setRefocus(n => n + 1)
              }}
            >
              Mark won
            </Button>
            <Button variant="secondary" onClick={() => setLosing(true)}>
              Mark lost
            </Button>
          </div>
        )
      ) : (
        <div ref={actions} className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              change({ type: 'moveStage', dealId: deal.id, stage: 'negotiation' }, `${deal.name} reopened`, 'Back in Negotiation.')
              setRefocus(n => n + 1)
            }}
          >
            Reopen
          </Button>
        </div>
      )}

      <LineItems deal={deal} />

      <section aria-labelledby={`${ids}-tasks`} className="flex flex-col gap-3">
        <h3 id={`${ids}-tasks`} className={SECTION}>
          Tasks
        </h3>
        {tasks.length === 0 ? (
          <p className="font-body text-sm text-[var(--color-text-secondary)]">No tasks on this deal.</p>
        ) : (
          <ul role="list" className="flex flex-col gap-2">
            {tasks.map(task => (
              <li key={task.id} className="flex items-start gap-3">
                <Checkbox
                  id={`${ids}-${task.id}`}
                  checked={task.done}
                  onCheckedChange={() => run({ type: 'toggleTask', taskId: task.id })}
                  className="mt-0.5"
                />
                <label htmlFor={`${ids}-${task.id}`} className="font-body text-sm">
                  <span className={task.done ? 'line-through text-[var(--color-text-secondary)]' : undefined}>
                    {task.title}
                  </span>
                  <span className="block text-[var(--color-text-secondary)]">
                    {task.done ? 'Done' : `Due ${formatDate(task.due)}`} · {repById(task.ownerId).name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${ids}-log`} className="flex flex-col gap-3">
        <h3 id={`${ids}-log`} className={SECTION}>
          Log activity
        </h3>
        <Composer target={{ accountId: deal.accountId, dealId: deal.id, contactId: deal.contactId }} />
      </section>

      <section aria-labelledby={`${ids}-activity`} className="flex flex-col gap-3">
        <h3 id={`${ids}-activity`} className={SECTION}>
          Activity
        </h3>
        {activities.length === 0 ? (
          <p className="font-body text-sm text-[var(--color-text-secondary)]">Nothing logged on this deal yet.</p>
        ) : (
          <ActivityTimeline label={`Activity on ${deal.name}`} activities={activities} deals={state.deals} groupLevel={4} />
        )}
      </section>
    </div>
  )
}

/**
 * One deal's detail, beside whatever page opened it: a Sheet, because the list or board behind it
 * stays the context (design.md: one item's detail beside a list is a Sheet). Opened by `?deal=<id>`
 * from anywhere in Corvane, so it is linkable and Back closes it. Mounted once, in the shell.
 *
 * Marking a deal lost asks for the reason inline, in the sheet, not in a dialog on top of it: a
 * dialog over a sheet is an overlay on an overlay.
 */
export function DealSheet() {
  const [params] = useSearchParams()
  const { state } = useCrm()
  const close = useCloseSheet('deal')
  const id = params.get('deal')
  const deal = id ? state.deals.find(d => d.id === id) : undefined
  const account = deal ? accountById(deal.accountId) : undefined

  return (
    <Sheet
      open={id !== null}
      onOpenChange={open => {
        if (!open) close()
      }}
    >
      {id !== null ? (
        <SheetContent
          title={deal ? deal.name : 'Deal not found'}
          description={deal ? `${account?.name ?? 'Unknown account'} · owned by ${repById(deal.ownerId).name}` : undefined}
          closeLabel="Close deal"
          className="w-[min(36rem,calc(100vw-1rem))]"
        >
          {deal ? (
            <DealBody key={deal.id} deal={deal} />
          ) : (
            <p className="font-body text-sm">No deal has the id “{id}”. It may have been created in another session.</p>
          )}
        </SheetContent>
      ) : null}
    </Sheet>
  )
}
