import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../components/atoms/button/Button'
import { Input } from '../components/atoms/input/Input'
import { Select } from '../components/atoms/select/Select'
import { ErrorSummary } from '../components/molecules/form-field/ErrorSummary'
import { FormField } from '../components/molecules/form-field/FormField'
import { QuantityStepper } from '../components/molecules/quantity-stepper/QuantityStepper'
import { useToast } from '../components/molecules/toast/Toast'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from '../components/organisms/dialog/Dialog'
import { formatEuros } from './money'
import { hasErrors, summarize, useFieldErrors } from '../lib/field-errors'
import { ACCOUNTS, CURRENT_REP_ID, REPS } from './data'
import { addDays, TODAY } from './dates'
import { PRODUCTS, productById, type ProductId } from './model'
import { useCrm } from './store'

type Field = 'name' | 'account' | 'closeDate' | 'product'
const ORDER: readonly Field[] = ['name', 'account', 'closeDate', 'product']
const ID: Record<Field, string> = {
  name: 'new-deal-name',
  account: 'new-deal-account',
  closeDate: 'new-deal-close',
  product: 'new-deal-product',
}

function validate(field: Field, value: string): string | undefined {
  if (field === 'name') return value.trim() ? undefined : 'Give the deal a name.'
  if (field === 'account') return value ? undefined : 'Choose the account.'
  if (field === 'product') return value ? undefined : 'Choose the main product.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter the expected close date.'
  if (value < TODAY) return 'The close date cannot be in the past.'
  return undefined
}

const ACCOUNT_OPTIONS = ACCOUNTS.map(account => ({ value: account.id, label: account.name }))
const OWNER_OPTIONS = REPS.map(rep => ({ value: rep.id, label: rep.name }))
const PRODUCT_OPTIONS = PRODUCTS.map(product => ({ value: product.id, label: product.name }))

/**
 * "New deal": a Dialog, because creating a deal is a short task on top of the pipeline that the
 * pipeline does not need to stay readable for. Every new deal starts in Qualified.
 */
export function NewDealDialog({ onCreated }: { onCreated?: (id: string) => void }) {
  const { state, run } = useCrm()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [account, setAccount] = useState('')
  const [owner, setOwner] = useState(CURRENT_REP_ID)
  const [closeDate, setCloseDate] = useState(addDays(TODAY, 45))
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const { errors, blur, change, validateAll, replace } = useFieldErrors<Field>(validate)
  const [attempt, setAttempt] = useState(0)
  const summary = useRef<HTMLDivElement>(null)
  // Fields typed into since the dialog opened. Only these are checked on blur: the name field has
  // focus when the dialog opens, so pressing Cancel or the close button blurs it first. Checking it
  // then raised "Give the deal a name." on the way out, and the error line pushed the footer down
  // between press and release, so the click missed Cancel and the dialog stayed open.
  const typed = useRef(new Set<Field>())

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  const values: Record<Field, string> = { name, account, closeDate, product }

  function reset() {
    setName('')
    setAccount('')
    setOwner(CURRENT_REP_ID)
    setCloseDate(addDays(TODAY, 45))
    setProduct('')
    setQuantity(1)
    replace({})
    setAttempt(0)
    typed.current.clear()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateAll(ORDER, field => values[field])
    if (hasErrors(found)) {
      setAttempt(n => n + 1)
      return
    }
    const contact = state.contacts.find(c => c.accountId === account)
    const { undo, createdId } = run({
      type: 'createDeal',
      accountId: account,
      contactId: contact?.id ?? '',
      name: name.trim(),
      ownerId: owner,
      closeDate,
      lineItems: [{ productId: product as ProductId, quantity }],
    })
    setOpen(false)
    reset()
    toast({
      tone: 'ok',
      title: `${name.trim()} created`,
      description: `In Qualified, worth ${formatEuros(productById(product as ProductId).unitPrice * quantity)}.`,
      action: { label: 'Undo', altText: 'Mark the deal lost from its sheet to take it out of the pipeline.', onAction: undo },
    })
    if (createdId) onCreated?.(createdId)
  }

  // The summary lists what a submit found, never what a blur found, as everywhere else in this
  // repo (AuthForm, Onboarding, CheckoutForm).
  const listed = attempt > 0 ? summarize(errors, ORDER, field => ID[field]) : []

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button iconStart={<Plus />}>New deal</Button>
      </DialogTrigger>
      <DialogContent title="New deal" description="It starts in Qualified. Everything else can change later." size="md">
        <form id="new-deal-form" noValidate onSubmit={submit} className="flex flex-col gap-4 bg-[var(--color-surface-base)]">
          {listed.length > 0 ? <ErrorSummary ref={summary} headingLevel={3} errors={listed} /> : null}
          <FormField label="Deal name" required error={errors.name}>
            <Input
              id={ID.name}
              value={name}
              autoComplete="off"
              onChange={event => {
                setName(event.target.value)
                typed.current.add('name')
                change('name', event.target.value)
              }}
              onBlur={event => {
                if (typed.current.has('name')) blur('name', event.target.value)
              }}
            />
          </FormField>
          <FormField label="Account" required error={errors.account}>
            <Select
              id={ID.account}
              label="Account"
              placeholder="Choose an account"
              options={ACCOUNT_OPTIONS}
              value={account}
              onValueChange={value => {
                setAccount(value)
                change('account', value)
              }}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Owner">
              <Select id="new-deal-owner" label="Owner" options={OWNER_OPTIONS} value={owner} onValueChange={setOwner} />
            </FormField>
            <FormField label="Expected close" required error={errors.closeDate}>
              <Input
                id={ID.closeDate}
                type="date"
                value={closeDate}
                onChange={event => {
                  setCloseDate(event.target.value)
                  typed.current.add('closeDate')
                  change('closeDate', event.target.value)
                }}
                onBlur={event => {
                  if (typed.current.has('closeDate')) blur('closeDate', event.target.value)
                }}
              />
            </FormField>
            <FormField label="Main product" required error={errors.product}>
              <Select
                id={ID.product}
                label="Main product"
                placeholder="Choose a product"
                options={PRODUCT_OPTIONS}
                value={product}
                onValueChange={value => {
                  setProduct(value)
                  change('product', value)
                }}
              />
            </FormField>
            <FormField label="Quantity">
              <QuantityStepper id="new-deal-quantity" label="Quantity" min={1} max={500} value={quantity} onValueChange={setQuantity} />
            </FormField>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="new-deal-form">
            Create deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
