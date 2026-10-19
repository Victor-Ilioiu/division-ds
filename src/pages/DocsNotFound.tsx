import { Link as RouterLink, useLocation } from 'react-router-dom'
import { linkVariants } from '../components/atoms/link/Link'
import { PageHeader } from '../components/docs/PageChrome'

const LINKS: { to: string; label: string }[] = [
  { to: '/', label: 'Design system overview' },
  { to: '/components/button', label: 'Components: Button' },
  { to: '/demo', label: 'The Hexline demo store' },
]

/**
 * The docs shell's own 404: reached by any path AppShell's routes don't cover, including
 * `/does-not-exist` and a mistyped `/components/*` path. Styled the same as every other docs
 * page (`PageHeader`, the Link atom's own `linkVariants`) rather than a bare heading, so a
 * mistyped URL still reads as part of this system rather than as a generic router fallback.
 *
 * Sets no title of its own: AppShell's title effect (see its own comment) wins the title back on
 * every render it owns, and the route that renders this page passes it the 404 string directly
 * (`title="Division DS — page not found"`) -- the same "the shell that renders owns the title"
 * rule as every other AppShell route, just with a non-default value for this one.
 *
 * No explicit focus handling either: `RouteFocus` in App.tsx already moves focus to `#main` on
 * every client-side navigation, including the one that lands here.
 */
export function DocsNotFound() {
  const { pathname } = useLocation()
  return (
    <div>
      <PageHeader
        eyebrow="Error"
        title="Page not found"
        lede={
          <>
            There's no page at <code className="break-all">{pathname}</code>. Try one of these
            instead.
          </>
        }
      />
      <ul role="list" className="flex flex-col gap-2 mt-8">
        {LINKS.map(link => (
          <li key={link.to}>
            <RouterLink to={link.to} className={linkVariants()}>
              {link.label}
            </RouterLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
