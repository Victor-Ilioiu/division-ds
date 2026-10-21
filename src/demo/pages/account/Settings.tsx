import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../components/atoms/button/Button'
import { Input } from '../../../components/atoms/input/Input'
import { Select, type SelectOption } from '../../../components/atoms/select/Select'
import { Switch } from '../../../components/atoms/switch/Switch'
import { Textarea } from '../../../components/atoms/textarea/Textarea'
import { Alert } from '../../../components/molecules/alert/Alert'
import { FormField } from '../../../components/molecules/form-field/FormField'
import { ErrorSummary } from '../../../components/molecules/form-field/ErrorSummary'
import { useToast } from '../../../components/molecules/toast/Toast'
import { summarize, useFieldErrors } from '../../../lib/field-errors'
import { saveProfile } from '../../store/api'
import { RequireSession } from '../../RequireSession'
import { useSession } from '../../store/session'
import { readJson, writeJson } from '../../store/storage'
import { AccountLayout } from './AccountLayout'

const PROFILE_KEY = 'hexline-profile'
const BIO_MAX = 280
const SAVE_ERROR = 'Your account was not updated. Please try again.'
const NAME_REQUIRED = 'Enter your name.'

const SIZES: SelectOption[] = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
]

type Field = 'name'

type StoredProfile = {
  /** The account this profile belongs to -- see `loadProfile` below for why this has to be here. */
  email: string
  name: string
  defaultSize: string
  newsletter: boolean
  serviceReminders: boolean
  bio: string
}

/** Guards `sessionStorage`'s own JSON before it reaches `useState`'s initialiser -- the same
 *  reason `isSessionState`/`isCartItems` exist for their own stores. A tampered or version-skewed
 *  value falls back rather than crashing Settings on load. */
function isStoredProfile(value: unknown): value is StoredProfile {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.email === 'string' &&
    typeof v.name === 'string' &&
    typeof v.defaultSize === 'string' &&
    typeof v.newsletter === 'boolean' &&
    typeof v.serviceReminders === 'boolean' &&
    typeof v.bio === 'string'
  )
}

function defaultProfile(email: string, name: string): StoredProfile {
  return { email, name, defaultSize: 'M', newsletter: false, serviceReminders: false, bio: '' }
}

/** `hexline-profile` is one key shared by every account this tab ever signs into, not one key
 *  per account -- `sessionStorage` has no namespacing of its own to lean on. Reads it validated
 *  (`isStoredProfile`), and falls back to a fresh profile for `email` whenever the stored one
 *  belongs to someone else: without that check, signing out and back in as a different demo user
 *  (or two people sharing a machine, in the same tab) would show one account's name and bio on
 *  another's. The stored `email` is the whole guard; nothing else on disk says whose profile this
 *  is. */
function loadProfile(email: string, name: string): StoredProfile {
  const stored = readJson(PROFILE_KEY, defaultProfile(email, name), isStoredProfile)
  return stored.email === email ? stored : defaultProfile(email, name)
}

function validate(_field: Field, value: string): string | undefined {
  return value.trim() === '' ? NAME_REQUIRED : undefined
}

/**
 * The profile form: name, a read-only email, default size, two update switches and a bio, plus
 * Sign out. Unlike Onboarding's `saveOnboarding`, nothing here is thrown away on success --
 * `hexline-profile` persists the whole form (validated on read and matched to the signed-in
 * email, see `loadProfile`), and the display name flows back into the session itself through
 * `updateName`, so the Navbar's own "Account: {name}" and AccountAction's menu pick it up
 * immediately.
 *
 * Save follows Onboarding's own shape exactly: `inFlight` is a plain ref, checked and set
 * synchronously before any await, so a fast double-click on Save can only ever start one request
 * in flight, and `mounted` decides how a result that lands after the person has already left (Sign
 * out from another tab, a browser back) is allowed to reach them. A success still fully happens --
 * the profile is written and the session renamed either way, since both are real, durable changes
 * nothing else will retry -- it just can't update this page's own React state, and it toasts
 * instead of leaving the change unannounced. A failure that lands the same way toasts too, since
 * there is no form left to show a retryable alert on.
 *
 * The Bio counter is two separate pieces of text, not one: the visible `n/280` updates on every
 * keystroke but carries no live role (a live region announcing every keystroke would be
 * unusable), while an sr-only `role="status"` updates only 750ms after the last keystroke --
 * throttled, not silent, so a screen-reader user still hears where they landed once they pause,
 * without a running commentary while they're still typing.
 */
