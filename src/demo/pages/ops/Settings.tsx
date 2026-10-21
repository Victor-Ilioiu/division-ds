import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, LogOut, Monitor, ShieldAlert, Smartphone, Store, Tablet, Users } from 'lucide-react'
import { Avatar } from '../../../components/atoms/avatar/Avatar'
import { Badge } from '../../../components/atoms/badge/Badge'
import { Button } from '../../../components/atoms/button/Button'
import { Input } from '../../../components/atoms/input/Input'
import { Select, type SelectOption } from '../../../components/atoms/select/Select'
import { Switch } from '../../../components/atoms/switch/Switch'
import { Alert } from '../../../components/molecules/alert/Alert'
import { ErrorSummary } from '../../../components/molecules/form-field/ErrorSummary'
import { FormField } from '../../../components/molecules/form-field/FormField'
import { List, ListItem } from '../../../components/molecules/list-item/ListItem'
import { PageHeader } from '../../../components/molecules/page-header/PageHeader'
import { SectionHeading } from '../../../components/molecules/section-heading/SectionHeading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/molecules/tabs/Tabs'
import { useToast } from '../../../components/molecules/toast/Toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from '../../../components/organisms/alert-dialog/AlertDialog'
import { summarize, useFieldErrors } from '../../../lib/field-errors'
import { opsRequest, ROLE_LABEL, STORE_HANDLE, TEAM, type TeamMember, type TeamRole } from './data'
import { OpsLayout } from './OpsLayout'

const SECTIONS = ['profile', 'notifications', 'team', 'sessions', 'danger'] as const
type Section = (typeof SECTIONS)[number]

function isSection(value: string | null): value is Section {
  return value !== null && (SECTIONS as readonly string[]).includes(value)
}

/** `md` in Tailwind's default scale. Below it the tab list runs across the top, not down the
 *  side: a 12rem column of tabs beside a 320px-wide panel leaves the panel a strip. */
const WIDE_QUERY = '(min-width: 48rem)'

function subscribeWide(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(WIDE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Wide when there is no `matchMedia` to ask (jsdom): the vertical layout is the one the page is
 *  designed around. */
function readWide() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(WIDE_QUERY).matches : true
}

const CURRENCIES: SelectOption[] = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'RON', label: 'Romanian leu (RON)' },
  { value: 'GBP', label: 'Pound sterling (GBP)' },
]

type ProfileField = 'name' | 'email'
const PROFILE_FIELDS: readonly ProfileField[] = ['name', 'email']

function validateProfile(field: ProfileField, value: string): string | undefined {
  if (field === 'name') return value.trim() === '' ? 'Enter the store name.' : undefined
  if (value.trim() === '') return 'Enter a support email.'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : 'Enter an email like help@hexline.example.'
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <SectionHeading level={2} title={title} description={description} />
      {children}
    </div>
  )
}

function StoreProfile() {
  const { toast } = useToast()
  const uid = useId()
  const idOf = (field: string) => `${uid}-${field}`
  const [profile, setProfile] = useState({
    name: 'Hexline',
    tagline: 'Airsoft replicas, parts and care, from Brasov.',
    email: 'help@hexline.example',
    currency: 'EUR',
  })
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const errors = useFieldErrors<ProfileField>(validateProfile)
  const summary = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  const change = (field: keyof typeof profile, value: string) => {
    setProfile(current => ({ ...current, [field]: value }))
    if (field === 'name' || field === 'email') errors.change(field, value)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const found = errors.validateAll(PROFILE_FIELDS, field => profile[field])
    if (Object.keys(found).length > 0) {
      setAttempt(count => count + 1)
      return
    }
    setPending(true)
    await opsRequest()
    setPending(false)
    toast({ tone: 'ok', title: 'Store profile saved' })
  }

  return (
    <Panel title="Store profile" description="What customers see in the header, on receipts and in every email.">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <ErrorSummary ref={summary} errors={attempt > 0 ? summarize(errors.errors, PROFILE_FIELDS, idOf) : []} />
        <FormField label="Store name" required error={errors.errors.name}>
          <Input
            id={idOf('name')}
            maxLength={40}
            showCount
            value={profile.name}
            onChange={event => change('name', event.target.value)}
            onBlur={event => errors.blur('name', event.target.value, event.relatedTarget)}
          />
        </FormField>
        <FormField label="Tagline" help="One line under the name in the store header.">
          <Input
            id={idOf('tagline')}
            maxLength={80}
            showCount
            value={profile.tagline}
            onChange={event => change('tagline', event.target.value)}
          />
        </FormField>
        <FormField label="Support email" required error={errors.errors.email}>
          <Input
            id={idOf('email')}
            type="email"
            autoComplete="email"
            value={profile.email}
            onChange={event => change('email', event.target.value)}
            onBlur={event => errors.blur('email', event.target.value, event.relatedTarget)}
          />
        </FormField>
        <FormField label="Currency" help="Prices are stored in euro and shown in this currency.">
          <Select
            label="Currency"
            options={CURRENCIES}
            value={profile.currency}
            onValueChange={value => change('currency', value)}
          />
        </FormField>
        <div>
          <Button type="submit" loading={pending} loadingLabel="Saving the store profile">
            Save profile
          </Button>
        </div>
      </form>
    </Panel>
  )
}

