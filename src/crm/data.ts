import { addDays, daysBetween, TODAY } from './dates'
import type {
  Account,
  Activity,
  ActivityType,
  Contact,
  Deal,
  LineItem,
  LostReason,
  Outcome,
  ProductId,
  Rep,
  Stage,
  Task,
} from './model'
import { STAGE_LABEL } from './model'

/**
 * Corvane's demo data: the Halden Systems sales team, its accounts, their people, the deals and
 * three weeks of activity up to `TODAY`. Every company and person is invented. Deterministic: the
 * hand-written records are literal, and the generated ones (contacts, activities, tasks) come from
 * a seeded generator, so two loads, two test runs and two screenshots always agree.
 */

export const WORKSPACE = 'Halden Systems'
export const PRODUCT_NAME = 'Corvane'

export const REPS: readonly Rep[] = [
  { id: 'r-maren', name: 'Maren Holt', title: 'Account executive' },
  { id: 'r-tobias', name: 'Tobias Rennick', title: 'Account executive' },
  { id: 'r-sana', name: 'Sana Okafor', title: 'Senior account executive' },
  { id: 'r-jules', name: 'Jules Ferrand', title: 'Account executive' },
  { id: 'r-priya', name: 'Priya Valdez', title: 'Sales development' },
  { id: 'r-elias', name: 'Elias Brandt', title: 'Head of sales' },
]

/** The rep signed in to the demo: the one who logs notes and moves deals. */
export const CURRENT_REP_ID = 'r-maren'

/** The quarter's won-revenue goal for the whole team, in cents. */
export const QUARTER_GOAL = 25_000_000

type AccountRow = [slug: string, name: string, industry: Account['industry'], city: string, employees: number, owner: string, health: Account['health']]

const ACCOUNT_ROWS: AccountRow[] = [
  ['vellmark', 'Vellmark Logistics', 'Logistics', 'Rotterdam', 1200, 'r-maren', 'healthy'],
  ['frostline', 'Frostline Depots', 'Cold storage', 'Hamburg', 340, 'r-tobias', 'watch'],
  ['corlan', 'Corlan Metalworks', 'Manufacturing', 'Brno', 610, 'r-sana', 'healthy'],
  ['ambergate', 'Ambergate Distribution', 'Logistics', 'Leeds', 880, 'r-maren', 'healthy'],
  ['tidewell', 'Tidewell Cold Storage', 'Cold storage', 'Antwerp', 210, 'r-jules', 'at-risk'],
  ['harrowlune', 'Harrow & Lune Freight', 'Logistics', 'Bristol', 450, 'r-priya', 'healthy'],
  ['quillon', 'Quillon Plastics', 'Manufacturing', 'Lyon', 390, 'r-elias', 'watch'],
  ['saltmere', 'Saltmere Foods', 'Food distribution', 'Aarhus', 720, 'r-tobias', 'healthy'],
  ['brennick', 'Brennick Pharma Supply', 'Pharma distribution', 'Basel', 260, 'r-sana', 'healthy'],
  ['ostwind', 'Ostwind Fulfilment', 'Logistics', 'Leipzig', 1500, 'r-jules', 'watch'],
  ['pellam', 'Pellam Industries', 'Manufacturing', 'Turin', 980, 'r-priya', 'healthy'],
  ['greyhaven', 'Greyhaven Cold Chain', 'Cold storage', 'Gdańsk', 300, 'r-elias', 'healthy'],
  ['marrowlane', 'Marrow Lane Packaging', 'Manufacturing', 'Porto', 170, 'r-maren', 'at-risk'],
  ['ketterby', 'Ketterby Auto Parts', 'Manufacturing', 'Győr', 2100, 'r-tobias', 'healthy'],
  ['lindqvist', 'Lindqvist Haulage', 'Logistics', 'Gothenburg', 540, 'r-sana', 'watch'],
  ['rookfield', 'Rookfield Dairies', 'Food distribution', 'Cork', 410, 'r-jules', 'healthy'],
  ['ardenvale', 'Arden Vale Logistics', 'Logistics', 'Valencia', 760, 'r-priya', 'healthy'],
  ['wexmoor', 'Wexmoor Components', 'Manufacturing', 'Tampere', 280, 'r-elias', 'healthy'],
]

export const ACCOUNTS: readonly Account[] = ACCOUNT_ROWS.map(([slug, name, industry, city, employees, ownerId, health]) => ({
  id: `acc-${slug}`,
  name,
  industry,
  city,
  employees,
  ownerId,
  health,
}))

