import type { Category } from '../store/catalog'

/**
 * Field notes: Hexline's own field guides for the sport, structured as blocks rather than HTML so
 * the article page decides how each kind renders (and so a heading can carry a stable `id` for
 * the "On this page" links, rather than one derived at render time from the block's own text).
 *
 * Every guide is invented for a fictional store. They describe looking after equipment and
 * setting it up: none describes use against people, and none borrows a real maker's procedure.
 */
export type JournalBlock =
  | { kind: 'heading'; id: string; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'callout'; title: string; text: string }
  /** `src` is optional: `public/media/journal/<slug>-figure.webp` (1200x900) once the picture
   *  exists. Until then the figure renders its placeholder box, so the layout is already final. */
  | { kind: 'figure'; caption: string; src?: string }

export type JournalPost = {
  slug: string
  title: string
  /** Shown on the index card and, for the first two others, under "More field notes". */
  summary: string
  /** ISO date, read straight into `<time dateTime>`. */
  date: string
  readingMinutes: number
  /** The index page's own filter chips -- a separate taxonomy from `categories` below, e.g. the
   *  battery guide carries the `replicas` tag without being the guide a replica's own Guide tab
   *  links to, because the cleaning guide already answers for that category. */
  tags: string[]
  /** Which catalogue categories this guide answers for -- read by `guideForCategory` below, not
   *  by the index or the article themselves. */
  categories: Category['id'][]
  /** The cover, 16:9: `public/media/journal/<slug>-cover.webp` (1600x900). Absent until the
   *  picture exists; the index card and the article header then render the placeholder box.
   *  `alt` stays empty unless the picture says something the title does not. */
  image?: { src: string; alt?: string }
  body: JournalBlock[]
}

