import { afterEach, describe, expect, it, vi } from 'vitest'

// src's own tsconfig carries no `"node"` types (only `vite/client`, for the browser build this
// module ships into) -- this test is the one file under src that ever reads `process.env`, so a
// minimal ambient declaration here is what keeps `tsc -b` clean without widening every other
// file's types.
declare const process: { env: Record<string, string | undefined> }

const ORIGINAL_TZ = process.env.TZ

describe('formatJournalDate', () => {
  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ
    vi.resetModules()
  })

  // `DATE_FORMATTER` is built once, at module load, from whatever `process.env.TZ` the process
  // sees at that moment -- `vi.resetModules()` plus a fresh `await import()` is what forces a new
  // module instance (and so a fresh formatter) to pick up the TZ set just below, rather than
  // whatever TZ the test runner itself started under.
  //
  // Mutation: drop `timeZone: 'UTC'` from journal.ts's DATE_FORMATTER -> with the system clock
  // west of UTC, `new Date('2026-04-14')` (UTC midnight) formats at its own local midnight, one
  // calendar day earlier, and this assertion fails on '13 Apr 2026' instead.
  it("keeps a post's own calendar day for a reader whose system clock sits west of UTC", async () => {
    process.env.TZ = 'America/Los_Angeles'
    vi.resetModules()
    const { formatJournalDate } = await import('./journal')
    expect(formatJournalDate('2026-04-14')).toBe('14 Apr 2026')
  })
})

describe('journal archive, tag counts and filtering', () => {
  it('groups notes by month, newest first, with counts', async () => {
    const { journalArchive } = await import('./journal')
    expect(journalArchive()).toEqual([
      { key: '2026-06', label: 'June 2026', count: 1 },
      { key: '2026-05', label: 'May 2026', count: 2 },
      { key: '2026-04', label: 'April 2026', count: 1 },
    ])
  })

  it('counts every tag once per note', async () => {
    const { journalTagCounts } = await import('./journal')
    expect(journalTagCounts().find(t => t.tag === 'replicas')?.count).toBe(2)
    expect(journalTagCounts().find(t => t.tag === 'optics')?.count).toBe(1)
  })

  it('combines text, tag and month with AND, every word having to match', async () => {
    const { filterJournalPosts, JOURNAL_POSTS } = await import('./journal')
    expect(filterJournalPosts({})).toHaveLength(JOURNAL_POSTS.length)
    expect(filterJournalPosts({ q: 'OPTICS rail' })).toHaveLength(1)
    expect(filterJournalPosts({ q: 'optics', month: '2026-04' })).toHaveLength(0)
    expect(filterJournalPosts({ tag: 'replicas', month: '2026-06' })).toHaveLength(1)
  })
})
