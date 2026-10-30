import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { linkVariants } from '../../../components/atoms'
import { Search, SectionHeading } from '../../../components/molecules'
import { cn } from '../../../lib/cn'
import { journalArchive, journalTagCounts } from '../../content/journal'

const JOURNAL_INDEX = '/store/journal'

/** A tag's weight in the cloud: by how many notes carry it. Three steps, so the cloud reads as a
 *  cloud without a size for every count; sizes are plain Tailwind text sizes, all 14px or more. */
function tagSize(count: number): string {
  if (count >= 3) return 'text-lg font-semibold'
  if (count === 2) return 'text-base font-medium'
  return 'text-sm'
}

/**
 * The Field notes sidebar: search, archive, tag cloud. Every block leads to the index page, which
 * does the filtering (`?q=`, `?month=`, `?tag=`), so a result is a link someone can share or
 * reload and the sidebar holds no result state of its own.
 *
 * `currentTags` are the open article's own tags: they are drawn in the primary text colour and
 * carry a visually hidden "(on this note)", so the cloud also tells you where you are.
 */
export function JournalSidebar({ currentTags = [] }: { currentTags?: string[] }) {
  const navigate = useNavigate()
  const archive = journalArchive()
  const tags = journalTagCounts()

  return (
    <aside aria-label="Field notes" className="flex flex-col gap-10">
      <section aria-labelledby="journal-search-heading" className="flex flex-col gap-4">
        <SectionHeading id="journal-search-heading" level={2} title="Search" />
        <Search
          label="Search field notes"
          placeholder="Search field notes"
          onSearch={query => navigate(`${JOURNAL_INDEX}?q=${encodeURIComponent(query)}`)}
        />
      </section>

      <section aria-labelledby="journal-archive-heading" className="flex flex-col gap-4">
        <SectionHeading id="journal-archive-heading" level={2} title="Archive" />
        <ul role="list" className="flex flex-col gap-2">
          {archive.map(month => (
            <li key={month.key}>
              <RouterLink
                to={`${JOURNAL_INDEX}?month=${month.key}`}
                className={cn(linkVariants({ tone: 'quiet' }), 'font-body text-sm')}
              >
                {month.label}
              </RouterLink>{' '}
              <span className="font-mono text-sm tabular-nums text-[var(--color-text-secondary)]">
                <span className="sr-only">, </span>({month.count}
                <span className="sr-only"> {month.count === 1 ? 'note' : 'notes'}</span>)
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="journal-tags-heading" className="flex flex-col gap-4">
        <SectionHeading id="journal-tags-heading" level={2} title="Tags" />
        <ul role="list" className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {tags.map(({ tag, count }) => {
            const current = currentTags.includes(tag)
            return (
              <li key={tag}>
                <RouterLink
                  to={`${JOURNAL_INDEX}?tag=${encodeURIComponent(tag)}`}
                  className={cn(
                    linkVariants({ tone: 'quiet' }),
                    'font-body',
                    tagSize(count),
                    current && 'text-[var(--color-text-primary)]'
                  )}
                >
                  {tag}
                  <span className="sr-only">
                    , {count} {count === 1 ? 'note' : 'notes'}
                    {current ? ', on this note' : ''}
                  </span>
                </RouterLink>
              </li>
            )
          })}
        </ul>
      </section>
    </aside>
  )
}