export const JOURNAL_POSTS: JournalPost[] = [
  {
    slug: 'cleaning-after-a-field-day',
    title: 'Cleaning a replica after a field day',
    summary:
      'Ten minutes with a cleaning rod and a drop of silicone oil keeps a replica feeding properly, and it is the job most people skip.',
    date: '2026-04-14',
    readingMinutes: 4,
    tags: ['replicas', 'maintenance', 'quick-job'],
    categories: ['replicas'],
    body: [
      { kind: 'heading', id: 'what-youll-need', text: "What you'll need" },
      {
        kind: 'paragraph',
        text:
          'The barrel cleaning rod from the box, a few cotton patches, silicone oil, a dry cloth, and about ten minutes at a table with the battery unplugged.',
      },
      { kind: 'heading', id: 'steps', text: 'Steps' },
      {
        kind: 'steps',
        items: [
          'Unplug the battery, take the magazine out and check that no BB is left in the feed tube.',
          'Turn the hop-up dial fully off, so the patch does not catch the rubber on its way through.',
          'Thread a dry patch on the rod and push it through from the muzzle end until it comes out clean.',
          'Wipe the outside down with the dry cloth, put one drop of silicone oil on the magazine catch, and set the hop-up back where it was.',
        ],
      },
      {
        kind: 'callout',
        title: 'If the day was wet',
        text:
          'Leave the replica out of its bag overnight with the stock folded out. A damp gearbox closed up in a case is how springs and screws start to rust.',
      },
      { kind: 'heading', id: 'when-to-send-it-in', text: 'When to send it in' },
      {
        kind: 'paragraph',
        text:
          'A clean barrel that still feeds badly, or a motor that sounds strained, is a job for a technician. A Care plan covers the tune and a chrono check on the way out.',
      },
      { kind: 'figure', caption: 'A replica on a table with its magazine out, a cleaning rod and a row of cotton patches beside it.' },
    ],
  },
  {
    slug: 'fitting-an-optic-to-a-rail',
    title: 'Fitting an optic to a rail',
    summary: 'A sight that sits level and stays put takes one hex key and five minutes. Most wobble comes from the clamp, not the sight.',
    date: '2026-05-02',
    readingMinutes: 3,
    tags: ['optics', 'rails', 'quick-job'],
    categories: ['optics'],
    body: [
      { kind: 'heading', id: 'what-youll-need', text: "What you'll need" },
      {
        kind: 'paragraph',
        text: 'The sight, its rail mount, the hex key from the box, and a replica with a 20 mm top rail. Fit the cell last.',
      },
      { kind: 'heading', id: 'steps', text: 'Steps' },
      {
        kind: 'steps',
        items: [
          'Loosen the clamp screw until the jaw clears the rail, and pick a slot far enough forward that the sight sits a hand’s width from your eye protection.',
          'Seat the cross bolt in the slot and push the sight forward against it before tightening, so it has nowhere left to creep.',
          'Tighten the clamp screw until it is snug, then a quarter turn more. Overtightening strips a polymer rail.',
          'Fit the cell, switch on, and look through with both eyes open: the dot should sit in the middle of the window at your normal hold.',
        ],
      },
      {
        kind: 'callout',
        title: 'Keep the lens shield on',
        text:
          'A window sight without its polycarbonate shield will not survive a field day. Carry the spare shield from the box in a pouch, and swap it when the first one cracks.',
      },
      { kind: 'heading', id: 'when-to-send-it-in', text: 'When to send it in' },
      {
        kind: 'paragraph',
        text: 'A dot that drifts after every skirmish, on a clamp that is tight, means the mount itself is worn. That is a replacement mount, not more torque.',
      },
      { kind: 'figure', caption: 'A window sight seated on a top rail, with the hex key still in the clamp screw.' },
    ],
  },
  {
    slug: 'choosing-bb-weight',
    title: 'Choosing a BB weight',
    summary: 'Heavier BBs hold their line in wind and lighter ones leave the barrel quicker. The right weight follows from the energy of your replica.',
    date: '2026-05-20',
    readingMinutes: 5,
    tags: ['ammo', 'setup', 'hop-up'],
    categories: ['ammo'],
    body: [
      { kind: 'heading', id: 'what-youll-need', text: "What you'll need" },
      {
        kind: 'paragraph',
        text: 'The muzzle energy of your replica in joules, from its listing or from the chrono at your site, and one bottle each of two weights to compare.',
      },
      { kind: 'heading', id: 'steps', text: 'Steps' },
      {
        kind: 'steps',
        items: [
          'Start from the energy: at about 1 J, begin with 0.25 g. Above 1.2 J, begin with 0.28 g.',
          'Load one magazine and set the hop-up so the BBs fly flat for as far as you can follow them, without climbing at the end.',
          'Try the next weight up on the same day and in the same wind, and reset the hop-up for it: a heavier BB needs more.',
          'Keep the weight that flies flattest for longest, and write the hop-up setting on a strip of tape inside the stock.',
        ],
      },
      {
        kind: 'callout',
        title: 'Energy is set by the site, not by the BB',
        text: 'A site measures energy in joules at its chrono, usually with its own 0.20 g BBs. Changing BB weight does not get a replica under a limit it is over.',
      },
      { kind: 'heading', id: 'when-to-send-it-in', text: 'When to send it in' },
      {
        kind: 'paragraph',
        text: 'If no weight flies flat at any hop-up setting, the hop-up rubber is worn or the barrel is dirty. Clean the barrel first; the rubber is a workshop job.',
      },
      { kind: 'figure', caption: 'Two bottles of BBs, 0.25 g and 0.28 g, beside a magazine and a speed loader.' },
    ],
  },
  {
    slug: 'battery-care-and-storage',
    title: 'Battery care and storage',
    summary: 'A lithium polymer pack lasts for years if it is charged on a balance charger and never stored full or flat.',
    date: '2026-06-11',
    readingMinutes: 6,
    tags: ['parts', 'replicas', 'batteries', 'maintenance'],
    categories: ['parts'],
    body: [
      { kind: 'heading', id: 'what-youll-need', text: "What you'll need" },
      {
        kind: 'paragraph',
        text: 'A balance charger with a storage mode, a fireproof charging bag, and somewhere cool and dry that is not a car or a shed.',
      },
      { kind: 'heading', id: 'steps', text: 'Steps' },
      {
        kind: 'steps',
        items: [
          'Unplug the battery from the replica as soon as the day ends. Left connected, it drains past the point it can recover from.',
          'Let it cool to room temperature before charging, and charge it inside the bag, on a hard surface, while you are in the room.',
          'Use the balance lead every time, so the charger can see each cell and stop when the first one is full.',
          'If the next field day is more than a week away, run the storage mode instead: it brings each cell to 3.8 V.',
        ],
      },
      {
        kind: 'callout',
        title: 'A pack that has puffed up',
        text: 'A swollen or dented pack is finished. Do not charge it and do not put it back in a replica. Take it to a battery recycling point.',
      },
      { kind: 'heading', id: 'when-to-send-it-in', text: 'When to send it in' },
      {
        kind: 'paragraph',
        text: 'A battery cannot be serviced, only replaced. If a healthy pack still gives a slow, uneven cycle, the fault is in the wiring or the motor, and that is a workshop job.',
      },
      { kind: 'figure', caption: 'A stick battery on a balance charger inside an open charging bag, showing 3.8 V per cell.' },
    ],
  },
]

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IE', { dateStyle: 'medium', timeZone: 'UTC' })

