import { useMemo } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Button, linkVariants } from '../../../components/atoms'
import { Search } from '../../../components/molecules'
import { DEFAULT_PAGE } from '../../DefaultPage'
import { JournalCard } from './JournalCard'
import { EmptyState } from '../../states/EmptyState'
import { allJournalTags, filterJournalPosts, formatJournalMonth } from '../../content/journal'

function notesLabel(n: number): string {
  return `${n} ${n === 1 ? 'note' : 'notes'}`
}

/**
 * The Field notes index: every field guide, filterable by one tag at a time through `?tag=` in
 * the URL -- the same reason the shop listing's own filters live there (see filters.ts's own
 * comment): a filtered list is a link someone can share, reload or back out of without losing.
 *
 * `?q=` (free text over title, summary and tags) and `?month=YYYY-MM` (the archive) filter the same
 * list and combine with `?tag=`; the article page's sidebar links here with each of them.
 *
 * Only a single tag can be active, unlike the shop's multi-select category checkboxes -- a row
 * of toggle buttons rather than checkboxes, so `aria-pressed` (not `aria-checked`) is the right
 * state to carry. Clicking the already-active tag clears it, back to every note; clicking a
 * different one replaces it, it never adds to a multi-select set.
 *
 * `?tag=` naming something no post actually carries (a stale link, a hand-edited URL) renders an
 * `EmptyState` rather than an empty list with no explanation -- the same distinction Shop draws
 * between "filters narrowed this to zero" and an outright unknown value, except Shop has no
 * unknown-value case of its own to draw it against (an unknown category there is silently
 * dropped, never surfaced) because its filters are additive checkboxes with no single value that
 * can be "wrong". A single required tag can be.
 */
export function Journal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')
  const query = searchParams.get('q')?.trim() || null
  const month = searchParams.get('month')
  const tags = useMemo(() => allJournalTags(), [])
  const knownTag = activeTag === null || tags.includes(activeTag)
  const posts = knownTag ? filterJournalPosts({ q: query, tag: activeTag, month }) : []

  function setQuery(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    setSearchParams(next)
  }

  function toggleTag(tag: string) {
    const next = new URLSearchParams(searchParams)
    if (activeTag === tag) next.delete('tag')
    else next.set('tag', tag)
    setSearchParams(next)
  }

  return (
    <div className={`${DEFAULT_PAGE} py-12`}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="font-display font-semibold text-3xl text-[var(--color-text-primary)]">Field notes</h1>
          <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-[68ch]">
            Field guides from the Hexline workshop: what to check, how to set it up, and when to send it in
            instead.
          </p>
        </div>

        {/* Keyed on the query so a back/forward or a "clear" from the URL resets the field. */}
        <Search
          key={query ?? ''}
          label="Search field notes"
          placeholder="Search field notes"
          defaultValue={query ?? ''}
          onSearch={setQuery}
          onValueChange={value => {
            if (value === '' && query) setQuery('')
          }}
          className="max-w-md"
        />

        <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Button
              key={tag}
              type="button"
              variant={activeTag === tag ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={activeTag === tag}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>

        {/* Persistent for the same reason ProductGrid's own status is: a role="status" that only
            ever mounts once a filter has already emptied the list is not reliably announced. It
            stays mounted through every tag change, known or unknown, and simply narrates a
            different count (0 for an unknown tag, same as a known one matching nothing). */}
        {/* `aria-label`, not left nameless: an `<output>`/other unnamed status elsewhere on the
            page (or, in a test, the router's own probe) would otherwise be indistinguishable from
            this one to a query -- the same reasoning Shop's own "Result count" status carries. */}
        <p role="status" aria-label="Note count" className="font-body text-sm text-[var(--color-text-secondary)]">
          {notesLabel(posts.length)}
          {query ? ` matching “${query}”` : ''}
          {month ? ` from ${formatJournalMonth(month)}` : ''}
        </p>

        {!knownTag ? (
          <EmptyState title="No field notes with that tag">
            Nothing here is tagged &ldquo;{activeTag}&rdquo;.{' '}
            <RouterLink to="/demo/journal" className={linkVariants({ tone: 'quiet' })}>
              Clear the filter
            </RouterLink>{' '}
            to see every note.
          </EmptyState>
        ) : posts.length === 0 ? (
          <EmptyState title="No field notes match">
            Nothing matches those filters.{' '}
            <RouterLink to="/demo/journal" className={linkVariants({ tone: 'quiet' })}>
              Clear the filters
            </RouterLink>{' '}
            to see every note.
          </EmptyState>
        ) : (
          <ul role="list" className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {posts.map(post => (
              <li key={post.slug}>
                <JournalCard post={post} headingLevel={2} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
