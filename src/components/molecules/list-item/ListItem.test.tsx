import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { List, ListItem } from './ListItem'

describe('ListItem', () => {
  it('renders title, description and meta', () => {
    render(
      <List aria-label="Sessions">
        <ListItem title="Chrome on Windows" description="Brasov, Romania" meta="2 min ago" />
      </List>
    )
    const row = screen.getByRole('listitem')
    expect(row).toHaveTextContent('Chrome on Windows')
    expect(row).toHaveTextContent('Brasov, Romania')
    expect(within(row).getByText('2 min ago')).toBeInTheDocument()
  })

  it('List is a ul with an explicit list role, dividers on by default', () => {
    const { container, rerender } = render(
      <List aria-label="Sessions">
        <ListItem title="One" />
      </List>
    )
    const list = screen.getByRole('list', { name: 'Sessions' })
    expect(list.tagName).toBe('UL')
    expect(list).toHaveAttribute('role', 'list')
    expect(list).toHaveAttribute('data-dividers', 'true')
    rerender(
      <List aria-label="Sessions" dividers={false}>
        <ListItem title="One" />
      </List>
    )
    expect(container.querySelector('ul')).toHaveAttribute('data-dividers', 'false')
  })

  it('renders leading media', () => {
    render(<ListItem as="div" title="Ilse Varga" media={<span data-testid="media">IV</span>} />)
    expect(screen.getByTestId('media')).toBeInTheDocument()
  })

  it('with href, renders one link named by the title, and actions outside it', async () => {
    render(
      <List aria-label="Notifications">
        <ListItem
          title="Order shipped"
          description="Your replica left the depot."
          href="/orders/1"
          actions={<button type="button">Archive</button>}
        />
      </List>
    )
    const link = screen.getByRole('link', { name: 'Order shipped' })
    expect(link).toHaveAttribute('href', '/orders/1')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    const action = screen.getByRole('button', { name: 'Archive' })
    expect(link).not.toContainElement(action)
    // Link first, then the action: the row reads, then offers its extra controls.
    await userEvent.tab()
    expect(link).toHaveFocus()
    await userEvent.tab()
    expect(action).toHaveFocus()
  })

  it('passes the link through renderLink', () => {
    render(
      <ListItem
        as="div"
        title="Order shipped"
        href="/orders/1"
        renderLink={({ href, ...rest }) => <a data-router="yes" href={`#${href}`} {...rest} />}
      />
    )
    const link = screen.getByRole('link', { name: 'Order shipped' })
    expect(link).toHaveAttribute('data-router', 'yes')
    expect(link).toHaveAttribute('href', '#/orders/1')
  })

  it('with onActivate, renders one button named by the title and calls it on click and Enter', async () => {
    const onActivate = vi.fn()
    render(<ListItem as="div" title="Ilse Varga" onActivate={onActivate} />)
    const button = screen.getByRole('button', { name: 'Ilse Varga' })
    await userEvent.click(button)
    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(onActivate).toHaveBeenCalledTimes(2)
  })

  it('a click on a trailing action does not activate the row', async () => {
    const onActivate = vi.fn()
    const onRemove = vi.fn()
    render(
      <ListItem
        as="div"
        title="Ilse Varga"
        onActivate={onActivate}
        actions={
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        }
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledOnce()
    expect(onActivate).not.toHaveBeenCalled()
  })

  it('renders no link or button when the row is not interactive', () => {
    render(<ListItem as="div" title="Plain row" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('merges className and forwards refs', () => {
    const list = createRef<HTMLUListElement>()
    const item = createRef<HTMLLIElement>()
    render(
      <List ref={list} className="list-x" aria-label="Rows">
        <ListItem ref={item} className="item-x" title="One" />
      </List>
    )
    expect(list.current).not.toBeNull()
    expect(list.current).toHaveClass('list-x')
    expect(item.current).not.toBeNull()
    expect(item.current).toHaveClass('item-x')
    expect(item.current!.tagName).toBe('LI')
  })

  it('is axe-clean with plain, link and button rows', async () => {
    const { container } = render(
      <List aria-label="Mixed">
        <ListItem title="Plain" description="Nothing to click." meta="12:04" />
        <ListItem title="Linked" href="/a" actions={<button type="button">Mute</button>} />
        <ListItem title="Pressed" onActivate={() => {}} />
      </List>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
