import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Search } from './Search'

describe('Search', () => {
  it('is a search landmark holding a named search field', () => {
    render(<Search label="Search the catalogue" />)
    expect(screen.getByRole('search', { name: 'Search the catalogue' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search the catalogue' })).toBeInTheDocument()
  })

  it('calls onSearch with the trimmed query on Enter', async () => {
    const onSearch = vi.fn()
    render(<Search label="Search" onSearch={onSearch} />)
    await userEvent.type(screen.getByRole('searchbox'), '  holo sight {Enter}')
    expect(onSearch).toHaveBeenCalledWith('holo sight')
  })

  it('does not call onSearch for an empty query', async () => {
    const onSearch = vi.fn()
    render(<Search label="Search" onSearch={onSearch} />)
    await userEvent.type(screen.getByRole('searchbox'), '   {Enter}')
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('shows a clear button only while there is text, and it clears and refocuses', async () => {
    render(<Search label="Search" />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
    const box = screen.getByRole('searchbox')
    await userEvent.type(box, 'magazines')
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
  })

  it('clears on Escape', async () => {
    render(<Search label="Search" />)
    const box = screen.getByRole('searchbox')
    await userEvent.type(box, 'magazines{Escape}')
    expect(box).toHaveValue('')
  })

  it('focuses from the shortcut key, and announces the shortcut', async () => {
    render(<Search label="Search" shortcut="/" />)
    const box = screen.getByRole('searchbox')
    expect(box).toHaveAttribute('aria-keyshortcuts', '/')
    await userEvent.keyboard('/')
    expect(box).toHaveFocus()
    expect(box).toHaveValue('')
  })

  it('ignores the shortcut while another field has focus', async () => {
    render(
      <>
        <input aria-label="Other" />
        <Search label="Search" shortcut="/" />
      </>
    )
    const other = screen.getByRole('textbox', { name: 'Other' })
    await userEvent.click(other)
    await userEvent.keyboard('/')
    expect(other).toHaveFocus()
    expect(other).toHaveValue('/')
  })

  it('works controlled', async () => {
    const onValueChange = vi.fn()
    render(<Search label="Search" value="sight" onValueChange={onValueChange} />)
    expect(screen.getByRole('searchbox')).toHaveValue('sight')
    await userEvent.type(screen.getByRole('searchbox'), 's')
    expect(onValueChange).toHaveBeenLastCalledWith('sights')
  })

  it('forwards a ref to the input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Search ref={ref} label="Search" />)
    expect(ref.current).toBe(screen.getByRole('searchbox'))
  })

  it('is axe clean with text and a shortcut', async () => {
    const { container } = render(<Search label="Search" shortcut="/" defaultValue="sight" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
