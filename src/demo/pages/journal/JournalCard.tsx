import { Link as RouterLink } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { linkVariants, Tag } from '../../../components/atoms'
import { Card, CardBody, CardMedia, CardTitle } from '../../../components/molecules'
import { cn } from '../../../lib/cn'
import { formatJournalDate, type JournalPost } from '../../content/journal'

/** The stretched link an interactive card needs (the shape ProductCard uses): the title's link
 *  covers the whole card and draws the focus ring around it. */
const STRETCHED =
  "outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]"

/** The sunken box with the book icon: what a cover or figure shows until its picture exists. */
export function JournalPlaceholder({ iconClass = 'w-10 h-10' }: { iconClass?: string }) {
  return <BookOpen aria-hidden="true" className={cn(iconClass, 'text-[var(--color-text-muted)]')} />
}

/** An image card for one note: the cover first, edge to edge, then title, date, summary, tags.
 *  The whole card is the link, so it is `interactive`. */
export function JournalCard({
  post,
  headingLevel,
  compact = false,
}: {
  post: JournalPost
  headingLevel: 2 | 3
  /** Smaller title and no tags: the "More field notes" row. */
  compact?: boolean
}) {
  return (
    <Card as="article" interactive className="h-full">
      <CardMedia src={post.image?.src} alt={post.image?.alt} aspect="16/9">
        <JournalPlaceholder />
      </CardMedia>
      <CardBody className="flex flex-col gap-3">
        <CardTitle level={headingLevel} className={compact ? 'text-base' : 'text-lg'}>
          <RouterLink
            to={`/store/journal/${post.slug}`}
            className={cn(linkVariants({ tone: 'quiet' }), STRETCHED, 'rounded-none')}
          >
            {post.title}
          </RouterLink>
        </CardTitle>
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
          <time dateTime={post.date}>{formatJournalDate(post.date)}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{post.readingMinutes} min read</span>
        </p>
        <p className="font-body text-sm text-[var(--color-text-secondary)]">{post.summary}</p>
        {compact ? null : (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
