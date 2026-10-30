import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axeClean } from '../../test/axe'
import { NAV, Sidebar } from './Sidebar'

function renderSidebar(initialPath = '/components/button') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('shell Sidebar', () => {
  it('renders exactly one nav landmark, named "Documentation", not two nested', () => {
    renderSidebar()
    const navs = screen.getAllByRole('navigation', { name: 'Documentation' })
    expect(navs).toHaveLength(1)
  })

  it("marks the page at the current route as current, and no other", () => {
    renderSidebar('/components/button')
    expect(screen.getByRole('link', { name: 'Button' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Checkbox' })).not.toHaveAttribute('aria-current')
    // Guards against a prefix match (e.g. `startsWith`) standing in for the exact-match compare:
    // '/' is a prefix of every pathname, so Overview would wrongly read as current on every page
    // under such a change, and this is the assertion that would catch it.
    expect(screen.getByRole('link', { name: 'All components' })).not.toHaveAttribute('aria-current')
  })

  it('still marks the current route when its URL carries a trailing slash', () => {
    renderSidebar('/components/button/')
    expect(screen.getByRole('link', { name: 'Button' })).toHaveAttribute('aria-current', 'page')
  })

  it("marks '/components' current for the All components link (the homepage '/' is not a docs page)", () => {
    renderSidebar('/components')
    expect(screen.getByRole('link', { name: 'All components' })).toHaveAttribute('aria-current', 'page')
  })

  it('every NAV group title is a real, focusable disclosure button', () => {
    renderSidebar()
    for (const group of NAV) {
      expect(screen.getByRole('button', { name: group.title })).toHaveAttribute('aria-expanded')
    }
  })

  it('starts with only Guidelines open when the current page is a guideline', () => {
    renderSidebar('/guidelines/color')
    for (const group of NAV) {
      expect(screen.getByRole('button', { name: group.title })).toHaveAttribute(
        'aria-expanded',
        group.title === 'Guidelines' ? 'true' : 'false'
      )
    }
  })

  it('also opens the group holding the current page, so the page you are on is never hidden', () => {
    renderSidebar('/components/button')
    expect(screen.getByRole('button', { name: 'Guidelines' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Atoms' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Molecules' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('gives every NAV group an icon', () => {
    for (const group of NAV) expect(group.icon).toBeTruthy()
  })

  it("collapsing one group's title hides only that group's items, leaving others open", async () => {
    renderSidebar()
    const user = userEvent.setup()

    const atomsToggle = screen.getByRole('button', { name: 'Atoms' })
    expect(screen.getByRole('list', { name: 'Atoms' })).toBeVisible()
    expect(screen.getByRole('list', { name: 'Guidelines' })).toBeVisible()

    await user.click(atomsToggle)

    expect(atomsToggle).toHaveAttribute('aria-expanded', 'false')
    // Collapsed: the list sits in an inert wrapper, the same way the organism's own tests
    // prove a collapsed group is inert (the wrapper animates closed rather than snapping to
    // display:none, so toBeVisible() no longer distinguishes open from collapsed here).
    // jsdom's role queries don't honor `inert` the way a real browser's tab order and
    // accessibility tree do, so unreachability is proven the same way the organism's own
    // suite proves it: by the presence of the `[inert]` attribute itself, not by a role query.
    expect(screen.getByRole('list', { name: 'Atoms' }).closest('[inert]')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Button' }).closest('[inert]')).not.toBeNull()
    // Untouched: the other group stays exactly as open as it started.
    expect(screen.getByRole('list', { name: 'Guidelines' })).toBeVisible()
  })

  it('is axe clean in the default state and with a group collapsed', async () => {
    const { container } = renderSidebar()
    expect(await axeClean(container)).toHaveNoViolations()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Atoms' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