const NOTIFICATIONS = [
  {
    id: 'orders',
    label: 'New orders',
    description: 'An email for every paid order, with the packing list.',
    on: true,
  },
  {
    id: 'stock',
    label: 'Low stock',
    description: 'When an item falls to six units or fewer.',
    on: true,
  },
  {
    id: 'returns',
    label: 'Return requests',
    description: 'When a customer asks to send something back.',
    on: true,
  },
  {
    id: 'digest',
    label: 'Weekly digest',
    description: 'Monday morning: last week’s revenue, orders and returns.',
    on: false,
  },
] as const

function Notifications() {
  const uid = useId()
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATIONS.map(item => [item.id, item.on])),
  )
  const [saved, setSaved] = useState('')

  return (
    <Panel title="Notifications" description="What the back office emails to the team. Changes save as you go.">
      <ul
        role="list"
        className="flex flex-col divide-y divide-[var(--color-border-hairline)] border-y border-[var(--color-border-hairline)]"
      >
        {NOTIFICATIONS.map(item => {
          const id = `${uid}-${item.id}`
          return (
            <li key={item.id} className="flex items-start justify-between gap-6 py-4">
              <div className="flex flex-col gap-1">
                <label htmlFor={id} className="font-body text-base font-semibold text-[var(--color-text-primary)]">
                  {item.label}
                </label>
                <p id={`${id}-help`} className="font-body text-sm text-[var(--color-text-secondary)]">
                  {item.description}
                </p>
              </div>
              <Switch
                id={id}
                aria-describedby={`${id}-help`}
                checked={on[item.id]}
                onCheckedChange={checked => {
                  setOn(current => ({ ...current, [item.id]: checked }))
                  setSaved(`${item.label} turned ${checked ? 'on' : 'off'}. Saved.`)
                }}
                className="mt-0.5 shrink-0"
              />
            </li>
          )
        })}
      </ul>
      <p role="status" className="min-h-5 font-body text-sm text-[var(--color-text-secondary)]">
        {saved}
      </p>
    </Panel>
  )
}

const ROLE_OPTIONS: SelectOption[] = (['manager', 'packer', 'support'] as const).map(role => ({
  value: role,
  label: ROLE_LABEL[role],
}))

function Team() {
  const { toast } = useToast()
  const [team, setTeam] = useState<TeamMember[]>(() => [...TEAM])

  function changeRole(member: TeamMember, role: TeamRole) {
    setTeam(current => current.map(m => (m.id === member.id ? { ...m, role } : m)))
    toast({
      tone: 'ok',
      title: `${member.name} is now ${ROLE_LABEL[role].toLowerCase()}`,
    })
  }

  return (
    <Panel
      title="Team"
      description="Who can sign in to the back office, and what they can change. Only the owner manages roles."
    >
      <List aria-label="Team members">
        {team.map(member => (
          <ListItem
            key={member.id}
            media={<Avatar name={member.name} status={member.status} />}
            title={member.name}
            description={member.email}
            actions={
              member.role === 'owner' ? (
                <Badge tone="signal">Owner</Badge>
              ) : (
                <Select
                  label={`Role for ${member.name}`}
                  options={ROLE_OPTIONS}
                  value={member.role}
                  inputSize="sm"
                  onValueChange={value => changeRole(member, value as TeamRole)}
                  className="w-32"
                />
              )
            }
          />
        ))}
      </List>
    </Panel>
  )
}

