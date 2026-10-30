import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { axeClean } from '../test/axe'
import { NAV } from '../components/shell/Sidebar'
import { Components, OVERVIEW_COUNTS } from './Components'

/**
 * The components index prints the tier counts, one of them at hero size, and PRODUCT.md's second
 * principle is "evidence over assertion: every count is counted from the repository". So each
 * figure is recomputed here from the folders it claims to describe, and the index is checked to
 * list every component the sidebar lists.
 */
function Where() {
  const { search } = useLocation()
  return <output data-testid="search">{search}</output>
}

function renderPage(url = '/components') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/components"
          element={
            <>
              <Components />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

const tierItems = (title: string) => NAV.find(group => group.title === title)!.items

describe('every number the components index prints', () => {
  it('counts the atoms from the atom folders', () => {
    const folders = new Set(
      Object.keys(import.meta.glob('../components/atoms/*/*.tsx')).map(path => path.split('/')[3])
    )
    expect(OVERVIEW_COUNTS.atoms).toBe(folders.size)
    expect(tierItems('Atoms')).toHaveLength(folders.size)
  })

  it('counts the molecules from the molecule folders', () => {
    const folders = new Set(
      Object.keys(import.meta.glob('../components/molecules/*/*.tsx')).map(path => path.split('/')[3])
    )
    expect(OVERVIEW_COUNTS.molecules).toBe(folders.size)
    expect(tierItems('Molecules')).toHaveLength(folders.size)
  })

  it('counts the organisms from the organism folders', () => {
    const folders = new Set(
      Object.keys(import.meta.glob('../components/organisms/*/*.tsx')).map(path => path.split('/')[3])
    )
    expect(OVERVIEW_COUNTS.organisms).toBe(folders.size)
    expect(tierItems('Organisms')).toHaveLength(folders.size)
  })

  it('counts the themes from the semantic token files', () => {
    const themes = Object.keys(import.meta.glob('../../tokens/semantic/color.*.json'))
    expect(OVERVIEW_COUNTS.themes).toBe(themes.length)
  })
})

describe('the components index', () => {
  it('renders the hero count as a numeral whose dimmed pad is hidden from assistive tech', () => {
    const { container } = renderPage()
    const numerals = [...container.querySelectorAll('[data-numeral]')]
    expect(numerals).toHaveLength(1)
    const pad = numerals[0].querySelector('[aria-hidden="true"]')
    expect(pad?.textContent ?? '0', 'the pad is zeros only').toMatch(/^0*$/)
  })

  const listed = () => within(screen.getByRole('list', { name: 'Components' })).getAllByRole('link')
  const sorted = (items: { label: string; to: string }[]) => [...items].sort((x, y) => x.label.localeCompare(y.label))

  it('lists every component as one alphabetical list of links', () => {
    renderPage()
    const all = sorted(['Atoms', 'Molecules', 'Organisms'].flatMap(tierItems))
    expect(listed().map(a => a.getAttribute('href'))).toEqual(all.map(item => item.to))
    expect(listed().map(a => a.textContent)).toEqual(all.map(item => item.label))
    expect(screen.getByRole('link', { name: 'Panel' })).toHaveAttribute('href', '/components/panel')
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('reads the level from the address and writes it back', async () => {
    renderPage('/components?level=molecules')
    expect(listed().map(a => a.getAttribute('href'))).toEqual(sorted(tierItems('Molecules')).map(item => item.to))
    expect(screen.getByText(/^Showing/)).toHaveTextContent(`Showing ${OVERVIEW_COUNTS.molecules} of`)
    await userEvent.click(screen.getByRole('radio', { name: /^Organisms/ }))
    expect(screen.getByTestId('search')).toHaveTextContent('?level=organisms')
    expect(listed()).toHaveLength(OVERVIEW_COUNTS.organisms)
    await userEvent.click(screen.getByRole('radio', { name: /^All/ }))
    expect(screen.getByTestId('search')).toHaveTextContent('')
    expect(listed()).toHaveLength(OVERVIEW_COUNTS.atoms + OVERVIEW_COUNTS.molecules + OVERVIEW_COUNTS.organisms)
  })

  it('is axe clean', async () => {
    const { container } = renderPage()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
