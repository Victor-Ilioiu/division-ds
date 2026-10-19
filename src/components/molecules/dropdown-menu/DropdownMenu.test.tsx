import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Button } from '../../atoms'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './DropdownMenu'

function Menu({ onArchive = () => {}, onToggle = () => {} }: { onArchive?: () => void; onToggle?: (v: boolean) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">Manifest actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Manifest</DropdownMenuLabel>
        <DropdownMenuItem shortcut="D">Duplicate</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={false} onCheckedChange={onToggle}>
          Pin to top
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="hostile" shortcut="Del" onSelect={onArchive}>
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('advertises a popup on its trigger', () => {
    render(<Menu />)
    const trigger = screen.getByRole('button', { name: 'Manifest actions' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens a menu of items on click', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Manifest actions' }))
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Pin to top' })).toHaveAttribute('aria-checked', 'false')
  })

  it('exposes an item shortcut through aria-keyshortcuts', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Manifest actions' }))
    expect(await screen.findByRole('menuitem', { name: /Duplicate/ })).toHaveAttribute('aria-keyshortcuts', 'D')
  })

  // The shortcut hint carries a real colour at rest, never a dimmed one: aria-hidden exempts it
  // from the accessibility tree, never from being a visible pixel, so an opacity utility on it
  // would fall below SC 1.4.3's 4.5:1 floor. No opacity utility should ship on it, and each
  // tone's rest colour should be the real, already-gated token.
  it('gives the shortcut hint a real colour at rest, never a dimmed one (SC 1.4.3)', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Manifest actions' }))
    const defaultShortcut = (await screen.findByRole('menuitem', { name: /Duplicate/ }))
      .querySelector('[aria-hidden="true"]')
    expect(defaultShortcut?.className).not.toMatch(/opacity/)
    expect(defaultShortcut?.className).toContain('text-[var(--color-text-secondary)]')

    const hostileShortcut = screen.getByRole('menuitem', { name: /Archive/ }).querySelector('[aria-hidden="true"]')
    expect(hostileShortcut?.className).not.toMatch(/opacity/)
    expect(hostileShortcut?.className).toContain('text-[var(--color-accent-hostile-text)]')
  })

  it('follows the item into the disabled text colour on a disabled item, shortcut included', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Manifest actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem shortcut="D" disabled>
            Duplicate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    const shortcut = (await screen.findByRole('menuitem', { name: /Duplicate/ })).querySelector('[aria-hidden="true"]')
    expect(shortcut?.className).toContain('group-data-[disabled]:text-[var(--component-control-text-disabled)]')
  })

  it('runs the action and closes on select', async () => {
    const onArchive = vi.fn()
    render(<Menu onArchive={onArchive} />)
    await userEvent.click(screen.getByRole('button', { name: 'Manifest actions' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }))
    expect(onArchive).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('toggles a checkbox item', async () => {
    const onToggle = vi.fn()
    render(<Menu onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: 'Manifest actions' }))
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Pin to top' }))
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Menu />)
    const trigger = screen.getByRole('button', { name: 'Manifest actions' })
    await userEvent.click(trigger)
    await screen.findByRole('menu')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  // DropdownMenu's Root renders no DOM node of its own (it's a context provider, same as
  // RadixSelect.Root), so the ref that reaches an actual element is Content's — the portalled
  // menu surface, opened with defaultOpen so it exists to receive it.
  it('forwards a ref to the content element', async () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Manifest actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent ref={ref}>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    const menu = await screen.findByRole('menu')
    expect(ref.current).toBe(menu)
  })

  it('is axe clean while open', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Manifest actions' }))
    await screen.findByRole('menu')
    // The menu is portalled, so scan the whole body, as Select.test.tsx does.
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})

function SortMenu({ value = 'newest', onValueChange = () => {} }: { value?: string; onValueChange?: (v: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">View options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="price">Price</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Armoury</DropdownMenuItem>
            <DropdownMenuItem>Workshop</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('DropdownMenu radio items', () => {
  it('exposes one checked menuitemradio per group', async () => {
    render(<SortMenu value="price" />)
    await userEvent.click(screen.getByRole('button', { name: 'View options' }))
    expect(await screen.findByRole('menuitemradio', { name: 'Price' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: 'Newest' })).toHaveAttribute('aria-checked', 'false')
  })

  it('reports the chosen value', async () => {
    const onValueChange = vi.fn()
    render(<SortMenu onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'View options' }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Price' }))
    expect(onValueChange).toHaveBeenCalledWith('price')
  })
})

describe('DropdownMenu submenus', () => {
  it('marks the sub trigger as opening a menu', async () => {
    render(<SortMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'View options' }))
    const sub = await screen.findByRole('menuitem', { name: 'Move to' })
    expect(sub).toHaveAttribute('aria-haspopup', 'menu')
    expect(sub).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens with ArrowRight on the same surface and closes with ArrowLeft', async () => {
    render(<SortMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'View options' }))
    const sub = await screen.findByRole('menuitem', { name: 'Move to' })
    sub.focus()
    await userEvent.keyboard('{ArrowRight}')
    const menus = await screen.findAllByRole('menu')
    expect(menus).toHaveLength(2)
    const subMenu = menus[1]
    expect(subMenu).toHaveClass('anim-popover', 'crosshair', 'bg-[var(--color-surface-sunken)]')
    expect(screen.getByRole('menuitem', { name: 'Armoury' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(sub).toHaveFocus()
  })

  it('is axe clean with a submenu open', async () => {
    render(<SortMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'View options' }))
    const sub = await screen.findByRole('menuitem', { name: 'Move to' })
    sub.focus()
    await userEvent.keyboard('{ArrowRight}')
    await screen.findByRole('menuitem', { name: 'Armoury' })
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