type Session = {
  id: string
  device: string
  where: string
  when: string
  icon: typeof Monitor
  current?: true
}

const SESSIONS: Session[] = [
  {
    id: 'win',
    device: 'Chrome on Windows',
    where: 'Brasov, Romania',
    when: 'Now',
    icon: Monitor,
    current: true,
  },
  {
    id: 'ios',
    device: 'Safari on iPhone',
    where: 'Brasov, Romania',
    when: '2 h ago',
    icon: Smartphone,
  },
  {
    id: 'tab',
    device: 'Firefox on Android tablet',
    where: 'Cluj-Napoca, Romania',
    when: '3 d ago',
    icon: Tablet,
  },
  {
    id: 'mac',
    device: 'Safari on macOS',
    where: 'Sibiu, Romania',
    when: '12 d ago',
    icon: Monitor,
  },
]

function DeviceIcon({ icon: Icon }: { icon: typeof Monitor }) {
  return (
    <span className="flex size-9 items-center justify-center border border-[var(--color-border-hairline-strong)] text-[var(--color-text-secondary)]">
      <Icon aria-hidden="true" className="size-4" />
    </span>
  )
}

function Sessions() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState(SESSIONS)
  const [signingOut, setSigningOut] = useState<string | null>(null)
  const others = sessions.filter(session => !session.current)

  async function signOut(ids: string[], title: string) {
    setSigningOut(ids.length === 1 ? ids[0] : 'all')
    await opsRequest()
    setSigningOut(null)
    setSessions(current => current.filter(session => !ids.includes(session.id)))
    toast({ tone: 'ok', title })
  }

  return (
    <Panel
      title="Sessions"
      description="Everywhere your back-office account is signed in. Sign out of anything you do not recognise."
    >
      <List aria-label="Signed-in sessions">
        {sessions.map(session => (
          <ListItem
            key={session.id}
            media={<DeviceIcon icon={session.icon} />}
            title={session.device}
            description={session.where}
            meta={session.when}
            actions={
              session.current ? (
                <Badge tone="ok">This device</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Sign out of ${session.device}`}
                  loading={signingOut === session.id}
                  loadingLabel={`Signing out of ${session.device}`}
                  onClick={() => {
                    if (signingOut === null) void signOut([session.id], `Signed out of ${session.device}`)
                  }}
                >
                  Sign out
                </Button>
              )
            }
          />
        ))}
      </List>
      {others.length > 0 ? (
        <div>
          <Button
            variant="secondary"
            iconStart={<LogOut />}
            loading={signingOut === 'all'}
            loadingLabel="Signing out of every other session"
            onClick={() => {
              if (signingOut === null)
                void signOut(
                  others.map(session => session.id),
                  `Signed out of ${others.length} other ${others.length === 1 ? 'session' : 'sessions'}`,
                )
            }}
          >
            Sign out of every other session
          </Button>
        </div>
      ) : (
        <p className="font-body text-sm text-[var(--color-text-secondary)]">This is the only device signed in.</p>
      )}
    </Panel>
  )
}

function DangerZone() {
  const { toast } = useToast()
  const uid = useId()
  const [typed, setTyped] = useState('')
  const [closed, setClosed] = useState(false)
  const matches = typed.trim() === STORE_HANDLE

  return (
    <Panel title="Danger zone" description="Changes here reach every customer at once.">
      <Alert compact tone="warning" title="No undo here">
        Each action asks you to confirm by name.
      </Alert>
      {closed ? (
        <Alert tone="hostile" title="The store is closed">
          Customers see a closed notice. Reload the page to open the demo store again.
        </Alert>
      ) : (
        <div className="flex flex-col gap-4 border border-[var(--color-border-hairline-strong)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-body text-base font-semibold text-[var(--color-text-primary)]">Close the store</p>
            <p className="font-body text-sm text-[var(--color-text-secondary)]">
              Takes every replica off sale, empties open carts and refunds paid orders.
            </p>
          </div>
          <AlertDialog onOpenChange={() => setTyped('')}>
            <AlertDialogTrigger asChild>
              <Button variant="danger" className="shrink-0">
                Close store
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              title="Close the Hexline store?"
              description="Every replica comes off sale, open carts are emptied and today’s 5 paid orders are refunded."
            >
              <FormField label="Store handle" help={`Type ${STORE_HANDLE} to enable Close store.`}>
                <Input
                  id={`${uid}-handle`}
                  value={typed}
                  onChange={event => setTyped(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              </FormField>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it open</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!matches}
                  loadingLabel="Closing the store"
                  onClick={() =>
                    opsRequest().then(() => {
                      setClosed(true)
                      toast({
                        tone: 'warning',
                        title: 'Store closed',
                        description: 'Reload the page to reopen it.',
                      })
                    })
                  }
                >
                  Close store
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Panel>
  )
}

/**
 * The settings centre: five sections behind vertical, line-variant tabs. The tab list runs down
 * the side from `md` and across the top below it, and Tabs takes `orientation` from a media query
 * here because the component has no responsive orientation of its own: switching the prop, not
 * just the CSS, is what moves the arrow keys (Up and Down beside, Left and Right on top) and the
 * active bar (the inline edge beside, the bottom on top) with the layout.
 *
 * The open section is in the URL (`?tab=`), so the dashboard's "Manage team" link lands on Team
 * and a reload stays where it was. Each section keeps its own state and loses it when its tab
 * closes: Radix unmounts an inactive panel, and these are demo edits, not drafts.
 */
export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Section = isSection(tabParam) ? tabParam : 'profile'
  const wide = useSyncExternalStore(subscribeWide, readWide, () => true)
  const tabList = useRef<HTMLDivElement>(null)

  // Across the top, the list scrolls sideways inside itself, and Radix does not bring the active
  // tab into view: a link to ?tab=team landed with Team scrolled out of sight at 320px. Scrolls
  // the list only (scrollLeft), never the page.
  useEffect(() => {
    const list = tabList.current
    if (wide || !list) return
    const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
    if (active) list.scrollLeft = active.offsetLeft - list.offsetLeft - 16
  }, [tab, wide])

  return (
    <OpsLayout>
      <PageHeader
        eyebrow="Back office"
        title="Settings"
        description="The store’s profile, who gets told what, who works here and where you are signed in."
      />
      <Tabs
        value={tab}
        onValueChange={value => {
          const next = new URLSearchParams(searchParams)
          if (value === 'profile') next.delete('tab')
          else next.set('tab', value)
          setSearchParams(next, { replace: true })
        }}
        orientation={wide ? 'vertical' : 'horizontal'}
        variant="line"
      >
        <TabsList ref={tabList} aria-label="Settings sections" className={wide ? 'w-52' : undefined}>
          <TabsTrigger value="profile" icon={<Store />}>
            Store profile
          </TabsTrigger>
          <TabsTrigger value="notifications" icon={<Bell />}>
            Notifications
          </TabsTrigger>
          <TabsTrigger value="team" icon={<Users />}>
            Team
          </TabsTrigger>
          <TabsTrigger value="sessions" icon={<Monitor />}>
            Sessions
          </TabsTrigger>
          <TabsTrigger value="danger" icon={<ShieldAlert />}>
            Danger zone
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <StoreProfile />
        </TabsContent>
        <TabsContent value="notifications">
          <Notifications />
        </TabsContent>
        <TabsContent value="team">
          <Team />
        </TabsContent>
        <TabsContent value="sessions">
          <Sessions />
        </TabsContent>
        <TabsContent value="danger">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </OpsLayout>
  )
}