/** A small seeded generator (mulberry32): the same sequence on every run. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

const FIRST = [
  'Ines', 'Oskar', 'Hanna', 'Mateo', 'Lotte', 'Ravi', 'Clara', 'Emil', 'Noor', 'Felix', 'Ada', 'Bastien', 'Mira',
  'Jonas', 'Zofia', 'Luca', 'Freya', 'Tomas', 'Elif', 'Pieter', 'Signe', 'Aurelio', 'Dagny', 'Kofi', 'Wren',
  'Anouk', 'Henrik', 'Lucia', 'Malik', 'Saoirse', 'Vera', 'Nils', 'Ottilie', 'Rafael', 'Ingrid', 'Cyrus', 'Petra',
  'Leon', 'Yara', 'Matthis', 'Greta', 'Idris', 'Liv', 'Konrad', 'Esme',
]
const LAST = [
  'Marlow', 'Dekker', 'Vos', 'Brandvold', 'Achterberg', 'Kessler', 'Novak', 'Lindgren', 'Moretti', 'Farrow',
  'Okonkwo', 'Duval', 'Halvorsen', 'Strand', 'Pereira', 'Kowalczyk', 'Aalto', 'Byrne', 'Castell', 'Rasmussen',
  'Weiss', 'Janssen', 'Horvath', 'Ortega', 'Fennimore', 'Quist', 'Bauer', 'Sandoval', 'Eriksen', 'Holloway',
  'Varga', 'Mercer', 'Lundqvist', 'Abara', 'Delacroix', 'Sorensen', 'Navarro', 'Hughes', 'Kaminski', 'Petrov',
  'Lowe', 'Brooks', 'Ferreira', 'Nyberg', 'Rowan',
]
const TITLES = [
  'Head of operations',
  'Warehouse manager',
  'Procurement lead',
  'Facilities director',
  'IT manager',
  'Quality manager',
  'Chief operating officer',
  'Supply chain analyst',
  'Site manager',
]

function slugName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.')
}

/** Three people at each of the first nine accounts, two at the rest: 45. */
function buildContacts(): Contact[] {
  const contacts: Contact[] = []
  let i = 0
  ACCOUNTS.forEach((account, a) => {
    const count = a < 9 ? 3 : 2
    for (let k = 0; k < count; k++, i++) {
      const name = `${FIRST[i]} ${LAST[(i * 17) % LAST.length]}`
      contacts.push({
        id: `c-${String(i + 1).padStart(2, '0')}`,
        name,
        title: TITLES[(i + a) % TITLES.length],
        accountId: account.id,
        email: `${slugName(name)}@example.com`,
        phone: `+1 555-01${String(i + 10).padStart(2, '0')}`,
        ownerId: account.ownerId,
        lastTouch: addDays(TODAY, -(30 + ((i * 7) % 40))),
      })
    }
  })
  return contacts
}

type DealRow = [
  id: string,
  account: string,
  name: string,
  stage: Stage,
  owner: string,
  close: string,
  nextStep: string | null,
  created: string,
  items: [ProductId, number][],
  lostReason?: LostReason,
]

