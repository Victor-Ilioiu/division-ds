import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { hasErrors, summarize, useFieldErrors } from '../../lib/field-errors'
import { Button, Checkbox, Select, Switch, type SelectOption } from '../../components/atoms'
import { Alert, ErrorSummary, FormField, Stepper, useToast } from '../../components/molecules'
import { saveOnboarding, type OnboardingPrefs } from '../store/api'
import { useSession } from '../store/session'
import { DEFAULT_PAGE } from '../DefaultPage'

type Field = 'activities' | 'size'

const STEPS = [{ label: 'Activities' }, { label: 'Fit' }, { label: 'Updates' }]

const ACTIVITIES: SelectOption[] = [
  { value: 'woodland', label: 'Woodland field days' },
  { value: 'indoor', label: 'Indoor sites' },
  { value: 'weekend-events', label: 'Weekend events' },
  { value: 'speed-skirmishes', label: 'Speed skirmishes' },
  { value: 'collecting', label: 'Collecting' },
]

const SIZES: SelectOption[] = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
]

const REQUIRED: Record<Field, string> = {
  activities: 'Choose at least one activity.',
  size: 'Choose your usual helmet size.',
}

/** Filled in is the only rule either field has: a joined string stands in for the checkbox
 *  group's array so both fields share one `useFieldErrors` instance. */
function validate(field: Field, value: string): string | undefined {
  return value.trim() === '' ? REQUIRED[field] : undefined
}

const SAVE_ERROR = 'Something went wrong saving your preferences. Please try again.'
const LABEL = 'font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]'
const FIELD_ERROR = 'flex items-start gap-1.5 font-body text-xs text-[var(--color-accent-hostile-text)]'
const RING =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * The three-step preferences flow shown right after an account is created: which activities the
 * kit is for, the usual helmet size, and two optional update channels. One piece of state for the
 * whole flow, the same shape CheckoutForm uses for its own steps, so Back never loses what was
 * already chosen.
 *
 * This page carries its own real `h1` rather than the auth pages' quiet `PageHeading` eyebrow:
 * that component exists to defer to AuthForm's own bolder mode heading directly below it, and
 * nothing here plays that role -- the Stepper isn't a heading at all, and each step's own `h2`
 * ("Activities", "Fit", "Updates") is a smaller, later thing on the page, not a competing title.
 * Making the page's only real heading a quiet eyebrow would leave it with no visual anchor.
 *
 * A page reached only from a signed-in state: a direct load or a refresh with no one signed in
 * (the account-creation step never happened, or the tab was closed and reopened after signing
 * out) bounces to account creation instead of showing a form with nothing to save it against.
 *
 * The checkbox group is a native fieldset/legend, described by its own error paragraph through
 * `aria-describedby` -- there is no multi-select equivalent of RadioGroup to carry that wiring
 * for it, the way CheckoutForm's delivery step leans on `RadioGroup` itself. The helmet-size field
 * reuses `FormField`/`Select` exactly as CheckoutForm's own country picker does.
 */
