import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Sidebar, type SidebarGroup } from './Sidebar'

const GROUPS: SidebarGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Overview', href: '#overview' },
      { label: 'Orders', href: '#orders', current: true, count: 12 },
      { label: 'Shipments', href: '#shipments' },
    ],
  },
  {
    title: 'Catalogue',
    defaultOpen: false,
    items: [
      { label: 'Products', href: '#products' },
      { label: 'Inventory', href: '#inventory' },
    ],
  },
  {
    title: 'Account',
    collapsible: false,
    items: [{ label: 'Settings', href: '#settings' }],
  },
]

describe('Sidebar', () => {
  it('is a named nav with one list per group, each named by its title', () => {
    render(<Sidebar label="Dashboard" groups={GROUPS} />)
    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).getByRole('list', { name: 'Operations' })).toBeInTheDocument()
    expect(within(nav).getByRole('list', { name: 'Account' })).toBeInTheDocument()
  })

  it('marks the current item, and reads a count as part of the link name', () => {
    render(<Sidebar label="Dashboard" groups={GROUPS} />)
    expect(screen.getByRole('link', { name: 'Orders 12' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })

  it('collapses and expands a group from its title, toggling inert in step with aria-expanded', async () => {
    const { container } = render(<Sidebar label="Dashboard" groups={GROUPS} />)
    const toggle = screen.getByRole('button', { name: 'Catalogue' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Only Catalogue starts collapsed (Operations holds the current item, Account isn't
    // collapsible), so exactly one inert wrapper exists before the click.
    expect(container.querySelectorAll('[inert]')).toHaveLength(1)
    expect(screen.getByRole('list', { name: 'Catalogue' }).closest('[inert]')).not.toBeNull()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelectorAll('[inert]')).toHaveLength(0)
  })

  it('starts a group open when it holds the current page, even if told to start closed', () => {
    const groups: SidebarGroup[] = [
      { title: 'Catalogue', defaultOpen: false, items: [{ label: 'Products', href: '#products', current: true }] },
    ]
    render(<Sidebar label="Dashboard" groups={groups} />)
    expect(screen.getByRole('button', { name: 'Catalogue' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Products' })).toBeVisible()
  })

  it('opens a group when the current page moves into it on a later render', () => {
    const before: SidebarGroup[] = [
      { title: 'Operations', items: [{ label: 'Overview', href: '#overview', current: true }] },
      { title: 'Catalogue', defaultOpen: false, items: [{ label: 'Products', href: '#products' }] },
    ]
    const { rerender } = render(<Sidebar label="Dashboard" groups={before} />)
    const toggle = screen.getByRole('button', { name: 'Catalogue' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    const after: SidebarGroup[] = [
      { title: 'Operations', items: [{ label: 'Overview', href: '#overview' }] },
      { title: 'Catalogue', defaultOpen: false, items: [{ label: 'Products', href: '#products', current: true }] },
    ]
    rerender(<Sidebar label="Dashboard" groups={after} />)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Products' })).toBeVisible()
  })

  it('gives a fixed group a plain title, not a button', () => {
    render(<Sidebar label="Dashboard" groups={GROUPS} />)
    expect(screen.queryByRole('button', { name: 'Account' })).toBeNull()
  })

  it('draws a group icon hidden from assistive tech, so the title alone still names the group', () => {
    const groups: SidebarGroup[] = [
      { ...GROUPS[0], icon: <svg data-testid="ops-icon" /> },
      { ...GROUPS[2], icon: <svg data-testid="account-icon" /> },
    ]
    render(<Sidebar label="Dashboard" groups={groups} />)

    const toggle = screen.getByRole('button', { name: 'Operations' })
    expect(within(toggle).getByTestId('ops-icon').closest('[aria-hidden="true"]')).not.toBeNull()
    // The fixed (non-collapsible) title gets the icon too, not just the disclosure button.
    expect(screen.getByTestId('account-icon').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByRole('list', { name: 'Account' })).toBeInTheDocument()
  })

  it('renders its links through renderLink, and its header and footer', () => {
    render(
      <Sidebar
        label="Dashboard"
        groups={GROUPS}
        header={<p>Hexline ops</p>}
        footer={<p>Signed in as Ana</p>}
        renderLink={props => <a {...props} data-router="true" />}
      />
    )
    for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('data-router', 'true')
    expect(screen.getByText('Hexline ops')).toBeInTheDocument()
    expect(screen.getByText('Signed in as Ana')).toBeInTheDocument()
  })

  it('forwards a ref to the nav', () => {
    const ref = createRef<HTMLElement>()
    render(<Sidebar ref={ref} label="Dashboard" groups={GROUPS} />)
    expect(ref.current).toBe(screen.getByRole('navigation', { name: 'Dashboard' }))
  })

  it('is axe clean with a group collapsed', async () => {
    const { container } = render(<Sidebar label="Dashboard" groups={GROUPS} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it("staggers each item's reveal delay by index on open, capped at 5, and drops it uniformly on close", async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ label: `Item ${i}`, href: `#item-${i}` }))
    const groups: SidebarGroup[] = [{ title: 'Long group', defaultOpen: false, items }]
    render(<Sidebar label="Dashboard" groups={groups} />)
    const toggle = screen.getByRole('button', { name: 'Long group' })
    const delay = (label: string) => screen.getByRole('link', { name: label }).closest('li')!.style.transitionDelay

    // Collapsed: every item already sits at the uniform 0ms a close produces.
    expect(delay('Item 0')).toBe('0ms')
    expect(delay('Item 9')).toBe('0ms')

    await userEvent.click(toggle)
    expect(delay('Item 0')).toBe('0ms')
    expect(delay('Item 1')).toBe('40ms')
    expect(delay('Item 4')).toBe('160ms')
    expect(delay('Item 6')).toBe('200ms') // capped: uncapped would be 6 * 40ms = 240ms
    expect(delay('Item 9')).toBe('200ms') // still capped, same plateau as Item 6

    await userEvent.click(toggle)
    expect(delay('Item 9')).toBe('0ms') // closing is uniform, not staggered
  })

  it('gates the new height and per-item transitions behind motion-reduce:transition-none, like the chevron', () => {
    const { container } = render(<Sidebar label="Dashboard" groups={GROUPS} />)
    const list = screen.getByRole('list', { name: 'Operations' })
    const gridWrapper = list.parentElement?.parentElement
    expect(gridWrapper).not.toBeNull()
    expect(gridWrapper!.className).toContain('motion-reduce:transition-none')
    const item = container.querySelector('li')
    expect(item).not.toBeNull()
    expect(item!.className).toContain('motion-reduce:transition-none')
  })

  it("transitions the CSS translate property for the item slide, not transform (Tailwind's translate-y-* sets translate)", () => {
    const { container } = render(<Sidebar label="Dashboard" groups={GROUPS} />)
    const item = container.querySelector('li')
    expect(item).not.toBeNull()
    expect(item!.className).toContain('transition-[opacity,translate]')
    expect(item!.className).not.toContain('transition-[opacity,transform]')
  })

  it('clips the collapsing row with overflow-clip, not overflow-hidden, so it cannot be scrolled into while growing', () => {
    render(<Sidebar label="Dashboard" groups={GROUPS} />)
    const list = screen.getByRole('list', { name: 'Operations' })
    const clipDiv = list.parentElement
    expect(clipDiv).not.toBeNull()
    expect(clipDiv!.className).toContain('overflow-clip')
    expect(clipDiv!.className).not.toContain('overflow-hidden')
  })

  it("gives the wrapper's own height transition --duration-base while expanded and --duration-fast while collapsed, so a close finishes on the same frame as the items' own fade", () => {
    render(<Sidebar label="Dashboard" groups={GROUPS} />)
    // Operations starts open (holds the current item); Catalogue starts closed (defaultOpen: false).
    const openWrapper = screen.getByRole('list', { name: 'Operations' }).parentElement?.parentElement
    const closedWrapper = screen.getByRole('list', { name: 'Catalogue' }).parentElement?.parentElement
    expect(openWrapper).not.toBeNull()
    expect(closedWrapper).not.toBeNull()
    expect(openWrapper!.className).toContain('[transition-duration:var(--duration-base)]')
    expect(openWrapper!.className).not.toContain('[transition-duration:var(--duration-fast)]')
    expect(closedWrapper!.className).toContain('[transition-duration:var(--duration-fast)]')
    expect(closedWrapper!.className).not.toContain('[transition-duration:var(--duration-base)]')
  })
})