const DEAL_ROWS: DealRow[] = [
  ['d-01', 'vellmark', 'Rotterdam hub rollout', 'negotiation', 'r-maren', '2026-10-28', 'Legal review of the MSA', '2026-07-02', [['gateway', 6], ['sensor-kit', 20], ['licence', 3], ['onboarding', 1]]],
  ['d-02', 'frostline', 'Freezer aisle monitoring', 'proposal', 'r-tobias', '2026-11-12', 'Send revised quote', '2026-08-14', [['sensor-kit', 8], ['probe', 40], ['licence', 1]]],
  ['d-03', 'corlan', 'Press line pilot', 'discovery', 'r-sana', '2026-12-04', 'Site survey on the 21st', '2026-09-10', [['gateway', 2], ['sensor-kit', 4]]],
  ['d-04', 'ambergate', 'Leeds cross-dock sensors', 'qualified', 'r-maren', '2026-12-18', null, '2026-10-01', [['sensor-kit', 10]]],
  ['d-05', 'tidewell', 'Probe replacement', 'proposal', 'r-jules', '2026-10-09', 'Chase sign-off', '2026-07-20', [['probe', 60]]],
  ['d-06', 'harrowlune', 'Bristol yard visibility', 'negotiation', 'r-priya', '2026-11-06', 'Pricing call with finance', '2026-06-30', [['gateway', 4], ['sensor-kit', 12], ['licence', 2]]],
  ['d-07', 'quillon', 'Moulding hall humidity', 'discovery', 'r-elias', '2026-11-27', null, '2026-09-02', [['sensor-kit', 6], ['gateway', 1]]],
  ['d-08', 'saltmere', 'Aarhus chilled DC', 'won', 'r-tobias', '2026-10-06', null, '2026-05-12', [['gateway', 5], ['probe', 80], ['licence', 2], ['onboarding', 1]]],
  ['d-09', 'brennick', 'GDP compliance kit', 'negotiation', 'r-sana', '2026-10-30', 'Validation pack to QA', '2026-07-08', [['probe', 120], ['licence', 1], ['onboarding', 1]]],
  ['d-10', 'ostwind', 'Leipzig fulfilment phase 2', 'proposal', 'r-jules', '2026-11-20', 'Workshop with site leads', '2026-08-25', [['gateway', 8], ['sensor-kit', 24], ['licence', 4]]],
  ['d-11', 'pellam', 'Turin plant expansion', 'qualified', 'r-priya', '2027-01-15', 'Intro call booked', '2026-10-06', [['gateway', 3], ['sensor-kit', 9]]],
  ['d-12', 'greyhaven', 'Gdańsk blast freezers', 'won', 'r-elias', '2026-10-13', null, '2026-06-18', [['probe', 48], ['sensor-kit', 6], ['licence', 1]]],
  ['d-13', 'marrowlane', 'Packaging line trial', 'lost', 'r-maren', '2026-10-08', null, '2026-07-15', [['sensor-kit', 3]], 'Budget'],
  ['d-14', 'ketterby', 'Győr parts warehouse', 'discovery', 'r-tobias', '2026-12-11', 'Send case study', '2026-09-18', [['gateway', 6], ['sensor-kit', 18], ['licence', 2]]],
  ['d-15', 'lindqvist', 'Fleet depot trackers', 'proposal', 'r-sana', '2026-10-02', null, '2026-07-28', [['gateway', 4], ['licence', 3]]],
  ['d-16', 'rookfield', 'Milk reception probes', 'negotiation', 'r-jules', '2026-11-03', 'Final terms to procurement', '2026-08-04', [['probe', 36], ['gateway', 2], ['onboarding', 1]]],
  ['d-17', 'ardenvale', 'Valencia cold room', 'qualified', 'r-priya', '2026-12-09', 'Qualify budget owner', '2026-09-29', [['sensor-kit', 5], ['probe', 20]]],
  ['d-18', 'wexmoor', 'Component store monitoring', 'discovery', 'r-elias', '2026-11-30', 'Demo for the plant manager', '2026-09-14', [['sensor-kit', 7], ['gateway', 1]]],
  ['d-19', 'vellmark', 'Second-site licence', 'won', 'r-maren', '2026-09-24', null, '2026-06-02', [['licence', 2]]],
  ['d-20', 'frostline', 'Dock door sensors', 'lost', 'r-tobias', '2026-09-12', null, '2026-05-30', [['sensor-kit', 6]], 'Chose a competitor'],
  ['d-21', 'corlan', 'Paint shop probes', 'qualified', 'r-sana', '2026-12-22', null, '2026-10-08', [['probe', 24]]],
  ['d-22', 'ambergate', 'Returns centre add-on', 'proposal', 'r-maren', '2026-10-29', 'Confirm pilot sites', '2026-08-19', [['sensor-kit', 6], ['licence', 1]]],
  ['d-23', 'tidewell', 'Antwerp licence renewal', 'negotiation', 'r-jules', '2026-09-30', 'Renewal call', '2026-06-11', [['licence', 2]]],
  ['d-24', 'harrowlune', 'Trailer yard pilot', 'discovery', 'r-priya', '2026-12-15', 'Map the yard', '2026-09-22', [['gateway', 2], ['sensor-kit', 4]]],
  ['d-25', 'quillon', 'Resin store probes', 'lost', 'r-elias', '2026-10-05', null, '2026-07-01', [['probe', 30]], 'No decision'],
  ['d-26', 'saltmere', 'Onboarding for new DC', 'qualified', 'r-tobias', '2026-11-25', 'Scope workshop', '2026-10-05', [['onboarding', 2]]],
  ['d-27', 'brennick', 'Basel second cold room', 'won', 'r-sana', '2026-10-01', null, '2026-07-22', [['probe', 40], ['sensor-kit', 4]]],
  ['d-28', 'ostwind', 'Returns hall sensors', 'discovery', 'r-jules', '2026-12-02', null, '2026-09-08', [['sensor-kit', 10], ['gateway', 2]]],
  ['d-29', 'pellam', 'Maintenance store', 'proposal', 'r-priya', '2026-11-18', 'Quote to procurement', '2026-08-30', [['sensor-kit', 4], ['licence', 1]]],
  ['d-30', 'greyhaven', 'Licence uplift', 'qualified', 'r-elias', '2026-12-01', 'Usage review', '2026-10-09', [['licence', 2]]],
  ['d-31', 'ketterby', 'Inbound dock pilot', 'won', 'r-tobias', '2026-09-18', null, '2026-06-05', [['gateway', 2], ['sensor-kit', 6], ['onboarding', 1]]],
  ['d-32', 'lindqvist', 'Driver app add-on', 'lost', 'r-sana', '2026-08-28', null, '2026-05-20', [['licence', 1]], 'Timing'],
]