/** `new Date(iso)` reads a date-only ISO string (`'2026-04-14'`) as UTC midnight -- `timeZone:
 *  'UTC'` above is what keeps the formatted date that same calendar day everywhere this runs. Left
 *  off, a reader west of UTC (any negative offset) would see the formatter render its own local
 *  midnight, one calendar day earlier than the post's own date. Formatting with the same formatter
 *  everywhere this module is used, rather than each caller building its own, is what keeps the
 *  index card's date and the article's `<time>` text identical for the same post. */
export function formatJournalDate(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso))
}

export function findJournalPost(slug: string): JournalPost | undefined {
  return JOURNAL_POSTS.find(post => post.slug === slug)
}

/** The first `count` other posts, in catalogue order -- deterministic, so "More field notes"
 *  never reshuffles between renders of the same article. */
export function relatedJournalPosts(post: JournalPost, count: number): JournalPost[] {
  return JOURNAL_POSTS.filter(other => other.slug !== post.slug).slice(0, count)
}

/** Every tag across every post, deduplicated and sorted -- the index page's own filter chips.
 *  Never hand-maintained: a new post's tags reach the filter row for free. */
export function allJournalTags(): string[] {
  return Array.from(new Set(JOURNAL_POSTS.flatMap(post => post.tags))).sort()
}

/** Every tag with the number of posts that carry it, in the same sorted order as
 *  {@link allJournalTags} -- the sidebar's tag cloud sizes each link by this count. */
export function journalTagCounts(): { tag: string; count: number }[] {
  return allJournalTags().map(tag => ({ tag, count: JOURNAL_POSTS.filter(post => post.tags.includes(tag)).length }))
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** `'2026-05-20'` -> `'2026-05'`: the archive's key, and the `?month=` value in the URL. */
export function journalMonthKey(iso: string): string {
  return iso.slice(0, 7)
}

/** "May 2026" for a `'2026-05'` key. */
export function formatJournalMonth(key: string): string {
  return MONTH_FORMATTER.format(new Date(`${key}-01`))
}

/** The archive: one entry per month that has a post, newest first, with its post count. */
export function journalArchive(): { key: string; label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const post of JOURNAL_POSTS) {
    const key = journalMonthKey(post.date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts, ([key, count]) => ({ key, label: formatJournalMonth(key), count })).sort((a, b) =>
    b.key.localeCompare(a.key)
  )
}

/** The index page's filters, all optional and combined with AND: a free-text query matched
 *  case-insensitively against title, summary and tags (every word must match somewhere), one tag,
 *  one `YYYY-MM` month. */
export function filterJournalPosts(filters: { q?: string | null; tag?: string | null; month?: string | null }): JournalPost[] {
  const words = (filters.q ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  return JOURNAL_POSTS.filter(post => {
    if (filters.tag && !post.tags.includes(filters.tag)) return false
    if (filters.month && journalMonthKey(post.date) !== filters.month) return false
    const haystack = `${post.title} ${post.summary} ${post.tags.join(' ')}`.toLowerCase()
    return words.every(word => haystack.includes(word))
  })
}

/** The guide `/demo/shop`'s Product page links its Guide tab to: the first post (in catalogue
 *  order) whose `categories` include this one, or `undefined` when no guide covers it yet --
 *  Product.tsx falls back to the Field notes index itself in that case, rather than a broken or
 *  guessed link. */
export function guideForCategory(categoryId: Category['id']): JournalPost | undefined {
  return JOURNAL_POSTS.find(post => post.categories.includes(categoryId))
}