export function Onboarding() {
  const { user } = useSession()
  const navigate = useNavigate()
  const { toast } = useToast()
  const uid = useId()
  const idOf = (field: Field) => `${uid}-${field}`
  const [step, setStep] = useState(0)
  const [activities, setActivities] = useState<string[]>([])
  const [size, setSize] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [serviceReminders, setServiceReminders] = useState(false)
  const [pending, setPending] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const errors = useFieldErrors<Field>(validate)
  const summary = useRef<HTMLDivElement>(null)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const finishRef = useRef<HTMLButtonElement>(null)
  const moved = useRef(false)
  // A slow save that resolves after this page is gone (signed out from another tab, a browser
  // back) must not toast or navigate for a form that isn't showing anymore.
  const mounted = useRef(true)
  // A plain ref, not React state: Retry calls `finish` directly, with no Button `loading` state of
  // its own to block a second click at the DOM level the way Finish's own submit button does, so
  // this is the only thing standing between a fast double-click on Retry and two saves in flight.
  // Checked and set synchronously, before any state update or await, so it holds even across two
  // clicks that land before a render has had a chance to reflect the first one.
  const inFlight = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  // Next and Back leave focus on a button that may not exist on the next step; the step's own
  // heading is where the new content starts. Same shape as CheckoutForm's own step-change effect.
  useLayoutEffect(() => {
    if (!moved.current) return
    moved.current = false
    stepHeading.current?.focus()
  }, [step])

  if (!user) {
    return <Navigate to="/store/create-account" replace state={{ notice: 'Create an account first.' }} />
  }

  const fieldsFor = (at: number): readonly Field[] => (at === 0 ? ['activities'] : at === 1 ? ['size'] : [])
  const valueOf = (field: Field): string => (field === 'activities' ? activities.join(',') : size)

  const setActivity = (value: string, checked: boolean) => {
    const next = checked ? [...activities, value] : activities.filter(v => v !== value)
    setActivities(next)
    errors.change('activities', next.join(','))
  }

  const chooseSize = (value: string) => {
    setSize(value)
    errors.blur('size', value)
  }

  const goTo = (next: number) => {
    errors.replace({})
    moved.current = true
    setStep(next)
  }

  const finish = async () => {
    if (inFlight.current || !user) return
    inFlight.current = true
    setSaveFailed(false)
    setPending(true)
    // Lets the cleared alert reach the DOM before the request runs, so an identical failure on a
    // retry still changes the live region's text instead of leaving it holding what it already said.
    await Promise.resolve()
    const prefs: OnboardingPrefs = { activities, size, newsletter, serviceReminders }
    try {
      await saveOnboarding(user.email, prefs)
      if (!mounted.current) return
      toast({ title: 'Your account is set up.' })
      navigate('/store/shop')
    } catch {
      if (!mounted.current) {
        // Never dropped silently: the page isn't there anymore to show the retryable alert, so
        // the failure travels as a toast instead of vanishing with nothing said about it.
        toast({ tone: 'hostile', title: 'Your preferences were not saved.' })
        return
      }
      setSaveFailed(true)
    } finally {
      inFlight.current = false
      if (mounted.current) setPending(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = errors.validateAll(fieldsFor(step), valueOf)
    if (hasErrors(found)) {
      setAttempt(count => count + 1)
      return
    }
    if (step < STEPS.length - 1) {
      goTo(step + 1)
      return
    }
    await finish()
  }

  const activitiesError = errors.errors.activities
  const activitiesErrorId = `${uid}-activities-error`

  return (
    <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-6`}>
      <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Set up your account</h1>
      <div className="flex flex-col gap-6 max-w-md">
        <Stepper steps={STEPS} current={step} label="Setup progress" />
        <form noValidate aria-labelledby={`${uid}-step`} onSubmit={submit} className="flex flex-col gap-4">
          <h2
            id={`${uid}-step`}
            ref={stepHeading}
            tabIndex={-1}
            className={cn('font-display font-semibold text-lg text-[var(--color-text-primary)]', RING)}
          >
            <span className="sr-only">{`Step ${step + 1} of ${STEPS.length}:`}</span> {STEPS[step].label}
          </h2>
          {/* Gated on `attempt`, not `errors.errors` directly -- see AuthForm's own comment on the
              same pattern: a blur alone already puts a message in `errors.errors`, and mounting
              this block on that alone would push the step's fields and the Next/Finish button down
              by its own height, out from under a pointer already on its way to click it. */}
          <ErrorSummary
            ref={summary}
            errors={attempt > 0 ? summarize(errors.errors, fieldsFor(step), idOf) : []}
            headingLevel={3}
          />

          {step === 0 ? (
            <fieldset
              aria-describedby={activitiesError ? activitiesErrorId : undefined}
              aria-invalid={activitiesError ? true : undefined}
              className="flex flex-col gap-3 border-0 p-0 m-0 min-w-0"
            >
              <legend className={cn(LABEL, 'p-0')}>
                What do you use your kit for?
                <span aria-hidden="true" className="ml-1 text-[var(--color-accent-signal-text)]">
                  *
                </span>
              </legend>
              {ACTIVITIES.map((activity, index) => {
                const id = index === 0 ? idOf('activities') : `${idOf('activities')}-${index}`
                return (
                  <div key={activity.value} className="flex items-center gap-3">
                    <Checkbox
                      id={id}
                      checked={activities.includes(activity.value)}
                      invalid={Boolean(activitiesError)}
                      onCheckedChange={checked => setActivity(activity.value, checked === true)}
                    />
                    <label htmlFor={id} className="font-body text-sm text-[var(--color-text-primary)]">
                      {activity.label}
                    </label>
                  </div>
                )
              })}
              {activitiesError ? (
                <p id={activitiesErrorId} className={FIELD_ERROR}>
                  <CircleAlert aria-hidden="true" className="w-3.5 h-3.5 mt-px shrink-0" />
                  {activitiesError}
                </p>
              ) : null}
            </fieldset>
          ) : step === 1 ? (
            <FormField label="Usual helmet size" error={errors.errors.size} required>
              <Select id={idOf('size')} label="Usual helmet size" options={SIZES} value={size} onValueChange={chooseSize} />
            </FormField>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Switch id={`${uid}-newsletter`} checked={newsletter} onCheckedChange={setNewsletter} />
                <label htmlFor={`${uid}-newsletter`} className="font-body text-sm text-[var(--color-text-primary)]">
                  Product news
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id={`${uid}-service`} checked={serviceReminders} onCheckedChange={setServiceReminders} />
                <label htmlFor={`${uid}-service`} className="font-body text-sm text-[var(--color-text-primary)]">
                  Service reminders
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="secondary"
                aria-disabled={pending || undefined}
                onClick={event => {
                  // Same pattern as CheckoutForm's own Back: focusable, aria-disabled, and its
                  // click prevented -- inert rather than merely discouraged while a save is pending.
                  if (pending) {
                    event.preventDefault()
                    return
                  }
                  goTo(step - 1)
                }}
              >
                Back
              </Button>
            ) : null}
            <Button ref={finishRef} type="submit" loading={pending} loadingLabel="Saving">
              {step < STEPS.length - 1 ? 'Next' : 'Finish'}
            </Button>
          </div>

          {/* Persistent and sr-only regardless of content: a live region has to already exist
              before a later change to its text is picked up. The visible duplicate below is a real
              Alert, not an aria-hidden echo of it, because its Retry action has to stay reachable. */}
          <p role="alert" className="sr-only">
            {saveFailed ? SAVE_ERROR : null}
          </p>
          {saveFailed ? (
            <Alert
              tone="hostile"
              title={SAVE_ERROR}
              action={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Retry unmounts itself the instant `finish` clears `saveFailed`, so focus has
                    // to land on something that survives that -- the Finish button, always mounted
                    // on this step -- before that happens, or it drops to the body.
                    finishRef.current?.focus()
                    void finish()
                  }}
                >
                  Retry
                </Button>
              }
            />
          ) : null}
        </form>
      </div>
    </div>
  )
}