/** Open deals nobody has touched for over two weeks: their activity is all 15 or more days old. */
export const STALLED_DEAL_IDS: ReadonlySet<string> = new Set(['d-05', 'd-07', 'd-15', 'd-28'])

function buildDeals(contacts: readonly Contact[]): Deal[] {
  return DEAL_ROWS.map(([id, slug, name, stage, ownerId, closeDate, nextStep, created, items, lostReason]) => {
    const accountId = `acc-${slug}`
    const people = contacts.filter(contact => contact.accountId === accountId)
    const index = Number(id.slice(2))
    const lineItems: LineItem[] = items.map(([productId, quantity]) => ({ productId, quantity }))
    const deal: Deal = {
      id,
      accountId,
      contactId: people[index % people.length].id,
      name,
      stage,
      ownerId,
      closeDate,
      nextStep,
      created,
      lineItems,
    }
    if (lostReason) deal.lostReason = lostReason
    return deal
  })
}

const BODIES: Record<Exclude<ActivityType, 'stage'>, string[]> = {
  call: [
    'Walked through the pilot scope and the number of dock doors.',
    'Asked about the alerting thresholds for the freezer aisles.',
    'Budget sits with operations this year, not IT.',
    'Wants a reference from another cold-storage site.',
    'Confirmed the gateway can sit on their existing VLAN.',
  ],
  email: [
    'Sent the revised quote with the onboarding package itemised.',
    'Shared the data sheet for the cold-chain probe.',
    'Followed up on the security questionnaire.',
    'Sent the case study from a similar distribution centre.',
  ],
  meeting: [
    'Site visit: three halls, about 40 sensor points in total.',
    'Workshop with the site leads on alert routing.',
    'Demo of the fleet dashboard for the operations team.',
  ],
  note: [
    'Procurement freeze lifts at the start of next month.',
    'Champion is moving roles in January; find a second sponsor.',
    'Competitor pitched a cheaper probe without calibration certificates.',
    'They run two shifts, so alerts need to reach the night supervisor.',
  ],
  task: ['Sent the pilot plan', 'Booked the site survey', 'Shared the pricing sheet', 'Logged the security answers'],
}

const OUTCOMES: Record<'call' | 'email' | 'meeting' | 'task', Outcome[]> = {
  call: ['Connected', 'No answer', 'Left voicemail', 'Connected'],
  email: ['Sent', 'Replied'],
  meeting: ['Held', 'Held', 'Rescheduled'],
  task: ['Done'],
}

const TYPES: Exclude<ActivityType, 'stage'>[] = ['call', 'email', 'meeting', 'note', 'task', 'call', 'email']

/** How far back the activity feed reaches, in days. */
export const ACTIVITY_WINDOW_DAYS = 20

