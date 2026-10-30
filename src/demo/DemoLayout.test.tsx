import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, matchPath } from 'react-router-dom'
import { afterEach, describe, it, expect } from 'vitest'
import { axeClean } from '../test/axe'
import { NAV } from '../components/shell/Sidebar'
import { DISCLAIMER, NEWSLETTER } from './content'
import { JOURNAL_POSTS } from './content/journal'
import { DemoLayout, FOOTER_COLUMNS, FOOTER_GUIDES } from './DemoLayout'
import { parseFilters } from './filters'
import { DEMO_PAGES } from './routes'
import { setLatency } from './store/api'
import { CATEGORIES } from './store/catalog'

afterEach(() => {
  sessionStorage.clear()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<DemoLayout />}>
          {/* The splat also matches the bare `/store` -- one route stub covers the exact path and
              every path under it. */}
          <Route path="/store/*" element={<h1>Home</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DemoLayout', () => {
  it('has one banner, one main, one contentinfo and a skip link to #main', async () => {
    renderAt('/store')
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  })
  it('marks the current page in the Hexline navigation', async () => {
    renderAt('/store')
    const nav = await screen.findByRole('navigation', { name: 'Hexline' })
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Home')
  })
  // `/store/home/*` held the hero-variant routes until 2026-10-02. Nothing is registered there now,
  // and Home has no descendants at all (see `isDescendantOf`).
  it('does not mark Home current on an unregistered /store/home/* path', async () => {
    renderAt('/store/home/parallax')
    const nav = await screen.findByRole('navigation', { name: 'Hexline' })
    expect(nav.querySelector('[aria-current="page"]')).toBeNull()
  })
  it('is axe clean', async () => {
    const { container } = renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    expect(await axeClean(container)).toHaveNoViolations()
  })
  it('lists Shop in the Hexline navigation and marks it current on /store/shop', async () => {
    renderAt('/store/shop')
    const nav = await screen.findByRole('navigation', { name: 'Hexline' })
    expect(within(nav).getAllByRole('link', { name: 'Shop' })[0]).toHaveAttribute('href', '/store/shop')
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Shop')
  })
  // The footer's groups come from the catalogue and from a short list of guides held equal to
  // the real one, and every link in them has to be a page that exists. jsdom shows both forms of a group title and
  // every list (no container query runs here), so every link is in the tree at once.
  // Mutation: drop the `...CATEGORIES.map(...)` line from FOOTER_COLUMNS -> the Shop list has one
  // link and the first block fails.
  it('lists the shop`s five categories as filtered shop links, and the four field guides', async () => {
    renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    const footer = screen.getByRole('contentinfo')
    const shop = within(footer).getByRole('list', { name: 'Shop' })
    expect(within(shop).getAllByRole('link').map(link => [link.textContent, link.getAttribute('href')])).toEqual([
      ['All products', '/store/shop'],
      ...CATEGORIES.map(category => [category.label, `/store/shop?category=${category.id}`]),
    ])
    expect(CATEGORIES).toHaveLength(5)
    // The parameter is the shop's own: each link parses to exactly its category.
    for (const category of CATEGORIES) {
      expect(parseFilters(new URLSearchParams(`category=${category.id}`)).categories).toEqual([category.id])
    }
    const guides = within(footer).getByRole('list', { name: 'Guides' })
    expect(within(guides).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      '/store/journal',
      ...JOURNAL_POSTS.map(post => `/store/journal/${post.slug}`),
    ])
    expect(JOURNAL_POSTS).toHaveLength(4)
    // The footer's own short list of guides is the real list: same guides, same order, same titles.
    expect(FOOTER_GUIDES).toEqual(JOURNAL_POSTS.map(post => ({ slug: post.slug, title: post.title })))
    expect(within(footer).getByRole('link', { name: 'Care' })).toHaveAttribute('href', '/store/care')
  })
  // The name, once. The footer's wordmark is the brand: one image named "Hexline", no small
  // brand link beside it (the Navbar's is the link home), and the name nowhere else in the
  // footer, so it is announced once however large it is drawn.
  // Mutation: pass `brand={<Brand />}` to the Footer again in DemoLayout.tsx -> the link assertion
  // fails.
  it('states the name once in the footer: the wordmark, an image, and no second brand', async () => {
    renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getAllByRole('img')).toHaveLength(1)
    expect(within(footer).getByRole('img', { name: 'Hexline' })).toBe(footer.lastElementChild?.lastElementChild)
    expect(within(footer).queryByRole('link', { name: 'Hexline' })).toBeNull()
    expect(within(footer).queryByText('Hexline')).toBeNull()
    // The link home is the Navbar's brand.
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Hexline' })).toHaveAttribute('href', '/store')
  })
  describe('the newsletter sign-up in the footer', () => {
    const footer = () => screen.getByRole('contentinfo')
    const field = () => within(footer()).getByRole('textbox', { name: NEWSLETTER.field })
    const submit = () => within(footer()).getByRole('button', { name: new RegExp(NEWSLETTER.submit) })

    it('is the footer`s second section: a heading, the description, and a named form with the consent line', async () => {
      const { container } = renderAt('/store/care')
      await screen.findByRole('heading', { level: 1 })
      const aside = container.querySelector<HTMLElement>('footer [data-footer-aside]')!
      expect(within(aside).getByRole('heading', { level: 2, name: NEWSLETTER.title })).toBeInTheDocument()
      expect(within(aside).getByText(NEWSLETTER.description)).toBeInTheDocument()
      const form = within(aside).getByRole('form', { name: NEWSLETTER.label })
      expect(within(form).getByText(NEWSLETTER.consent)).toBeInTheDocument()
      expect(submit()).toHaveAccessibleDescription(NEWSLETTER.consent)
      // The field says what the address is for: on sign-in, create-account, reset and checkout
      // the page has an "Email" field of its own, and two fields of one name cannot be told apart.
      expect(NEWSLETTER.field).not.toBe('Email')
      expect(within(footer()).queryByRole('textbox', { name: 'Email' })).toBeNull()
      // One form on the page, on a page that has no other.
      expect(screen.getAllByRole('form', { name: NEWSLETTER.label })).toHaveLength(1)
    })

    // Through the demo API, never a stub. Mutation: pass `onSubmit={() => {}}` in DemoLayout.tsx
    // -> the offline address succeeds, and the test after this one fails.
    it('subscribes an address through the demo API and shows the success message', async () => {
      setLatency(0)
      renderAt('/store')
      await screen.findByRole('heading', { level: 1 })
      await userEvent.type(field(), 'rae@hexline.test')
      await userEvent.click(submit())
      const heading = await within(footer()).findByRole('heading', { level: 3, name: NEWSLETTER.successTitle })
      await waitFor(() => expect(heading).toHaveFocus())
      expect(within(footer()).getByText('Updates go to rae@hexline.test.')).toBeInTheDocument()
      expect(screen.queryByRole('form', { name: NEWSLETTER.label })).not.toBeInTheDocument()
    })

    it('shows the alert and keeps the address when the demo API rejects', async () => {
      setLatency(0)
      renderAt('/store')
      await screen.findByRole('heading', { level: 1 })
      await userEvent.type(field(), 'offline@hexline.test')
      await userEvent.click(submit())
      await waitFor(() =>
        expect(within(screen.getByRole('form', { name: NEWSLETTER.label })).getByRole('alert')).toHaveTextContent(
          'Something went wrong. Please try again.'
        )
      )
      expect(field()).toHaveValue('offline@hexline.test')
    })
  })
  // The line the footer's small print used to carry ("A concept store ... Nothing here is for
  // sale.") is the homepage's fourth house rule now, and is not repeated here.
  it('carries no concept-store line in the footer', async () => {
    renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    expect(within(screen.getByRole('contentinfo')).queryByText(/Nothing here is for sale/)).toBeNull()
  })
  // No dead links: every footer link is a route this app registers. A demo link has to match a
  // DEMO_PAGES path; a docs link has to be a page in the docs sidebar's own list.
  // Mutation: add `{ label: 'Returns', href: '/store/returns' }` to a group -> this fails, naming it.
  it('links only to pages that exist', () => {
    const docs = new Set(NAV.flatMap(group => group.items.map(item => item.to)))
    const links = FOOTER_COLUMNS.flatMap(column => column.links)
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      const path = link.href.split('?')[0]
      const known = path.startsWith('/store')
        ? DEMO_PAGES.some(page => matchPath({ path: page.path, end: true }, path))
        : docs.has(path)
      expect(known, `${link.label} -> ${link.href}`).toBe(true)
    }
    // A footer is not a second navbar: six groups at most, the number its grid is drawn for.
    expect(FOOTER_COLUMNS.length).toBeLessThanOrEqual(6)
  })
  // jsdom has no WebGL2, which is exactly the case the rule is about: no backdrop is passed, and
  // the Footer closes on its wordmark alone. The other half, with WebGL2, is
  // DemoLayout.terrain.test.tsx.
  it('passes the footer no backdrop where there is no WebGL2, and it still ends on the wordmark', async () => {
    const { container } = renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('[data-footer-backdrop]')).toBeNull()
    expect(container.querySelector('footer canvas')).toBeNull()
    expect(container.querySelector('footer [data-footer-closing] [data-footer-wordmark]')).not.toBeNull()
  })
  // The Footer is on every demo page, so this is the one place the disclaimer reaches the pages
  // that show no product of their own. It comes from the `DISCLAIMER` constant, as the Footer's
  // small print. Mutation: change `legal={DISCLAIMER}` in DemoLayout.tsx to any other string ->
  // this fails.
  it('states the disclaimer in the footer', async () => {
    renderAt('/store/sign-in')
    await screen.findByRole('heading', { level: 1 })
    expect(within(screen.getByRole('contentinfo')).getByText(DISCLAIMER)).toBeInTheDocument()
  })
  it('offers a Sign in link to /store/sign-in when no one is signed in, in a compact and a full form', async () => {
    renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    const links = screen.getAllByRole('link', { name: 'Sign in' })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute('href', '/store/sign-in')
  })
  // jsdom never computes a Tailwind breakpoint, so this pins the actual classes that decide
  // which control the accessibility tree carries at a given width, rather than the widths
  // themselves (e2e/demo.spec.ts proves those against a real, laid-out browser). The responsive
  // class lives on a plain span OUTSIDE each control's own `.bevel-focus-wrap` -- that class sets
  // its own `display` outside Tailwind's layers and would outrank a breakpoint utility landing on
  // it directly (the same reasoning as Navbar's own `@2xl:hidden` mobile-menu wrapper).
  it('switches the compact and full Sign in controls with opposite width classes on their own wrapping span', async () => {
    renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    const [compact, full] = screen.getAllByRole('link', { name: 'Sign in' })
    expect(compact.closest('.bevel-focus-wrap')?.parentElement).toHaveClass('sm:hidden')
    expect(full.closest('.bevel-focus-wrap')?.parentElement).toHaveClass('hidden', 'sm:inline-flex')
  })
  it('carries a cart button, named by its (empty) item count, in the Navbar actions', async () => {
    renderAt('/store')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('button', { name: 'Cart, 0 items' })).toBeInTheDocument()
  })

  describe('route error boundary', () => {
    /** Throws during render, guarded by state set from a real click -- the shape a render-phase
     *  boundary actually needs to catch (see DemoErrorBoundary.test.tsx's own Boom). */
    function Crashable() {
      const [crashed, setCrashed] = useState(false)
      if (crashed) throw new Error('boom')
      return (
        <>
          <h1>Crashable</h1>
          <button onClick={() => setCrashed(true)}>Crash</button>
        </>
      )
    }

    function renderCrashable() {
      return render(
        <MemoryRouter initialEntries={['/store/shop']}>
          <Routes>
            <Route element={<DemoLayout />}>
              <Route path="/store" element={<h1>Home</h1>} />
              <Route path="/store/shop" element={<Crashable />} />
            </Route>
          </Routes>
        </MemoryRouter>,
        // Replaces React's own default onCaughtError (console.error) for this test only --
        // main.tsx carries the real app's equivalent. Nothing here is asserting on that call.
        { onCaughtError: () => {} }
      )
    }

    // Mutation: in DemoLayout.tsx, wrap the Suspense/Outlet directly in `<main>` again, dropping
    // DemoErrorBoundary -> Crashable's throw is never caught by anything inside this render tree,
    // and this test fails with the uncaught error instead of finding the fallback heading.
    it('shows the route error page when a child throws, and keeps the Navbar and Footer', async () => {
      renderCrashable()
      await screen.findByRole('heading', { level: 1, name: 'Crashable' })
      await userEvent.click(screen.getByRole('button', { name: 'Crash' }))
      expect(await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })).toHaveFocus()
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    // Mutation: drop `key={resetCount}` from DemoErrorBoundary in DemoLayout.tsx (a hardcoded
    // key, say) -> "Try again" bumps `resetCount` as always, but the boundary is never actually
    // remounted, its own caught `state.error` is never cleared (nothing here clears it any other
    // way -- see DemoErrorBoundary's own `componentDidUpdate`, which only watches `resetKey`, i.e.
    // `path`, not `resetCount`), and the heading below stays "Something went wrong" instead.
    it('recovers when "Try again" is clicked, remounting the crashed page fresh and refocusing #main', async () => {
      renderCrashable()
      await screen.findByRole('heading', { level: 1, name: 'Crashable' })
      await userEvent.click(screen.getByRole('button', { name: 'Crash' }))
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByRole('heading', { level: 1, name: 'Crashable' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument()
      // "Try again" removes itself along with the rest of the crashed fallback -- without
      // DemoLayout's own resetCount-keyed focus effect, focus would drop to <body> here instead.
      expect(screen.getByRole('main')).toHaveFocus()
    })

    // Mutation: drop the `resetKey={path}` prop from DemoErrorBoundary in DemoLayout.tsx -> the
    // boundary's own `componentDidUpdate` never sees `resetKey` change on a navigation (it stays
    // whatever it was passed, permanently undefined), `state.error` is never cleared, and the
    // fallback from the /store/shop crash keeps rendering in place of the unrelated Home route.
    it('clears the error by navigating to a different route', async () => {
      renderCrashable()
      await screen.findByRole('heading', { level: 1, name: 'Crashable' })
      await userEvent.click(screen.getByRole('button', { name: 'Crash' }))
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
      await userEvent.click(screen.getByRole('link', { name: 'Go to the store home' }))
      expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument()
    })
  })
})
