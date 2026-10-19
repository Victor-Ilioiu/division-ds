import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../../test/axe'
import { Journal } from './Journal'

/** Reads the URL the page itself just wrote, the same way Shop.test.tsx reads the cart it wrote.
 *  A plain `div`, not `<output>`: `<output>` carries an implicit `role="status"`, which would
 *  collide with the page's own named "Note count" status region in every `getByRole` query
 *  below. */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="search">{location.search}</div>
}

function renderJournal(path = '/demo/journal') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/demo/journal"
          element={
            <>
              <Journal />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('Journal', () => {
  it('renders the "Field notes" heading and every post as a card', () => {
    renderJournal()
    expect(screen.getByRole('heading', { level: 1, name: 'Field notes' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('status', { name: 'Note count' })).toHaveTextContent(/^4 notes$/)
  })

  it('is axe clean', async () => {
    const { container } = renderJournal()
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: change the tag filter's `.filter(post => post.tags.includes(activeTag))` to ignore
  // `activeTag` and always return every post -> the count below stays "4 notes" after the click,
  // and this assertion fails.
  it('a tag toggle narrows the list and writes ?tag= to the URL', async () => {
    renderJournal()
    await userEvent.click(screen.getByRole('button', { name: 'optics', pressed: false }))
    expect(screen.getByRole('button', { name: 'optics' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status', { name: 'Note count' })).toHaveTextContent(/^1 note$/)
    expect(screen.getByTestId('search')).toHaveTextContent('?tag=optics')
  })

  // Mutation: change the toggle's `if (activeTag === tag) next.delete('tag')` branch to always
  // `next.set('tag', tag)` -> the second click leaves `?tag=optics` in place, and this assertion
  // (expecting it gone) fails.
  it('clicking the active tag again clears the filter', async () => {
    renderJournal('/demo/journal?tag=optics')
    const toggle = screen.getByRole('button', { name: 'optics' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status', { name: 'Note count' })).toHaveTextContent(/^4 notes$/)
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/)
  })

  // Mutation: change `knownTag` to always be `true` -> an unknown tag falls through to the
  // "0 posts, no explanation" list branch instead of this EmptyState, and the heading below is
  // never rendered.
  it('shows an EmptyState for a tag no post carries', () => {
    renderJournal('/demo/journal?tag=does-not-exist')
    expect(screen.getByRole('heading', { level: 2, name: 'No field notes with that tag' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Note count' })).toHaveTextContent(/^0 notes$/)
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('the EmptyState link clears the unknown tag', async () => {
    renderJournal('/demo/journal?tag=does-not-exist')
    await userEvent.click(screen.getByRole('link', { name: 'Clear the filter' }))
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/)
    expect(screen.getAllByRole('article')).toHaveLength(4)
  })

  // Mutation: drop the CardMedia from JournalCard -> a card loses its cover box.
  it('gives every card a cover box at the top, in a default page', () => {
    const { container } = renderJournal()
    screen.getAllByRole('article').forEach(card => {
      expect(card.firstElementChild).toHaveAttribute('data-card-media')
    })
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Field notes' }).closest('.mx-auto')).toHaveClass('max-w-[1200px]')
  })

  // Mutation: drop `md:grid-cols-2` from the list -> one column at every width, and this fails.
  it('lays the cards out as a two-column grid from md up', () => {
    renderJournal()
    expect(screen.getAllByRole('article')[0].closest('ul')).toHaveClass('grid-cols-1', 'md:grid-cols-2')
  })

  // Mutation: make filterJournalPosts ignore `month` -> all four notes remain.
  it('?month= and ?q= narrow the list and say so in the count', () => {
    renderJournal('/demo/journal?month=2026-05')
    expect(screen.getByRole('status', { name: 'Note count' })).toHaveTextContent('2 notes from May 2026')
  })

  it('?q= matches titles, summaries and tags', () => {
    renderJournal('/demo/journal?q=hop-up')
    expect(screen.getByRole('status', { name: 'Note count' })).toHaveTextContent(/^1 note matching/)
  })

  it('shows an empty state, not an empty list, when the filters match nothing', () => {
    renderJournal('/demo/journal?q=zzzz')
    expect(screen.getByRole('heading', { name: 'No field notes match' })).toBeInTheDocument()
  })

  it('submitting the search field writes ?q= to the URL', async () => {
    renderJournal()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search field notes' }), 'rail{Enter}')
    expect(screen.getByTestId('search')).toHaveTextContent('?q=rail')
  })
})