function stamp(daysAgo: number, rand: () => number): string {
  const hour = 8 + Math.floor(rand() * 10)
  const minute = Math.floor(rand() * 12) * 5
  return `${addDays(TODAY, -daysAgo)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildActivities(deals: readonly Deal[], contacts: readonly Contact[]): Activity[] {
  const rand = seeded(20261015)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  const activities: Activity[] = []
  const nameOf = (id: string) => contacts.find(contact => contact.id === id)?.name ?? ''

  for (const deal of deals) {
    const closed = deal.stage === 'won' || deal.stage === 'lost'
    const closedAgo = daysBetween(deal.closeDate, TODAY)
    if (closed && closedAgo > ACTIVITY_WINDOW_DAYS) continue
    const earliest = closed ? Math.max(closedAgo, 0) : STALLED_DEAL_IDS.has(deal.id) ? 15 : 0
    const count = 2 + Math.floor(rand() * 2)
    for (let k = 0; k < count; k++) {
      const type = pick(TYPES)
      // An open deal that is not stalled always has something in the last ten days.
      const daysAgo =
        k === 0 && !closed && !STALLED_DEAL_IDS.has(deal.id)
          ? Math.floor(rand() * 10)
          : earliest + Math.floor(rand() * (ACTIVITY_WINDOW_DAYS - earliest + 1))
      const contactName = nameOf(deal.contactId)
      const title =
        type === 'call'
          ? `Call with ${contactName}`
          : type === 'email'
            ? `Email to ${contactName}`
            : type === 'meeting'
              ? `Meeting with ${contactName}`
              : type === 'note'
                ? `Note on ${deal.name}`
                : `Task done: ${pick(BODIES.task)}`
      activities.push({
        id: '',
        type,
        at: stamp(daysAgo, rand),
        accountId: deal.accountId,
        dealId: deal.id,
        contactId: type === 'note' || type === 'task' ? undefined : deal.contactId,
        ownerId: deal.ownerId,
        title,
        body: type === 'task' ? undefined : pick(BODIES[type]),
        outcome: type === 'note' ? undefined : pick(OUTCOMES[type]),
      })
    }
    if (closed) {
      activities.push({
        id: '',
        type: 'stage',
        at: `${deal.closeDate}T17:30`,
        accountId: deal.accountId,
        dealId: deal.id,
        ownerId: deal.ownerId,
        title: `Moved to ${STAGE_LABEL[deal.stage]}`,
        body: deal.stage === 'lost' ? `Reason: ${deal.lostReason ?? 'Not recorded'}.` : 'Signed order received.',
      })
    }
  }

  // A handful of account-level notes, tied to no deal.
  const ACCOUNT_NOTES: [string, number, string][] = [
    ['acc-tidewell', 3, 'Support raised two probe calibration complaints this month.'],
    ['acc-marrowlane', 6, 'New CFO; spending reviews on every purchase over €5,000.'],
    ['acc-ostwind', 1, 'Opening a third site in Halle next spring.'],
    ['acc-lindqvist', 9, 'Asked for a quarterly business review.'],
    ['acc-quillon', 12, 'Plant manager prefers phone over email.'],
    ['acc-vellmark', 0, 'Renewal conversation should start in November.'],
  ]
  for (const [accountId, daysAgo, body] of ACCOUNT_NOTES) {
    const account = ACCOUNTS.find(a => a.id === accountId)!
    activities.push({
      id: '',
      type: 'note',
      at: stamp(daysAgo, rand),
      accountId,
      ownerId: account.ownerId,
      title: `Note on ${account.name}`,
      body,
    })
  }

  activities.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  return activities.map((activity, i) => ({ ...activity, id: `a-${String(i + 1).padStart(3, '0')}` }))
}

const TASK_EXTRAS = ['Check the calibration certificates', 'Update the mutual close plan', 'Add the night supervisor as a contact']

function buildTasks(deals: readonly Deal[]): Task[] {
  const tasks: Task[] = []
  deals.forEach((deal, i) => {
    if (deal.stage === 'won' || deal.stage === 'lost') return
    if (deal.nextStep) {
      tasks.push({
        id: `t-${tasks.length + 1}`,
        dealId: deal.id,
        title: deal.nextStep,
        due: addDays(TODAY, (i % 9) - 3),
        done: false,
        ownerId: deal.ownerId,
      })
    }
    if (i % 4 === 0) {
      tasks.push({
        id: `t-${tasks.length + 1}`,
        dealId: deal.id,
        title: TASK_EXTRAS[i % TASK_EXTRAS.length],
        due: addDays(TODAY, (i % 5) + 1),
        done: i % 8 === 0,
        ownerId: deal.ownerId,
      })
    }
  })
  return tasks
}

export type CrmData = {
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
  tasks: Task[]
}

/** A fresh copy of the whole seed, every time: the store mutates its own copy, never this. */
export function seedData(): CrmData {
  const contacts = buildContacts()
  const deals = buildDeals(contacts)
  const activities = buildActivities(deals, contacts)
  const tasks = buildTasks(deals)
  // A contact's last touch is their latest activity, where they have one.
  for (const contact of contacts) {
    const latest = activities.find(activity => activity.contactId === contact.id)
    if (latest) contact.lastTouch = latest.at.slice(0, 10)
  }
  return { contacts, deals, activities, tasks }
}

export function repById(id: string): Rep {
  return REPS.find(rep => rep.id === id) ?? REPS[0]
}

export function accountById(id: string): Account | undefined {
  return ACCOUNTS.find(account => account.id === id)
}
