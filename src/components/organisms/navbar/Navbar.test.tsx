import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Search as SearchIcon } from 'lucide-react'
import { axeClean } from '../../../test/axe'
import { IconButton } from '../../atoms'
import { Navbar, type NavbarProps } from './Navbar'

const ITEMS = [
  { label: 'Replicas', href: '#replicas' },
  { label: 'Optics', href: '#optics', current: true },
  { label: 'Parts', href: '#parts' },
]

function Store(props: Partial<NavbarProps>) {
  return (
    <Navbar
      label="Store"
      brand={<a href="#home">Hexline</a>}
      items={ITEMS}
      actions={
        <IconButton label="Search" variant="ghost">
          <SearchIcon aria-hidden="true" className="w-5 h-5" />
        </IconButton>
      }
      {...props}
    />
  )
}

describe('Navbar', () => {
  it('is a named navigation landmark with one link per item', () => {
    render(<Store />)
    const nav = screen.getByRole('navigation', { name: 'Store' })
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual(['Replicas', 'Optics', 'Parts'])
  })

  it('marks only the current item', () => {
    render(<Store />)
    const nav = screen.getByRole('navigation', { name: 'Store' })
    expect(within(nav).getByRole('link', { name: 'Optics' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Replicas' })).not.toHaveAttribute('aria-current')
  })

  it('renders the brand and the actions', () => {
    render(<Store />)
    expect(screen.getByRole('link', { name: 'Hexline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('renders its links through renderLink', () => {
    render(<Store renderLink={props => <a {...props} data-router="true" />} />)
    const nav = screen.getByRole('navigation', { name: 'Store' })
    for (const link of within(nav).getAllByRole('link')) expect(link).toHaveAttribute('data-router', 'true')
  })

  it('opens the same links in a menu sheet; choosing one closes it and returns focus', async () => {
    render(<Store />)
    const menu = screen.getByRole('button', { name: 'Menu' })
    await userEvent.click(menu)
    const sheet = await screen.findByRole('dialog', { name: 'Menu' })
    expect(within(sheet).getByRole('link', { name: 'Optics' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(within(sheet).getByRole('link', { name: 'Parts' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(menu).toHaveFocus()
  })

  it('opens a menu item as a dropdown of links, in place among the links', async () => {
    const items = [...ITEMS, { label: 'Guides', menu: [{ label: 'Sizing', href: '#sizing', description: 'Fit charts' }, { label: 'Returns', href: '#returns' }] }]
    render(<Store items={items} />)
    const nav = screen.getByRole('navigation', { name: 'Store' })
    const trigger = within(nav).getByRole('button', { name: 'Guides' })
    expect(within(nav).getAllByRole('listitem').at(-1)).toContainElement(trigger)
    await userEvent.click(trigger)
    const menu = await screen.findByRole('menu')
    const entries = within(menu).getAllByRole('menuitem')
    expect(entries.map(entry => entry.getAttribute('href'))).toEqual(['#sizing', '#returns'])
    expect(entries[0]).toHaveTextContent('Fit charts')
    expect(await axeClean(document.body)).toHaveNoViolations()
  })

  it('lists a menu item as a labelled group of links in the sheet', async () => {
    const items = [...ITEMS, { label: 'Guides', menu: [{ label: 'Sizing', href: '#sizing' }] }]
    render(<Store items={items} />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const sheet = await screen.findByRole('dialog', { name: 'Menu' })
    const group = within(sheet).getByRole('list', { name: 'Guides' })
    await userEvent.click(within(group).getByRole('link', { name: 'Sizing' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('folds the links into the sheet below collapseBelow (2xl unless set)', () => {
    const { container, rerender } = render(<Store />)
    expect(container.querySelector('nav')).toHaveClass('@2xl:block')
    rerender(<Store collapseBelow="4xl" />)
    const nav = container.querySelector('nav')!
    expect(nav).toHaveClass('hidden', '@4xl:block')
    expect(nav).not.toHaveClass('@2xl:block')
    expect(screen.getByRole('button', { name: 'Menu' }).closest('.\\@4xl\\:hidden')).not.toBeNull()
  })

  it('forwards a ref to the header', () => {
    const ref = createRef<HTMLElement>()
    const { container } = render(<Store ref={ref} />)
    expect(ref.current).toBe(container.querySelector('header'))
  })

  it('is axe clean, closed and with the menu open', async () => {
    const { container } = render(<Store />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await screen.findByRole('dialog', { name: 'Menu' })
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
