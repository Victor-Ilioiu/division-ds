import { useEffect } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { linkVariants } from '../../../components/atoms'
import { Alert, Breadcrumbs, CardMedia } from '../../../components/molecules'
import { DEMO_HOME } from '../../routes'
import { routerLink } from '../../routerLink'
import { DEFAULT_PAGE } from '../../DefaultPage'
import { JournalCard, JournalPlaceholder } from './JournalCard'
import { JournalSidebar } from './JournalSidebar'
import { findJournalPost, formatJournalDate, relatedJournalPosts, type JournalBlock } from '../../content/journal'

const HEADING_FOCUS_RING =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

function Block({ block }: { block: JournalBlock }) {
  switch (block.kind) {
    case 'heading':
      return (
        <h2
          id={block.id}
          // Focusable, not merely a scroll target: the "On this page" links below are plain
          // `href="#id"` anchors with no click handler of their own (see that list's own
          // comment), so a real click's own native fragment-navigation is what has to move focus
          // here -- and that only happens for a target the browser considers focusable.
          tabIndex={-1}
          className={`font-display font-semibold text-xl text-[var(--color-text-primary)] ${HEADING_FOCUS_RING}`}
        >
          {block.text}
        </h2>
      )
    case 'paragraph':
      return <p className="font-body text-base text-[var(--color-text-primary)]">{block.text}</p>
    case 'steps':
      return (
        <ol className="flex flex-col gap-2 pl-5 list-decimal font-body text-base text-[var(--color-text-primary)]">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      )
    case 'callout':
      return (
        <Alert tone="info" title={block.title}>
          {block.text}
        </Alert>
      )
    case 'figure':
      return (
        <figure className="flex flex-col gap-2">
          {/* The caption describes the picture, so the image itself is decorative. */}
          <CardMedia src={block.src} aspect="4/3" data-testid="journal-figure">
            <JournalPlaceholder />
          </CardMedia>
          <figcaption className="font-body text-xs text-[var(--color-text-secondary)]">{block.caption}</figcaption>
        </figure>
      )
  }
}

/**
 * One Field note, reached at `/store/journal/:slug`. Sets its own `document.title` (`routes.ts`
 * marks this route `titleFromPage`, the same reason Product.tsx does) because the real title
 * needs the post's own name, which the registry doesn't have -- and, exactly like Product.tsx,
 * the effect is keyed on `post` (not `slug`) so moving from one real article straight to another
 * re-fires it rather than leaving the previous title racing the registry's generic one.
 *
 * An id the catalogue doesn't have renders its own "Note not found" heading and a link back,
 * never the shell's generic 404 -- someone followed a real link to a real note; the index is
 * still one click away.
 */
export function Article() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? findJournalPost(slug) : undefined

  useEffect(() => {
    document.title = post ? `Hexline — ${post.title}` : 'Hexline — note not found'
  }, [post])

  if (!post) {
    return (
      <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-4`}>
        <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Note not found</h1>
        <p className="font-body text-sm text-[var(--color-text-secondary)]">
          <RouterLink to="/store/journal" className={linkVariants()}>
            Back to Field notes
          </RouterLink>
        </p>
      </div>
    )
  }

  const headings = post.body.filter(block => block.kind === 'heading')
  const related = relatedJournalPosts(post, 2)

  return (
    <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-10`}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: DEMO_HOME },
          { label: 'Field notes', href: '/store/journal' },
          { label: post.title },
        ]}
        renderLink={routerLink}
      />

      {/* Main column ~720px (the reading measure) and the sidebar on the right from lg up. Below
          lg the sidebar follows the article and "More field notes": the article is what someone
          came for, and the sidebar is for leaving it. */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,720px)_20rem] xl:justify-between">
        <div className="flex flex-col gap-10 min-w-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display font-semibold text-3xl text-[var(--color-text-primary)]">{post.title}</h1>
              <p className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                <span>Hexline workshop</span>
                <span aria-hidden="true">&middot;</span>
                <time dateTime={post.date}>{formatJournalDate(post.date)}</time>
                <span aria-hidden="true">&middot;</span>
                <span>{post.readingMinutes} min read</span>
              </p>
            </div>

            <CardMedia src={post.image?.src} alt={post.image?.alt} aspect="16/9" data-testid="journal-cover">
              <JournalPlaceholder iconClass="w-16 h-16" />
            </CardMedia>

            {headings.length > 0 ? (
              // Plain anchors, not `routerLink`/`RouterLink`: these are same-document fragment
              // jumps, not route changes, and a client-side router `Link` would still write a new
              // history entry for the identical path plus a hash. A native `<a href="#id">` is also
              // what keeps this working once Lenis is wired in elsewhere -- Lenis syncs off the
              // browser's own scroll event rather than owning a click handler for hash links (see
              // design.md's Lenis section), so the jump has to stay native for it to see it at all.
              <nav aria-label="On this page" className="flex flex-col gap-2">
                <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  On this page
                </p>
                <ol role="list" className="flex flex-col gap-1">
                  {headings.map(heading => (
                    <li key={heading.id}>
                      <a href={`#${heading.id}`} className={linkVariants({ tone: 'quiet' })}>
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}

            <div className="flex flex-col gap-4">
              {post.body.map((block, index) => (
                <Block key={block.kind === 'heading' ? block.id : index} block={block} />
              ))}
            </div>

            <p>
              <RouterLink to="/store/shop?category=parts" className={linkVariants()}>
                Shop parts and accessories
              </RouterLink>
            </p>
          </div>

          {related.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">More field notes</h2>
              <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {related.map(other => (
                  <li key={other.slug}>
                    <JournalCard post={other} headingLevel={3} compact />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <JournalSidebar currentTags={post.tags} />
      </div>
    </div>
  )
}