function SettingsBody() {
  const { user, signOut, updateName } = useSession()
  const { toast } = useToast()
  const uid = useId()
  const idOf = (field: string) => `${uid}-${field}`

  const [profile, setProfile] = useState<StoredProfile>(() => loadProfile(user?.email ?? '', user?.name ?? ''))
  const [pending, setPending] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [announcedBioLength, setAnnouncedBioLength] = useState(profile.bio.length)
  const [attempt, setAttempt] = useState(0)
  const errors = useFieldErrors<Field>(validate)
  const summary = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const inFlight = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setAnnouncedBioLength(profile.bio.length), 750)
    return () => clearTimeout(timer)
  }, [profile.bio])

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  const set = <K extends keyof StoredProfile>(field: K, value: StoredProfile[K]) =>
    setProfile(current => ({ ...current, [field]: value }))

  const changeName = (value: string) => {
    set('name', value)
    errors.change('name', value)
  }

  const save = async () => {
    if (inFlight.current || !user) return
    const nameError = validate('name', profile.name)
    if (nameError) {
      errors.replace({ name: nameError })
      setAttempt(count => count + 1)
      return
    }
    inFlight.current = true
    setSaveFailed(false)
    setPending(true)
    // Lets the cleared alert reach the DOM before the request runs, so an identical failure on a
    // retry still changes the live region's text instead of leaving it holding what it already said.
    await Promise.resolve()
    try {
      await saveProfile(user.email, profile)
      // Both real, durable changes -- neither is a React state update this page owns, so both
      // still happen even for a person who has already left: dropping them here would silently
      // discard a save that the request itself already confirmed succeeded. The toast is
      // unconditional for the same reason -- something did happen, whether or not this page is
      // still around to show anything else about it.
      writeJson(PROFILE_KEY, profile)
      updateName(profile.name)
      toast({ title: 'Your account was updated.' })
      if (!mounted.current) return
    } catch {
      if (!mounted.current) {
        toast({ tone: 'hostile', title: 'Your account was not updated.' })
        return
      }
      setSaveFailed(true)
    } finally {
      inFlight.current = false
      if (mounted.current) setPending(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save()
  }

  if (!user) return null

  return (
    <div className="flex flex-col gap-8">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 max-w-md">
        {/* Gated on `attempt`, not `errors.errors` directly -- see AuthForm's own comment on the
            same pattern: a blur alone already puts a message in `errors.errors`, and mounting
            this block on that alone would push Save down by its own height, out from under a
            pointer already on its way to click it. */}
        <ErrorSummary
          ref={summary}
          errors={attempt > 0 ? summarize(errors.errors, ['name'], idOf) : []}
        />

        <FormField label="Name" required error={errors.errors.name}>
          <Input
            id={idOf('name')}
            value={profile.name}
            onChange={event => changeName(event.target.value)}
            onBlur={event => errors.blur('name', event.target.value, event.relatedTarget)}
          />
        </FormField>

        <FormField label="Email" help="Your email is tied to this account and can't be changed here.">
          <Input value={user.email} readOnly />
        </FormField>

        <FormField label="Default size">
          <Select label="Default size" options={SIZES} value={profile.defaultSize} onValueChange={value => set('defaultSize', value)} />
        </FormField>

        <div className="flex items-center gap-3">
          <Switch id={idOf('newsletter')} checked={profile.newsletter} onCheckedChange={value => set('newsletter', value)} />
          <label htmlFor={idOf('newsletter')} className="font-body text-sm text-[var(--color-text-primary)]">
            Product news
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id={idOf('service')} checked={profile.serviceReminders} onCheckedChange={value => set('serviceReminders', value)} />
          <label htmlFor={idOf('service')} className="font-body text-sm text-[var(--color-text-primary)]">
            Service reminders
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={idOf('bio')}
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]"
          >
            Bio
          </label>
          <Textarea
            id={idOf('bio')}
            maxLength={BIO_MAX}
            value={profile.bio}
            onChange={event => set('bio', event.target.value)}
          />
          <div className="flex items-center justify-between">
            <p aria-hidden="true" className="font-mono text-xs text-[var(--color-text-secondary)]">
              {profile.bio.length}/{BIO_MAX}
            </p>
            <p role="status" className="sr-only">
              {announcedBioLength} of {BIO_MAX} characters
            </p>
          </div>
        </div>

        <div>
          <Button type="submit" loading={pending} loadingLabel="Saving">
            Save
          </Button>
        </div>

        {/* Persistent and sr-only regardless of content: a live region has to already exist
            before a later change to its text is picked up -- same pattern as Onboarding's own
            failure alert. */}
        <p role="alert" className="sr-only">
          {saveFailed ? SAVE_ERROR : null}
        </p>
        {saveFailed ? (
          <Alert
            tone="hostile"
            title={SAVE_ERROR}
            action={
              <Button type="button" variant="secondary" size="sm" onClick={() => void save()}>
                Retry
              </Button>
            }
          />
        ) : null}
      </form>

      <div>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function Settings() {
  return (
    <RequireSession>
      <AccountLayout>
        <SettingsBody />
      </AccountLayout>
    </RequireSession>
  )
}
