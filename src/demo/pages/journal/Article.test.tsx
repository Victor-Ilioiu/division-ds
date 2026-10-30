import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../../test/axe'
import { Article } from './Article'

function renderArticle(slug = 'cleaning-after-a-field-day') {
  return render(
    <MemoryRouter initialEntries={[`/store/journal/${slug}`]}>
      <Routes>
        <Route path="/store/journal/:slug" element={<Article />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Article', () => {
  it('renders the breadcrumb trail, the byline and the reading time', () => {
    renderArticle()
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(trail).toHaveTextContent('Home')
    expect(trail).toHaveTextContent('Field notes')
    expect(screen.getByRole('heading', { level: 1, name: 'Cleaning a replica after a field day' })).toBeInTheDocument()
    expect(screen.getByText('Hexline workshop')).toBeInTheDocument()
    expect(screen.getByText('4 min read')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderArticle()
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: change the body block map's `steps` case to render a `<ul>` instead of an `<ol>`
  // -> `ul` and `ol` are both `role="list"`, so a role-based query would not tell them apart;
  // reading the real tag name via `closest('ol')` is what actually catches this, and it fails
  // once the mutation lands.
  it('renders the steps as an ordered list, and the callout as an Alert', () => {
    renderArticle()
    const firstStep = screen.getByText('Unplug the battery, take the magazine out and check that no BB is left in the feed tube.')
    expect(firstStep.closest('ol')).not.toBeNull()
    expect(screen.getByText('If the day was wet')).toBeInTheDocument()
  })

  // This proves the link and the id line up; e2e/pages.spec.ts proves the other half (a real
  // click actually lands there and moves focus), which jsdom's own navigation cannot reproduce.
  // Mutation: change the nav link's `href={`#${heading.id}`}` to a fixed `href="#missing"` ->
  // `document.getElementById(id)` returns `undefined`, and the tagName assertion below fails.
  it('lists every body heading under "On this page", each pointing at that heading’s own id', () => {
    renderArticle()
    const nav = screen.getByRole('navigation', { name: 'On this page' })
    const links = nav.querySelectorAll('a')
    expect(links).toHaveLength(3)
    for (const link of links) {
      const id = link.getAttribute('href')?.slice(1)
      expect(id).toBeTruthy()
      const target = document.getElementById(id!)
      expect(target?.tagName).toBe('H2')
      expect(target).toHaveTextContent(link.textContent ?? '')
    }
  })

  // Mutation: change the "More field notes" heading's level from 2 to 4 (skipping 3) -> the
  // heading-level walk below finds a jump greater than 1 and fails.
  it('has no skipped heading levels', () => {
    renderArticle()
    const levels = screen.getAllByRole('heading').map(heading => Number(heading.tagName[1]))
    let seenMax = 0
    for (const level of levels) {
      expect(level - seenMax).toBeLessThanOrEqual(1)
      seenMax = Math.max(seenMax, level)
    }
  })

  // A real client-side navigation on the SAME mounted `<Article>`, not two separate `render()`
  // calls -- two fresh mounts would each fire the title effect on mount regardless of its
  // dependency array, proving nothing about the array itself (the mutation below passed against
  // an earlier, mount-only version of this test for exactly that reason).
  // Mutation: change the effect's dependency array from `[post]` to `[]` -> the title from the
  // first article survives the navigation below, and this assertion fails.
  it('updates document.title across a move from one article straight to another', async () => {
    renderArticle('cleaning-after-a-field-day')
    expect(document.title).toBe('Hexline — Cleaning a replica after a field day')
    await userEvent.click(screen.getByRole('link', { name: 'Fitting an optic to a rail' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Fitting an optic to a rail' })).toBeInTheDocument()
    expect(document.title).toBe('Hexline — Fitting an optic to a rail')
  })

  it('shows two other posts under "More field notes", never the current one', () => {
    renderArticle('cleaning-after-a-field-day')
    const heading = screen.getByRole('heading', { level: 2, name: 'More field notes' })
    const list = heading.parentElement?.querySelector('ul')
    expect(list).toBeTruthy()
    const links = list!.querySelectorAll('a')
    expect(links).toHaveLength(2)
    for (const link of links) expect(link.textContent).not.toBe('Cleaning a replica after a field day')
  })

  // A 68ch reading column reads as body copy, not fine print -- `text-sm` (14px) at that measure
  // undersells the actual paragraph text next to everything else on the page. Mutation: revert
  // the paragraph block's className back to `text-sm` -> this assertion fails.
  it('renders the body paragraphs at text-base (16px), not text-sm', () => {
    renderArticle()
    const paragraph = screen.getByText(
      'The barrel cleaning rod from the box, a few cotton patches, silicone oil, a dry cloth, and about ten minutes at a table with the battery unplugged.',
      { exact: false }
    )
    expect(paragraph).toHaveClass('text-base')
    expect(paragraph).not.toHaveClass('text-sm')
  })

  it('links to Shop parts and accessories, filtered to that category', () => {
    renderArticle()
    expect(screen.getByRole('link', { name: 'Shop parts and accessories' })).toHaveAttribute(
      'href',
      '/store/shop?category=parts'
    )
  })

  // Mutation: drop the `if (!post)` branch entirely (render the normal article layout with
  // `post` as `undefined`) -> this crashes instead of rendering the not-found heading, since the
  // body render below reads straight off `post.body`.
  it('renders "Note not found" and a link back for an unknown slug', () => {
    renderArticle('does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: 'Note not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Field notes' })).toHaveAttribute('href', '/store/journal')
    expect(document.title).toBe('Hexline — note not found')
  })

  // Mutation: drop `mx-auto` from DEFAULT_PAGE -> the page hugs the left of the gutter again.
  it('is a default page, with the cover, body and more-notes in a main column beside the sidebar', () => {
    renderArticle()
    const page = screen.getByRole('navigation', { name: 'Breadcrumb' }).parentElement as HTMLElement
    expect(page).toHaveClass('mx-auto', 'max-w-[1200px]')
    const main = screen.getByTestId('journal-cover').closest('.min-w-0') as HTMLElement
    expect(main).toContainElement(screen.getByRole('heading', { level: 2, name: 'More field notes' }))
    expect(main).not.toContainElement(screen.getByRole('complementary', { name: 'Field notes' }))
  })

  it('has a sidebar with search, a month archive and a tag cloud linking to the index', () => {
    renderArticle()
    const side = screen.getByRole('complementary', { name: 'Field notes' })
    expect(within(side).getByRole('searchbox', { name: 'Search field notes' })).toBeInTheDocument()
    expect(within(side).getByRole('link', { name: /^May 2026/ })).toHaveAttribute('href', '/store/journal?month=2026-05')
    expect(within(side).getByRole('link', { name: /^replicas/ })).toHaveAttribute('href', '/store/journal?tag=replicas')
    expect(within(side).getByRole('link', { name: /^optics/ })).toHaveAttribute('href', '/store/journal?tag=optics')
  })

  it("marks this note's own tags in the cloud", () => {
    renderArticle()
    const side = screen.getByRole('complementary', { name: 'Field notes' })
    expect(within(side).getByRole('link', { name: /^maintenance.*on this note/ })).toBeInTheDocument()
    expect(within(side).getByRole('link', { name: /^optics/ })).not.toHaveAccessibleName(/on this note/)
  })

  it('shows the placeholder box for the cover and every figure while no picture exists', () => {
    const { container } = renderArticle()
    expect(screen.getByTestId('journal-cover').querySelector('img')).toBeNull()
    expect(screen.getByTestId('journal-cover').querySelector('svg')).not.toBeNull()
    expect(screen.getAllByTestId('journal-figure').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('renders the same image card under More field notes, each with a cover box', () => {
    renderArticle()
    const more = screen.getByRole('heading', { level: 2, name: 'More field notes' }).parentElement as HTMLElement
    const cards = more.querySelectorAll('article')
    expect(cards).toHaveLength(2)
    cards.forEach(card => expect(card.querySelector('[data-card-media]')).not.toBeNull())
  })
})
